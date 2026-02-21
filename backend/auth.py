import os
from datetime import datetime, timedelta, timezone
from cryptography.fernet import Fernet
import jwt

SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-this-in-env")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    ENCRYPTION_KEY = Fernet.generate_key()
    print(
        "WARNING: Using auto-generated AES encryption key. Passwords will be lost on server restart."
    )

cipher_suite = Fernet(ENCRYPTION_KEY)


def verify_password(plain_password: str, encrypted_password: str) -> bool:
    try:
        decrypted_password = cipher_suite.decrypt(
            encrypted_password.encode("utf-8")
        ).decode("utf-8")
        return plain_password == decrypted_password
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return cipher_suite.encrypt(password.encode("utf-8")).decode("utf-8")


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
