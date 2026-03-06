# Adapter Pod: One-Time Setup + Persistent Restart Script

## Part 1: Save Script to Network Volume (ONE TIME ONLY)

**Paste Command 1 first, then paste Command 2.**

### Command 1 of 2 (paste this first):

```bash
cat > /workspace/scripts/full-restart-adapted.sh << 'PART1_END'
#!/bin/bash
set -e

echo "═══════════════════════════════════════════════════════"
echo "   ADAPTER POD FULL RESTART SCRIPT"
echo "═══════════════════════════════════════════════════════"

echo ""; echo "▶ [1/4] Installing vLLM 0.6.6 + compatible transformers..."
pip install vllm==0.6.6 transformers==4.44.2

echo ""; echo "▶ [2/4] Adding head_dim=128 to config.json..."
python3 -c "
import json
p='/workspace/models/mistralai/Mistral-7B-Instruct-v0.2/config.json'
c=json.load(open(p))
c['head_dim']=128
json.dump(c,open(p,'w'),indent=2)
print('Added head_dim=128')
"
PART1_END
```

### Command 2 of 2 (paste this second):

```bash
cat >> /workspace/scripts/full-restart-adapted.sh << 'PART2_END'

echo ""; echo "▶ [3/4] Killing nginx..."
pkill nginx 2>/dev/null || echo "   (nginx not running)"

echo ""; echo "▶ [4/4] Starting vLLM server on port 8001..."
echo "   Wait for: 'Uvicorn running on http://0.0.0.0:8001'"
echo "═══════════════════════════════════════════════════════"
/workspace/scripts/start-adapted.sh
PART2_END

chmod +x /workspace/scripts/full-restart-adapted.sh
echo "✅ Script saved! Run with: /workspace/scripts/full-restart-adapted.sh"
```

---

## Part 2: Every Subsequent Pod Creation

After creating a new pod attached to `brightrun-inference-adapter-pod` volume, just run:

```bash
/workspace/scripts/full-restart-adapted.sh
```

---

## Quick Reference

| Step | Command |
|------|---------|
| Create pod | RunPod Console → Deploy → attach `brightrun-inference-adapter-pod` volume |
| Start everything | `/workspace/scripts/full-restart-adapted.sh` |
| Wait for | `Uvicorn running on http://0.0.0.0:8001` |

---

## Test Endpoint (Git Bash)

```bash
POD_ID="your_pod_id_here"
curl -X POST "https://${POD_ID}-8001.proxy.runpod.net/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{"model": "adapter-6fd5ac79", "messages": [{"role": "user", "content": "Hello"}], "max_tokens": 20}'
```
