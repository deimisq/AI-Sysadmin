from cryptography.fernet import Fernet
from settings import settings
import base64
import os

# Ensure we have a valid key. In production, this must be persistent!
# For MVP, if SECRET_KEY is not 32 url-safe base64 bytes, we generate one derived from it or just use a fixed one for dev.
# Let's try to use the SECRET_KEY from settings, padding it if necessary.

def get_cipher_suite():
    key = settings.SECRET_KEY
    # Fernet key must be 32 url-safe base64-encoded bytes.
    # This is a hack for MVP. In prod, generate a proper key: Fernet.generate_key()
    # and store it in env vars.
    
    # Simple derivation for dev:
    # Pad or truncate to 32 bytes then base64 encode
    key_bytes = key.encode('utf-8')
    if len(key_bytes) < 32:
        key_bytes = key_bytes + b'0' * (32 - len(key_bytes))
    else:
        key_bytes = key_bytes[:32]
        
    final_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(final_key)

cipher_suite = get_cipher_suite()

def encrypt_value(value: str) -> str:
    if not value:
        return ""
    return cipher_suite.encrypt(value.encode('utf-8')).decode('utf-8')

def decrypt_value(encrypted_value: str) -> str:
    if not encrypted_value:
        return ""
    try:
        return cipher_suite.decrypt(encrypted_value.encode('utf-8')).decode('utf-8')
    except Exception:
        return "[Decryption Failed]"
