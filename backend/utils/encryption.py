from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
from cryptography.hazmat.backends import default_backend
import base64
import os

# In production, this should be stored in environment variables or a secrets manager
# For now, we'll use a fixed salt and derive the key from settings
ENCRYPTION_SALT = b'sysadmin_agent_salt_2024'  # Should be in env vars in production

def get_encryption_key() -> bytes:
    """
    Generate encryption key from a password/secret.
    In production, use a proper secret from environment variables.
    """
    # This should come from environment variable in production
    password = os.getenv('ENCRYPTION_KEY', 'default-encryption-key-change-in-production').encode()
    
    kdf = PBKDF2(
        algorithm=hashes.SHA256(),
        length=32,
        salt=ENCRYPTION_SALT,
        iterations=100000,
        backend=default_backend()
    )
    key = base64.urlsafe_b64encode(kdf.derive(password))
    return key

# Initialize Fernet cipher
_cipher = None

def get_cipher():
    global _cipher
    if _cipher is None:
        _cipher = Fernet(get_encryption_key())
    return _cipher

def encrypt_data(data: str) -> str:
    """
    Encrypt sensitive data (passwords, SSH keys, etc.)
    Returns base64 encoded encrypted string
    """
    if not data:
        return data
    
    cipher = get_cipher()
    encrypted = cipher.encrypt(data.encode())
    return encrypted.decode()

def decrypt_data(encrypted_data: str) -> str:
    """
    Decrypt sensitive data
    Returns original string
    """
    if not encrypted_data:
        return encrypted_data
    
    cipher = get_cipher()
    decrypted = cipher.decrypt(encrypted_data.encode())
    return decrypted.decode()
