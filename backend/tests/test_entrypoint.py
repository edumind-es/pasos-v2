"""El punto de entrada que arranca systemd debe existir y exponer `app`.

La unidad pasos-api.service ejecuta `gunicorn ... wsgi:app`. Un linter llegó a
borrar el import de wsgi.py por considerarlo no usado: sin esta prueba, eso se
descubre con el servicio caído en producción.
"""

from __future__ import annotations

import importlib


def test_wsgi_expone_la_aplicacion() -> None:
    wsgi = importlib.import_module("wsgi")
    assert hasattr(wsgi, "app"), "wsgi:app es lo que arranca gunicorn"


def test_la_aplicacion_es_la_de_app_main() -> None:
    from app.main import app as app_main

    wsgi = importlib.import_module("wsgi")
    assert wsgi.app is app_main
