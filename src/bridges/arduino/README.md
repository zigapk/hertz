# Arduino bridge (planned)

An Arduino bridge is planned but not implemented in this repository yet.

Current status:

- No Arduino peripherals are exported from `hertz`.
- No runtime bridge code exists under `src/bridges/arduino` yet.

The intended direction is to provide an Arduino bridge over a transport such as serial, following the same reconciler patterns used by the ClearCore bridge.

If you want to start building it, use:

- `src/bridges/clearcore` as the reference implementation,
- `docs/bring-your-own-hardware.md` for bridge authoring guidance.
