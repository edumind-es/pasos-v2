from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.v1.dtos import (
    OrgMemberRoleUpdateRequest,
    OrgMembershipResponse,
    OrganizationCreateRequest,
    OrganizationResponse,
    TeamCreateRequest,
    TeamResponse,
)
from app.core.deps import DbSession, get_current_user
from app.models.user import User
from app.services.organization_service import (
    create_organization,
    create_team,
    list_org_members,
    list_organization_teams,
    list_user_organizations,
    remove_org_member,
    update_org_member_role,
)

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("", response_model=list[OrganizationResponse])
def list_organizations_endpoint(
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[OrganizationResponse]:
    return list_user_organizations(db, current_user)


@router.post("", response_model=OrganizationResponse, status_code=201)
def create_organization_endpoint(
    payload: OrganizationCreateRequest,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> OrganizationResponse:
    return create_organization(db, current_user, payload)


@router.get("/{organization_id}/teams", response_model=list[TeamResponse])
def list_organization_teams_endpoint(
    organization_id: str,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[TeamResponse]:
    return list_organization_teams(db, organization_id, current_user)


@router.post("/{organization_id}/teams", response_model=TeamResponse, status_code=201)
def create_team_endpoint(
    organization_id: str,
    payload: TeamCreateRequest,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> TeamResponse:
    return create_team(db, organization_id, current_user, payload)


@router.get("/{organization_id}/members", response_model=list[OrgMembershipResponse])
def list_org_members_endpoint(
    organization_id: str,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[OrgMembershipResponse]:
    return list_org_members(db, organization_id, current_user)


@router.put("/{organization_id}/members/{user_id}", response_model=OrgMembershipResponse)
def update_org_member_role_endpoint(
    organization_id: str,
    user_id: str,
    payload: OrgMemberRoleUpdateRequest,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> OrgMembershipResponse:
    return update_org_member_role(db, organization_id, user_id, current_user, payload)


@router.delete("/{organization_id}/members/{user_id}", status_code=204)
def remove_org_member_endpoint(
    organization_id: str,
    user_id: str,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    remove_org_member(db, organization_id, user_id, current_user)
