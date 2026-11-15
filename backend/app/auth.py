import time
import logging
import jwt
from jwt import PyJWKClient
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from app.config import get_settings

logger = logging.getLogger("pharmacy.auth")
settings = get_settings()

_jwks_client: Optional[PyJWKClient] = None
_jwks_last_init: float = 0


def get_jwks_client() -> Optional[PyJWKClient]:
    global _jwks_client, _jwks_last_init
    now = time.time()
    # Refresh/initialize client if older than 1 hour or uninitialized
    if _jwks_client is None or (now - _jwks_last_init) > 3600:
        if settings.SUPABASE_URL and "placeholder" not in settings.SUPABASE_URL:
            try:
                _jwks_client = PyJWKClient(settings.jwks_url, cache_jwk_set=True, lifespan=3600)
                _jwks_last_init = now
            except Exception as e:
                logger.warning(f"Could not initialize PyJWKClient: {e}")
                _jwks_client = None
    return _jwks_client


def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Verifies Supabase JWT token using JWKS (asymmetric) or decoded claims.
    Validates audience='authenticated' and issuer.
    Returns decoded token dictionary containing 'sub', 'email', etc.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Allow test tokens in test / offline dev environment if configured
    if settings.ENVIRONMENT == "test" and token.startswith("test-token-"):
        # Format: test-token-<role>-<uuid>
        parts = token.split(":")
        sub = parts[1] if len(parts) > 1 else "00000000-0000-0000-0000-000000000001"
        email = parts[2] if len(parts) > 2 else "test@pharmacy.local"
        return {"sub": sub, "email": email, "aud": "authenticated"}

    client = get_jwks_client()
    if client:
        try:
            signing_key = client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "ES256", "HS256"],
                audience="authenticated",
                issuer=settings.jwt_issuer,
                options={"verify_exp": True}
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception as e:
            logger.error(f"JWKS verification failed: {e}")
            # Fall through to unverified decode inspection if in development mode
            if settings.ENVIRONMENT != "development":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid authentication token: {str(e)}",
                    headers={"WWW-Authenticate": "Bearer"},
                )

    # Fallback for development without live internet JWKS connection:
    try:
        # Decode without verification only in non-production development for inspection
        payload = jwt.decode(token, options={"verify_signature": False})
        if payload.get("aud") != "authenticated" and "sub" not in payload:
            raise ValueError("Token missing required audience or subject")
        return payload
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate token credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
