# Incident Response Runbook — EH Universe / Loreguard Studio

**Version**: 1.0 (2026-04-24)
**Audience**: internal maintainer · on-call engineer · future support team
**Source-of-truth**: this file.  Cross-reference: `docs/dgx-runbook.md` · `CLAUDE.md`.

---

## 1. Severity matrix

| Sev | Definition | Response |
|-----|------------|----------|
| **S0** | Customer data loss risk · unauthorized access · payment compromise | Halt deploys · page maintainer immediately · preserve evidence |
| **S1** | Complete service outage (SaaS unreachable · all-user AI unavailable) | Respond within 30 min · announce on `/status` |
| **S2** | Major feature broken (single AI provider down · specific page 5xx · checkout broken for some) | Respond within 2 hours · partial workaround if possible |
| **S3** | Minor bug · cosmetic · non-blocking | Log as GitHub Issue · next release |

---

## 2. Intake

1. **Signal source**
   - User email → `gilheumpark@gmail.com`
   - GitHub Issues label `incident`
   - Sentry alert
   - Vercel deployment failure
   - `/api/health` polled by `/status` reports `unhealthy`

2. **Initial triage (5 min)**
   - Reproduce on production URL
   - Check `/api/health`, `/status`
   - Check Vercel dashboard last deploy · recent logs
   - Check DGX server reachable (internal network only)

3. **Classify severity** using the matrix above.

---

## 3. Response flows

### 3.1  S0 (data / security)

1. **Stop the bleed**
   - If Firestore rules bypass: disable write for affected collection via Firebase Console → Rules → replace with `allow write: if false;`
   - If API key leak: rotate immediately (Gemini / OpenAI / Claude / Stripe)
   - If Vercel env var exposed in log: rotate + purge logs
2. **Evidence snapshot**
   - Screenshot Vercel runtime logs
   - Export affected Firestore docs
   - Save Sentry issue ID
3. **Rollback**
   - `git revert <bad-sha>` + force-push to `master` OR
   - Vercel dashboard → Deployments → promote previous healthy deploy
4. **Notify affected users** within 24 h (K-PIPA 30일, EU GDPR Art.33 72시간 고지)
5. **Post-mortem** within 7 days → `docs/post-mortems/YYYY-MM-DD-{slug}.md`

### 3.2  S1 (full outage)

1. **Identify layer**
   - Frontend (Next.js rendering): Vercel dashboard → deployment status
   - API routes: check `/api/health` categories
   - DGX AI: `curl http://<DGX-IP>:8001/v1/models` from internal machine
   - Firestore: Firebase Console → Firestore → Usage
2. **Hotfix or rollback**
   - Bad deploy: revert in Vercel dashboard (1 click)
   - DGX down: SSH to DGX, `bash scripts/deploy-dgx.sh`
   - Firestore rules broke: re-deploy last good rules
3. **Communicate**
   - Update `/status` (health endpoint already reflects)
   - Post GitHub Issue with `incident` label
4. **Verify recovery** via manual request to key paths:
   - `GET /` — landing renders
   - `GET /api/health` — `healthy`
   - `POST /api/chat` with test prompt — AI responds

### 3.3  S2 (partial)

1. **Scope** — one provider · one page · one feature?
2. **Workaround** announce on `/status` if user-visible
3. **Fix** — normal PR flow; expedite review

---

## 4. Rollback mechanics

### 4.1  Vercel deploy rollback
- Vercel dashboard → Project → Deployments → previous healthy → "Promote to Production"
- Takes ~30 s

### 4.2  Git rollback
```bash
git log --oneline -10
git revert <bad-sha>
git push origin master
# OR for emergency:
git reset --hard <last-good-sha>
git push origin master --force-with-lease
```
Last resort — coordinate with any other collaborators first.

### 4.3  Firestore rules rollback
- Firebase Console → Firestore → Rules → History → previous version → "Restore"
- Takes ~1 min to propagate

### 4.4  Env var revert
- Vercel dashboard → Settings → Environment Variables → Edit → redeploy

---

## 5. Known failure modes

| Symptom | Likely cause | Remedy |
|---------|-------------|--------|
| `/api/chat` 500 | DGX unreachable (Cloudflare Tunnel dead) | SSH DGX, check vLLM process; fallback to BYOK provider |
| Firestore read 403 everywhere | Rule deploy broke | Firebase Console → Rules → History → restore |
| Sentry DSN invalid | `NEXT_PUBLIC_SENTRY_DSN` rotated, not updated on Vercel | Update env var, redeploy |
| Lighthouse drops | Font CDN dead (cdn.jsdelivr / fonts.gstatic) | Next.js font cache usually handles; no action unless persistent |
| `/api/cron/universe-daily` 401 in Vercel Cron | `CRON_SECRET` scope mismatch | Verify Production scope; redeploy |

---

## 6. Contact ladder

| Tier | Contact | Expected response |
|------|---------|-------------------|
| 1 (internal) | `gilheumpark@gmail.com` | 30 min business hours, 4 h off-hours |
| 2 (user email) | same | 3 business days |
| 3 (legal / law enforcement) | `gilheumpark@gmail.com` | Forward to legal counsel |

---

## 7. Post-incident

1. **Incident log** → `docs/post-mortems/YYYY-MM-DD-{slug}.md`
   - Timeline · root cause · remediation · action items
2. **Update SECURITY.md** if vulnerability class was new
3. **Add defense** — regression test · monitoring rule · runbook entry
4. **Notify affected users** if not already done

---

## 8. SLIs / SLOs (alpha baseline)

| Metric | Target |
|--------|--------|
| Frontend availability | 99.5% / month |
| `/api/chat` p95 latency | < 30 s (alpha; beta target 15 s) |
| Firestore read success | 99.9% / month |
| Sentry error rate | < 0.1% of requests |

Alpha stage — numbers are *directional*, not contractual. Formal SLO/SLA published at beta.

---

*IDENTITY_SEAL: incident-response | role=on-call runbook | scope=S0~S3 + rollback + contacts*
