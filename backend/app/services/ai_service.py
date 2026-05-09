import anthropic
import json
import base64
from app.core.config import settings
from app.core.database import get_db

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

def compute_compatibility_score(user_id: str, group_id: str) -> dict:
    db = get_db()
    user = db.table("users").select("*").eq("id", user_id).execute().data[0]
    group = db.table("groups").select("*, sports(name), group_members(users(display_name, skill_level, bio))").eq("id", group_id).execute().data[0]
    prompt = f"""You are a sports matching assistant. Score how well this user fits this group.
User: Name: {user.get('display_name')}, Bio: {user.get('bio', 'No bio')}, Skill: {user.get('skill_level', 'unknown')}
Group sport: {group.get('sports', {}).get('name', 'unknown')}
Respond ONLY with JSON: {{\"score\": <0-100>, \"reason\": \"<one sentence>\"}}"""
    response = client.messages.create(model="claude-sonnet-4-20250514", max_tokens=200, messages=[{"role": "user", "content": prompt}])
    parsed = json.loads(response.content[0].text.strip())
    db.table("ai_scores").upsert({"user_id": user_id, "group_id": group_id, "score": parsed["score"], "reason": parsed["reason"]}).execute()
    return parsed

def extract_sports_from_bio(bio: str) -> list[str]:
    response = client.messages.create(model="claude-sonnet-4-20250514", max_tokens=100, messages=[{"role": "user", "content": f"Extract sports from this bio: \"{bio}\". Respond ONLY with a JSON array like [\"football\", \"tennis\"]. If none, return []."}])
    return json.loads(response.content[0].text.strip())

def extract_sports_from_photo(image_bytes: bytes, content_type: str = "image/jpeg") -> list[str]:
    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
    response = client.messages.create(model="claude-sonnet-4-20250514", max_tokens=150, messages=[{"role": "user", "content": [{"type": "image", "source": {"type": "base64", "media_type": content_type, "data": b64}}, {"type": "text", "text": "What sports does this image suggest? Respond ONLY with a JSON array like [\"football\"]. If none, return []."}]}])
    return json.loads(response.content[0].text.strip())

def generate_teammate_recommendations(user_id: str, candidates: list[dict]) -> list[dict]:
    response = client.messages.create(model="claude-sonnet-4-20250514", max_tokens=500, messages=[{"role": "user", "content": f"Rank these candidates as teammates for user {user_id}: {json.dumps(candidates)}. Respond ONLY with a JSON array sorted best-first: [{{\"user_id\": \"...\", \"score\": 0-100, \"reason\": \"one sentence\"}}]"}])
    return json.loads(response.content[0].text.strip())
