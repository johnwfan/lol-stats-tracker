"""
Draft Intelligence inference service.

Run with: uvicorn main:app --reload --port 8001
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from inference import InvalidDraftError, analyzer
from schemas import DraftAnalysis, DraftRequest

app = FastAPI(title="Draft Intelligence Inference Service", version=analyzer.metadata["model_version"])


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model_version": analyzer.metadata["model_version"]}


@app.post("/analyze-draft", response_model=DraftAnalysis)
def analyze_draft(draft: DraftRequest) -> DraftAnalysis:
    try:
        return analyzer.analyze(draft)
    except InvalidDraftError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.exception_handler(Exception)
def unhandled_exception_handler(_request, exc: Exception) -> JSONResponse:
    # Never leak internals (sklearn tracebacks, file paths) to the client.
    return JSONResponse(status_code=500, content={"detail": "Internal error analyzing draft."})
