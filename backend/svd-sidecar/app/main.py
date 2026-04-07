from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import os
import uuid

app = FastAPI(title="Recommendation SVD Sidecar", version="0.1.0")

class TrainRequest(BaseModel):
    full_retrain: bool = False
    max_interactions: Optional[int] = None

class TrainResponse(BaseModel):
    job_id: str
    status: str

class PredictResponse(BaseModel):
    userId: str
    videoId: str
    score: float

class PredictRequest(BaseModel):
    userId: str
    videoId: str

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "svd-sidecar",
        "port": int(os.getenv("PORT", "8000"))
    }

@app.post("/train", response_model=TrainResponse)
def train(req: TrainRequest):
    job_id = str(uuid.uuid4())
    # Placeholder: training pipeline will be implemented here.
    return {"job_id": job_id, "status": "queued"}

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    # Placeholder: return a default score until model is wired.
    return {"userId": req.userId, "videoId": req.videoId, "score": 0.0}
