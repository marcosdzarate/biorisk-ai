#!/usr/bin/env sh
set -eu

# Usage:
#   WIDOCO_JAR=/path/to/widoco.jar ./generate-docs.sh [output-directory]

WIDOCO_JAR_PATH="${WIDOCO_JAR:-widoco.jar}"
WIDOCO_OUTPUT_DIR="${1:-docs}"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

case "$WIDOCO_JAR_PATH" in
  /*) ;;
  *) WIDOCO_JAR_PATH="$(pwd)/$WIDOCO_JAR_PATH" ;;
esac

case "$WIDOCO_OUTPUT_DIR" in
  /*) ;;
  *) WIDOCO_OUTPUT_DIR="$(pwd)/$WIDOCO_OUTPUT_DIR" ;;
esac

if [ ! -f "$WIDOCO_JAR_PATH" ]; then
  echo "WIDOCO JAR not found: $WIDOCO_JAR_PATH" >&2
  exit 1
fi

WIDOCO_TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$WIDOCO_TEMP_DIR"' EXIT HUP INT TERM

(
  cd "$WIDOCO_TEMP_DIR"
  java -jar "$WIDOCO_JAR_PATH" \
    -ontFile "$SCRIPT_DIR/biodivrisK-onto.owl" \
    -outFolder "$WIDOCO_OUTPUT_DIR" \
    -confFile "$SCRIPT_DIR/widoco.conf" \
    -rewriteAll \
    -webVowl \
    -includeAnnotationProperties \
    -uniteSections \
    -lang en
)

# GitHub Pages serves index.html at the site root.
cp "$WIDOCO_OUTPUT_DIR/index-en.html" "$WIDOCO_OUTPUT_DIR/index.html"

# Replace WIDOCO's generic repository README with project-specific metadata.
cat > "$WIDOCO_OUTPUT_DIR/readme.md" <<'EOF'
# BiodivRisk-Onto documentation

This directory contains the WIDOCO-generated documentation for
**BiodivRisk-Onto v0.3.1**.

- [Open the ontology documentation](index.html)
- [Browse the WebVOWL visualisation](webvowl/index.html)
- [Review the competency questions and SPARQL queries](competency-questions.md)
- [Download the ontology source](ontology.owl)

The canonical namespace is <https://w3id.org/biodivrisK-onto#>.
The ontology is maintained by Marcos Daniel Zárate, CESIMAR-CONICET.
EOF

# WIDOCO 1.4.25 omits the fragment marker for this local annotation-property
# link. Correct both entry pages until the upstream renderer is fixed.
sed -i 's/href="hasBridgingCondition"/href="#hasBridgingCondition"/g' \
  "$WIDOCO_OUTPUT_DIR/index-en.html" "$WIDOCO_OUTPUT_DIR/index.html"

# Normalize the Windows-style relative link emitted in the provenance page.
sed -i 's#\.\.\\index-en\.html#../index-en.html#g' \
  "$WIDOCO_OUTPUT_DIR/provenance/provenance-en.html"

echo "Documentation generated in $WIDOCO_OUTPUT_DIR"
