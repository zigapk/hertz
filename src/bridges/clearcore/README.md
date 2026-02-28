# ClearCore bridge

This bridge connects Hertz peripherals to a Teknic ClearCore controller.

It is the only implemented bridge in this repository at the moment and serves as both a usable integration and a reference implementation for new bridges.

## What is included

- `CCDPinOut` (`ccdpinout`): write digital pin values.
- `CCDPinIn` (`ccdpinin`): read digital pin values and emit `onValueChange`.
- `CCMotor` (`ccmotor`): control ClearPath motor enable/state/targets and consume motor telemetry.

Exports are available from `@/bridges` via `clearCorePeripherals` and the component wrappers.

## Required firmware

Before running Node-side code, flash `src/bridges/clearcore/firmware/firmware.ino` to your ClearCore board.

- Firmware docs: `src/bridges/clearcore/firmware/README.md`
- Serial protocol is consumed by `llamajet-driver-ts`, which this bridge uses under the hood.

Without compatible firmware, the bridge cannot communicate with the controller.

## Minimal setup

```tsx
import { ClearCore } from "llamajet-driver-ts";
import { SerialPort } from "serialport";
import { CCDPinOut, clearCorePeripherals } from "@/bridges";
import { createReconciler } from "@/reconciler";

const Program = () => <CCDPinOut pin={3} value={true} />;

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

	render(<Program />);
	await runEventLoop();
}

void main();
```

## Examples

See `src/examples` for full programs:

- `src/examples/clearcore-blink.tsx`
- `src/examples/clearcore-complex.tsx`
- `src/examples/clearcore-motor-position.tsx`
- `src/examples/clearcore-motor-velocity.tsx`
- `src/examples/clearcore-error-boundary.tsx`
- `src/examples/clearcore-blink-with-telemetry.tsx`

## Notes

- Keep identity props immutable after mount (`pin`, `port`, `eStopPin`), as enforced by peripheral implementations.
- This repository does not currently ship Arduino or Raspberry Pi bridges; those are planned.
