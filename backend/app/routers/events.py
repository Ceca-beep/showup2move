from fastapi import APIRouter, Depends, Query, HTTPException
from app.core.security import get_current_user
from app.core.database import get_db
from app.schemas.activity import EventCreate, PollCreate, PollVote
from app.services import event_service
from typing import Any

router = APIRouter(prefix="/events", tags=["events"])


@router.post("/")
def create_event(data: EventCreate, current_user=Depends(get_current_user)):
    return event_service.create_event(current_user["id"], data)


@router.get("/")
def get_all_events(current_user=Depends(get_current_user)):
    db = get_db()
    result = (
        db.table("events")
        .select("*, users(display_name)")
        .order("starts_at")
        .execute()
    )
    return result.data


@router.get("/group/{group_id}")
def group_events(group_id: str, current_user=Depends(get_current_user)):
    return event_service.get_group_events(group_id)


@router.patch("/{event_id}")
def update_event(event_id: str, data: dict[str, Any], current_user=Depends(get_current_user)):
    db = get_db()
    event = db.table("events").select("creator_id").eq("id", event_id).execute()
    if not event.data:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.data[0]["creator_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not the event creator")
    result = db.table("events").update(data).eq("id", event_id).execute()
    return result.data[0]


@router.delete("/{event_id}")
def delete_event(event_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    event = db.table("events").select("creator_id").eq("id", event_id).execute()
    if not event.data:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.data[0]["creator_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not the event creator")
    db.table("events").delete().eq("id", event_id).execute()
    return {"message": "Event deleted"}


@router.post("/polls")
def create_poll(data: PollCreate, current_user=Depends(get_current_user)):
    return event_service.create_poll(current_user["id"], data)


@router.post("/polls/{poll_id}/vote")
def vote(poll_id: str, data: PollVote, current_user=Depends(get_current_user)):
    return event_service.vote_poll(current_user["id"], poll_id, data.choice)


@router.get("/polls/{poll_id}/results")
def poll_results(poll_id: str, current_user=Depends(get_current_user)):
    return event_service.get_poll_results(poll_id)


@router.get("/venues")
async def venues(
    lat: float = Query(...),
    lng: float = Query(...),
    sport: str = Query(...),
    current_user=Depends(get_current_user),
):
    return await event_service.get_nearby_venues(lat, lng, sport)


@router.get("/weather")
async def weather(
    lat: float = Query(...),
    lng: float = Query(...),
    current_user=Depends(get_current_user),
):
    return await event_service.get_weather(lat, lng)