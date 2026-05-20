"""In-memory factor cache + dot-product prediction.

Factors are read from `user_factors` / `item_factors` and kept in module-level
dicts. `load_factors()` is called at startup and again after every successful
training run so `/predict/batch` doesn't keep returning stale scores.

Missing user or item -> score 0.0 (graceful degradation for the caller).
"""

from __future__ import annotations

import logging
import threading
from typing import Dict, List

import numpy as np
from sqlalchemy import text

from .db import get_engine

logger = logging.getLogger(__name__)

_lock = threading.RLock()
_user_vectors: Dict[str, np.ndarray] = {}
_item_vectors: Dict[str, np.ndarray] = {}


def load_factors() -> None:
    """Reload user and item vectors from the DB into memory."""
    engine = get_engine()

    user_sql = text(
        "SELECT user_id::text AS user_id, vector "
        "FROM recommendation_schema.user_factors "
        "WHERE vector IS NOT NULL"
    )
    item_sql = text(
        "SELECT video_id, vector "
        "FROM recommendation_schema.item_factors "
        "WHERE vector IS NOT NULL"
    )

    new_users: Dict[str, np.ndarray] = {}
    new_items: Dict[str, np.ndarray] = {}

    with engine.connect() as conn:
        for row in conn.execute(user_sql):
            vector = row.vector
            if vector is None:
                continue
            new_users[str(row.user_id)] = np.asarray(vector, dtype=float)
        for row in conn.execute(item_sql):
            vector = row.vector
            if vector is None:
                continue
            new_items[str(row.video_id)] = np.asarray(vector, dtype=float)

    with _lock:
        _user_vectors.clear()
        _user_vectors.update(new_users)
        _item_vectors.clear()
        _item_vectors.update(new_items)

    logger.info("Loaded %d user vectors and %d item vectors", len(new_users), len(new_items))


def _dot(user_vec: np.ndarray | None, item_vec: np.ndarray | None) -> float:
    if user_vec is None or item_vec is None:
        return 0.0
    if user_vec.shape != item_vec.shape:
        return 0.0
    return float(np.dot(user_vec, item_vec))


def predict_single(user_id: str, video_id: str) -> float:
    with _lock:
        user_vec = _user_vectors.get(user_id)
        item_vec = _item_vectors.get(video_id)
    return _dot(user_vec, item_vec)


def predict_batch(user_id: str, video_ids: List[str]) -> List[dict]:
    with _lock:
        user_vec = _user_vectors.get(user_id)
        items_snapshot = {vid: _item_vectors.get(vid) for vid in video_ids}

    return [
        {"videoId": vid, "score": _dot(user_vec, items_snapshot.get(vid))}
        for vid in video_ids
    ]
