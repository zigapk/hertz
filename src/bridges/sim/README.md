# Simulation bridge

This bridge connects Hertz peripherals to an in-memory 2D robot
simulation instead of physical hardware. It needs no devices, drivers,
or serial connections, which makes it the only bridge that is safe to
run directly (including in CI or as a demo).

It implements a differential-drive robot in a square room with static
obstacles, plus a front collision sensor. The simulation state can be
streamed to a browser viewer over Server-Sent Events (SSE).

## What is included

- `SimMotor` (`simmotor`): drives one virtual wheel (`side: "L" | "R"`)
  at a normalized `velocity` in the range `-1..1`.
- `SimFrontSensor` (`simfrontsensor`): reports whether the robot's front
  semicircle is touching a wall or obstacle, via `onPressedChange`.
- `SimEngine`: the physics core (kinematics, collision resolution,
  front-sensor probing). Passed to `createReconciler` as the hardware.
- `startSSEServer(engine, port?)`: streams `SimState` snapshots to
  connected viewers and returns a `broadcast()` function.

Exports are available from `@/bridges/sim` via `simPeripherals` and the
component wrappers.

## Minimal setup

```tsx
import { SimEngine, SimMotor, simPeripherals } from "@/bridges/sim";
import { createReconciler } from "@/reconciler";

const Program = () => <SimMotor side="L" velocity={1} />;

async function main() {
	const engine = new SimEngine();
	setInterval(() => engine.tick(1 / 60), 1000 / 60);

	const { render, runEventLoop } = createReconciler(simPeripherals, engine);
	render(<Program />);
	await runEventLoop();
}

void main();
```

## Components

### `<SimMotor>`

Drives one virtual wheel of the differential-drive robot.

| Prop | Type | Description |
|------|------|-------------|
| `side` | `"L" \| "R"` | Which wheel (immutable after mount) |
| `velocity` | `number` | Normalized speed, clamped to `-1..1` |

On unmount the wheel velocity is set to `0`.

### `<SimFrontSensor>`

Front collision sensor. Fires a callback when contact with a wall or
obstacle starts or stops.

| Prop | Type | Description |
|------|------|-------------|
| `onPressedChange` | `(pressed: boolean, isInitialRead: boolean) => void` | Called when the contact state changes |

The sensor is polled by the Hertz event loop.

## Viewer

`startSSEServer` exposes the simulation at `http://localhost:3100`:

- `GET /events` streams `SimState` JSON as SSE.
- CORS is enabled so the viewer works from a `file://` URL.

Open `src/examples/sim-roomba-viewer.html` in a browser to watch the
robot. Call the returned `broadcast()` on a timer to push new frames.

## Examples

- `src/examples/sim-roomba.tsx` -- naive Roomba as a React state machine
  (drive forward, back off on collision, rotate, repeat).
- `src/examples/sim-roomba-viewer.html` -- canvas viewer that connects to
  the SSE stream.

## Architecture note

The hardware parameter passed to `createReconciler` is a `SimEngine`
instance. `SimMotorPeripheral` writes wheel velocities into it, and
`SimFrontSensorPeripheral` reads the collision flag from it. The physics
`tick()` and the SSE `broadcast()` are driven by your own timers, kept
separate from the reconciler's polling loop.
