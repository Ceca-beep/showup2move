from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.schemas.user import UserRegister, UserLogin
from fastapi import HTTPException
from datetime import datetime, timezone

def register_user(data: UserRegister) -> dict:
    db = get_db()
    existing = db.table("users").select("id").eq("email", data.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = hash_password(data.password)
    user_row = {"email": data.email, "password_hash": hashed, "display_name": data.display_name, "available_today": False, "created_at": datetime.now(timezone.utc).isoformat()}
    result = db.table("users").insert(user_row).execute()
    user = result.data[0]
    token = create_access_token({"sub": user["id"], "email": user["email"]})
    return {"access_token": token, "token_type": "bearer", "user": user}

def login_user(data: UserLogin) -> dict:
    db = get_db()
    result = db.table("users").select("*").eq("email", data.email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = result.data[0]
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user["id"], "email": user["email"]})
    return {"access_token": token, "token_type": "bearer", "user": user}

def get_user_by_id(user_id: str) -> dict:
    db = get_db()
    result = db.table("users").select("*").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]
