"""SVD training pipeline.

Reads `interactions` from `recommendation_schema`, trains a Surprise SVD model
with `rating_scale=(-1, 1)`, then:
  - upserts `user_factors` rows (vector + interaction_count + last_trained_at + updated_at)
  - UPDATEs `item_factors.vector` ONLY -- never touches tags/category_id/thumbnail_url/
    language/view_count/global_score (those are owned by Java).
"""

from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Dict

import pandas as pd
from sqlalchemy import text
from surprise import Dataset, Reader, SVD

from .db import get_engine

logger = logging.getLogger(__name__)

DEFAULT_N_FACTORS = int(os.environ.get("SVD_N_FACTORS", "50"))


def _load_interactions() -> pd.DataFrame:
    engine = get_engine()
    sql = text(
        "SELECT user_id::text AS user_id, video_id, score "
        "FROM recommendation_schema.interactions"
    )
    with engine.connect() as conn:
        return pd.read_sql(sql, conn)


def _write_user_factors(vectors: Dict[str, list[float]], counts: Dict[str, int]) -> None:
    if not vectors:
        return

    engine = get_engine()
    now = datetime.utcnow()
    upsert_sql = text(
        """
        INSERT INTO recommendation_schema.user_factors
            (user_id, vector, interaction_count, last_trained_at, updated_at)
        VALUES (CAST(:user_id AS uuid), :vector, :interaction_count, :last_trained_at, :updated_at)
        ON CONFLICT (user_id) DO UPDATE SET
            vector = EXCLUDED.vector,
            interaction_count = EXCLUDED.interaction_count,
            last_trained_at = EXCLUDED.last_trained_at,
            updated_at = EXCLUDED.updated_at
        """
    )

    rows = [
        {
            "user_id": user_id,
            "vector": list(vector),
            "interaction_count": counts.get(user_id, 0),
            "last_trained_at": now,
            "updated_at": now,
        }
        for user_id, vector in vectors.items()
    ]

    with engine.begin() as conn:
        conn.execute(upsert_sql, rows)


def _write_item_factor_vectors(vectors: Dict[str, list[float]]) -> int:
    """UPDATE item_factors.vector only. Skip rows that don't already exist --
    Java is responsible for creating the row on `video.uploaded`."""
    if not vectors:
        return 0

    engine = get_engine()
    now = datetime.utcnow()
    update_sql = text(
        """
        UPDATE recommendation_schema.item_factors
        SET vector = :vector, updated_at = :updated_at
        WHERE video_id = :video_id
        """
    )

    rows = [
        {"video_id": video_id, "vector": list(vector), "updated_at": now}
        for video_id, vector in vectors.items()
    ]

    updated = 0
    with engine.begin() as conn:
        for row in rows:
            result = conn.execute(update_sql, row)
            updated += result.rowcount or 0
    return updated


def train(n_factors: int | None = None) -> dict:
    """Train SVD on current interactions; write user and item vectors. Returns stats."""
    df = _load_interactions()
    if df.empty:
        logger.warning("No interactions in DB -- skipping training")
        return {"num_users": 0, "num_items": 0, "num_interactions": 0, "items_updated": 0}

    factors = n_factors or DEFAULT_N_FACTORS
    reader = Reader(rating_scale=(-1, 1))
    dataset = Dataset.load_from_df(df[["user_id", "video_id", "score"]], reader)
    trainset = dataset.build_full_trainset()

    algo = SVD(n_factors=factors)
    algo.fit(trainset)

    interaction_counts = (
        df.groupby("user_id").size().astype(int).to_dict()
    )

    user_vectors: Dict[str, list[float]] = {}
    for inner_uid in trainset.all_users():
        raw_uid = trainset.to_raw_uid(inner_uid)
        user_vectors[str(raw_uid)] = algo.pu[inner_uid].tolist()

    item_vectors: Dict[str, list[float]] = {}
    for inner_iid in trainset.all_items():
        raw_iid = trainset.to_raw_iid(inner_iid)
        item_vectors[str(raw_iid)] = algo.qi[inner_iid].tolist()

    _write_user_factors(user_vectors, interaction_counts)
    items_updated = _write_item_factor_vectors(item_vectors)

    stats = {
        "num_users": len(user_vectors),
        "num_items": len(item_vectors),
        "num_interactions": int(len(df)),
        "items_updated": items_updated,
        "n_factors": factors,
    }
    logger.info("SVD training complete: %s", stats)
    return stats
