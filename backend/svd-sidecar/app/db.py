"""SQLAlchemy engine wired to recommendation_schema.

`DATABASE_URL` is provided by docker-compose from `SUPABASE_DB_URL_REC`, which is
the same JDBC URL the Java services consume (`jdbc:postgresql://host:port/db?...`).
SQLAlchemy needs `postgresql+psycopg2://user:pass@host:port/db?...`, so the JDBC
prefix is stripped and credentials are injected from `DATABASE_USERNAME` /
`DATABASE_PASSWORD` when present.
"""

from __future__ import annotations

import os
from functools import lru_cache
from urllib.parse import urlparse, urlunparse

from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.engine.url import URL
from sqlalchemy import create_engine

SCHEMA = "recommendation_schema"


def _build_sqlalchemy_url() -> str:
    raw = os.environ.get("DATABASE_URL")
    if not raw:
        raise RuntimeError(
            "DATABASE_URL is not set. docker-compose wires it from SUPABASE_DB_URL_REC."
        )

    if raw.startswith("jdbc:"):
        raw = raw[len("jdbc:"):]

    parsed = urlparse(raw)
    if parsed.scheme not in {"postgresql", "postgres"}:
        # Pass through unchanged: caller already gave us a SQLAlchemy URL.
        return raw

    user = os.environ.get("DATABASE_USERNAME")
    password = os.environ.get("DATABASE_PASSWORD")

    netloc = parsed.netloc
    if user and "@" not in netloc:
        credentials = user
        if password:
            credentials = f"{user}:{password}"
        netloc = f"{credentials}@{netloc}"

    return urlunparse(("postgresql+psycopg2", netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    url = _build_sqlalchemy_url()
    engine = create_engine(url, pool_pre_ping=True, pool_size=2, max_overflow=2)

    @event.listens_for(engine, "connect")
    def _set_search_path(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute(f"SET search_path TO {SCHEMA}")
        finally:
            cursor.close()

    return engine
