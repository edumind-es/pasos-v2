#!/usr/bin/env bash
set -u
set -o pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${DIST_DIR:-$ROOT_DIR/dist}"
PROD_URL="${PROD_URL:-https://pasos.edumind.es}"
HEALTH_PATH="${HEALTH_PATH:-/health}"
RUN_ID="$(date -u +%Y%m%d_%H%M%S)"
REPORT_DIR="${REPORT_DIR:-$ROOT_DIR/run/ripg_go_nogo_$RUN_ID}"
REPORT_FILE="$REPORT_DIR/RIPG_GO_NO_GO_REPORT.md"

DO_BUILD=0
CHECK_LIVE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build)
      DO_BUILD=1
      shift
      ;;
    --live)
      CHECK_LIVE=1
      shift
      ;;
    --dist)
      DIST_DIR="$2"
      shift 2
      ;;
    --url)
      PROD_URL="$2"
      shift 2
      ;;
    --health-path)
      HEALTH_PATH="$2"
      shift 2
      ;;
    -h|--help)
      cat <<'EOF'
Usage: scripts/ripg-go-nogo.sh [--build] [--live] [--dist PATH] [--url URL] [--health-path PATH]

GO/NO GO validation for Pasos production deployments using ripgrep.

Examples:
  npm run ripg:local
  npm run ripg:live
  npm run ripg:go-nogo
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

mkdir -p "$REPORT_DIR"

failures=0
warnings=0

write_report_header() {
  {
    echo "# RIPG GO/NO GO - Pasos"
    echo
    echo "- Fecha UTC: $(date -u '+%Y-%m-%d %H:%M:%S')"
    echo "- Repo: $ROOT_DIR"
    echo "- Dist candidato: $DIST_DIR"
    echo "- Produccion: $PROD_URL"
    echo "- Health: $HEALTH_PATH"
    echo "- Build local: $([[ "$DO_BUILD" -eq 1 ]] && echo si || echo no)"
    echo "- Validacion live: $([[ "$CHECK_LIVE" -eq 1 ]] && echo si || echo no)"
    echo
    echo "## Comprobaciones"
  } > "$REPORT_FILE"
}

log_pass() {
  echo "[OK] $1"
  echo "- GO: $1" >> "$REPORT_FILE"
}

log_warn() {
  warnings=$((warnings + 1))
  echo "[WARN] $1"
  echo "- WARN: $1" >> "$REPORT_FILE"
}

log_fail() {
  failures=$((failures + 1))
  echo "[NO GO] $1"
  echo "- NO GO: $1" >> "$REPORT_FILE"
}

require_cmd() {
  if command -v "$1" >/dev/null 2>&1; then
    log_pass "Comando disponible: $1"
  else
    log_fail "Falta comando requerido: $1"
  fi
}

rg_quiet() {
  local pattern="$1"
  local target="$2"
  rg --fixed-strings --quiet --glob '!node_modules/**' --glob '!*.map' "$pattern" "$target"
}

extract_assets() {
  local index_file="$1"
  rg --only-matching --no-filename "(/|\./)?assets/[^\"') ]+\.(js|css)" "$index_file" \
    | sed 's#^\./##; s#^/##' \
    | sort -u
}

list_dist_assets() {
  if [[ -d "$DIST_DIR/assets" ]]; then
    find "$DIST_DIR/assets" -type f \( -name '*.js' -o -name '*.css' \) \
      | sed "s#^$DIST_DIR/##" \
      | sort -u
  fi
}

discover_referenced_assets() {
  local file="$1"
  local dir
  dir="$(dirname "$file")"

  rg --only-matching --no-filename "(\./|assets/)[A-Za-z0-9._-]+\.(js|css)" "$file" \
    | sed 's#^\./##; s#^/##' \
    | while IFS= read -r ref; do
        [[ -z "$ref" ]] && continue
        [[ "$ref" == http* ]] && continue
        if [[ "$ref" == assets/* ]]; then
          printf '%s\n' "$ref"
        elif [[ "$dir" == */assets ]]; then
          printf 'assets/%s\n' "$ref"
        fi
      done \
    | sort -u
}

validate_markers() {
  local target="$1"
  local label="$2"
  local marker
  local markers=(
    "Pasos"
    "Planificador"
    "EDUmind"
    "ARASAAC"
    "api.arasaac.org"
    "/api/v1"
    "Privacidad"
  )

  for marker in "${markers[@]}"; do
    if rg_quiet "$marker" "$target"; then
      log_pass "$label contiene marcador critico: $marker"
    else
      log_fail "$label no contiene marcador critico: $marker"
    fi
  done
}

