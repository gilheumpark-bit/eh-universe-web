# HPG 7.0 Omniverse Platform

HPG 7.0 starts as a modular rebuild of the 6.0 Omniverse prototype.

The immediate goals are:

- split the monolith into stable packages
- move multiverse branching to copy-on-write storage
- add a real bridge layer for dashboards and engine sync
- stage advanced simulation modules as isolated units

Current staged modules:

- PART 28: Kaluza-Klein extra-dimension projection
- PART 29: Hawking radiation and black-hole evaporation
- PART 30: Grand unification regime model
- PART 31: Command Center streaming bridge
- PART 32: Unreal and Unity material bridges
- PART 33: Virtual quantum circuit simulator
- NOA TOWER: web page narrative game prototype with psychological vector routing

Directory map:

- `hpg7/core`: state, branching, scheduling, audit
- `hpg7/noa_tower`: dialogue dataset and web game inference engine
- `hpg7/physics/advanced`: PART 28-30 modules
- `hpg7/bridges`: PART 31-32 output adapters
- `hpg7/quantum_vm`: PART 33 circuit and simulator
- `benchmarks`: quick performance probes
- `tests`: import and bootstrap verification

Run:

```powershell
python run_hpg7.py demo
python run_hpg7.py serve
python run_hpg7.py serve-noa-tower
python run_hpg7.py noa-tower-demo
python run_hpg7.py export-bridges --out-dir exports
python -m unittest discover -s tests
```

NOA TOWER page:

- run `python run_hpg7.py serve-noa-tower`
- open `http://127.0.0.1:8765/noa-tower`
- includes clue unlocks, theory fragments, final verdict submission, and browser autosave
- design notes live in `NOA_TOWER_WEB_GAME_PLAN.md`

Initial optimization strategy:

- copy-on-write branch overlays instead of deep copies
- deterministic event payloads for reproducibility
- module isolation so expensive physics can be toggled per run
- bridge payloads split into snapshot and delta packets
