from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.v1.dtos import (
    BoardCommentCreateRequest,
    BoardCommentResponse,
    BoardMeetingCreateRequest,
    BoardMeetingResponse,
    BoardCreateRequest,
    BoardInsightsResponse,
    BoardLearnerInsightResponse,
    LearningAssignmentCreateRequest,
    LearningAssignmentResponse,
    BoardResponse,
    BoardSnapshotDTO,
    BoardUpdateRequest,
    LearnerFeedbackRequest,
    ShareCreateRequest,
    ShareResponse,
)
from app.core.deps import DbSession, get_current_user
from app.models.user import User
from app.services.activity_service import add_teacher_feedback, get_board_insights
from app.services.assignment_service import create_board_assignment, delete_board_assignment, list_board_assignments
from app.services.board_service import create_board, delete_board, get_board_for_user, list_user_boards, update_board
from app.services.comment_service import create_board_comment, list_board_comments
from app.services.meeting_service import create_board_meeting, list_board_meetings
from app.services.share_service import create_share

router = APIRouter(prefix="/boards", tags=["boards"])


@router.get("", response_model=list[BoardResponse])
def list_boards(
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
    organization_id: str | None = None,
    team_id: str | None = None,
    limit: int = 200,
) -> list[BoardResponse]:
    return list_user_boards(db, current_user, organization_id=organization_id, team_id=team_id, limit=limit)


@router.post("", response_model=BoardResponse, status_code=201)
def create_board_endpoint(
    payload: BoardCreateRequest,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> BoardResponse:
    return create_board(db, current_user, payload)


@router.get("/{board_id}", response_model=BoardResponse)
def get_board_endpoint(
    board_id: str,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> BoardResponse:
    board, role = get_board_for_user(db, board_id, current_user)
    return BoardResponse(
        id=board.id,
        title=board.title,
        owner_id=board.owner_id,
        organization_id=board.organization_id,
        team_id=board.team_id,
        context_type=board.context_type,
        board_type=board.board_type,
        snapshot=BoardSnapshotDTO.model_validate(board.snapshot),
        role=role,
        created_at=board.created_at,
        updated_at=board.updated_at,
    )


@router.put("/{board_id}", response_model=BoardResponse)
def update_board_endpoint(
    board_id: str,
    payload: BoardUpdateRequest,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> BoardResponse:
    return update_board(db, board_id, current_user, payload)


@router.delete("/{board_id}", status_code=204)
def delete_board_endpoint(
    board_id: str,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    delete_board(db, board_id, current_user)


@router.post("/{board_id}/share", response_model=ShareResponse)
def create_share_endpoint(
    board_id: str,
    payload: ShareCreateRequest,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> ShareResponse:
    return create_share(db, board_id, current_user, payload)


@router.get("/{board_id}/insights", response_model=BoardInsightsResponse)
def get_board_insights_endpoint(
    board_id: str,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> BoardInsightsResponse:
    return get_board_insights(db, board_id, current_user)


@router.post("/{board_id}/learner-feedback", response_model=BoardLearnerInsightResponse)
def add_learner_feedback_endpoint(
    board_id: str,
    payload: LearnerFeedbackRequest,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> BoardLearnerInsightResponse:
    return add_teacher_feedback(db, board_id, current_user, payload)


@router.get("/{board_id}/assignments", response_model=list[LearningAssignmentResponse])
def list_board_assignments_endpoint(
    board_id: str,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[LearningAssignmentResponse]:
    return list_board_assignments(db, board_id, current_user)


@router.post("/{board_id}/assignments", response_model=LearningAssignmentResponse, status_code=201)
def create_board_assignment_endpoint(
    board_id: str,
    payload: LearningAssignmentCreateRequest,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> LearningAssignmentResponse:
    return create_board_assignment(db, board_id, current_user, payload)


@router.delete("/{board_id}/assignments/{assignment_id}", status_code=204)
def delete_board_assignment_endpoint(
    board_id: str,
    assignment_id: str,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    delete_board_assignment(db, board_id, assignment_id, current_user)


@router.get("/{board_id}/comments", response_model=list[BoardCommentResponse])
def list_board_comments_endpoint(
    board_id: str,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[BoardCommentResponse]:
    return list_board_comments(db, board_id, current_user)


@router.post("/{board_id}/comments", response_model=BoardCommentResponse, status_code=201)
def create_board_comment_endpoint(
    board_id: str,
    payload: BoardCommentCreateRequest,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> BoardCommentResponse:
    return create_board_comment(db, board_id, current_user, payload)


@router.get("/{board_id}/meetings", response_model=list[BoardMeetingResponse])
def list_board_meetings_endpoint(
    board_id: str,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[BoardMeetingResponse]:
    return list_board_meetings(db, board_id, current_user)


@router.post("/{board_id}/meetings", response_model=BoardMeetingResponse, status_code=201)
def create_board_meeting_endpoint(
    board_id: str,
    payload: BoardMeetingCreateRequest,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> BoardMeetingResponse:
    return create_board_meeting(db, board_id, current_user, payload)
