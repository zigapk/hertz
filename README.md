# React Hertz 💡

![Let a picture speak a thousand words.](docs/assets/blink.gif)

Hertz is a React framework (or reconciler/renderer) for driving hardware peripherals. **It projects the internal state of your React app to the physical world** instead of a [screen](https://www.npmjs.com/package/react-dom), [video](https://www.remotion.dev/) or [terminal](https://github.com/vadimdemedes/ink).

**NOTE**: This is still a work in progress. APIs may change and coverage is incomplete, but the project is usable for experimentation.

## Why use this reconciler for robots

Hertz gives you React ergonomics for hardware control while keeping execution in a Node runtime.

- Declarative hardware tree: describe target hardware state as components and props.
- Built-in lifecycle mapping: mount/update/unmount map to peripheral init/apply/disown methods.
- Parent-first initialization: parent peripherals initialize before children.
- Poll-driven input updates: readable hardware values are queried and surfaced via `on...Change` callbacks.
- Error propagation through React boundaries: hardware/runtime errors bubble to standard React error boundaries.
- External telemetry store: publish selected robot state for CLIs, dashboards, and monitoring.

## What this repository provides

Hertz is primarily a framework for building hardware reconcilers with React. This repository currently includes:

- the reconciler/runtime,
- telemetry utilities for publishing robot state outside React,
- working ClearCore and Raspberry Pi bridges with examples,
- a hardware-free simulation bridge for demos and visualisation.

## Bridge status

| Bridge | Status | Notes |
| --- | --- | --- |
| ClearCore | Available | Serial bridge to Teknic ClearCore. See `src/bridges/clearcore/README.md` |
| Raspberry Pi | Available | Direct GPIO via `rpi-io`. See `src/bridges/raspberrypi/README.md` |
| Simulation | Available | In-memory 2D robot, no hardware. See `src/bridges/sim/README.md` |
| Arduino | Planned | Not implemented yet |

See also:

- Bring your own hardware: `docs/bring-your-own-hardware.md`
- Testing: `docs/testing.md`

## Runtime model

Hertz runs in a Node.js-like runtime, not in a browser.

- `Node.js` is the primary target.
- `Bun`/`Deno` might work but are not officially tested yet.
- Devices that cannot run Node directly (for example microcontrollers) are controlled from a host process over a transport such as serial.
- Devices that can run Node (for example Raspberry Pi) can run Hertz directly with local GPIO access.

## Quick start (ClearCore)

1. Install dependencies in your project:

```bash
pnpm add react github:zigapk/hertz
pnpm add serialport
pnpm add llamajet-driver-ts
```

2. Flash ClearCore firmware from `src/bridges/clearcore/firmware/firmware.ino`.

3. Create the most basic program (blink one digital output pin):

```tsx
import { ClearCore } from "llamajet-driver-ts";
import { useEffect, useState } from "react";
import { SerialPort } from "serialport";
import { CCDPinOut, clearCorePeripherals, createReconciler } from "hertz";

const Blink = () => {
	const [value, setValue] = useState(false);

	useEffect(() => {
		const timer = setInterval(() => {
			setValue((current) => !current);
		}, 1000);

		return () => clearInterval(timer);
	}, []);

	return <CCDPinOut pin={3} value={value} />;
};

async function main() {
	const clearcore = new ClearCore(
		new SerialPort({
			path: "/dev/ttyACM0",
			baudRate: 115200,
		}),
	);

	await clearcore.connect();

	const { render, runEventLoop } = createReconciler(
		clearCorePeripherals,
		clearcore,
	);

	render(<Blink />);
	await runEventLoop();
}

void main();
```

4. Use one of the richer examples as a next step:

- `src/examples/clearcore-blink.tsx`
- `src/examples/clearcore-complex.tsx`
- `src/examples/clearcore-motor-position.tsx`
- `src/examples/clearcore-motor-velocity.tsx`
- `src/examples/clearcore-error-boundary.tsx`
- `src/examples/clearcore-blink-with-telemetry.tsx`

The ClearCore bridge communicates over serial through `llamajet-driver-ts`, which expects the firmware protocol implemented by `firmware.ino`.

## Quick start (Raspberry Pi)

The Raspberry Pi bridge runs Hertz directly on the Pi, controlling GPIO pins through the `rpi-io` native module. No external controller or serial connection needed.

**Prerequisites**: Raspberry Pi (4B, 5 and Zero 2, might also work on other models) running Raspberry Pi OS with Node.js >= 23 and `libgpiod` installed (included by default on Bookworm/Trixie).

1. Install dependencies on the Pi:

```bash
pnpm add react github:zigapk/hertz
# rpi-io is an optional dependency of hertz -- it installs and compiles
# automatically on ARM Linux. It is skipped on other platforms.
```

2. Create a blink program:

```tsx
import { useEffect, useState } from "react";
import { RpiDOut, rpiPeripherals, RpiHardware, createReconciler } from "hertz";

const Blink = () => {
	const [value, setValue] = useState(false);

	useEffect(() => {
		const timer = setInterval(() => {
			setValue((current) => !current);
		}, 1000);

		return () => clearInterval(timer);
	}, []);

	return <RpiDOut gpio={17} value={value} />;
};

async function main() {
	const hardware = new RpiHardware();

	const { render, runEventLoop } = createReconciler(
		rpiPeripherals,
		hardware,
	);

	render(<Blink />);
	await runEventLoop();
}

void main();
```

3. More examples:

- `src/examples/rpi-blink.tsx` -- blink an LED on GPIO 17.
- `src/examples/rpi-follow.tsx` -- output mirrors an input pin.
- `src/examples/rpi-loopback-test.tsx` -- toggle output and verify via input with timing.

## Quick start (Simulation)

The simulation bridge runs entirely in memory and needs no hardware,
which makes it the easiest way to try Hertz. It drives a 2D
differential-drive robot and can stream its state to a browser viewer.

1. Install dependencies in your project:

```bash
pnpm add react github:zigapk/hertz
```

2. Create a program that drives the simulated robot and streams it:

```tsx
import {
	SimEngine,
	SimMotor,
	simPeripherals,
	startSSEServer,
} from "hertz";
import { createReconciler } from "hertz";

const Program = () => (
	<>
		<SimMotor side="L" velocity={1} />
		<SimMotor side="R" velocity={1} />
	</>
);

async function main() {
	const engine = new SimEngine();

	// Advance the physics at 60 Hz.
	setInterval(() => engine.tick(1 / 60), 1000 / 60);

	// Stream state to the viewer at 30 Hz.
	const { broadcast } = startSSEServer(engine);
	setInterval(broadcast, 1000 / 30);

	const { render, runEventLoop } = createReconciler(simPeripherals, engine);
	render(<Program />);
	await runEventLoop();
}

void main();
```

3. Open `src/examples/sim-roomba-viewer.html` in a browser to watch the
   robot move.

4. For a complete program, see `src/examples/sim-roomba.tsx`, which
   implements a naive Roomba as a React state machine (drive forward,
   back off on collision, rotate, repeat). See `src/bridges/sim/README.md`
   for the full bridge reference.

## Error handling and propagation

Hertz peripherals are wrapped by higher-level React components (`createHigherLevelComponent`) that propagate peripheral errors into the React tree:

1. Peripheral lifecycle/read methods catch errors.
2. They call an internal `onError` callback.
3. The wrapper stores the error in state and throws it on the next render.
4. A React `ErrorBoundary` above the peripheral catches it.

That means you can use standard React error boundaries to isolate failing robot subtrees and render safe fallbacks.

```tsx
import { ErrorBoundary } from "react-error-boundary";
import { CCDPinIn, CCDPinOut } from "hertz";

const FaultyPeripheral = () => {
	return (
		<>
			<CCDPinOut pin={0} value={true} />
			<CCDPinIn
				pin={1}
				onValueChange={(value) => {
					if (value) {
						throw new Error("Pin 1 is HIGH");
					}
				}}
			/>
		</>
	);
};

const Fallback = (_props: { resetErrorBoundary: () => void }) => {
	return <CCDPinOut pin={2} value={true} />;
};

const Program = () => {
	return (
		<ErrorBoundary FallbackComponent={Fallback}>
			<FaultyPeripheral />
		</ErrorBoundary>
	);
};
```

For a complete runnable example, see `src/examples/clearcore-error-boundary.tsx`.

## Telemetry (reading robot state outside React)

Telemetry lets you project selected React state into an external store so non-React code can observe it (CLI, dashboards, logs, safety monitors).

```tsx
type Telemetry = {
	blink: {
		phase: "on" | "off";
		toggles: number;
	};
};

const telemetry = createTelemetryStore<Telemetry>({
	blink: { phase: "off", toggles: 0 },
});

useTelemetry<Telemetry, ["blink"]>(["blink"], {
	phase: value ? "on" : "off",
	toggles,
});

telemetry.subscribeSelector(
	(snapshot) => snapshot.blink.phase,
	(next, previous) => console.log(`Phase changed: ${previous} -> ${next}`),
);
```

See `src/examples/clearcore-blink-with-telemetry.tsx` for an end-to-end example.

## Safety and warranty

This software controls physical hardware. Misconfiguration can damage equipment or cause injury. By using Hertz, you accept responsibility for safe setup, safe operation, and validation on your target hardware. The project maintainers are not liable for hardware damage, data loss, or personal injury resulting from use of this software.
