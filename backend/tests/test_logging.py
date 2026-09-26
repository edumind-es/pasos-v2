"""El arranque configura el log en JSON; si eso falla, el servicio no arranca.

Se toca poco y no tenía pruebas: al cambiar el import deprecado de
python-json-logger, nada habría avisado de una equivocación.
"""

from __future__ import annotations

import logging

from app.core.logging import configure_logging


def test_configura_el_log_sin_reventar() -> None:
    configure_logging()
    raiz = logging.getLogger()
    assert raiz.handlers, "configure_logging debe dejar al menos un handler"


def test_el_formateador_incluye_los_campos_de_peticion() -> None:
    configure_logging()
    formateador = logging.getLogger().handlers[0].formatter
    assert formateador is not None

    registro = logging.LogRecord(
        name="pasos",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="peticion atendida",
        args=(),
        exc_info=None,
    )
    salida = formateador.format(registro)
    # Los campos de contexto llevan valor por defecto: sin ellos, formatear un
    # log corriente lanzaría KeyError y tumbaría la petición que lo emite.
    assert "peticion atendida" in salida
