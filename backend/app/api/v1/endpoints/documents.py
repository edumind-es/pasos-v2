from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.v1.dtos import (
    BoardDocumentCreateRequest,
    BoardDocumentResponse,
    BoardDocumentUpdateRequest,
    BoardDocumentVersionResponse,
)
from app.core.deps import DbSession, get_current_user
from app.models.user import User
from app.services.document_service import (
    create_board_document,
    delete_board_document,
    list_board_document_versions,
    list_board_documents,
    update_board_document,
)

router = APIRouter(prefix="/boards/{board_id}/documents", tags=["documents"])


@router.get("", response_model=list[BoardDocumentResponse])
def list_board_documents_endpoint(
    board_id: str,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[BoardDocumentResponse]:
    return list_board_documents(db, board_id, current_user)


@router.post("", response_model=BoardDocumentResponse, status_code=201)
def create_board_document_endpoint(
    board_id: str,
    payload: BoardDocumentCreateRequest,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> BoardDocumentResponse:
    return create_board_document(db, board_id, current_user, payload)


@router.put("/{document_id}", response_model=BoardDocumentResponse)
def update_board_document_endpoint(
    board_id: str,
    document_id: str,
    payload: BoardDocumentUpdateRequest,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> BoardDocumentResponse:
    return update_board_document(db, board_id, document_id, current_user, payload)


@router.delete("/{document_id}", status_code=204)
def delete_board_document_endpoint(
    board_id: str,
    document_id: str,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    delete_board_document(db, board_id, document_id, current_user)


@router.get("/{document_id}/versions", response_model=list[BoardDocumentVersionResponse])
def list_board_document_versions_endpoint(
    board_id: str,
    document_id: str,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[BoardDocumentVersionResponse]:
    return list_board_document_versions(db, board_id, document_id, current_user)
