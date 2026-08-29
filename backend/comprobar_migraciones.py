"""Avisa de migraciones destructivas antes de aplicarlas.

Por que existe: deploy.sh corre las migraciones ANTES de mover el symlink,
con el codigo viejo todavia atendiendo peticiones. Eso es correcto para una
migracion que solo anade cosas, pero una que quita una columna deja al codigo
viejo consultando algo que ya no existe: 500 hasta que el reinicio termina.

La regla (expandir / contraer):
  1. Despliegue A: anade lo nuevo y deja de usar lo viejo. Sin destruir nada.
  2. Despliegue B, ya con A en produccion: destruye lo viejo.

Este script no decide nada; solo se niega a que una destruccion pase de
tapadillo. Con --permitir se sigue adelante a sabiendas.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory

# Operaciones que rompen al codigo que todavia esta sirviendo.
DESTRUCTIVAS = (
    "drop_column",
    "drop_table",
    "drop_constraint",
    "drop_index",
    "alter_column",  # un NOT NULL nuevo o un rename tambien rompen
)
COMENTARIO = re.compile(r"^\s*#")


def operaciones_destructivas(ruta: Path) -> list[str]:
    encontradas: list[str] = []
    for numero, linea in enumerate(ruta.read_text(encoding="utf-8").splitlines(), 1):
        if COMENTARIO.match(linea):
            continue
        for op in DESTRUCTIVAS:
            if f"op.{op}(" in linea:
                encontradas.append(f"    {ruta.name}:{numero}  {linea.strip()}")
    return encontradas


def revisiones_pendientes(cfg: Config, actual: str | None) -> list:
    script = ScriptDirectory.from_config(cfg)
    destino = script.get_current_head()
    if destino is None:
        return []
    return list(script.iterate_revisions(destino, actual or "base"))


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--actual", help="revision aplicada ahora mismo en la BD")
    p.add_argument("--ini", default="alembic.ini")
    p.add_argument("--permitir", action="store_true",
                   help="seguir aunque haya destruccion (asumes el corte)")
    args = p.parse_args()

    cfg = Config(args.ini)
    pendientes = revisiones_pendientes(cfg, args.actual)
    if not pendientes:
        print("Sin migraciones pendientes.")
        return 0

    problemas: list[str] = []
    for rev in pendientes:
        ruta = Path(rev.path)
        lineas = operaciones_destructivas(ruta)
        if lineas:
            problemas.append(f"  {rev.revision}:")
            problemas.extend(lineas)

    print(f"Migraciones pendientes: {len(pendientes)}")
    if not problemas:
        print("Ninguna destruye nada: se pueden aplicar sin cortar servicio.")
        return 0

    print("\nMigraciones que rompen al codigo que sigue sirviendo:")
    print("\n".join(problemas))
    if args.permitir:
        print("\n--permitir dado: se aplican de todos modos. Habra corte.")
        return 0
    print(
        "\nSepara el despliegue en dos:\n"
        "  1) Primero el codigo que ya no usa lo que se va a borrar.\n"
        "  2) Cuando ese este vivo, esta migracion.\n"
        "Si el corte te da igual (nadie usando la app), repite con"
        " --permitir-contraccion."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
