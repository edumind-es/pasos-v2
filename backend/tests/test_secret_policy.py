"""Pruebas de la salvaguarda que impide arrancar con secretos JWT inseguros.

No tenía pruebas y es una barrera de seguridad: si deja de morder, producción
puede arrancar firmando tokens con el secreto de ejemplo publicado en el
repositorio. Ver app/core/config.py::Settings.enforce_secret_policy.
"""

from __future__ import annotations

import pytest

from app.core.config import Settings

SECRETO_VALIDO = "a" * 64


def _settings(**cambios: str) -> Settings:
    base = {
        "app_env": "production",
        "jwt_secret_key": SECRETO_VALIDO,
        "refresh_jwt_secret_key": SECRETO_VALIDO,
    }
    base.update(cambios)
    return Settings(**base)  # type: ignore[arg-type]


def test_acepta_secretos_largos_y_propios() -> None:
    _settings().enforce_secret_policy()


@pytest.mark.parametrize(
    "campo",
    ["jwt_secret_key", "refresh_jwt_secret_key"],
)
def test_aborta_con_el_secreto_de_ejemplo(campo: str) -> None:
    with pytest.raises(RuntimeError, match="valor de ejemplo"):
        _settings(**{campo: "change-me-access-secret"}).enforce_secret_policy()


@pytest.mark.parametrize(
    "campo",
    ["jwt_secret_key", "refresh_jwt_secret_key"],
)
def test_aborta_con_un_secreto_corto(campo: str) -> None:
    # 16 bytes: exactamente el caso que tenía producción antes de la rotación.
    with pytest.raises(RuntimeError, match="demasiado corto"):
        _settings(**{campo: "b" * 16}).enforce_secret_policy()


def test_el_mensaje_explica_como_generar_uno() -> None:
    with pytest.raises(RuntimeError, match="openssl rand -hex 32"):
        _settings(jwt_secret_key="c" * 10).enforce_secret_policy()


@pytest.mark.parametrize("entorno", ["development", "test", "staging"])
def test_fuera_de_produccion_no_muerde(entorno: str) -> None:
    # En desarrollo y pruebas los secretos son de juguete a propósito.
    _settings(app_env=entorno, jwt_secret_key="change-me-access-secret").enforce_secret_policy()


def test_los_secretos_nunca_salen_en_el_volcado_de_configuracion() -> None:
    volcado = _settings().model_dump_safe()
    assert "jwt_secret_key" not in volcado
    assert "refresh_jwt_secret_key" not in volcado
    assert "database_url" not in volcado
    assert SECRETO_VALIDO not in str(volcado)