validate_forbidden_markers() {
  local target="$1"
  local label="$2"
  local marker
  local forbidden=(
    "localhost:5173"
    "localhost:9150"
    "127.0.0.1:9150"
    "0.0.0.0:9150"
    "staging.pasos.test"
  )

  for marker in "${forbidden[@]}"; do
    if rg_quiet "$marker" "$target"; then
      log_fail "$label contiene marcador no valido en produccion: $marker"
    else
      log_pass "$label no contiene marcador prohibido: $marker"
    fi
  done
}

validate_dist() {
  if [[ ! -d "$DIST_DIR" ]]; then
    log_fail "No existe el directorio dist candidato: $DIST_DIR"
    return
  fi

  if [[ ! -s "$DIST_DIR/index.html" ]]; then
    log_fail "No existe index.html candidato o esta vacio"
    return
  fi

  log_pass "Existe index.html candidato"

  local entry_assets_file="$REPORT_DIR/dist-entry-assets.txt"
  local assets_file="$REPORT_DIR/dist-assets.txt"
  extract_assets "$DIST_DIR/index.html" > "$entry_assets_file"
  list_dist_assets > "$assets_file"

  if [[ ! -s "$entry_assets_file" ]]; then
    log_fail "No se detectan assets JS/CSS en dist/index.html"
  else
    log_pass "Assets de entrada detectados en dist/index.html: $(wc -l < "$entry_assets_file" | tr -d ' ')"
  fi

  if [[ ! -s "$assets_file" ]]; then
    log_fail "No se detectan assets JS/CSS en dist/assets"
  else
    log_pass "Assets JS/CSS totales en dist/assets: $(wc -l < "$assets_file" | tr -d ' ')"
  fi

  while IFS= read -r asset; do
    [[ -z "$asset" ]] && continue
    if [[ -s "$DIST_DIR/$asset" ]]; then
      log_pass "Asset local presente: $asset"
    else
      log_fail "Asset referenciado por index.html no existe: $asset"
    fi
  done < "$entry_assets_file"

  validate_markers "$DIST_DIR" "dist candidato"
  validate_forbidden_markers "$DIST_DIR" "dist candidato"

  if [[ -s "$DIST_DIR/manifest.webmanifest" || -s "$DIST_DIR/manifest.json" ]]; then
    log_pass "Manifest PWA generado en dist"
  else
    log_warn "No se detecta manifest PWA en dist"
  fi

  if find "$DIST_DIR" -maxdepth 1 -type f \( -name 'sw.js' -o -name 'workbox-*.js' \) | rg --quiet .; then
    log_pass "Service worker/PWA generado en dist"
  else
    log_warn "No se detecta service worker en la raiz de dist"
  fi
}

download_live_snapshot() {
  local live_dir="$REPORT_DIR/live"
  mkdir -p "$live_dir/assets"

  if ! curl --fail --silent --show-error --location "$PROD_URL/" --output "$live_dir/index.html"; then
    log_fail "No se pudo descargar index de produccion: $PROD_URL"
    return 1
  fi

  log_pass "Index live descargado desde produccion"

  local live_entry_assets="$REPORT_DIR/live-entry-assets.txt"
  local live_assets="$REPORT_DIR/live-assets.txt"
  extract_assets "$live_dir/index.html" > "$live_entry_assets"

  if [[ ! -s "$live_entry_assets" ]]; then
    log_fail "No se detectan assets JS/CSS en index live"
    return 1
  fi

  cp "$live_entry_assets" "$live_assets"

  while IFS= read -r asset; do
    [[ -z "$asset" ]] && continue
    mkdir -p "$live_dir/$(dirname "$asset")"
    if curl --fail --silent --show-error --location "$PROD_URL/$asset" --output "$live_dir/$asset"; then
      log_pass "Asset live descargado: $asset"
    else
      log_fail "No se pudo descargar asset live: $asset"
    fi
  done < "$live_entry_assets"

  local changed=1
  while [[ "$changed" -eq 1 ]]; do
    changed=0
    while IFS= read -r asset; do
      [[ -z "$asset" ]] && continue
      [[ -s "$live_dir/$asset" ]] || continue
      discover_referenced_assets "$live_dir/$asset"
    done < "$live_assets" | sort -u > "$REPORT_DIR/live-discovered-assets.txt"

    while IFS= read -r asset; do
      [[ -z "$asset" ]] && continue
      if ! rg --fixed-strings --quiet "$asset" "$live_assets"; then
        echo "$asset" >> "$live_assets"
        changed=1
        mkdir -p "$live_dir/$(dirname "$asset")"
        if curl --fail --silent --show-error --location "$PROD_URL/$asset" --output "$live_dir/$asset"; then
          log_pass "Asset live dinamico descargado: $asset"
        else
          log_fail "No se pudo descargar asset live dinamico: $asset"
        fi
      fi
    done < "$REPORT_DIR/live-discovered-assets.txt"
    sort -u "$live_assets" -o "$live_assets"
  done

  log_pass "Assets JS/CSS totales descargados de live: $(wc -l < "$live_assets" | tr -d ' ')"

  validate_markers "$live_dir" "produccion live"
  validate_forbidden_markers "$live_dir" "produccion live"
}

