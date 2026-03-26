# EH Warp Gate Command

Standalone web prototype for the HPG warp-gate gameplay loop.

Files:

- `index.html`: single-page interface
- `styles.css`: archive / gate inspired visual layer
- `app.js`: simulation loop, data tables, and SJC verdict logic
- `serve.py`: tiny local server

Loop:

1. Select a ship
2. Build relay infrastructure
3. Upgrade HCTG and chamber systems
4. Calibrate toward `0.51` consistency
5. Charge, focus, and commit the jump
6. Resolve `ALLOW / HOLD / DENY`
7. Run field-physics actions for motion, collision, thermal recovery, support cycles, and orbital stepping

Run:

```powershell
cd "C:\Users\sung4\OneDrive\바탕 화면\AI 소설\설정집\룰북\공개용\새 폴더\최종\마스터\개봉 절대금지\까마귀\6.0\모델별정리\3.0라이트\Narrative Sentinel™\7.0\warp_gate_command"
python serve.py
```

Open `http://127.0.0.1:8047`

Notes:

- Save uses browser local storage.
- The model is gameplay-oriented, not a rigorous physics solver.
- The folder is self-contained so it can later be lifted into a Next.js route.
- The latest prototype also exposes gameplay-system panels for motion, hull damage, thermal control, resource growth, and orbit timing.
