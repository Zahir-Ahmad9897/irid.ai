"""
api/auth.py
-----------
Signup / login endpoints backed by SQLite.

Deliberately uses ONLY the Python standard library (hashlib, hmac, secrets) —
no new pip dependencies, so no requirements.txt change and no Docker image
rebuild is needed. Mirrors the get_db() context-manager pattern already used
in main.py.
"""

import binascii
import datetime as dt
import hashlib
import hmac
import secrets

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from src.db import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

SESSION_EXPIRES_MINUTES = 15  # matches "auto-lock after 15 minutes" copy in LoginPage.jsx
PBKDF2_ITERATIONS = 260_000


class SignupRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    username: str


def init_auth_db() -> None:
    """Creates the users/sessions tables if they don't exist. Call once at startup."""
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                expires_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def _hash_password(password: str, salt: bytes | None = None) -> str:
    """Returns 'salt_hex$hash_hex' using PBKDF2-HMAC-SHA256 (stdlib only)."""
    salt = salt or secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return f"{binascii.hexlify(salt).decode()}${binascii.hexlify(derived).decode()}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, hash_hex = stored.split("$")
    except ValueError:
        return False
    salt = binascii.unhexlify(salt_hex)
    expected = binascii.unhexlify(hash_hex)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return hmac.compare_digest(derived, expected)


def _issue_session(username: str) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = (dt.datetime.utcnow() + dt.timedelta(minutes=SESSION_EXPIRES_MINUTES)).isoformat()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO sessions (token, username, expires_at) VALUES (?, ?, ?)",
            (token, username, expires_at),
        )
        conn.commit()
    return token


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest) -> AuthResponse:
    username = payload.username.strip()

    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE username = ?", (username,)
        ).fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with that username already exists.",
            )

        conn.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, _hash_password(payload.password)),
        )
        conn.commit()

    return AuthResponse(token=_issue_session(username), username=username)


@router.post("/login", response_model=AuthResponse, status_code=status.HTTP_200_OK)
async def login(payload: LoginRequest) -> AuthResponse:
    username = payload.username.strip()

    with get_db() as conn:
        row = conn.execute(
            "SELECT username, password_hash FROM users WHERE username = ?", (username,)
        ).fetchone()

    if not row or not _verify_password(payload.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    return AuthResponse(token=_issue_session(username), username=username)


@router.get("/me", status_code=status.HTTP_200_OK)
async def me(token: str) -> dict:
    """Validates a session token and returns the current user."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT username, expires_at FROM sessions WHERE token = ?", (token,)
        ).fetchone()

    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session.")
    if dt.datetime.fromisoformat(row["expires_at"]) < dt.datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired.")

    return {"username": row["username"]}