validate_live_health() {
  local health_file="$REPORT_DIR/live-health.json"
  local health_url="${PROD_URL%/}${HEALTH_PATH}"

  if curl --fail --silent --show-error --location "$health_url" --output "$health_file"; then
    log_pass "Health live descargado: $health_url"
  else
    log_fail "No se pudo consultar health live: $health_url"
    return
  fi

  if rg_quiet "\"status\"" "$health_file" && rg_quiet "\"ok\"" "$health_file"; then
    log_pass "Health live informa status ok"
  else
    log_fail "Health live no informa status ok"
  fi

  if rg_quiet "pasos" "$health_file"; then
    log_pass "Health live identifica Pasos"
  else
    log_warn "Health live no incluye identificador pasos"
  fi
}

compare_local_and_live_assets() {
  local dist_assets="$REPORT_DIR/dist-assets.txt"
  local live_assets="$REPORT_DIR/live-assets.txt"

  if [[ ! -s "$dist_assets" || ! -s "$live_assets" ]]; then
    log_fail "No hay listas de assets suficientes para comparar dist vs live"
    return
  fi

  local only_dist="$REPORT_DIR/assets-only-dist.txt"
  local only_live="$REPORT_DIR/assets-only-live.txt"
  comm -23 "$dist_assets" "$live_assets" > "$only_dist"
  comm -13 "$dist_assets" "$live_assets" > "$only_live"

  if [[ -s "$only_dist" || -s "$only_live" ]]; then
    log_fail "Produccion live no sirve los mismos assets JS/CSS que el dist candidato"
    {
      echo
      echo "### Assets solo en dist candidato"
      sed 's/^/- /' "$only_dist"
      echo
      echo "### Assets solo en produccion live"
      sed 's/^/- /' "$only_live"
    } >> "$REPORT_FILE"
  else
    log_pass "Produccion live sirve los mismos assets JS/CSS que dist candidato"
  fi
}

write_report_footer() {
  {
    echo
    echo "## Decision"
    if [[ "$failures" -eq 0 ]]; then
      echo
      echo "**GO**"
      echo
      echo "Sin bloqueos detectados. Warnings: $warnings."
    else
      echo
      echo "**NO GO**"
      echo
      echo "Bloqueos detectados: $failures. Warnings: $warnings."
    fi
  } >> "$REPORT_FILE"
}

write_report_header
require_cmd rg
if [[ "$DO_BUILD" -eq 1 ]]; then require_cmd npm; fi
if [[ "$CHECK_LIVE" -eq 1 ]]; then require_cmd curl; fi

if [[ "$failures" -eq 0 && "$DO_BUILD" -eq 1 ]]; then
  echo >> "$REPORT_FILE"
  echo "## Build" >> "$REPORT_FILE"
  if (cd "$ROOT_DIR" && npm run build) >> "$REPORT_FILE" 2>&1; then
    log_pass "Build local completado"
  else
    log_fail "Build local fallido"
  fi
fi

if [[ "$failures" -eq 0 ]]; then
  validate_dist
fi

if [[ "$failures" -eq 0 && "$CHECK_LIVE" -eq 1 ]]; then
  download_live_snapshot
  validate_live_health
  compare_local_and_live_assets
fi

write_report_footer

echo
echo "Reporte: $REPORT_FILE"

if [[ "$failures" -eq 0 ]]; then
  echo "Decision: GO"
  exit 0
fi

echo "Decision: NO GO"
exit 1
