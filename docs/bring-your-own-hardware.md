# Bring your own hardware

Hertz is a framework for building React reconcilers that drive hardware.

This guide explains how to implement a new bridge/peripheral so it works well with Hertz lifecycle semantics.

## Bridge design requirements

Before writing a peripheral, make sure your hardware control layer has an interface with these properties:

1. Stateless command shape (from Hertz perspective)

- Calls should describe target state directly, without relying on fragile command ordering.
- Internal controller state is fine, but bridge-facing operations should remain predictable and idempotent when possible.

2. Acknowledged operations

- `await` should mean the command was accepted by the controller/driver.
- This does not require physical motion to be finished; it only requires that the command reached the control layer.

3. Low-latency reads/writes

- `readValuesFromHardware()` is polled frequently by the event loop.
- Calls that block for long periods make the whole reconciler unresponsive.

If your device API does not satisfy these constraints directly, add an adapter/wrapper first.

## Peripheral lifecycle in Hertz

Each peripheral extends `BasePeripheral` and participates in this flow:

1. `initPeripheral()`

- One-time setup (pin mode, session setup, etc.).

2. `applyNewPropsToHardware()` (driven by generated `applyX`/`disownX` methods)

- Reconciles prop changes to hardware commands.

3. `queryForChanges()` -> `readValuesFromHardware()`

- Polls readable values and emits `on...Change` callbacks.

4. `desconstructPeripheral()`

- Performs teardown and disown logic on unmount.

Parent-first initialization is guaranteed by the reconciler, so child peripherals mount only after parents complete initialization.

## Minimal implementation pattern

```ts
import type { SomeHardware } from "some-driver";
import { createHigherLevelComponent } from "@/reconciler/higher-level-component";
import {
	BasePeripheral,
	type PeripheralLifecycleMethods,
	type PeripheralProps,
} from "@/reconciler/pheripheral";

interface BaseProps {
	pin: number;
}

interface Values {
	value: boolean;
}

type Props = PeripheralProps<BaseProps, Values>;

export class ExamplePinInPeripheral
	extends BasePeripheral<SomeHardware, BaseProps, Values>
	implements PeripheralLifecycleMethods<BaseProps>
{
	static readonly tagName = "examplepinin";
	readonly pin: number;

	refData = {};

	constructor(props: Props, hardware: SomeHardware) {
		super(props, hardware);
		this.pin = props.pin;
	}

	async initPeripheral(): Promise<void> {
		await this.hardware.configureInput(this.pin);
	}

	async applyPin(pin: number): Promise<void> {
		if (pin !== this.pin) {
			throw new Error("Changing pin after initialization is not supported.");
		}
	}

	async readValuesFromHardware(): Promise<Values> {
		return { value: await this.hardware.readInput(this.pin) };
	}
}

export const ExamplePinIn = createHigherLevelComponent(ExamplePinInPeripheral);
```

## Implementation checklist

- Keep identity props immutable after mount (`pin`, `port`, bus address, etc.).
- Implement explicit errors for unsupported runtime prop changes.
- Keep `readValuesFromHardware()` small and deterministic.
- Use stable output object shapes for readable values.
- Avoid hidden side effects in `readValuesFromHardware()`.
- Add `disownX` methods when hardware should be put in a safe state on unmount.

## Where to look in this repository

- `src/bridges/clearcore`: concrete bridge implementation.
- `src/reconciler/pheripheral.ts`: base peripheral class and lifecycle helpers.
- `src/reconciler/reconciler.ts`: renderer host config and event loop.
- `src/reconciler/higher-level-component.tsx`: React wrapper with error propagation.

## Current bridge status

At the time of writing:

- ClearCore bridge exists and is used as the reference implementation.
- Arduino and Raspberry Pi bridges are planned but not implemented yet.
