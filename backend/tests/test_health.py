from app.api.v1.endpoints.health import healthcheck


def test_healthcheck_returns_ok() -> None:
    payload = healthcheck()

    assert payload.status == "ok"
    assert payload.app == "pasos-api"
    assert payload.version == "0.1.0"
