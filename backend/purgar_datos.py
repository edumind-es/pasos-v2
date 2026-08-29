"""Purga programada de datos personales.

Se lanza desde un temporizador de systemd, no desde HTTP: no depende de que
nadie se acuerde de pulsar nada.

    python purgar_datos.py                 # aplica la purga
    python purgar_datos.py --simular       # solo cuenta, no borra

Qué borra y por qué:

- **Progreso del alumnado** de códigos caducados o revocados hace más de
  30 días. Ese progreso incluye el alias que escribe el alumno —su nombre,
  en la práctica—, las tareas en las que pidió ayuda, sus evidencias y el
  feedback del docente. Es un dato personal de un menor y el RGPD obliga a
  conservarlo solo mientras haga falta.
- **Eventos de actividad** con más de 90 días, que son la traza de quién
  hizo qué y cuándo.

El plazo de gracia existe para que el docente pueda revisar y exportar
después de que el código deje de servir.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.db import get_session_factory  # noqa: E402
from app.services.activity_service import (  # noqa: E402
    count_activity_events,
    count_learner_progress,
    purge_expired_learner_progress,
    purge_old_activity_events,
)

DIAS_GRACIA_ALUMNADO = 30
DIAS_EVENTOS = 90


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--simular", action="store_true", help="cuenta sin borrar")
    parser.add_argument("--gracia", type=int, default=DIAS_GRACIA_ALUMNADO)
    parser.add_argument("--eventos", type=int, default=DIAS_EVENTOS)
    args = parser.parse_args()

    sesion = get_session_factory()
    with sesion() as db:
        progreso = count_learner_progress(db)
        eventos = count_activity_events(db)
        print(f"antes: {progreso} filas de progreso, {eventos} eventos")

        if args.simular:
            print("simulacion: no se ha borrado nada")
            return 0

        borrado_progreso = purge_expired_learner_progress(db, grace_days=args.gracia)
        borrados_eventos = purge_old_activity_events(db, days=args.eventos)

    print(
        f"purgado: {borrado_progreso} filas de progreso de codigos caducados "
        f"hace mas de {args.gracia} dias, {borrados_eventos} eventos de mas de "
        f"{args.eventos} dias"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
