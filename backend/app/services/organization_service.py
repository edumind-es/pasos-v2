from __future__ import annotations

import re
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.dtos import (
    OrgMemberRoleUpdateRequest,
    OrgMembershipResponse,
    OrganizationCreateRequest,
    OrganizationResponse,
    TeamCreateRequest,
    TeamResponse,
)
from app.core.errors import ApiError
from app.models.organization import Organization
from app.models.organization_membership import OrganizationMembership
from app.models.team import Team
from app.services.user_identity_service import to_user_response
from app.models.team_membership import TeamMembership
from app.models.user import User

SLUG_RE = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    base = SLUG_RE.sub("-", value.lower()).strip("-")
    return base[:120] or uuid4().hex[:12]


def _organization_response(organization: Organization, role: str) -> OrganizationResponse:
    return OrganizationResponse(
        id=organization.id,
        name=organization.name,
        slug=organization.slug,
        plan_type=organization.plan_type,
        is_active=organization.is_active,
        role=role,  # type: ignore[arg-type]
        created_at=organization.created_at,
        updated_at=organization.updated_at,
    )


def _team_response(team: Team, role: str | None) -> TeamResponse:
    return TeamResponse(
        id=team.id,
        organization_id=team.organization_id,
        name=team.name,
        slug=team.slug,
        team_type=team.team_type,
        visibility=team.visibility,
        is_archived=team.is_archived,
        role=role,  # type: ignore[arg-type]
        created_at=team.created_at,
        updated_at=team.updated_at,
    )


def _require_org_membership(db: Session, organization_id: str, user: User) -> OrganizationMembership:
    membership = db.scalar(
        select(OrganizationMembership).where(
            OrganizationMembership.organization_id == organization_id,
            OrganizationMembership.user_id == user.id,
            OrganizationMembership.status == "active",
        )
    )
    if not membership:
        raise ApiError(404, "organization_not_found", "Organization not found")
    return membership


def list_user_organizations(db: Session, user: User) -> list[OrganizationResponse]:
    memberships = db.execute(
        select(OrganizationMembership, Organization)
        .join(Organization, OrganizationMembership.organization_id == Organization.id)
        .where(
            OrganizationMembership.user_id == user.id,
            OrganizationMembership.status == "active",
            Organization.is_active.is_(True),
        )
        .order_by(Organization.updated_at.desc())
    ).all()
    return [_organization_response(organization, membership.role) for membership, organization in memberships]


def create_organization(db: Session, user: User, payload: OrganizationCreateRequest) -> OrganizationResponse:
    slug = payload.slug or slugify(payload.name)
    existing = db.scalar(select(Organization).where(Organization.slug == slug))
    if existing:
        raise ApiError(409, "organization_slug_exists", "Organization slug already exists")

    organization = Organization(
        id=str(uuid4()),
        name=payload.name,
        slug=slug,
        plan_type=payload.plan_type,
        is_active=True,
        metadata_json={"created_from": "fase2-scaffold"},
    )
    membership = OrganizationMembership(
        id=str(uuid4()),
        organization_id=organization.id,
        user_id=user.id,
        role="organization_admin",
        status="active",
    )
    db.add(organization)
    db.add(membership)
    db.commit()
    db.refresh(organization)
    return _organization_response(organization, membership.role)


def _require_org_admin(db: Session, organization_id: str, user: User) -> OrganizationMembership:
    membership = _require_org_membership(db, organization_id, user)
    if membership.role not in {"organization_admin", "leadership"}:
        raise ApiError(403, "org_forbidden", "Insufficient permissions to manage organization members")
    return membership


def _org_member_response(membership: OrganizationMembership, user: User) -> OrgMembershipResponse:
    return OrgMembershipResponse(
        id=membership.id,
        organization_id=membership.organization_id,
        user=to_user_response(user),
        role=membership.role,  # type: ignore[arg-type]
        status="active",
        created_at=membership.created_at,
        updated_at=membership.updated_at,
    )


