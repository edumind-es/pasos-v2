from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.v1.dtos import LearningAssignmentResponse
from app.core.deps import DbSession, get_current_user
from app.models.user import User
from app.services.assignment_service import list_today_assignments

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.get("/today", response_model=list[LearningAssignmentResponse])
def list_today_assignments_endpoint(
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[LearningAssignmentResponse]:
    return list_today_assignments(db, current_user)
