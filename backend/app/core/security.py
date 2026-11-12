"""
Security utilities placeholder for password hashing and JWT token handling.
No external secrets hardcoded.
"""
from typing import Optional
from app.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Placeholder for password verification."""
    return plain_password == hashed_password


def get_password_hash(password: str) -> str:
    """Placeholder for password hashing."""
    return f"hashed_{password}"