def list_org_members(db: Session, organization_id: str, user: User) -> list[OrgMembershipResponse]:
    _require_org_membership(db, organization_id, user)
    rows = db.execute(
        select(OrganizationMembership, User)
        .join(User, OrganizationMembership.user_id == User.id)
        .where(
            OrganizationMembership.organization_id == organization_id,
            OrganizationMembership.status == "active",
        )
        .order_by(OrganizationMembership.created_at.asc())
    ).all()
    return [_org_member_response(membership, u) for membership, u in rows]


def update_org_member_role(
    db: Session,
    organization_id: str,
    target_user_id: str,
    current_user: User,
    payload: OrgMemberRoleUpdateRequest,
) -> OrgMembershipResponse:
    _require_org_admin(db, organization_id, current_user)

    if target_user_id == current_user.id:
        raise ApiError(400, "cannot_edit_own_role", "No puedes cambiar tu propio rol en la organización")

    membership = db.scalar(
        select(OrganizationMembership).where(
            OrganizationMembership.organization_id == organization_id,
            OrganizationMembership.user_id == target_user_id,
            OrganizationMembership.status == "active",
        )
    )
    if not membership:
        raise ApiError(404, "member_not_found", "Member not found in this organization")

    target_user = db.scalar(select(User).where(User.id == target_user_id))
    if not target_user:
        raise ApiError(404, "user_not_found", "User not found")

    membership.role = payload.role
    db.commit()
    db.refresh(membership)
    return _org_member_response(membership, target_user)


def remove_org_member(
    db: Session,
    organization_id: str,
    target_user_id: str,
    current_user: User,
) -> None:
    _require_org_admin(db, organization_id, current_user)

    if target_user_id == current_user.id:
        raise ApiError(400, "cannot_remove_self", "No puedes eliminarte a ti mismo de la organización")

    membership = db.scalar(
        select(OrganizationMembership).where(
            OrganizationMembership.organization_id == organization_id,
            OrganizationMembership.user_id == target_user_id,
            OrganizationMembership.status == "active",
        )
    )
    if not membership:
        raise ApiError(404, "member_not_found", "Member not found in this organization")

    membership.status = "inactive"
    db.commit()


def list_organization_teams(db: Session, organization_id: str, user: User) -> list[TeamResponse]:
    _require_org_membership(db, organization_id, user)
    rows = db.execute(
        select(Team, TeamMembership)
        .outerjoin(
            TeamMembership,
            (TeamMembership.team_id == Team.id)
            & (TeamMembership.user_id == user.id)
            & (TeamMembership.status == "active"),
        )
        .where(Team.organization_id == organization_id, Team.is_archived.is_(False))
        .order_by(Team.updated_at.desc())
    ).all()
    return [_team_response(team, membership.role if membership else None) for team, membership in rows]


def create_team(
    db: Session,
    organization_id: str,
    user: User,
    payload: TeamCreateRequest,
) -> TeamResponse:
    membership = _require_org_membership(db, organization_id, user)
    if membership.role not in {"organization_admin", "leadership"}:
        raise ApiError(403, "team_forbidden", "Insufficient permissions to create teams")

    slug = payload.slug or slugify(payload.name)
    existing = db.scalar(
        select(Team).where(Team.organization_id == organization_id, Team.slug == slug)
    )
    if existing:
        raise ApiError(409, "team_slug_exists", "Team slug already exists in this organization")

    team = Team(
        id=str(uuid4()),
        organization_id=organization_id,
        name=payload.name,
        slug=slug,
        team_type=payload.team_type,
        visibility=payload.visibility,
        is_archived=False,
        metadata_json={"created_from": "fase2-scaffold"},
    )
    team_membership = TeamMembership(
        id=str(uuid4()),
        team_id=team.id,
        user_id=user.id,
        role="owner",
        status="active",
    )
    db.add(team)
    db.add(team_membership)
    db.commit()
    db.refresh(team)
    return _team_response(team, team_membership.role)
