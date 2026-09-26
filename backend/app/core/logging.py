import logging
import sys

from app.core.config import get_settings

try:
    # Ruta nueva desde python-json-logger 3.1; `pythonjsonlogger.jsonlogger`
    # sigue existiendo pero avisa de deprecacion en cada arranque.
    from pythonjsonlogger.json import JsonFormatter
except ModuleNotFoundError:  # pragma: no cover - fallback for thin bootstrap hosts
    try:
        from pythonjsonlogger.jsonlogger import JsonFormatter  # type: ignore[no-redef]
    except ModuleNotFoundError:
        JsonFormatter = None  # type: ignore[assignment, misc]


def configure_logging() -> None:
    settings = get_settings()
    handler = logging.StreamHandler(sys.stdout)
    defaults = {
        "request_id": "-",
        "path": "-",
        "method": "-",
        "status_code": "-",
        "duration_ms": "-",
    }
    if JsonFormatter is not None:
        formatter = JsonFormatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s "
            "%(path)s %(method)s %(status_code)s %(duration_ms)s",
            defaults=defaults,
        )
    else:
        formatter = logging.Formatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s "
            "request_id=%(request_id)s path=%(path)s method=%(method)s "
            "status_code=%(status_code)s duration_ms=%(duration_ms)s",
            defaults=defaults,
        )
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(settings.log_level.upper())
