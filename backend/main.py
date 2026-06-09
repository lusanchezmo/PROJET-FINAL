import os
from contextlib import asynccontextmanager
from typing import List, Literal, Optional
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# MongoDB Async Driver
from motor.motor_asyncio import AsyncIOMotorClient

from langchain_openai import ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.messages import HumanMessage, AIMessage

from ingest import run_ingestion

load_dotenv()

# Global infrastructure variables
vector_store = None
retriever = None
rag_chain = None
condense_chain = None
mongo_db = None  # Global MongoDB reference

# ==========================================
# PYDANTIC SCHEMAS (API Contracts)
# ==========================================
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    question: str = Field(..., description="The current follow-up question.")
    history: List[ChatMessage] = Field(default=[], description="Stateless history passed by client.")

# New MongoDB-backed Request Schema
class StoredChatRequest(BaseModel):
    user_id: str = Field(..., description="Unique identifier for the student/user.")
    conversation_id: str = Field(..., description="Unique identifier for the specific chat session.")
    question: str = Field(..., description="The new question to process.")

class ChatResponse(BaseModel):
    answer: str

class IngestionResponse(BaseModel):
    status: str
    detail: str

# ==========================================
# RAG ENGINE CORE INITIALIZATION
# ==========================================
def initialize_rag_components():
    global vector_store, retriever, rag_chain, condense_chain
    
    print("[INFO] Initializing Core RAG components...")
    
    if not os.path.exists("faiss_uphf_index/index.faiss"):
        print("[WARNING] Vector store index not found locally. Running automatic ingestion...")
        run_ingestion()
    
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    vector_store = FAISS.load_local("faiss_uphf_index", embeddings, allow_dangerous_deserialization=True)
    retriever = vector_store.as_retriever(search_kwargs={"k": 4})
    
    huggingface_api_token = os.getenv("HUGGINGFACEHUB_API_TOKEN")
    llm = ChatOpenAI(
        base_url="https://router.huggingface.co/v1",
        api_key=huggingface_api_token,
        model="Qwen/QwQ-32B:nscale",
        temperature=0.2
    )

    # Contextualization Sub-Chain
    contextualize_system_prompt = (
        "Compte tenu de l'historique de la conversation et de la dernière question de l'utilisateur"
        "qui peut faire référence à un contexte de l'historique de la conversation "
        "formulez une question autonome qui puisse être comprise"
        "sans l'historique de la conversation. NE répondez PAS à la question,"
        "reformulez-la simplement si nécessaire et sinon renvoyez-la telle quelle."
    )
    condense_prompt_template = ChatPromptTemplate.from_messages([
        ("system", contextualize_system_prompt),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{question}")
    ])
    condense_chain = condense_prompt_template | llm | StrOutputParser()

    # Core QA System Prompt
    system_prompt = """
Vous êtes l'Agent de Sécurité virtuel de l'UPHF, un assistant expert en cybersécurité.
Votre mission est de guider les utilisateurs sur les bonnes pratiques et répondre aux questions sur l'UPHF en vous basant STRICTEMENT sur le contexte fourni ci-dessous.

Si la réponse ne se trouve pas dans le contexte, dites poliment : "Je suis désolé, mais je ne dispose pas de cette information spécifique dans mes bases documentaires officielles." Ne tentez pas d'inventer une réponse.

Contexte de référence :
{context}
"""
    main_prompt_template = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{question}")
    ])
    
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    def route_and_retrieve_context(chain_input):
        if chain_input.get("history"):
            standalone_question = condense_chain.invoke({
                "question": chain_input["question"], 
                "history": chain_input["history"]
            })
            return format_docs(retriever.invoke(standalone_question))
        return format_docs(retriever.invoke(chain_input["question"]))

    output_parser = StrOutputParser()
    rag_chain = (
        {
            "context": route_and_retrieve_context,
            "question": lambda x: x["question"],
            "history": lambda x: x.get("history", [])
        }
        | main_prompt_template
        | llm
        | output_parser
    )
    print("[INFO] RAG infrastructure loaded successfully.")

# Lifespan manager to orchestrate server startup and database connection pools safely
@asynccontextmanager
async def lifespan(app: FastAPI):
    global mongo_db
    # 1. Connect to MongoDB using Async Driver
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    print(f"[INFO] Connecting to MongoDB instance at: {mongo_uri}")
    mongo_client = AsyncIOMotorClient(mongo_uri)
    mongo_db = mongo_client["uphf_security_db"] # Select database
    
    # 2. Setup RAG Indices
    initialize_rag_components()
    yield
    # 3. Clean up connection pool on shutdown
    mongo_client.close()
    print("[INFO] Shutting down application services and closing DB connections.")

# ==========================================
# FASTAPI APPLICATION ARCHITECTURE
# ==========================================
app = FastAPI(
    title="UPHF Virtual Security Agent API",
    version="1.2.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    return {"status": "healthy", "service": "uphf-security-rag-agent"}

# --- ENDPOINT 1: STATELESS CHAT (Original) ---
@app.post("/api/v1/chat", response_model=ChatResponse)
async def conversational_chat_endpoint(payload: ChatRequest):
    try:
        langchain_history = []
        for message in payload.history:
            if message.role == "user":
                langchain_history.append(HumanMessage(content=message.content))
            elif message.role == "assistant":
                langchain_history.append(AIMessage(content=message.content))
        
        result_text = rag_chain.invoke({
            "question": payload.question,
            "history": langchain_history
        })
        return ChatResponse(answer=result_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- ENDPOINT 2: MONGO-BACKED PERSISTENT CHAT (New) ---
@app.post("/api/v1/chat/stored", response_model=ChatResponse)
async def stateful_chat_endpoint(payload: StoredChatRequest):
    try:
        # 1. Search for existing conversation history in MongoDB
        session_document = await mongo_db.conversations.find_one({
            "user_id": payload.user_id,
            "conversation_id": payload.conversation_id
        })
        
        # 2. Parse database logs into LangChain native message format
        langchain_history = []
        if session_document and "messages" in session_document:
            for msg in session_document["messages"]:
                if msg["role"] == "user":
                    langchain_history.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    langchain_history.append(AIMessage(content=msg["content"]))
        
        # 3. Execute the Multi-turn RAG Chain
        result_text = rag_chain.invoke({
            "question": payload.question,
            "history": langchain_history
        })
        
        # 4. Atomically push the new human query and AI answer back to MongoDB
        await mongo_db.conversations.update_one(
            {"user_id": payload.user_id, "conversation_id": payload.conversation_id},
            {
                "$push": {
                    "messages": {
                        "$each": [
                            {"role": "user", "content": payload.question},
                            {"role": "assistant", "content": result_text}
                        ]
                    }
                }
            },
            upsert=True # Creates the document automatically if it doesn't exist yet
        )
        
        return ChatResponse(answer=result_text)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database or RAG execution error: {str(e)}"
        )

@app.post("/api/v1/ingest", response_model=IngestionResponse)
async def trigger_re_ingestion_endpoint():
    success = run_ingestion()
    if not success:
        raise HTTPException(status_code=400, detail="Ingestion pipeline failed.")
    initialize_rag_components()
    return IngestionResponse(status="success", detail="FAISS vector index rebuilt successfully.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)