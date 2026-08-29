"""El nombre del alumnado deja de guardarse en el servidor.

`share_learner_progress.learner_label` guardaba el alias que escribía el
propio alumno, que en un aula real es su nombre. Junto al resto de la fila
—tareas hechas, peticiones de ayuda, evidencias y feedback— eso es
seguimiento del rendimiento de un menor identificable.

A partir de aquí el alumnado se identifica solo por `learner_key`, un UUID
aleatorio que genera su navegador, y el apodo que ve el docente («Lince 7»)
se **calcula** en el navegador a partir de esa clave. El docente puede
anotar el nombre real en su propio dispositivo; el servidor no lo recibe.

Se elimina la columna en vez de dejarla vacía: una columna que puede
volver a rellenarse es una tentación, y aquí no hay datos que migrar.

Revision ID: 20260825_0011
Revises: 20260516_0010
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260825_0011"
down_revision = "20260516_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("share_learner_progress", "learner_label")
    # Los eventos de actividad del alumnado tambien llevaban el nombre en
    # actor_label. Se vacia lo existente; el codigo ya no lo escribe.
    op.execute(
        "UPDATE board_activity_events SET actor_label = NULL "
        "WHERE actor_type = 'student'"
    )


def downgrade() -> None:
    op.add_column(
        "share_learner_progress",
        sa.Column("learner_label", sa.String(length=120), nullable=True),
    )
