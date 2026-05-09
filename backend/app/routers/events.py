from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user
from app.schemas.activity import EventCreate, PollCreate, PollVote
from app.services import event_service

router = APIRouter(prefix="/events", tags=["events"])

@router.post("/")
def create_event(data: EventCreate, current_user=Depends(get_current_user)):
    return event_service.create_event(current_user["id"], data)

@router.get("/group/{group_id}")
def group_events(group_id: str, current_user=Depends(get_current_user)):
    return event_service.get_group_events(group_id)

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
async def venues(lat: float = Query(...), lng: float = Query(...), sport: str = Query(...), current_user=Depends(get_current_user)):
    return await event_service.get_nearby_venues(lat, lng, sport)

@router.get("/weather")
async def weather(lat: float = Query(...), lng: float = Query(...), current_user=Depends(get_current_user)):
    return await event_service.get_weather(lat, lng)