from app.core.database import get_db
from app.schemas.activity import EventCreate, PollCreate
from fastapi import HTTPException
from datetime import datetime, timezone
import httpx
from app.core.config import settings

def create_event(creator_id: str, data: EventCreate) -> dict:
    db = get_db()
    member = db.table("group_members").select("user_id").eq("group_id", data.group_id).eq("user_id", creator_id).execute()
    if not member.data:
        raise HTTPException(status_code=403, detail="Not a group member")
    row = {"group_id": data.group_id, "creator_id": creator_id, "title": data.title, "location_name": data.location_name, "lat": data.lat, "lng": data.lng, "starts_at": data.starts_at.isoformat(), "status": "planned"}
    return db.table("events").insert(row).execute().data[0]

def get_group_events(group_id: str) -> list:
    db = get_db()
    return db.table("events").select("*").eq("group_id", group_id).order("starts_at").execute().data

def create_poll(creator_id: str, data: PollCreate) -> dict:
    db = get_db()
    row = {"event_id": data.event_id, "question": data.question, "options": data.options, "closes_at": data.closes_at.isoformat() if data.closes_at else None}
    return db.table("polls").insert(row).execute().data[0]

def vote_poll(user_id: str, poll_id: str, choice: str) -> dict:
    db = get_db()
    existing = db.table("poll_votes").select("poll_id").eq("poll_id", poll_id).eq("user_id", user_id).execute()
    if existing.data:
        result = db.table("poll_votes").update({"choice": choice}).eq("poll_id", poll_id).eq("user_id", user_id).execute()
    else:
        result = db.table("poll_votes").insert({"poll_id": poll_id, "user_id": user_id, "choice": choice}).execute()
    return result.data[0]

def get_poll_results(poll_id: str) -> dict:
    db = get_db()
    poll = db.table("polls").select("*").eq("id", poll_id).execute().data
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    votes = db.table("poll_votes").select("choice").eq("poll_id", poll_id).execute()
    tally: dict[str, int] = {}
    for v in votes.data:
        tally[v["choice"]] = tally.get(v["choice"], 0) + 1
    return {"poll": poll[0], "results": tally, "total_votes": len(votes.data)}

async def get_nearby_venues(lat: float, lng: float, sport: str) -> list:
    if not settings.GOOGLE_MAPS_API_KEY:
        return []
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {"location": f"{lat},{lng}", "radius": 5000, "keyword": sport, "type": "sports_complex", "key": settings.GOOGLE_MAPS_API_KEY}
    async with httpx.AsyncClient() as http:
        resp = await http.get(url, params=params)
    return [{"name": p["name"], "address": p.get("vicinity"), "rating": p.get("rating"), "lat": p["geometry"]["location"]["lat"], "lng": p["geometry"]["location"]["lng"]} for p in resp.json().get("results", [])[:6]]

async def get_weather(lat: float, lng: float) -> dict:
    if not settings.OPENWEATHER_API_KEY:
        return {}
    async with httpx.AsyncClient() as http:
        resp = await http.get("https://api.openweathermap.org/data/2.5/weather", params={"lat": lat, "lon": lng, "appid": settings.OPENWEATHER_API_KEY, "units": "metric"})
    data = resp.json()
    return {"temp_c": data.get("main", {}).get("temp"), "description": data.get("weather", [{}])[0].get("description")}
