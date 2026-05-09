from fastapi import APIRouter, Depends, UploadFile, File
from app.core.security import get_current_user
from app.schemas.user import UserProfileUpdate, SportPreference
from app.services import user_service, auth_service, ai_service

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return auth_service.get_user_by_id(current_user["id"])

@router.patch("/me")
def update_me(data: UserProfileUpdate, current_user=Depends(get_current_user)):
    return user_service.update_profile(current_user["id"], data)

@router.post("/me/photo")
def upload_photo(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    return user_service.upload_photo(current_user["id"], file)

@router.put("/me/sports")
def set_sports(sports: list[SportPreference], current_user=Depends(get_current_user)):
    return user_service.set_sport_preferences(current_user["id"], sports)

@router.get("/me/sports")
def get_sports(current_user=Depends(get_current_user)):
    return user_service.get_sport_preferences(current_user["id"])

@router.get("/sports")
def list_sports():
    return user_service.get_all_sports()

@router.post("/me/analyze-bio")
def analyze_bio(current_user=Depends(get_current_user)):
    user = auth_service.get_user_by_id(current_user["id"])
    bio = user.get("bio", "")
    if not bio:
        return {"sports": []}
    return {"sports": ai_service.extract_sports_from_bio(bio)}

@router.post("/me/analyze-photo")
async def analyze_photo(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    content = await file.read()
    return {"sports": ai_service.extract_sports_from_photo(content, file.content_type or "image/jpeg")}