# Testing Hertz

This project uses automated tests to validate the reconciler runtime, bridge behavior, and telemetry utilities without touching real hardware.

## What we test

- Reconciler lifecycle behavior (`init`, updates, unmount cleanup).
- Error propagation and React integration (`act`, wrapper components, refs).
- Bridge peripheral behavior with mocked hardware calls.
- Telemetry store and React telemetry hooks.

## What we do not test automatically

- Real hardware communication in CI/unit tests.
- Scripts under `src/examples/*` that drive physical devices.

Manual hardware validation should be done by a human on a safe setup.

## Test stack

- `vitest` as the test runner.
- React `act` for reconciler integration tests.
- A dedicated mock bridge in `src/test/mock-bridge.ts`.

## Run tests

```bash
pnpm test
```

Run one file:

```bash
pnpm test src/reconciler/reconciler.test.tsx
```

## Writing new tests

1. Prefer unit tests for pure class/store behavior.
2. Use integration tests (with `act`) for renderer-level behavior.
3. Mock hardware dependencies; do not connect to physical devices.
