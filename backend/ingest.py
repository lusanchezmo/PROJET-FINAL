import os
from langchain_community.document_loaders import AsyncHtmlLoader, PyPDFDirectoryLoader
from langchain_community.document_transformers import Html2TextTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

# Secure Hugging Face Hub authentication token
from dotenv import load_dotenv
load_dotenv()
HUGGINGFACE_API_TOKEN = os.getenv("HUGGINGFACEHUB_API_TOKEN")

def run_ingestion():
    # ==========================================
    # SOURCE 1: Web Scraping Pipeline
    # ==========================================
    print("1. Starting web scraping process...")
    urls = ["https://numerique.uphf.fr/organisation/s%C3%A9curit%C3%A9%20des%20syst%C3%A8mes%20d%27information"]
    web_loader = AsyncHtmlLoader(urls)
    web_docs_raw = web_loader.load()
    
    # Transform raw HTML into clean Markdown plain text
    html_to_text = Html2TextTransformer()
    web_documents = html_to_text.transform_documents(web_docs_raw)
    print("   -> Web content successfully extracted and formatted.")

    # ==========================================
    # SOURCE 2: Local PDF Directory Loading
    # ==========================================
    print("2. Loading local PDF files from target directory...")
    # Directory path where your project PDFs are stored
    pdf_folder_path = "ANSSI/" 
    
    pdf_loader = PyPDFDirectoryLoader(pdf_folder_path)
    pdf_documents = pdf_loader.load()
    print(f"   -> Successfully loaded {len(pdf_documents)} pages from PDFs.")

    # ==========================================
    # KNOWLEDGE UNIFICATION AND CHUNKING
    # ==========================================
    print("3. Merging all knowledge sources into a single dataset...")
    all_documents = web_documents + pdf_documents

    print("4. Applying text segmentation (Recursive Chunking)...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=700, 
        chunk_overlap=100
    )
    docs_split = text_splitter.split_documents(all_documents)

    # ==========================================
    # VECTOR STORE INDEXING AND PERSISTENCE
    # ==========================================
    print("5. Generating text embeddings and structuring FAISS index...")
    embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    
    vector_store = FAISS.from_documents(docs_split, embedding_model)

    print("6. Persisting FAISS vector database to local disk...")
    vector_store.save_local("faiss_uphf_index")
    print("SUCCESS: Ingestion completed. 'faiss_uphf_index' is ready for use.")

if __name__ == "__main__":
    run_ingestion()