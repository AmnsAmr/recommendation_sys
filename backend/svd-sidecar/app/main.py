"""SVD sidecar HTTP surface.

Exposes:
  GET  /health           -- liveness probe
  POST /train            -- synchronous SVD training over current interactions
  POST /predict          -- single-pair score (kept for compatibility)
  POST /predict/batch    -- batch scoring used by recommendation-service's HybridScorer
"""

from __future__ import annotations

import logging
import os
import uuid
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI
from fastapi import HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        from . import predict
        predict.load_factors()
    except Exception:  # noqa: BLE001 - sidecar should still boot even if DB is briefly unavailable
        logger.exception("Initial factor load failed; /predict will return 0.0 until next /train")
    yield


app = FastAPI(title="Recommendation SVD Sidecar", version="0.2.0", lifespan=lifespan)


class TrainRequest(BaseModel):
    full_retrain: bool = False
    max_interactions: Optional[int] = None
    n_factors: Optional[int] = None


class TrainResponse(BaseModel):
    job_id: str
    status: str
    stats: dict


class PredictRequest(BaseModel):
    userId: str
    videoId: str


class PredictResponse(BaseModel):
    userId: str
    videoId: str
    score: float


class BatchPredictRequest(BaseModel):
    userId: str
    videoIds: List[str]


class ScoreItem(BaseModel):
    videoId: str
    score: float


class BatchPredictResponse(BaseModel):
    scores: List[ScoreItem]


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "svd-sidecar",
        "port": int(os.getenv("PORT", "8000")),
    }


@app.post("/train", response_model=TrainResponse)
def train(req: TrainRequest):
    try:
        from . import predict, training
    except Exception as exc:  # noqa: BLE001 - surface runtime dependency issues without crash-looping the container
        logger.exception("Training dependencies failed to import")
        raise HTTPException(status_code=503, detail="TRAINING_DEPENDENCIES_UNAVAILABLE") from exc

    stats = training.train(n_factors=req.n_factors)
    predict.load_factors()
    return TrainResponse(job_id=str(uuid.uuid4()), status="completed", stats=stats)


@app.post("/predict", response_model=PredictResponse)
def predict_one(req: PredictRequest):
    from . import predict
    score = predict.predict_single(req.userId, req.videoId)
    return PredictResponse(userId=req.userId, videoId=req.videoId, score=score)


@app.post("/predict/batch", response_model=BatchPredictResponse)
def predict_many(req: BatchPredictRequest):
    from . import predict
    scores = predict.predict_batch(req.userId, req.videoIds)
    return BatchPredictResponse(scores=[ScoreItem(**item) for item in scores])
