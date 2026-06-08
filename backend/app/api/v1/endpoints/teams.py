from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.v1.dtos import TeamMemberRoleUpdateRequest, TeamMembershipCreateRequest, TeamMembershipResponse
from app.core.deps import DbSession, get_current_user
from app.models.user import User
from app.services.team_service import (
    add_team_member,
    list_team_members,
    remove_team_member,
    update_team_member_role,
)

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("/{team_id}/members", response_model=list[TeamMembershipResponse])
def list_team_members_endpoint(
    team_id: str,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[TeamMembershipResponse]:
    return list_team_members(db, team_id, current_user)


@router.post("/{team_id}/members", response_model=TeamMembershipResponse, status_code=201)
def add_team_member_endpoint(
    team_id: str,
    payload: TeamMembershipCreateRequest,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> TeamMembershipResponse:
    return add_team_member(db, team_id, current_user, payload)


@router.put("/{team_id}/members/{user_id}", response_model=TeamMembershipResponse)
def update_team_member_role_endpoint(
    team_id: str,
    user_id: str,
    payload: TeamMemberRoleUpdateRequest,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> TeamMembershipResponse:
    return update_team_member_role(db, team_id, user_id, current_user, payload)


@router.delete("/{team_id}/members/{user_id}", status_code=204)
def remove_team_member_endpoint(
    team_id: str,
    user_id: str,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    remove_team_member(db, team_id, user_id, current_user)
