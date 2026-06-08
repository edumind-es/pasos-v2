from fastapi import APIRouter

from app.api.v1.endpoints.assignments import router as assignments_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.boards import router as boards_router
from app.api.v1.endpoints.calendar import router as calendar_router
from app.api.v1.endpoints.documents import router as documents_router
from app.api.v1.endpoints.executive import router as executive_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.maintenance import router as maintenance_router
from app.api.v1.endpoints.organizations import router as organizations_router
from app.api.v1.endpoints.shares import router as shares_router
from app.api.v1.endpoints.teams import router as teams_router
from app.api.v1.endpoints.timeline import router as timeline_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(boards_router)
api_router.include_router(assignments_router)
api_router.include_router(documents_router)
api_router.include_router(executive_router)
api_router.include_router(calendar_router)
api_router.include_router(organizations_router)
api_router.include_router(shares_router)
api_router.include_router(teams_router)
api_router.include_router(timeline_router)
api_router.include_router(maintenance_router)
