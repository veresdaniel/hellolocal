#!/usr/bin/env bash
# Regenerate overview marketing WebP ladder from JPG masters in public/marketing/.
# Requires: sips (macOS), cwebp
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)/public/marketing"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cd "$ROOT"

WIDTHS=(480 720 960 1100)
NAMES=(map-szeged craft-workshop local-service side-street visitor-hiker)

for name in "${NAMES[@]}"; do
  [[ -f "${name}.jpg" ]] || { echo "missing ${name}.jpg"; exit 1; }
  for w in "${WIDTHS[@]}"; do
    sips -Z "$w" "${name}.jpg" --out "${TMP}/${name}-${w}.jpg" >/dev/null
    q=58
    if [[ "$w" -le 720 ]]; then q=52; fi
    cwebp -q "$q" -m 6 -mt "${TMP}/${name}-${w}.jpg" -o "${name}-${w}.webp"
  done
  cp "${name}-960.webp" "${name}.webp"
  sips -s format jpeg -s formatOptions 70 "${TMP}/${name}-960.jpg" --out "${name}.jpg" >/dev/null
done

echo "Done. Responsive WebP ladder in ${ROOT}"
ls -la ./*-{480,720,960,1100}.webp | awk '{print $5, $9}'
