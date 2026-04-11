FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m spacy download en_core_web_sm
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
COPY extraction ./extraction
COPY analysis ./analysis
COPY chat ./chat
COPY auth ./auth
COPY db ./db
COPY migrations ./migrations
COPY compare_service.py .
COPY main.py .
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=development
ENV PORT=8000
EXPOSE 8000
CMD uvicorn main:app --host 0.0.0.0 --port $PORT