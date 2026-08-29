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


def test_admin_can_archive_team_and_it_disappears_from_listing(
    client: TestClient, db_session: Session
) -> None:
    user = create_user(
        db_session,
        user_id="user-archive-team",
        email="archive-team@example.test",
        display_name="Archive Team Admin",
    )
    organization = client.post(
        "/api/v1/organizations",
        headers=auth_header(user.id),
        json={"name": "Centro Archivo", "plan_type": "school"},
    ).json()
    team = client.post(
        f"/api/v1/organizations/{organization['id']}/teams",
        headers=auth_header(user.id),
        json={"name": "Equipo Efimero", "team_type": "project"},
    ).json()

    deleted = client.delete(
        f"/api/v1/organizations/{organization['id']}/teams/{team['id']}",
        headers=auth_header(user.id),
    )
    assert deleted.status_code == 204, deleted.text

    listed = client.get(
        f"/api/v1/organizations/{organization['id']}/teams",
        headers=auth_header(user.id),
    ).json()
    assert listed == []


def test_member_cannot_archive_team(client: TestClient, db_session: Session) -> None:
    admin = create_user(
        db_session,
        user_id="user-team-admin2",
        email="team-admin2@example.test",
        display_name="Team Admin",
    )
    outsider = create_user(
        db_session,
        user_id="user-team-outsider",
        email="team-outsider@example.test",
        display_name="Team Outsider",
    )
    organization = client.post(
        "/api/v1/organizations",
        headers=auth_header(admin.id),
        json={"name": "Centro Blindado", "plan_type": "school"},
    ).json()
    team = client.post(
        f"/api/v1/organizations/{organization['id']}/teams",
        headers=auth_header(admin.id),
        json={"name": "Equipo Protegido", "team_type": "project"},
    ).json()

    response = client.delete(
        f"/api/v1/organizations/{organization['id']}/teams/{team['id']}",
        headers=auth_header(outsider.id),
    )
    assert response.status_code in (403, 404), response.text


def test_admin_can_archive_organization(client: TestClient, db_session: Session) -> None:
    user = create_user(
        db_session,
        user_id="user-archive-org",
        email="archive-org@example.test",
        display_name="Archive Org Admin",
    )
    organization = client.post(
        "/api/v1/organizations",
        headers=auth_header(user.id),
        json={"name": "Centro Temporal", "plan_type": "school"},
    ).json()
    client.post(
        f"/api/v1/organizations/{organization['id']}/teams",
        headers=auth_header(user.id),
        json={"name": "Equipo A", "team_type": "project"},
    )

    deleted = client.delete(
        f"/api/v1/organizations/{organization['id']}",
        headers=auth_header(user.id),
    )
    assert deleted.status_code == 204, deleted.text

    # La organización desaparece del listado del usuario
    listed = client.get("/api/v1/organizations", headers=auth_header(user.id)).json()
    assert all(item["id"] != organization["id"] for item in listed)


def test_non_admin_cannot_archive_organization(client: TestClient, db_session: Session) -> None:
    admin = create_user(
        db_session,
        user_id="user-org-admin-3",
        email="org-admin3@example.test",
        display_name="Org Admin",
    )
    leader = create_user(
        db_session,
        user_id="user-org-leader",
        email="org-leader@example.test",
        display_name="Org Leader",
    )
    organization = client.post(
        "/api/v1/organizations",
        headers=auth_header(admin.id),
        json={"name": "Centro Jerarquia", "plan_type": "school"},
    ).json()
    # 'leadership' puede gestionar miembros pero NO eliminar la organización
    db_session.add(
        OrganizationMembership(
            id="org-leader-link",
            organization_id=organization["id"],
            user_id=leader.id,
            role="leadership",
            status="active",
        )
    )
    db_session.commit()

    response = client.delete(
        f"/api/v1/organizations/{organization['id']}",
        headers=auth_header(leader.id),
    )
    assert response.status_code == 403, response.text
    assert response.json()["error"]["code"] == "org_forbidden"
