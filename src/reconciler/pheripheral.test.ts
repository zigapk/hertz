import { describe, expect, it, vi } from "vitest";
import {
	BasePeripheral,
	type PeripheralLifecycleMethods,
	type PeripheralProps,
} from "./pheripheral.js";

interface WritableProps {
	mode?: "on" | "off";
}

interface ReadableValues {
	value: boolean;
}

interface RefData {
	name: string;
}

class TestPeripheral
	extends BasePeripheral<object, WritableProps, ReadableValues, RefData>
	implements PeripheralLifecycleMethods<WritableProps>
{
	readonly refData = { name: "test" };
	private queue: ReadableValues[] = [];
	readonly applyModeCalls: Array<WritableProps["mode"]> = [];
	readonly disownModeCalls: number[] = [];

	async initPeripheral(): Promise<void> {}

	pushRead(value: ReadableValues): void {
		this.queue.push(value);
	}

	async readValuesFromHardware(): Promise<ReadableValues> {
		const next = this.queue.shift();
		if (next === undefined) {
			throw new Error("No queued values");
		}
		return next;
	}

	async applyMode(value: WritableProps["mode"]): Promise<void> {
		this.applyModeCalls.push(value);
	}

	async disownMode(): Promise<void> {
		this.disownModeCalls.push(1);
	}
}

function createProps(
	overrides: Partial<PeripheralProps<WritableProps, ReadableValues>> = {},
): PeripheralProps<WritableProps, ReadableValues> {
	return {
		mode: "off",
		onError: vi.fn(),
		onValueChange: vi.fn(),
		...overrides,
	};
}

describe("BasePeripheral", () => {
	it("marks the peripheral initialized after init", async () => {
		const peripheral = new TestPeripheral(createProps(), {});

		expect(peripheral.isInitialized()).toBe(false);
		await peripheral.init();
		expect(peripheral.isInitialized()).toBe(true);
	});

	it("applies changed props and disowns removed props", async () => {
		const peripheral = new TestPeripheral(createProps(), {});
		await peripheral.init();

		const first = createProps({ mode: "on" });
		await peripheral.applyNewPropsToHardware(first, first);
		expect(peripheral.applyModeCalls).toEqual(["on"]);

		const unchanged = createProps({ mode: "on" });
		await peripheral.applyNewPropsToHardware(first, unchanged);
		expect(peripheral.applyModeCalls).toEqual(["on"]);

		const changed = createProps({ mode: "off" });
		await peripheral.applyNewPropsToHardware(unchanged, changed);
		expect(peripheral.applyModeCalls).toEqual(["on", "off"]);

		const removed = createProps({ mode: undefined });
		await peripheral.applyNewPropsToHardware(changed, removed);
		expect(peripheral.disownModeCalls).toHaveLength(1);
	});

	it("emits change callbacks on initial read and only on changes after", async () => {
		const onValueChange = vi.fn();
		const peripheral = new TestPeripheral(createProps({ onValueChange }), {});
		await peripheral.init();

		peripheral.pushRead({ value: false });
		peripheral.pushRead({ value: false });
		peripheral.pushRead({ value: true });

		await peripheral.queryForChanges();
		await peripheral.queryForChanges();
		await peripheral.queryForChanges();

		expect(onValueChange).toHaveBeenCalledTimes(2);
		expect(onValueChange).toHaveBeenNthCalledWith(1, false, true);
		expect(onValueChange).toHaveBeenNthCalledWith(2, true, false);
	});

	it("routes method errors to onError via decorator", async () => {
		const onError = vi.fn();
		const peripheral = new TestPeripheral(createProps({ onError }), {});

		await peripheral.applyNewPropsToHardware(createProps(), createProps());

		expect(onError).toHaveBeenCalledTimes(1);
		expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
		expect((onError.mock.calls[0]?.[0] as Error).message).toBe(
			"Peripheral is not initialized",
		);
	});
});
