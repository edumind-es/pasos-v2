import logging
import sys

from app.core.config import get_settings

try:
    from pythonjsonlogger import jsonlogger
except ModuleNotFoundError:  # pragma: no cover - fallback for thin bootstrap hosts
    jsonlogger = None


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
    if jsonlogger is not None:
        formatter = jsonlogger.JsonFormatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s %(path)s %(method)s %(status_code)s %(duration_ms)s",
            defaults=defaults,
        )
    else:
        formatter = logging.Formatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s request_id=%(request_id)s path=%(path)s method=%(method)s status_code=%(status_code)s duration_ms=%(duration_ms)s",
            defaults=defaults,
        )
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(settings.log_level.upper())
