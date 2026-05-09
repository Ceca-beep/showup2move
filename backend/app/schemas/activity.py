from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AvailabilityResponse(BaseModel):
    is_available: bool
    date: Optional[str] = None

class GroupOut(BaseModel):
    id: str
    sport_id: str
    sport_name: Optional[str] = None
    captain_id: str
    status: str
    max_size: int
    member_count: Optional[int] = 0
    created_at: datetime

class EventCreate(BaseModel):
    group_id: str
    title: str
    location_name: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    starts_at: datetime

class EventOut(BaseModel):
    id: str
    group_id: str
    creator_id: str
    title: str
    location_name: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    starts_at: datetime
    status: str

class PollCreate(BaseModel):
    event_id: str
    question: str
    options: list[str]
    closes_at: Optional[datetime] = None

class PollVote(BaseModel):
    choice: str

class MessageOut(BaseModel):
    id: str
    group_id: str
    sender_id: str
    sender_name: Optional[str] = None
    content: str
    sent_at: datetime

class MessageCreate(BaseModel):
    content: str
