FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

RUN python -m spacy download en_core_web_sm

COPY extraction ./extraction
COPY analysis ./analysis
COPY chat ./chat
COPY auth ./auth
COPY db ./db
COPY main.py .

RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=development

EXPOSE ${PORT:-8000}

CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
