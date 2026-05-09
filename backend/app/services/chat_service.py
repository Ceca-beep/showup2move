from app.core.database import get_db
from datetime import datetime, timezone

def save_message(group_id: str, sender_id: str, content: str) -> dict:
    db = get_db()
    member = db.table("group_members").select("user_id").eq("group_id", group_id).eq("user_id", sender_id).execute()
    if not member.data:
        raise PermissionError("Not a group member")
    row = {"group_id": group_id, "sender_id": sender_id, "content": content, "sent_at": datetime.now(timezone.utc).isoformat()}
    result = db.table("messages").insert(row).execute()
    return result.data[0]

def get_group_messages(group_id: str, limit: int = 50) -> list:
    db = get_db()
    query = db.table("messages").select("*, users(display_name, photo_url)").eq("group_id", group_id).order("sent_at", desc=True).limit(limit)
    return list(reversed(query.execute().data))

def get_group_members(group_id: str) -> list:
    db = get_db()
    result = db.table("group_members").select("*, users(id, display_name, photo_url, skill_level)").eq("group_id", group_id).execute()
    return result.data
