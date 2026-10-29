#!/usr/bin/env bash

DIR="${1:-datos-muestra}"
UA="AlertAR-relevamiento (proyecto academico)"
INTERVALO=900

RSS_SMN="https://ssl.smn.gob.ar/CAP/AR.php"
RSS_INPRES="https://www.inpres.gob.ar/mapa/sismos.xml"
INA_WFS="https://alerta.ina.gob.ar/geoserver/public2/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=public2:ultimas_alturas_con_timeseries&outputFormat=application/json&count=500"

mkdir -p "$DIR"/smn/cap "$DIR"/ina "$DIR"/inpres

exec 9>"$DIR/.lock"
if ! flock -n 9; then
    echo "Ya hay otra instancia recolectando en $DIR" >&2
    exit 1
fi

trap 'rm -f "$DIR"/*/.tmp.* "$DIR"/smn/cap/.tmp.*' EXIT
trap 'exit 0' INT TERM

registrar() {
    echo "$(date -u +%FT%TZ) $*" >> "$DIR/registro.log"
}

descargar() {
    curl -sS -L --connect-timeout 10 --max-time "$3" \
        -A "$UA" -o "$2" -w '%{http_code}' "$1" 2>/dev/null
}

guardar() {
    local url="$1" carpeta="$2" nombre="$3" ext="$4" limite="$5"
    local tmp codigo hash

    tmp=$(mktemp "$DIR/$carpeta/.tmp.XXXXXX") || {
        registrar "$nombre ERROR no_se_pudo_crear_temporal"
        return
    }

    codigo=$(descargar "$url" "$tmp" "$limite")

    if [ "$codigo" != "200" ] || [ ! -s "$tmp" ]; then
        registrar "$nombre ERROR http=$codigo"
        rm -f "$tmp"
        return
    fi

    hash=$(sha256sum "$tmp" | cut -d' ' -f1)
    if [ "$hash" = "$(cat "$DIR/$carpeta/.ultimo_hash" 2>/dev/null)" ]; then
        registrar "$nombre IGUAL"
        rm -f "$tmp"
    else
        mv "$tmp" "$DIR/$carpeta/${nombre}_$(date -u +%Y%m%dT%H%M%SZ)_${hash:0:12}.$ext"
        echo "$hash" > "$DIR/$carpeta/.ultimo_hash"
        registrar "$nombre CAMBIO"
    fi
}

guardar_cap() {
    local url="$1" nombre tmp codigo hash

    nombre=$(basename "${url%%\?*}")

    if [ -z "$nombre" ] || [ -f "$DIR/smn/cap/$nombre" ]; then
        return
    fi

    tmp=$(mktemp "$DIR/smn/cap/.tmp.XXXXXX") || {
        registrar "CAP $nombre ERROR no_se_pudo_crear_temporal"
        return
    }

    codigo=$(descargar "$url" "$tmp" 30)

    if [ "$codigo" != "200" ] || [ ! -s "$tmp" ]; then
        registrar "CAP $nombre ERROR http=$codigo"
        rm -f "$tmp"
        return
    fi

    if ! grep -Eq '<([[:alnum:]_]+:)?alert([[:space:]>])' "$tmp"; then
        registrar "CAP $nombre INVALIDO (sin elemento alert)"
        rm -f "$tmp"
        return
    fi

    if ! grep -Eq '<([[:alnum:]_]+:)?polygon([[:space:]>])' "$tmp"; then
        registrar "CAP $nombre SIN_POLIGONO"
    fi

    hash=$(sha256sum "$tmp" | cut -d' ' -f1)
    mv "$tmp" "$DIR/smn/cap/$nombre"
    printf '%s\t%s\t%s\n' "$(date -u +%FT%TZ)" "$nombre" "$hash" \
        >> "$DIR/smn/cap/manifiesto.tsv"
    registrar "CAP $nombre NUEVO"
}

while true; do
    guardar "$RSS_SMN" smn rss xml 30
    guardar "$RSS_INPRES" inpres sismos xml 30
    guardar "$INA_WFS" ina ultimas json 60

    ultimo_rss=$(ls -t "$DIR"/smn/rss_*.xml 2>/dev/null | head -n 1)

    if [ -n "$ultimo_rss" ]; then
        python3 - "$ultimo_rss" <<'PY' | sort -u | while IFS= read -r url; do
import sys
import xml.etree.ElementTree as ET
from urllib.parse import urljoin

rss_path = sys.argv[1]
base = "https://ssl.smn.gob.ar/CAP/AR.php"

try:
    root = ET.parse(rss_path).getroot()
except (ET.ParseError, OSError) as exc:
    print(f"ERROR_RSS\t{exc}", file=sys.stderr)
    raise SystemExit(1)

for node in root.iter():
    tag = node.tag.rsplit("}", 1)[-1].lower()
    if tag in ("link", "guid") and node.text and node.text.strip():
        url = urljoin(base, node.text.strip())
        if (
            url.startswith("https://ssl.smn.gob.ar/")
            and "/feeds/CAP/xml_generados/" in url
            and url.lower().endswith(".xml")
        ):
            print(url)
PY
            [ -n "$url" ] && guardar_cap "$url"
        done
    fi

    sleep "$INTERVALO" &
    wait $!
done

