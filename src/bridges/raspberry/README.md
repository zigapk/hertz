# Raspberry Pi bridge (planned)

A Raspberry Pi bridge is planned but not implemented in this repository yet.

Current status:

- No Raspberry Pi peripherals are exported from `hertz`.
- No runtime bridge code exists under `src/bridges/raspberry` yet.

The intended direction is to provide native Raspberry Pi GPIO peripherals that follow the same Hertz reconciler lifecycle as the ClearCore bridge.

If you want to start building it, use:

- `src/bridges/clearcore` as the reference implementation,
- `docs/bring-your-own-hardware.md` for bridge authoring guidance.
