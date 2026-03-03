import { act, createRef } from "react";
import { describe, expect, it } from "vitest";
import { createHigherLevelComponent } from "./higher-level-component.js";
import {
	BasePeripheral,
	type PeripheralLifecycleMethods,
	type PeripheralProps,
} from "./pheripheral.js";
import { createReconciler } from "./reconciler.js";

interface WrappedProps {
	id: number;
}

interface WrappedRefData {
	id: number;
}

class WrappedPeripheral
	extends BasePeripheral<
		object,
		WrappedProps,
		Record<string, never>,
		WrappedRefData
	>
	implements PeripheralLifecycleMethods<WrappedProps>
{
	static readonly tagName = "wrappedperipheral";
	readonly refData: WrappedRefData;

	constructor(
		props: PeripheralProps<WrappedProps, Record<string, never>>,
		hardware: object,
	) {
		super(props, hardware);
		this.refData = { id: props.id };
	}

	async initPeripheral(): Promise<void> {}

	async applyId(id: number): Promise<void> {
		if (id !== this.refData.id) {
			throw new Error("id is immutable");
		}
	}

	async readValuesFromHardware(): Promise<Record<string, never>> {
		return {};
	}
}

const WrappedComponent = createHigherLevelComponent(WrappedPeripheral);

declare module "react" {
	namespace JSX {
		interface IntrinsicElements {
			wrappedperipheral: PeripheralProps<WrappedProps, Record<string, never>>;
		}
	}
}

async function flush(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("createHigherLevelComponent", () => {
	it("creates a forwardRef wrapper with expected display name", () => {
		expect(WrappedComponent.displayName).toBe("HigherLevel(wrappedperipheral)");
	});

	it("forwards refs to peripheral refData", async () => {
		const { render } = createReconciler([WrappedPeripheral], {});
		const ref = createRef<WrappedRefData>();

		await act(async () => {
			render(<WrappedComponent id={1} ref={ref} />);
			await flush();
		});

		expect(ref.current).toEqual({ id: 1 });
	});
});
