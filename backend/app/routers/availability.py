from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.schemas.activity import AvailabilityResponse
from app.services import availability_service

router = APIRouter(prefix="/availability", tags=["availability"])

@router.post("/today")
def respond_today(data: AvailabilityResponse, current_user=Depends(get_current_user)):
    return availability_service.set_availability(current_user["id"], data.is_available, data.date)

@router.get("/history")
def my_history(current_user=Depends(get_current_user)):
    return availability_service.get_user_availability_history(current_user["id"])