from app.core.database import get_db
from app.schemas.user import UserProfileUpdate, SportPreference
from fastapi import HTTPException, UploadFile
import uuid

def update_profile(user_id: str, data: UserProfileUpdate) -> dict:
    db = get_db()
    updates = data.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = db.table("users").update(updates).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]

def set_sport_preferences(user_id: str, sports: list[SportPreference]) -> list:
    db = get_db()
    db.table("user_sports").delete().eq("user_id", user_id).execute()
    rows = [{"user_id": user_id, "sport_id": s.sport_id, "skill_level": s.skill_level} for s in sports]
    result = db.table("user_sports").insert(rows).execute()
    return result.data

def get_sport_preferences(user_id: str) -> list:
    db = get_db()
    result = db.table("user_sports").select("*, sports(name)").eq("user_id", user_id).execute()
    return result.data

def upload_photo(user_id: str, file: UploadFile) -> dict:
    db = get_db()
    content = file.file.read()
    filename = f"avatars/{user_id}/{uuid.uuid4()}.jpg"
    db.storage.from_("avatars").upload(filename, content, {"content-type": file.content_type or "image/jpeg"})
    public_url = db.storage.from_("avatars").get_public_url(filename)
    db.table("users").update({"photo_url": public_url}).eq("id", user_id).execute()
    return {"photo_url": public_url}

def get_all_sports() -> list:
    db = get_db()
    result = db.table("sports").select("*").order("name").execute()
    return result.data
