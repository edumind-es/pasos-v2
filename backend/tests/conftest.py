from __future__ import annotations

from collections.abc import Generator

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.models import Base


@pytest.fixture()
def db_session(tmp_path, monkeypatch: pytest.MonkeyPatch) -> Generator[Session, None, None]:
    db_path = tmp_path / "pasos-test.db"
    monkeypatch.setenv("PASOS_PUBLIC_BASE_URL", "https://staging.pasos.test")
    # Las pruebas usan los secretos de ejemplo a propósito; márcalas como
    # entorno de pruebas para que enforce_secret_policy() no aborte el arranque
    # (esa política solo debe morder en producción).
    monkeypatch.setenv("PASOS_APP_ENV", "test")
    # Secretos de juguete, pero con la longitud que pide RFC 7518 (>=32). Con
    # los valores por defecto (23 y 24 bytes) PyJWT emitia un
    # InsecureKeyLengthWarning por cada token firmado en las pruebas.
    monkeypatch.setenv("PASOS_JWT_SECRET_KEY", "pruebas-acceso-" + "0" * 32)
    monkeypatch.setenv("PASOS_REFRESH_JWT_SECRET_KEY", "pruebas-refresco-" + "0" * 32)
    get_settings.cache_clear()

    engine = create_engine(f"sqlite+pysqlite:///{db_path}", future=True)

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _connection_record) -> None:  # type: ignore[no-untyped-def]
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    Base.metadata.create_all(engine)

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
        engine.dispose()
        get_settings.cache_clear()
