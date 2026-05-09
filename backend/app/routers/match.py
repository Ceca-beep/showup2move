from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user
from app.services import matching_service, ai_service

router = APIRouter(prefix="/match", tags=["matching"])

@router.post("/run")
def trigger_matching(radius_km: float = Query(default=10.0), current_user=Depends(get_current_user)):
    groups = matching_service.run_matching(max_radius_km=radius_km)
    return {"groups_created": len(groups), "groups": groups}

@router.get("/my-groups")
def my_groups(current_user=Depends(get_current_user)):
    return matching_service.get_user_groups(current_user["id"])

@router.post("/groups/{group_id}/confirm")
def confirm_membership(group_id: str, current_user=Depends(get_current_user)):
    return matching_service.confirm_group_membership(current_user["id"], group_id)

@router.get("/groups/{group_id}/score")
def get_ai_score(group_id: str, current_user=Depends(get_current_user)):
    return ai_service.compute_compatibility_score(current_user["id"], group_id)

@router.get("/recommendations")
def get_recommendations(current_user=Depends(get_current_user)):
    from app.core.database import get_db
    db = get_db()
    candidates = db.table("users").select("id, display_name, skill_level, bio").neq("id", current_user["id"]).eq("available_today", True).limit(20).execute().data
    if not candidates:
        return []
    return ai_service.generate_teammate_recommendations(current_user["id"], candidates)