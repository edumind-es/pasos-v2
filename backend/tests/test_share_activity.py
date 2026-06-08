from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.dtos import LearnerFeedbackRequest, ShareActivityRequest, ShareCreateRequest, TaskEvidenceEntryDTO
from app.core.errors import ApiError
from app.models.activity import BoardActivityEvent
from app.models.board import Board
from app.models.membership import BoardMembership
from app.models.share import BoardShare
from app.models.user import User
from app.services.activity_service import add_teacher_feedback, get_board_insights, record_share_activity
from app.services.share_service import create_share, resolve_share


def build_snapshot() -> dict:
    return {
        "columns": [
            {"id": "todo", "title": "Por hacer", "order": 0},
            {"id": "done", "title": "Terminado", "order": 1},
        ],
        "tasks": [
            {
                "id": "task-1",
                "columnId": "todo",
                "title": "Anticipar la rutina",
                "description": "Explicar visualmente la secuencia del día.",
                "labels": ["inicio"],
                "color": "#45B7D1",
                "icon": None,
                "pictograms": [],
                "attachments": [],
                "durationSeconds": 300,
                "createdAt": 1,
            },
            {
                "id": "task-2",
                "columnId": "done",
                "title": "Cierre guiado",
                "description": "Revisar lo completado con el alumno.",
                "labels": ["cierre"],
                "color": "#96CEB4",
                "icon": None,
                "pictograms": [],
                "attachments": [],
                "durationSeconds": 180,
                "createdAt": 2,
            },
        ],
    }


def create_teacher_with_board(db_session: Session) -> tuple[User, Board]:
    teacher = User(
        id="teacher-1",
        email="teacher@example.test",
        display_name="Teacher",
        password_hash="hashed-password",
        is_active=True,
    )
    board = Board(
        id=str(uuid4()),
        owner_id=teacher.id,
        title="Rutina compartida",
        snapshot=build_snapshot(),
        metadata_json={"origin_mode": "pro"},
    )
    db_session.add_all([teacher, board])
    db_session.commit()

    membership = BoardMembership(
        id=str(uuid4()),
        board_id=board.id,
        user_id=teacher.id,
        role="owner",
    )
    db_session.add(membership)
    db_session.commit()
    return teacher, board


def create_teacher_with_team_board(db_session: Session) -> tuple[User, Board]:
    teacher, board = create_teacher_with_board(db_session)
    board.context_type = "team"
    board.organization_id = "org-test"
    board.team_id = "team-test"
    db_session.commit()
    return teacher, board


def test_resolve_share_increments_use_count(db_session: Session) -> None:
    teacher, board = create_teacher_with_board(db_session)

    created = create_share(
        db_session,
        board.id,
        teacher,
        ShareCreateRequest(permission="viewer", ttl_hours=24, allow_anonymous=True),
    )

    payload = resolve_share(db_session, created.code)
    share = db_session.scalar(select(BoardShare).where(BoardShare.code == created.code))

    assert payload.board.id == board.id
    assert payload.code == created.code
    assert share is not None
    assert share.use_count == 1


def test_create_share_persists_activity_with_valid_foreign_key(db_session: Session) -> None:
    teacher, board = create_teacher_with_board(db_session)

    created = create_share(
        db_session,
        board.id,
        teacher,
        ShareCreateRequest(permission="viewer", ttl_hours=24, allow_anonymous=True),
    )

    share = db_session.scalar(select(BoardShare).where(BoardShare.code == created.code))
    event = db_session.scalar(
        select(BoardActivityEvent).where(BoardActivityEvent.event_type == "share_created")
    )

    assert share is not None
    assert event is not None
    assert event.share_id == share.id


