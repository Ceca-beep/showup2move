from app.core.database import get_db
from app.services.availability_service import get_available_users
from geopy.distance import geodesic
from datetime import date, datetime, timezone
import random

def _distance_km(lat1, lng1, lat2, lng2) -> float:
    if None in (lat1, lng1, lat2, lng2):
        return 9999.0
    return geodesic((lat1, lng1), (lat2, lng2)).km

def _cluster_by_proximity(users: list, max_km: float) -> list[list]:
    visited = set()
    clusters = []
    for i, user in enumerate(users):
        if i in visited:
            continue
        cluster = [user]
        visited.add(i)
        for j, other in enumerate(users):
            if j in visited:
                continue
            dist = _distance_km(user["lat"], user["lng"], other["lat"], other["lng"])
            if dist <= max_km:
                cluster.append(other)
                visited.add(j)
        clusters.append(cluster)
    return clusters

def run_matching(max_radius_km: float = 10.0, for_date: str | None = None) -> list[dict]:
    db = get_db()
    target_date = for_date or date.today().isoformat()
    available = get_available_users(target_date)
    if len(available) < 2:
        return []
    sport_buckets: dict[str, dict] = {}
    for entry in available:
        user = entry.get("users", {})
        user_id = user.get("id") or entry.get("user_id")
        prefs = db.table("user_sports").select("sport_id, sports(name, min_players, max_players)").eq("user_id", user_id).execute()
        for pref in prefs.data:
            sport_id = pref["sport_id"]
            if sport_id not in sport_buckets:
                sport_buckets[sport_id] = {"min": (pref.get("sports") or {}).get("min_players", 2), "max": (pref.get("sports") or {}).get("max_players", 10), "users": []}
            sport_buckets[sport_id]["users"].append({"user_id": user_id, "lat": user.get("lat"), "lng": user.get("lng"), "skill_level": user.get("skill_level")})
    created_groups = []
    for sport_id, bucket in sport_buckets.items():
        users = bucket["users"]
        min_size = bucket["min"]
        max_size = bucket["max"]
        if len(users) < min_size:
            continue
        for cluster in _cluster_by_proximity(users, max_radius_km):
            if len(cluster) < min_size:
                continue
            group_members = cluster[:max_size]
            captain = random.choice(group_members)
            g = db.table("groups").insert({"sport_id": sport_id, "captain_id": captain["user_id"], "status": "forming", "max_size": max_size, "created_at": datetime.now(timezone.utc).isoformat()}).execute()
            group_id = g.data[0]["id"]
            db.table("group_members").insert([{"group_id": group_id, "user_id": m["user_id"], "status": "pending", "joined_at": datetime.now(timezone.utc).isoformat()} for m in group_members]).execute()
            created_groups.append({"group_id": group_id, "sport_id": sport_id, "size": len(group_members)})
    return created_groups

def get_user_groups(user_id: str) -> list:
    db = get_db()
    result = db.table("group_members").select("groups(*, sports(name)), status, joined_at").eq("user_id", user_id).execute()
    return result.data

def confirm_group_membership(user_id: str, group_id: str) -> dict:
    db = get_db()
    result = db.table("group_members").update({"status": "confirmed"}).eq("user_id", user_id).eq("group_id", group_id).execute()
    if not result.data:
        raise Exception("Membership not found")
    return result.data[0]
