"""Validación de tokens con claves efímeras y sin servicios externos."""
import os
import secrets
import sys
from datetime import datetime, timezone
from pathlib import Path

from cryptography.fernet import Fernet
import jwt
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", secrets.token_urlsafe(48))
os.environ.setdefault("ENCRYPTION_KEY", Fernet.generate_key().decode())

from utils import auth


def test_tokens_creados_conservan_sujeto_y_caducidad():
    token = auth.create_access_token({"sub": "usuario-sintetico"})
    claims = auth.decode_access_token(token)
    assert claims["sub"] == "usuario-sintetico"
    assert claims["exp"] > datetime.now(timezone.utc).timestamp()


@pytest.mark.parametrize("claims,algorithm,key", [
    ({"sub": "usuario-sintetico"}, "HS256", None),
    ({"exp": 1, "sub": "usuario-sintetico"}, "HS256", None),
    ({"exp": 4_000_000_000}, "HS256", None),
    ({"exp": 4_000_000_000, "sub": "usuario-sintetico"}, "HS512", None),
    ({"exp": 4_000_000_000, "sub": "usuario-sintetico"}, "HS256", secrets.token_urlsafe(48)),
])
def test_rechaza_tokens_sin_caducidad_sujeto_firma_o_algoritmo_validos(claims, algorithm, key):
    token = jwt.encode(claims, key or auth.SECRET_KEY, algorithm=algorithm)
    assert auth.decode_access_token(token) is None


def test_rechaza_tokens_sin_firma_y_texto_arbitrario():
    unsigned = jwt.encode({"sub": "usuario-sintetico", "exp": 4_000_000_000}, "", algorithm="none")
    assert auth.decode_access_token(unsigned) is None
    assert auth.decode_access_token("no-es-un-token") is None
