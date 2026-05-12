#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Gemma 4 Good Hackathon — Trij model setup script
# ──────────────────────────────────────────────────────────────
# This script helps you download Gemma 4 from Kaggle and make it
# available locally for Trij via Ollama.
#
# Prerequisites:
#   1. Python 3.10+ with `pip install kagglehub`
#   2. Ollama installed (https://ollama.com)
#   3. A Kaggle account (free)
#
# Usage:
#   chmod +x scripts/download-gemma4.sh
#   ./scripts/download-gemma4.sh
#
# Options:
#   --model <variant>   Model variant: e2b, e4b, 27b, 31b (default: e2b)
#   --quant  <q>        Quantization: q4_k_m, q5_k_m, q8_0 (default: q4_k_m)
#   --ollama-name <n>   Name for the Ollama model (default: gemma4)
# ──────────────────────────────────────────────────────────────

set -euo pipefail

MODEL_VARIANT="${1:-e2b}"
QUANT="${2:-q4_k_m}"
OLLAMA_NAME="${3:-gemma4}"

echo "═══ Trij — Gemma 4 Downloader ═══"
echo "  Variant:      ${MODEL_VARIANT}"
echo "  Quantization: ${QUANT}"
echo "  Ollama name:  ${OLLAMA_NAME}"
echo ""

# ── Step 1: Download from Kaggle ────────────────────────────

echo "▸ Step 1: Downloading Gemma 4 ${MODEL_VARIANT} from Kaggle..."

if ! python3 -c "import kagglehub" 2>/dev/null; then
  echo "  Installing kagglehub..."
  pip install -q kagglehub
fi

DOWNLOAD_DIR=$(python3 -c "
import kagglehub
path = kagglehub.model_download('google/gemma-4/GGUF/Gemma-4-${MODEL_VARIANT}-${QUANT}')
print(path)
")

echo "  Downloaded to: ${DOWNLOAD_DIR}"

# ── Step 2: Create Ollama Modelfile ─────────────────────────

echo ""
echo "▸ Step 2: Creating Ollama Modelfile..."

cat > /tmp/Modelfile.${OLLAMA_NAME} <<MODELEOF
FROM ${DOWNLOAD_DIR}/*.gguf

TEMPLATE """{{ if .System }}<|start_header_id|>system<|end_header_id|>

{{ .System }}<|eot_id|>{{ end }}<|start_header_id|>user<|end_header_id|>

{{ .Prompt }}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

"""
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER stop "<|eot_id|>"
PARAMETER stop "<|start_header_id|>"
PARAMETER stop "<|end_header_id|>"
MODELEOF

echo "  Modelfile created at /tmp/Modelfile.${OLLAMA_NAME}"

# ── Step 3: Create Ollama model ─────────────────────────────

echo ""
echo "▸ Step 3: Creating Ollama model '${OLLAMA_NAME}'..."
ollama create "${OLLAMA_NAME}" -f /tmp/Modelfile.${OLLAMA_NAME}

echo ""
echo "═══ Done! ═══"
echo ""
echo "Gemma 4 ${MODEL_VARIANT} is now available in Ollama as '${OLLAMA_NAME}'."
echo ""
echo "To use with Trij:"
echo "  1. Open Trij Settings → Ollama configuration"
echo "  2. Set Ollama URL: http://localhost:11434"
echo "  3. Set Ollama model: ${OLLAMA_NAME}"
echo "  4. Set Inference engine: Ollama"
echo ""
echo "Or run directly to test:"
echo "  ollama run ${OLLAMA_NAME}"
echo ""
echo "Verify the model is running:"
echo "  curl http://localhost:11434/api/tags"
