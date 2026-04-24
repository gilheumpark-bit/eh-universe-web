# DGX Server Runbook — Loreguard AI Inference

**Version**: 2026-04-24 (35B MoE 단일 전환 후)
**Hardware**: NVIDIA DGX GB10 (128GB VRAM)
**Model**: Qwen 3.6-35B-A3B-FP8 MoE
**Entry script**: `scripts/deploy-dgx.sh`
**Cross-reference**: `CLAUDE.md` §인프라 연동 · `docs/incident-response.md` §5

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────┐
│  Vercel Edge (SaaS frontend)                        │
│    ↓ SSE stream                                     │
│  vLLM OpenAI-compat endpoint  @ http://<DGX>:8001   │
│    ↑                                                │
│  Qwen 3.6-35B-A3B-FP8 MoE (FlashInfer + N-Gram SD)  │
│                                                     │
│  Adjacent services:                                 │
│    RAG API       @ :8082  (ChromaDB 99만 문서)      │
│    ComfyUI FLUX  @ :8188  (Flux-Schnell FP8)        │
└─────────────────────────────────────────────────────┘
```

Frontend priority (`src/lib/dgx-models.ts`):
1. `NEXT_PUBLIC_SPARK_GATEWAY_URL`
2. `NEXT_PUBLIC_SPARK_SERVER_URL`
3. `http://localhost:8001` (dev only)

---

## 2. Normal deploy

```bash
# On the DGX box:
bash scripts/deploy-dgx.sh
```

Steps performed:
1. `git fetch && git reset --hard origin/master`
2. Kill old `vllm.entrypoints` + legacy `main:app` processes
3. `bash scripts/start_vllm.sh` (no `both` arg — single 35B)
4. Wait up to 180s for `http://localhost:8001/v1/models`
5. Health check prints OK/FAIL for :8001 · :8082 · :8188

**Expected completion**: 60–120 s (model warm-load).

---

## 3. Health checks

```bash
# On DGX:
curl -s http://localhost:8001/v1/models
curl -s http://localhost:8082/health
curl -s http://localhost:8188/system_stats
```

**Expected**: `200 OK` + JSON body each.

Remote (from developer laptop via internal VPN only — Cloudflare Tunnel 차단 중):
```bash
curl -s http://<DGX-LAN-IP>:8001/v1/models
```

---

## 4. Common failure modes

### 4.1  vLLM failed to start

**Symptom**: `deploy-dgx.sh` prints "모델 로딩 대기 (최대 180초)..." but never shows "준비 완료".

**Check**:
```bash
tail -100 /tmp/vllm-35b.log
```

**Likely causes**:
- VRAM in use by zombie process → `pkill -9 -f vllm` + retry
- Model file missing → check `start_vllm.sh` referenced path
- CUDA OOM → other GPU workloads present (ComfyUI? other models?) — stop them first

### 4.2  Generation hangs mid-stream

**Symptom**: User sees partial response, then stalls; no error.

**Check**:
```bash
# vLLM 내부 큐 상태
curl http://localhost:8001/metrics | grep "vllm:num_requests"
```

**Mitigation**:
- If queue > 20: scaling issue; reject new requests at gateway layer
- If single request hung: `kill -USR1 <vllm-pid>` to dump state (if supported); else restart

### 4.3  FlashInfer version drift

**Symptom**: `ImportError: FlashInfer` or `AttributeError: flashinfer.prefill`.

**Remedy**: reinstall FlashInfer matching the current vLLM minor version:
```bash
pip install flashinfer-python --index-url https://flashinfer.ai/whl/cu124
```
Document exact version in commit message.

---

## 5. Rollback

### 5.1  Code rollback
Normal git revert (see `incident-response.md` §4.2).

### 5.2  Config rollback
`scripts/deploy-dgx.sh` keeps prior logs at `/tmp/vllm-35b.log`.
- Previous dual-engine architecture is documented in git history at commit `021161e4~1` (before the 2026-04-24 single-35B transition). Never re-enable without revisiting CLAUDE.md.

### 5.3  Emergency "black hole"
If the DGX must be taken offline (security incident, hardware fault):
```bash
# Stop all inference services
pkill -9 -f vllm
pkill -9 -f comfyui
```
- Frontend will automatically fallback to BYOK (user's own API keys) via `dgx-models.ts` priority list.
- Announce on `/status` within 30 min.

---

## 6. Cloudflare Tunnel status (blocked)

As of 2026-04-24 (per `CLAUDE.md:187-188`):
- Tunnel is **blocked** due to instability.
- Service runs on 192.168.x.x **internal network only**.
- Production frontend cannot reach DGX from Vercel Edge directly without tunnel.
- Current operation: dev + staging use BYOK providers; DGX 35B reachable only from internal dev machines.

**Restoration plan** (not this sprint):
- Evaluate WireGuard or Tailscale as replacement
- Or reconfigure Cloudflare Tunnel with cloudflared 2024+ client

Until restored, document expected behavior:
- `SPARK_SERVER_URL` env var unset on production → frontend uses BYOK
- DGX usage limited to internal testing

---

## 7. Maintenance windows

No formal schedule during alpha. Prefer:
- Weekly: `apt update && apt upgrade` on DGX
- Monthly: review `nvidia-smi`, check thermal logs
- After each deploy: verify `/v1/models` returns 200

---

## 8. Escalation

If DGX cannot be recovered within 4 hours:
1. Announce alpha participants on `/status` (manual)
2. Flip a global feature flag (future: `DGX_DISABLED=true` env var) to force BYOK path for all AI routes
3. Post-mortem in `docs/post-mortems/`

---

*IDENTITY_SEAL: dgx-runbook | role=DGX operations | covers=deploy+recovery+rollback*