def test_record_share_activity_updates_progress_and_insights(db_session: Session) -> None:
    teacher, board = create_teacher_with_board(db_session)

    created = create_share(
        db_session,
        board.id,
        teacher,
        ShareCreateRequest(permission="viewer", ttl_hours=48, allow_anonymous=True),
    )
    resolve_share(db_session, created.code)

    progress = record_share_activity(
        db_session,
        created.code,
        ShareActivityRequest(
            learner_key="learner-1",
            learner_label="Marta",
            event_type="progress_updated",
            completed_task_ids=["task-1"],
            help_task_ids=["task-2"],
            evidence_entries=[
                TaskEvidenceEntryDTO(
                    task_id="task-1",
                    note="He subido mi foto del ejercicio.",
                    url="https://example.com/evidencia-1",
                    submitted_at=datetime.now(timezone.utc),
                )
            ],
            last_access_at=datetime.now(timezone.utc),
        ),
    )
    completed = record_share_activity(
        db_session,
        created.code,
        ShareActivityRequest(
            learner_key="learner-1",
            learner_label="Marta",
            event_type="board_completed",
            completed_task_ids=["task-1", "task-2"],
            last_access_at=datetime.now(timezone.utc),
        ),
    )
    insights = get_board_insights(db_session, board.id, teacher)

    assert progress.progress_percent == 50
    assert progress.help_task_ids == ["task-2"]
    assert progress.evidence_entries[0].task_id == "task-1"
    assert completed.progress_percent == 100
    assert insights.learner_count == 1
    assert insights.completed_learners == 1
    assert insights.share_access_count == 1
    assert insights.learners[0].learner_label == "Marta"
    assert insights.learners[0].progress_percent == 100
    assert insights.learners[0].help_task_count == 0
    assert insights.learners[0].evidence_count == 1
    assert {event.event_type for event in insights.recent_events} >= {
        "share_created",
        "share_resolved",
        "progress_updated",
        "board_completed",
    }


def test_teacher_can_add_feedback_and_validate_task(db_session: Session) -> None:
    teacher, board = create_teacher_with_board(db_session)

    created = create_share(
        db_session,
        board.id,
        teacher,
        ShareCreateRequest(permission="viewer", ttl_hours=48, allow_anonymous=True),
    )
    resolve_share(db_session, created.code)

    record_share_activity(
        db_session,
        created.code,
        ShareActivityRequest(
            learner_key="learner-3",
            learner_label="Lucia",
            event_type="progress_updated",
            completed_task_ids=["task-1"],
            help_task_ids=["task-1"],
            evidence_entries=[
                TaskEvidenceEntryDTO(
                    task_id="task-1",
                    note="He terminado la anticipacion con apoyo visual.",
                    submitted_at=datetime.now(timezone.utc),
                )
            ],
            last_access_at=datetime.now(timezone.utc),
        ),
    )

    learner = add_teacher_feedback(
        db_session,
        board.id,
        teacher,
        LearnerFeedbackRequest(
            share_code=created.code,
            learner_key="learner-3",
            task_id="task-1",
            message="Buen trabajo. Ya puedes pasar a la siguiente actividad.",
            status="validated",
            resolve_help_request=True,
        ),
    )

    assert learner.learner_label == "Lucia"
    assert learner.validated_task_ids == ["task-1"]
    assert learner.help_task_ids == []
    assert learner.feedback_count == 1
    assert learner.feedback_entries[0].status == "validated"


def test_record_share_activity_rejects_expired_share(db_session: Session) -> None:
    teacher, board = create_teacher_with_board(db_session)

    created = create_share(
        db_session,
        board.id,
        teacher,
        ShareCreateRequest(permission="viewer", ttl_hours=1, allow_anonymous=True),
    )
    share = db_session.scalar(select(BoardShare).where(BoardShare.code == created.code))
    assert share is not None
    share.expires_at = datetime.now(timezone.utc) - timedelta(hours=2)
    db_session.commit()

    with pytest.raises(ApiError) as excinfo:
        record_share_activity(
            db_session,
            created.code,
            ShareActivityRequest(
                learner_key="learner-2",
                learner_label="Equipo azul",
                event_type="accessed",
                completed_task_ids=[],
                last_access_at=datetime.now(timezone.utc),
            ),
        )

    assert excinfo.value.code == "share_not_found"


def test_create_share_rejects_identified_mode_until_supported(db_session: Session) -> None:
    teacher, board = create_teacher_with_board(db_session)

    with pytest.raises(ApiError) as excinfo:
        create_share(
            db_session,
            board.id,
            teacher,
            ShareCreateRequest(permission="viewer", ttl_hours=24, allow_anonymous=False),
        )

    assert excinfo.value.code == "share_identified_not_supported"


def test_create_share_rejects_anonymous_team_board_sharing(db_session: Session) -> None:
    teacher, board = create_teacher_with_team_board(db_session)

    with pytest.raises(ApiError) as excinfo:
        create_share(
            db_session,
            board.id,
            teacher,
            ShareCreateRequest(permission="viewer", ttl_hours=24, allow_anonymous=True),
        )

    assert excinfo.value.code == "share_anonymous_forbidden"
