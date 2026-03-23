from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from jose import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from supabase import create_client, Client

from app.core.config import settings

import logging
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Check if it's an n8n/service API key (bypass Supabase auth)
        n8n_api_key = getattr(settings, "N8N_API_KEY", "")
        if n8n_api_key and token == n8n_api_key:
            return {
                "user_id": "00000000-0000-0000-0000-000000000000",
                "email": "n8n@st4rtup.app",
                "role": "admin",
                "user_metadata": {"service": "n8n"},
            }

        # Validate Supabase JWT token
        user_response = supabase.auth.get_user(token)

        if not user_response or not user_response.user:
            raise credentials_exception

        user = user_response.user
        user_id = user.id
        email = user.email

        # Fetch role from DB
        from app.core.database import AsyncSessionLocal
        from app.models.models import User as UserModel

        role = "viewer"
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(UserModel).where(UserModel.id == UUID(user_id))
                )
                db_user = result.scalar_one_or_none()
                if not db_user and email:
                    result = await db.execute(
                        select(UserModel).where(UserModel.email == email)
                    )
                    db_user = result.scalar_one_or_none()
                if db_user:
                    role = db_user.role.value if hasattr(db_user.role, 'value') else str(db_user.role)
        except Exception as db_err:
            logger.warning(f"DB role lookup failed for user {email}: {type(db_err).__name__}: {db_err}")

        # Role comes from DB only — no email-based promotion
        return {
            "user_id": user_id,
            "email": email,
            "role": role,
            "user_metadata": user.user_metadata,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.debug(f"Auth validation failed: {type(e).__name__}")
        raise credentials_exception


async def get_current_admin_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Dependency to verify that the current user has admin role.
    Checks the users table in the database for the role.
    """
    from uuid import UUID
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.models import User, UserRole

    current_user = await get_current_user(credentials)
    user_id = UUID(current_user["user_id"])

    logger.debug(f"Admin check for user_id={user_id}")

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            logger.debug(f"Admin check denied: user not found for id={user_id}")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions. Admin role required.")

        user_role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
        if user_role.lower() != 'admin':
            logger.debug(f"Admin check denied: role={user.role}")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions. Admin role required.")

    logger.debug("Admin check granted")
    return current_user
