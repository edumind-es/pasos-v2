from __future__ import annotations

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from sqlalchemy import delete as sql_delete
from app.api.v1.dtos import TeamMemberRoleUpdateRequest, TeamMembershipCreateRequest, TeamMembershipResponse
from app.core.errors import ApiError
from app.models.organization_membership import OrganizationMembership
from app.models.team import Team
from app.models.team_membership import TeamMembership
from app.models.user import User
from app.services.user_identity_service import build_workspace_code, to_user_response


def _get_team(db: Session, team_id: str) -> Team:
    team = db.scalar(select(Team).where(Team.id == team_id, Team.is_archived.is_(False)))
    if not team:
        raise ApiError(404, "team_not_found", "Team not found")
    return team


def _get_org_membership(db: Session, organization_id: str, user_id: str) -> OrganizationMembership | None:
    return db.scalar(
        select(OrganizationMembership).where(
            OrganizationMembership.organization_id == organization_id,
            OrganizationMembership.user_id == user_id,
            OrganizationMembership.status == "active",
        )
    )


def _get_team_membership(db: Session, team_id: str, user_id: str) -> TeamMembership | None:
    return db.scalar(
        select(TeamMembership).where(
            TeamMembership.team_id == team_id,
            TeamMembership.user_id == user_id,
            TeamMembership.status == "active",
        )
    )


def _require_team_manager(db: Session, team: Team, user: User) -> None:
    team_membership = _get_team_membership(db, team.id, user.id)
    if team_membership and team_membership.role == "owner":
        return

    org_membership = _get_org_membership(db, team.organization_id, user.id)
    if org_membership and org_membership.role in {"organization_admin", "leadership"}:
        return

    raise ApiError(403, "team_forbidden", "Insufficient permissions to manage team members")


def _membership_response(membership: TeamMembership, user: User) -> TeamMembershipResponse:
    return TeamMembershipResponse(
        id=membership.id,
        team_id=membership.team_id,
        user=to_user_response(user),
        role=membership.role,  # type: ignore[arg-type]
        status="active",
        created_at=membership.created_at,
        updated_at=membership.updated_at,
    )


def list_team_members(db: Session, team_id: str, current_user: User) -> list[TeamMembershipResponse]:
    team = _get_team(db, team_id)
    _require_team_manager(db, team, current_user)
    rows = db.execute(
        select(TeamMembership, User)
        .join(User, TeamMembership.user_id == User.id)
        .where(TeamMembership.team_id == team_id, TeamMembership.status == "active")
        .order_by(TeamMembership.created_at.asc())
    ).all()
    return [_membership_response(membership, user) for membership, user in rows]


def add_team_member(
    db: Session,
    team_id: str,
    current_user: User,
    payload: TeamMembershipCreateRequest,
) -> TeamMembershipResponse:
    team = _get_team(db, team_id)
    _require_team_manager(db, team, current_user)

    provided_targets = sum(
        1 for value in (payload.user_id, payload.user_email, payload.user_code) if value
    )
    if provided_targets != 1:
        raise ApiError(400, "invalid_member_target", "Provide either user_id, user_email or user_code")

    target_user: User | None
    if payload.user_id:
        target_user = db.scalar(select(User).where(User.id == payload.user_id))
    elif payload.user_email:
        target_user = db.scalar(select(User).where(User.email == payload.user_email.lower()))
    else:
        normalized_code = payload.user_code.strip().upper()  # type: ignore[union-attr]
        active_users = db.scalars(select(User).where(User.is_active.is_(True))).all()
        target_user = next(
            (user for user in active_users if build_workspace_code(user.id) == normalized_code),
            None,
        )
    if not target_user or not target_user.is_active:
        raise ApiError(404, "user_not_found", "User not found or inactive")

    org_membership = _get_org_membership(db, team.organization_id, target_user.id)
    if not org_membership:
        org_membership = OrganizationMembership(
            id=str(uuid4()),
            organization_id=team.organization_id,
            user_id=target_user.id,
            role="member",
            status="active",
        )
        db.add(org_membership)

    membership = _get_team_membership(db, team.id, target_user.id)
    if membership:
        membership.role = payload.role
        membership.status = "active"
    else:
        membership = TeamMembership(
            id=str(uuid4()),
            team_id=team.id,
            user_id=target_user.id,
            role=payload.role,
            status="active",
        )
        db.add(membership)

    db.commit()
    db.refresh(membership)
    return _membership_response(membership, target_user)


def update_team_member_role(
    db: Session,
    team_id: str,
    target_user_id: str,
    current_user: User,
    payload: TeamMemberRoleUpdateRequest,
) -> TeamMembershipResponse:
    team = _get_team(db, team_id)
    _require_team_manager(db, team, current_user)

    if target_user_id == current_user.id:
        raise ApiError(400, "cannot_edit_own_role", "No puedes cambiar tu propio rol")

    membership = _get_team_membership(db, team_id, target_user_id)
    if not membership:
        raise ApiError(404, "member_not_found", "Member not found in this team")

    target_user = db.scalar(select(User).where(User.id == target_user_id))
    if not target_user:
        raise ApiError(404, "user_not_found", "User not found")

    membership.role = payload.role
    db.commit()
    db.refresh(membership)
    return _membership_response(membership, target_user)


def remove_team_member(
    db: Session,
    team_id: str,
    target_user_id: str,
    current_user: User,
) -> None:
    team = _get_team(db, team_id)
    _require_team_manager(db, team, current_user)

    if target_user_id == current_user.id:
        raise ApiError(400, "cannot_remove_self", "No puedes expulsarte a ti mismo")

    membership = _get_team_membership(db, team_id, target_user_id)
    if not membership:
        raise ApiError(404, "member_not_found", "Member not found in this team")

    membership.status = "inactive"
    db.commit()
