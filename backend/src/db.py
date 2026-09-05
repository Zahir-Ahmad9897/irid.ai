"""
src/db.py
---------
SQLite persistence layer: connection management, schema initialization,
and helper functions for system logs and the deletion audit log.

Reconstructed to match every call site in api/main.py and api/auth.py:
  - init_db()                                   -> create tables if missing
  - get_db()                                     -> context manager yielding
                                                     a sqlite3.Connection with
                                                     row_factory = sqlite3.Row
  - insert_log(camera, name, status, confidence) -> system_logs table
  - insert_audit(action, target, actor)          -> audit_logs table

The users/sessions tables used by api/auth.py are created separately via
init_auth_db(), but share this same database file and get_db() connection.
"""

import os
import sqlite3
from contextlib import contextmanager

# Persisted via the `./backend/data:/app/data` volume mount in docker-compose.yml
DB_DIR = os.getenv("DB_DIR", "data")
DB_PATH = os.getenv("DB_PATH", os.path.join(DB_DIR, "app.db"))


def init_db() -> None:
    """Creates the core application tables if they don't already exist."""
    os.makedirs(DB_DIR, exist_ok=True)
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS system_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL DEFAULT (datetime('now')),
                camera TEXT,
                name TEXT,
                status TEXT NOT NULL,
                confidence REAL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL DEFAULT (datetime('now')),
                action TEXT NOT NULL,
                target TEXT,
                actor TEXT
            )
            """
        )
        conn.commit()


@contextmanager
def get_db():
    """
    Context manager yielding a sqlite3.Connection with row_factory set so
    rows behave like dicts (supports both `dict(row)` and `row["col"]`).
    Usable both as `with get_db() as conn: conn.execute(...)` and
    `with get_db() as conn: cursor = conn.cursor(); cursor.execute(...)`.
    """
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def insert_log(camera: str, name: str | None, status: str, confidence: float | None) -> None:
    """Records a single recognition event (enrollment or recognize call)."""
    with get_db() as conn:
        conn.execute(
            "INSERT INTO system_logs (camera, name, status, confidence) VALUES (?, ?, ?, ?)",
            (camera, name, status, confidence),
        )
        conn.commit()


def insert_audit(action: str, target: str | None, actor: str) -> None:
    """Records an administrative action (currently: identity deletion)."""
    with get_db() as conn:
        conn.execute(
            "INSERT INTO audit_logs (action, target, actor) VALUES (?, ?, ?)",
            (action, target, actor),
        )
        conn.commit()