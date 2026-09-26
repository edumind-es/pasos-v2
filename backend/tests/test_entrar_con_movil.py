"""Entrar con el movil: flujo de codigo de dispositivo con un Authentik simulado."""

from __future__ import annotations

import json
import time
from collections.abc import Generator

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db_session
from app.core.rate_limit import rate_limiter
from app.main import app
from app.services import oidc_service

ISSUER = "https://auth.test/application/o/pasos/"
CLIENT_ID = "cliente-pasos-test"

CLAVE = rsa.generate_private_key(public_exponent=65537, key_size=2048)
JWK = {**json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(CLAVE.public_key())), "kid": "k1"}


def firmar(claims: dict, clave=CLAVE) -> str:
    return jwt.encode(claims, clave, algorithm="RS256", headers={"kid": "k1"})


class AuthentikSimulado:
    def __init__(self) -> None:
        self.respuestas_token: list[tuple[int, dict]] = []
        self.consultas_token = 0

    def __call__(self, request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if url.endswith("/.well-known/openid-configuration"):
            return httpx.Response(
                200,
                json={
                    "issuer": ISSUER,
                    "authorization_endpoint": "https://auth.test/application/o/authorize/",
                    "token_endpoint": "https://auth.test/application/o/token/",
                    "userinfo_endpoint": "https://auth.test/application/o/userinfo/",
                    "jwks_uri": "https://auth.test/jwks/",
                    "device_authorization_endpoint": "https://auth.test/application/o/device/",
                },
            )
        if url == "https://auth.test/jwks/":
            return httpx.Response(200, json={"keys": [JWK]})
        if url == "https://auth.test/application/o/device/":
            return httpx.Response(
                200,
                json={
                    "device_code": "codigo-secreto-del-dispositivo",
                    "user_code": "123456789",
                    "verification_uri_complete": "https://auth.test/device?code=123456789",
                    "expires_in": 300,
                    "interval": 5,
                },
            )
        if url == "https://auth.test/application/o/token/":
            self.consultas_token += 1
            assert "client_secret=secreto-test" in request.content.decode()
            status, body = (
                self.respuestas_token.pop(0)
                if self.respuestas_token
                else (400, {"error": "authorization_pending"})
            )
            return httpx.Response(status, json=body)
        if url == "https://auth.test/application/o/userinfo/":
            return httpx.Response(
                200, json={"sub": "luis-sub", "email": "luis@test", "name": "Luis"}
            )
        return httpx.Response(404)


@pytest.fixture()
def authentik(monkeypatch: pytest.MonkeyPatch) -> AuthentikSimulado:
    simulado = AuthentikSimulado()
    cliente_real = httpx.AsyncClient
    monkeypatch.setattr(
        oidc_service.httpx,
        "AsyncClient",
        lambda **kw: cliente_real(transport=httpx.MockTransport(simulado), **kw),
    )
    monkeypatch.setattr(oidc_service, "_metadata_cache", None)
    monkeypatch.setattr(oidc_service, "_jwks_cache", None)
    return simulado


@pytest.fixture()
def client(
    db_session: Session, monkeypatch: pytest.MonkeyPatch, authentik: AuthentikSimulado
) -> Generator[TestClient, None, None]:
    monkeypatch.setenv("PASOS_AUTHENTIK_ENABLED", "true")
    monkeypatch.setenv("PASOS_AUTHENTIK_ISSUER_URL", ISSUER)
    monkeypatch.setenv("PASOS_AUTHENTIK_CLIENT_ID", CLIENT_ID)
    monkeypatch.setenv("PASOS_AUTHENTIK_CLIENT_SECRET", "secreto-test")
    get_settings.cache_clear()
    rate_limiter._buckets.clear()

    def override_db():
        yield db_session

    app.dependency_overrides[get_db_session] = override_db
    with TestClient(app, base_url="https://pasos.edumind.es") as test_client:
        yield test_client
    app.dependency_overrides.clear()


def iniciar(client: TestClient) -> dict:
    res = client.post("/api/v1/auth/movil/iniciar")
    assert res.status_code == 200, res.text
    return res.json()


def test_devuelve_el_enlace_del_qr_y_nunca_el_device_code(client: TestClient) -> None:
    datos = iniciar(client)
    assert datos == {
        "enlace": "https://auth.test/device?code=123456789",
        "codigo": "123456789",
        "caduca_en": 300,
    }
    assert "codigo-secreto-del-dispositivo" not in json.dumps(datos)


def test_sigue_pendiente_mientras_no_se_aprueba(client: TestClient) -> None:
    iniciar(client)
    res = client.post("/api/v1/auth/movil/estado")
    assert res.json() == {"estado": "pendiente"}
    assert get_settings().refresh_cookie_name not in res.cookies


def test_al_aprobar_abre_la_sesion_una_sola_vez(
    client: TestClient, authentik: AuthentikSimulado
) -> None:
    iniciar(client)
    ahora = int(time.time())
    authentik.respuestas_token.append(
        (
            200,
            {
                "access_token": "at",
                "id_token": firmar(
                    {
                        "iss": ISSUER,
                        "aud": CLIENT_ID,
                        "sub": "luis-sub",
                        "exp": ahora + 300,
                        "iat": ahora,
                    }
                ),
            },
        )
    )
    res = client.post("/api/v1/auth/movil/estado")
    assert res.json() == {"estado": "aprobada"}
    assert get_settings().refresh_cookie_name in res.cookies

    # La cookie del QR se ha borrado: no se puede cobrar dos veces.
    otra = client.post("/api/v1/auth/movil/estado")
    assert otra.json() == {"estado": "caducada"}


def test_sin_la_cookie_del_qr_no_se_consulta_a_authentik(
    client: TestClient, authentik: AuthentikSimulado
) -> None:
    res = client.post("/api/v1/auth/movil/estado")
    assert res.json() == {"estado": "caducada"}
    assert authentik.consultas_token == 0


def test_rechaza_un_id_token_firmado_por_otra_clave(
    client: TestClient, authentik: AuthentikSimulado
) -> None:
    iniciar(client)
    falsa = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    authentik.respuestas_token.append(
        (
            200,
            {
                "access_token": "at",
                "id_token": firmar(
                    {
                        "iss": ISSUER,
                        "aud": CLIENT_ID,
                        "sub": "intruso",
                        "exp": int(time.time()) + 300,
                    },
                    falsa,
                ),
            },
        )
    )
    res = client.post("/api/v1/auth/movil/estado")
    assert res.status_code == 401
    assert get_settings().refresh_cookie_name not in res.cookies


@pytest.mark.parametrize(
    ("error", "estado"), [("access_denied", "rechazada"), ("expired_token", "caducada")]
)
def test_informa_si_se_rechaza_o_caduca(
    client: TestClient, authentik: AuthentikSimulado, error: str, estado: str
) -> None:
    iniciar(client)
    authentik.respuestas_token.append((400, {"error": error}))
    assert client.post("/api/v1/auth/movil/estado").json() == {"estado": estado}
