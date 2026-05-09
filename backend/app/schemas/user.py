from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    display_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    skill_level: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class SportPreference(BaseModel):
    sport_id: str
    skill_level: Optional[str] = "beginner"

class UserOut(BaseModel):
    id: str
    email: str
    display_name: str
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    skill_level: Optional[str] = None
    available_today: bool = False
    created_at: datetime

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
