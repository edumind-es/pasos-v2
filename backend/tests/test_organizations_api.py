from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.db import get_db_session
from app.core.security import create_access_token
from app.main import app
from app.models.organization import Organization
from app.models.organization_membership import OrganizationMembership
from app.models.user import User


def create_user(db_session: Session, *, user_id: str, email: str, display_name: str) -> User:
    user = User(
        id=user_id,
        email=email,
        display_name=display_name,
        password_hash="hashed-password",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_db():
        yield db_session

    app.dependency_overrides[get_db_session] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def auth_header(user_id: str) -> dict[str, str]:
    token, _ = create_access_token(user_id)
    return {"Authorization": f"Bearer {token}"}


def test_create_and_list_organizations(client: TestClient, db_session: Session) -> None:
    user = create_user(
        db_session,
        user_id="user-org-admin",
        email="org-admin@example.test",
        display_name="Org Admin",
    )

    created = client.post(
        "/api/v1/organizations",
        headers=auth_header(user.id),
        json={"name": "Colegio Demo", "plan_type": "school"},
    )
    assert created.status_code == 201, created.text
    payload = created.json()
    assert payload["name"] == "Colegio Demo"
    assert payload["role"] == "organization_admin"
    assert payload["slug"] == "colegio-demo"

    listed = client.get("/api/v1/organizations", headers=auth_header(user.id))
    assert listed.status_code == 200, listed.text
    organizations = listed.json()
    assert len(organizations) == 1
    assert organizations[0]["slug"] == "colegio-demo"


def test_org_admin_can_create_and_list_teams(client: TestClient, db_session: Session) -> None:
    user = create_user(
        db_session,
        user_id="user-team-owner",
        email="team-owner@example.test",
        display_name="Team Owner",
    )
    organization = client.post(
        "/api/v1/organizations",
        headers=auth_header(user.id),
        json={"name": "Centro Horizonte", "plan_type": "school"},
    ).json()

    created = client.post(
        f"/api/v1/organizations/{organization['id']}/teams",
        headers=auth_header(user.id),
        json={"name": "Equipo Directivo", "team_type": "leadership", "visibility": "organization"},
    )
    assert created.status_code == 201, created.text
    payload = created.json()
    assert payload["organization_id"] == organization["id"]
    assert payload["name"] == "Equipo Directivo"
    assert payload["role"] == "owner"

    listed = client.get(
        f"/api/v1/organizations/{organization['id']}/teams",
        headers=auth_header(user.id),
    )
    assert listed.status_code == 200, listed.text
    teams = listed.json()
    assert len(teams) == 1
    assert teams[0]["slug"] == "equipo-directivo"


def test_member_cannot_create_team(client: TestClient, db_session: Session) -> None:
    user = create_user(
        db_session,
        user_id="user-member",
        email="member@example.test",
        display_name="Member User",
    )
    organization = Organization(
        id="org-member-test",
        name="Centro Semilla",
        slug="centro-semilla",
        plan_type="school",
        is_active=True,
        metadata_json={},
    )
    membership = OrganizationMembership(
        id="org-member-link",
        organization_id=organization.id,
        user_id=user.id,
        role="member",
        status="active",
    )
    db_session.add_all([organization, membership])
    db_session.commit()

    response = client.post(
        f"/api/v1/organizations/{organization.id}/teams",
        headers=auth_header(user.id),
        json={"name": "Comision TIC", "team_type": "project"},
    )
    assert response.status_code == 403, response.text
    payload = response.json()
    assert payload["error"]["code"] == "team_forbidden"
