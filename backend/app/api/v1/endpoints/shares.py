from fastapi import APIRouter

from app.api.v1.dtos import ShareActivityRequest, ShareActivityResponse, ShareResolveResponse
from app.core.deps import DbSession
from app.services.activity_service import record_share_activity
from app.services.share_service import resolve_share

router = APIRouter(prefix="/share", tags=["share"])


@router.get("/{code}", response_model=ShareResolveResponse)
def resolve_share_endpoint(code: str, db: DbSession) -> ShareResolveResponse:
    return resolve_share(db, code)


@router.post("/{code}/activity", response_model=ShareActivityResponse)
def record_share_activity_endpoint(
    code: str,
    payload: ShareActivityRequest,
    db: DbSession,
) -> ShareActivityResponse:
    return record_share_activity(db, code, payload)
