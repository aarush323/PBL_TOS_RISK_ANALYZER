import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os
import uuid
import threading
from extraction.input_handler import handle_input
from analysis.analyzer import analyze_document

app = FastAPI(title="ToS Analyzer - Extraction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for background analysis jobs
analysis_jobs: dict = {}

class TextInput(BaseModel):
    input_type: str   # "url" or "text"
    content: str

class AnalyzeInput(BaseModel):
    input_type: str
    content: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/extract")
def extract_text(body: TextInput):
    try:
        result = handle_input(body.input_type, body.content)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

@app.post("/analyze")
def analyze(body: AnalyzeInput):
    try:
        # Step 1: Extract (Part 1)
        extraction = handle_input(body.input_type, body.content)
        # Step 2: Analyze (Part 2)
        result = analyze_document(extraction)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/extract/pdf")
def extract_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    temp_path = f"/tmp/{file.filename}"
    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        result = handle_input("pdf", temp_path)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


# ---------------------------------------------------------------------------
# Background analysis (Upgrade 4)
# ---------------------------------------------------------------------------

def _run_analysis_background(job_id: str, extraction: dict):
    """Run analyze_document in a background thread and store the result."""
    try:
        result = analyze_document(extraction)
        analysis_jobs[job_id] = {"status": "complete", "result": result}
    except Exception as e:
        analysis_jobs[job_id] = {"status": "failed", "error": str(e)}


@app.post("/analyze/async")
def analyze_async(body: AnalyzeInput):
    try:
        # Step 1: Extract text immediately
        extraction = handle_input(body.input_type, body.content)

        # Step 2: Kick off analysis in background
        job_id = str(uuid.uuid4())
        analysis_jobs[job_id] = {"status": "processing"}

        thread = threading.Thread(
            target=_run_analysis_background,
            args=(job_id, extraction),
            daemon=True
        )
        thread.start()

        # Return extraction + job_id immediately
        return {
            "job_id": job_id,
            "status": "processing",
            "extraction": extraction
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@app.get("/analyze/status/{job_id}")
def analyze_status(job_id: str):
    if job_id not in analysis_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return analysis_jobs[job_id]

