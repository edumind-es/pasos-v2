from __future__ import annotations

from uuid import uuid4

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.v1.dtos import (
    BoardDocumentCreateRequest,
    BoardDocumentResponse,
    BoardDocumentUpdateRequest,
    BoardDocumentVersionResponse,
)
from app.core.errors import ApiError
from app.models.board_document import BoardDocument
from app.models.board_document_version import BoardDocumentVersion
from app.models.user import User
from app.services.board_service import get_board_for_user

_URL_REQUIRED_KINDS = {"link", "file", "image", "audio", "video", "embed"}


def _document_response(document: BoardDocument) -> BoardDocumentResponse:
    return BoardDocumentResponse(
        id=document.id,
        board_id=document.board_id,
        author_id=document.author_id,
        author_label=document.author_label,
        title=document.title,
        kind=document.kind,  # type: ignore[arg-type]
        status=document.status,  # type: ignore[arg-type]
        description=document.description,
        url=document.url,
        content=document.content,
        linked_task_ids=document.linked_task_ids_json,
        tags=document.tags_json,
        current_version=document.current_version,
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


def _document_version_response(version: BoardDocumentVersion) -> BoardDocumentVersionResponse:
    return BoardDocumentVersionResponse(
        id=version.id,
        document_id=version.document_id,
        board_id=version.board_id,
        author_id=version.author_id,
        version_number=version.version_number,
        title=version.title,
        kind=version.kind,  # type: ignore[arg-type]
        status=version.status,  # type: ignore[arg-type]
        description=version.description,
        url=version.url,
        content=version.content,
        linked_task_ids=version.linked_task_ids_json,
        tags=version.tags_json,
        created_at=version.created_at,
        updated_at=version.updated_at,
    )


def _validate_board_task_links(board_snapshot: dict, linked_task_ids: list[str]) -> None:
    board_tasks = board_snapshot.get("tasks", []) if isinstance(board_snapshot, dict) else []
    valid_task_ids = {
        task.get("id")
        for task in board_tasks
        if isinstance(task, dict) and task.get("id")
    }
    invalid_ids = sorted(set(linked_task_ids) - valid_task_ids)
    if invalid_ids:
        raise ApiError(422, "document_invalid_tasks", f"Unknown board task ids: {', '.join(invalid_ids)}")


def _validate_document_payload(
    board_snapshot: dict,
    *,
    kind: str,
    url: str | None,
    content: str | None,
    linked_task_ids: list[str],
) -> None:
    if kind in _URL_REQUIRED_KINDS and not url:
        raise ApiError(422, "document_url_required", "This document type requires a URL")
    if kind == "note" and not content and not url:
        raise ApiError(422, "document_content_required", "Add content or a URL for this note")
    _validate_board_task_links(board_snapshot, linked_task_ids)


def _create_document_version(db: Session, document: BoardDocument) -> None:
    version = BoardDocumentVersion(
        id=str(uuid4()),
        document_id=document.id,
        board_id=document.board_id,
        author_id=document.author_id,
        version_number=document.current_version,
        title=document.title,
        kind=document.kind,
        status=document.status,
        description=document.description,
        url=document.url,
        content=document.content,
        linked_task_ids_json=document.linked_task_ids_json,
        tags_json=document.tags_json,
        metadata_json=document.metadata_json,
    )
    db.add(version)


def list_board_documents(db: Session, board_id: str, user: User) -> list[BoardDocumentResponse]:
    board, _role = get_board_for_user(db, board_id, user)
    documents = db.scalars(
        select(BoardDocument)
        .where(BoardDocument.board_id == board.id)
        .order_by(desc(BoardDocument.updated_at), desc(BoardDocument.created_at))
    ).all()
    return [_document_response(document) for document in documents]


def create_board_document(
    db: Session,
    board_id: str,
    user: User,
    payload: BoardDocumentCreateRequest,
) -> BoardDocumentResponse:
    board, role = get_board_for_user(db, board_id, user)
    if role not in {"owner", "editor"}:
        raise ApiError(403, "document_forbidden", "Insufficient permissions to create documents")

    board_snapshot = board.snapshot or {}
    _validate_document_payload(
        board_snapshot,
        kind=payload.kind,
        url=payload.url,
        content=payload.content,
        linked_task_ids=payload.linked_task_ids,
    )

    document = BoardDocument(
        id=str(uuid4()),
        board_id=board.id,
        author_id=user.id,
        author_label=user.display_name or user.email,
        title=payload.title,
        kind=payload.kind,
        status=payload.status,
        description=payload.description,
        url=payload.url,
        content=payload.content,
        linked_task_ids_json=payload.linked_task_ids,
        tags_json=payload.tags,
        metadata_json={},
        current_version=1,
    )
    db.add(document)
    db.flush()
    _create_document_version(db, document)
    db.commit()
    db.refresh(document)
    return _document_response(document)


def update_board_document(
    db: Session,
    board_id: str,
    document_id: str,
    user: User,
    payload: BoardDocumentUpdateRequest,
) -> BoardDocumentResponse:
    board, role = get_board_for_user(db, board_id, user)
    if role not in {"owner", "editor"}:
        raise ApiError(403, "document_forbidden", "Insufficient permissions to update documents")

    document = db.scalar(
        select(BoardDocument).where(
            BoardDocument.id == document_id,
            BoardDocument.board_id == board.id,
        )
    )
    if document is None:
        raise ApiError(404, "document_not_found", "Document not found")

    board_snapshot = board.snapshot or {}
    _validate_document_payload(
        board_snapshot,
        kind=payload.kind,
        url=payload.url,
        content=payload.content,
        linked_task_ids=payload.linked_task_ids,
    )

    document.title = payload.title
    document.kind = payload.kind
    document.status = payload.status
    document.description = payload.description
    document.url = payload.url
    document.content = payload.content
    document.linked_task_ids_json = payload.linked_task_ids
    document.tags_json = payload.tags
    document.author_id = user.id
    document.author_label = user.display_name or user.email
    document.current_version += 1

    _create_document_version(db, document)
    db.commit()
    db.refresh(document)
    return _document_response(document)


def delete_board_document(db: Session, board_id: str, document_id: str, user: User) -> None:
    board, role = get_board_for_user(db, board_id, user)
    if role not in {"owner", "editor"}:
        raise ApiError(403, "document_forbidden", "Insufficient permissions to delete documents")

    document = db.scalar(
        select(BoardDocument).where(
            BoardDocument.id == document_id,
            BoardDocument.board_id == board.id,
        )
    )
    if document is None:
        raise ApiError(404, "document_not_found", "Document not found")

    db.delete(document)
    db.commit()


def list_board_document_versions(
    db: Session,
    board_id: str,
    document_id: str,
    user: User,
) -> list[BoardDocumentVersionResponse]:
    board, _role = get_board_for_user(db, board_id, user)
    document = db.scalar(
        select(BoardDocument).where(
            BoardDocument.id == document_id,
            BoardDocument.board_id == board.id,
        )
    )
    if document is None:
        raise ApiError(404, "document_not_found", "Document not found")

    versions = db.scalars(
        select(BoardDocumentVersion)
        .where(
            BoardDocumentVersion.document_id == document.id,
            BoardDocumentVersion.board_id == board.id,
        )
        .order_by(desc(BoardDocumentVersion.version_number))
    ).all()
    return [_document_version_response(version) for version in versions]
