from app.core.database import get_db
from datetime import datetime, date, timezone

def set_availability(user_id: str, is_available: bool, for_date: str | None = None) -> dict:
    db = get_db()
    target_date = for_date or date.today().isoformat()
    existing = db.table("availability").select("id").eq("user_id", user_id).eq("date", target_date).execute()
    row = {"user_id": user_id, "is_available": is_available, "date": target_date, "responded_at": datetime.now(timezone.utc).isoformat()}
    if existing.data:
        result = db.table("availability").update(row).eq("id", existing.data[0]["id"]).execute()
    else:
        result = db.table("availability").insert(row).execute()
    db.table("users").update({"available_today": is_available}).eq("id", user_id).execute()
    return result.data[0]

def get_available_users(for_date: str | None = None) -> list:
    db = get_db()
    target_date = for_date or date.today().isoformat()
    result = db.table("availability").select("*, users(id, display_name, lat, lng, skill_level)").eq("date", target_date).eq("is_available", True).execute()
    return result.data

def get_user_availability_history(user_id: str, limit: int = 30) -> list:
    db = get_db()
    result = db.table("availability").select("*").eq("user_id", user_id).order("date", desc=True).limit(limit).execute()
    return result.data
