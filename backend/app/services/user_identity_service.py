from __future__ import annotations

from app.api.v1.dtos import UserResponse
from app.models.user import User


def build_workspace_code(user_id: str) -> str:
    compact = "".join(character for character in user_id.upper() if character.isalnum())
    token = (compact[:8] if compact else "USUARIO0").ljust(8, "0")
    return f"PAS-{token}"


def to_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        workspace_code=build_workspace_code(user.id),
    )
