from fastapi import APIRouter
from app.schemas.user import UserRegister, UserLogin
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register")
def register(data: UserRegister):
    return auth_service.register_user(data)

@router.post("/login")
def login(data: UserLogin):
    return auth_service.login_user(data)