from fastapi import APIRouter, HTTPException, status
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserProfileResponse

router = APIRouter()


@router.post("/register", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserRegister):
    """
    User registration endpoint.
    Validates account_type and returns registered user profile.
    """
    if user_in.account_type not in {"buyer", "seller", "buyer_seller", "both"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid account type. Must be 'buyer_seller', 'buyer', or 'seller'.",
        )
    return {
        "id": "usr_demo_placeholder",
        "email": user_in.email,
        "full_name": user_in.full_name,
        "account_type": user_in.account_type,
        "created_at": "2026-11-12T00:00:00Z",
    }


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """
    Placeholder endpoint for future user login.
    Returns JWT access token when implemented.
    """
    return {
        "access_token": "placeholder-jwt-token",
        "token_type": "bearer",
        "user": {
            "email": credentials.email,
            "full_name": "Demo User",
            "account_type": "buyer",
        },
    }


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile():
    """Placeholder endpoint for retrieving authenticated user profile."""
    return {
        "id": "usr_demo_placeholder",
        "email": "demo@trustcart.ai",
        "full_name": "Demo User",
        "account_type": "buyer",
        "created_at": "2026-11-12T00:00:00Z",
    }

