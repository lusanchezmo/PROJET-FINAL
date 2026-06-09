# Use an optimized official Python runtime base image
FROM python:3.11-slim

# Set system environment adjustments
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install native system build requirements for networking or scraping if required
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/list/apt/lists/*

# Copy only the dependency definitions to maximize caching layers
COPY requirements.txt .

# Install dependencies and purge cache to minimize image footprint size
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Pre-download the Hugging Face embedding model during build time
# This ensures it is baked into the image and stays below the 1.5 Go runtime constraint
RUN python -c "from langchain_huggingface import HuggingFaceEmbeddings; HuggingFaceEmbeddings(model_name='sentence-transformers/all-MiniLM-L6-v2')"

# Copy application source code into container work directory
COPY ingest.py main.py ./
COPY ANSSI/ ./ANSSI/

# Expose FastAPI deployment port standard
EXPOSE 8000

# Launch server deployment script using Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]