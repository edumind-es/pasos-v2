"""El progreso del alumnado no puede quedarse para siempre.

Ese progreso guarda el alias que escribe el alumno —su nombre, en un aula
real—, en qué tareas pidió ayuda, sus evidencias y el feedback del docente.
Es un dato personal de un menor aunque la clave que lo identifica sea un
UUID aleatorio. El RGPD obliga a conservarlo solo mientras haga falta, y
deja de hacer falta cuando el código con el que se generó ya no sirve.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity import ShareLearnerProgress
from app.models.board import Board
from app.models.share import BoardShare
from app.models.user import User
from app.services.activity_service import (
    count_learner_progress,
    purge_expired_learner_progress,
)

AHORA = datetime.now(timezone.utc)


def _crear_codigo(
    db: Session,
    *,
    codigo: str,
    caduca: datetime,
    revocado: datetime | None = None,
) -> BoardShare:
    docente = db.get(User, "docente-1")
    if docente is None:
        docente = User(
            id="docente-1",
            email="docente@example.test",
            display_name="Docente",
            password_hash="hash",
            is_active=True,
        )
        tablero = Board(id="tablero-1", owner_id=docente.id, title="Rutina", snapshot={})
        db.add_all([docente, tablero])
        db.commit()

    share = BoardShare(
        id=str(uuid4()),
        board_id="tablero-1",
        created_by_user_id=docente.id,
        code=codigo,
        permission="read",
        expires_at=caduca,
        revoked_at=revocado,
        allow_anonymous=True,
    )
    db.add(share)
    db.commit()
    return share


def _crear_progreso(db: Session, share: BoardShare, clave: str) -> ShareLearnerProgress:
    progreso = ShareLearnerProgress(
        id=str(uuid4()),
        share_id=share.id,
        board_id=share.board_id,
        learner_key=clave,
        completed_task_ids=["task-1"],
        help_task_ids=["task-2"],
        validated_task_ids=[],
        evidence_entries=[],
        feedback_entries=[],
        started_at=AHORA,
        last_access_at=AHORA,
    )
    db.add(progreso)
    db.commit()
    return progreso


def _claves_restantes(db: Session) -> set[str]:
    return set(db.scalars(select(ShareLearnerProgress.learner_key)).all())


def test_borra_el_progreso_de_codigos_caducados_hace_tiempo(db_session: Session) -> None:
    viejo = _crear_codigo(db_session, codigo="VIEJO1", caduca=AHORA - timedelta(days=60))
    _crear_progreso(db_session, viejo, "Marta")

    borradas = purge_expired_learner_progress(db_session, grace_days=30)

    assert borradas == 1
    assert count_learner_progress(db_session) == 0


def test_respeta_el_margen_de_gracia(db_session: Session) -> None:
    reciente = _crear_codigo(db_session, codigo="AYER01", caduca=AHORA - timedelta(days=5))
    _crear_progreso(db_session, reciente, "Iago")

    borradas = purge_expired_learner_progress(db_session, grace_days=30)

    assert borradas == 0
    assert _claves_restantes(db_session) == {"Iago"}


def test_no_toca_los_codigos_en_vigor(db_session: Session) -> None:
    vigente = _crear_codigo(db_session, codigo="VIVO01", caduca=AHORA + timedelta(days=10))
    _crear_progreso(db_session, vigente, "Uxia")

    assert purge_expired_learner_progress(db_session, grace_days=30) == 0
    assert _claves_restantes(db_session) == {"Uxia"}


def test_borra_tambien_el_progreso_de_codigos_revocados(db_session: Session) -> None:
    revocado = _crear_codigo(
        db_session,
        codigo="CORTA1",
        caduca=AHORA + timedelta(days=90),
        revocado=AHORA - timedelta(days=45),
    )
    _crear_progreso(db_session, revocado, "Brais")

    assert purge_expired_learner_progress(db_session, grace_days=30) == 1
    assert count_learner_progress(db_session) == 0


def test_solo_borra_lo_caducado_y_deja_el_resto(db_session: Session) -> None:
    viejo = _crear_codigo(db_session, codigo="VIEJO2", caduca=AHORA - timedelta(days=90))
    vigente = _crear_codigo(db_session, codigo="VIVO02", caduca=AHORA + timedelta(days=30))
    _crear_progreso(db_session, viejo, "Antiga")
    _crear_progreso(db_session, vigente, "Actual")

    assert purge_expired_learner_progress(db_session, grace_days=30) == 1
    assert _claves_restantes(db_session) == {"Actual"}
