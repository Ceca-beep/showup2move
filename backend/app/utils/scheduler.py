from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.core.database import get_db
from app.services.matching_service import run_matching
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()

def _send_showup_today_prompts():
    db = get_db()
    db.table("users").update({"available_today": False}).execute()
    logger.info("ShowUpToday? prompts sent")

def _run_daily_matching():
    groups = run_matching(max_radius_km=10.0)
    logger.info(f"Daily matching complete - {len(groups)} groups formed")

def start_scheduler():
    scheduler.add_job(_send_showup_today_prompts, CronTrigger(hour=8, minute=0), id="showup_prompt", replace_existing=True)
    scheduler.add_job(_run_daily_matching, CronTrigger(hour=9, minute=0), id="daily_matching", replace_existing=True)
    scheduler.start()
    logger.info("Scheduler started")

def stop_scheduler():
    scheduler.shutdown()