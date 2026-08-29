"""Que el guardian de migraciones no se despiste en ninguno de los dos sentidos."""
from pathlib import Path

import pytest

from comprobar_migraciones import operaciones_destructivas

EXPANSIVA = '''
def upgrade() -> None:
    op.add_column("users", sa.Column("apodo", sa.String()))
    op.create_index("ix_users_apodo", "users", ["apodo"])
    op.execute("UPDATE users SET apodo = NULL")
'''

DESTRUCTIVA = '''
def upgrade() -> None:
    op.add_column("users", sa.Column("apodo", sa.String()))
    op.drop_column("users", "nombre")
'''

COMENTADA = '''
def upgrade() -> None:
    # op.drop_column("users", "nombre")  <- se hara en el siguiente despliegue
    op.add_column("users", sa.Column("apodo", sa.String()))
'''


def _escribir(tmp_path: Path, contenido: str) -> Path:
    ruta = tmp_path / "20260101_0001_prueba.py"
    ruta.write_text(contenido, encoding="utf-8")
    return ruta


def test_una_migracion_que_solo_anade_no_da_aviso(tmp_path: Path) -> None:
    assert operaciones_destructivas(_escribir(tmp_path, EXPANSIVA)) == []


def test_detecta_el_borrado_de_columna(tmp_path: Path) -> None:
    lineas = operaciones_destructivas(_escribir(tmp_path, DESTRUCTIVA))
    assert len(lineas) == 1
    assert "drop_column" in lineas[0]


def test_no_cuenta_lo_que_esta_comentado(tmp_path: Path) -> None:
    assert operaciones_destructivas(_escribir(tmp_path, COMENTADA)) == []


@pytest.mark.parametrize(
    "operacion",
    ["drop_table", "drop_constraint", "drop_index", "alter_column"],
)
def test_cubre_las_demas_operaciones_que_rompen(tmp_path: Path, operacion: str) -> None:
    cuerpo = f'def upgrade() -> None:\n    op.{operacion}("users", "algo")\n'
    assert len(operaciones_destructivas(_escribir(tmp_path, cuerpo))) == 1


def test_la_migracion_real_que_quito_el_nombre_del_alumnado_esta_marcada() -> None:
    real = Path(__file__).resolve().parents[1] / "alembic/versions/20260825_0011_sin_nombre_alumnado.py"
    assert real.exists()
    lineas = operaciones_destructivas(real)
    assert any("drop_column" in linea for linea in lineas)
