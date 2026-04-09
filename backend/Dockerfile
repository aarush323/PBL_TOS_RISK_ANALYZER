FROM python:3.11-slim AS builder

WORKDIR /app

# Cache HF/fastembed downloads inside /app so it can be copied
ENV HF_HOME=/app/.cache/hf

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

# Download only the required spaCy model specified in requirements
RUN python -m spacy validate || true

# Preload embedding model to avoid first-request downloads at runtime
ARG FASTEMBED_MODEL="BAAI/bge-small-en-v1.5"
ENV FASTEMBED_MODEL=$FASTEMBED_MODEL
RUN python -c "from fastembed import TextEmbedding; import os; m=os.getenv('FASTEMBED_MODEL'); e=TextEmbedding(model_name=m); next(e.embed(['warmup']))"

COPY extraction ./extraction
COPY analysis ./analysis
COPY chat ./chat
COPY auth ./auth
COPY db ./db
COPY compare_service.py .
COPY main.py .

FROM python:3.11-slim

WORKDIR /app

ENV HF_HOME=/app/.cache/hf

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=builder /usr/local/bin /usr/local/bin

COPY --from=builder /app /app

RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=development
ENV PORT=8000

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
