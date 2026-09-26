# Créditos y material de terceros

Pasos es obra de **Luis Vilela Acuña · EDUmind®** y se publica bajo licencia doble
AGPL-3.0-or-later / EUPL-1.2 (ver [LICENSE](LICENSE)). Este fichero acredita todo lo
que no es propio: pictogramas, tipografías y librerías principales.

## Pictogramas

Los pictogramas que se buscan y se muestran en las tareas **no están en este repositorio**:
se consultan en `api.arasaac.org` y se cargan desde `static.arasaac.org` en el momento de uso.

> Autor pictogramas: Sergio Palao. Origen: ARASAAC (http://www.arasaac.org).
> Licencia: CC BY-NC-SA. Propiedad: Gobierno de Aragón (España).

La licencia CC BY-NC-SA 4.0 permite el uso educativo no comercial con atribución y
compartir igual. Quien reutilice Pasos con fines comerciales deberá prescindir de los
pictogramas de ARASAAC o cambiar la fuente de pictogramas (ver «Cómo modificarlo» en el
[README](README.md)). Esta fórmula de atribución aparece también en el pie de la app.

## Tipografías (`public/fonts/`, servidas en local, sin llamadas a terceros)

Todas bajo la [SIL Open Font License 1.1](public/fonts/OFL.txt); los avisos de copyright
completos están en ese fichero.

| Familia | Autoría / origen |
|---|---|
| Atkinson Hyperlegible | Braille Institute of America, 2020 — https://brailleinstitute.org/freefont |
| IBM Plex Mono | IBM Corp., 2017 — https://github.com/IBM/plex |
| Literata | The Literata Project Authors (TypeTogether / Google Fonts), 2017 — https://github.com/googlefonts/literata |
| OpenDyslexic | Abbie Gonzalez, 2019 — https://opendyslexic.org |
| Outfit | The Outfit Project Authors (Rodrigo Fuenzalida), 2021 — https://github.com/Outfitio/Outfit-Fonts |

## Iconos e ilustraciones

- Iconos de interfaz: [lucide-react](https://lucide.dev) (licencia ISC), por npm.
- Ilustración de Pasos (`public/icons/pasos_logo.png`, iconos de la PWA) y logotipo de
  EDUmind (`public/icons/edumind_logo.png`): obra propia del autor. La marca EDUmind® y sus
  logotipos no se ceden con el código (ver [TRADEMARKS.md](TRADEMARKS.md)).

## Sonidos y música

Pasos no incluye ficheros de audio.

## Librerías principales

| Librería | Uso | Licencia |
|---|---|---|
| React 19 | interfaz | MIT |
| Vite + vite-plugin-pwa (Workbox) | compilación y service worker | MIT |
| Tailwind CSS 4 | estilos | MIT |
| zustand | estado de la app | MIT |
| @dnd-kit | arrastrar y soltar (ratón y teclado) | MIT |
| lucide-react | iconos | ISC |
| qrcode | QR de «Entrar con el móvil» | MIT |
| FastAPI, SQLAlchemy, Alembic, Pydantic | API del modo Pro | MIT |
| PyJWT, passlib | tokens y contraseñas del modo Pro | MIT / BSD |
| psycopg | acceso a PostgreSQL | LGPL-3.0 |
| gunicorn / uvicorn | servidor de la API | MIT / BSD |

La lista completa con versiones está en `package.json` y `backend/pyproject.toml`.

## Sistema visual

`public/vendor/lamina-v1.css` es el sistema «Lámina Cinco Mundos» de EDUmind, obra del
mismo autor, vendorizado sin cambios.
