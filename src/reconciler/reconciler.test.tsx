import { act, createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
	createMockHardware,
	MockMotor,
	mockPeripherals,
} from "../test/mock-bridge.js";
import { createReconciler } from "./reconciler.js";

async function flush(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("createReconciler", () => {
	it("initializes parent peripherals before children", async () => {
		const hardware = createMockHardware();
		const { render } = createReconciler(mockPeripherals, hardware);

		await act(async () => {
			render(
				<mockbus name="root" onError={vi.fn()}>
					<mockoutput channel={3} value={true} onError={vi.fn()} />
				</mockbus>,
			);
			await flush();
		});

		expect(hardware.log.indexOf("init:bus:root")).toBeLessThan(
			hardware.log.indexOf("init:output:3"),
		);
	});

	it("chains prop updates in order", async () => {
		const hardware = createMockHardware();
		const { render } = createReconciler(mockPeripherals, hardware);

		await act(async () => {
			render(<mockoutput channel={1} value={false} onError={vi.fn()} />);
			await flush();
		});

		await act(async () => {
			render(<mockoutput channel={1} value={true} onError={vi.fn()} />);
			await flush();
		});

		await act(async () => {
			render(<mockoutput channel={1} value={false} onError={vi.fn()} />);
			await flush();
		});

		expect(hardware.log).toContain("setOutput:1:false");
		expect(hardware.log).toContain("setOutput:1:true");
		expect(hardware.log.indexOf("setOutput:1:false")).toBeLessThan(
			hardware.log.indexOf("setOutput:1:true"),
		);
	});

	it("runs peripheral teardown on unmount", async () => {
		const hardware = createMockHardware();
		const { render } = createReconciler(mockPeripherals, hardware);

		await act(async () => {
			render(<mockoutput channel={5} value={true} onError={vi.fn()} />);
			await flush();
		});

		await act(async () => {
			render(null);
			await flush();
		});

		expect(hardware.log).toContain("setOutput:5:false");
	});

	it("exposes refData via forwarded refs", async () => {
		const hardware = createMockHardware();
		const { render } = createReconciler(mockPeripherals, hardware);
		const ref = createRef<{ kind: "mockmotor"; port: number }>();

		await act(async () => {
			render(<MockMotor port={7} ref={ref} enabled={true} />);
			await flush();
		});

		expect(ref.current).toEqual({ kind: "mockmotor", port: 7 });
	});

	it("keeps rendering valid trees after multiple updates", async () => {
		const hardware = createMockHardware();
		const { render } = createReconciler(mockPeripherals, hardware);

		await act(async () => {
			render(<mockoutput channel={2} value={true} onError={vi.fn()} />);
			await flush();
		});

		await act(async () => {
			render(
				<mockbus name="stable" onError={vi.fn()}>
					<mockoutput channel={2} value={false} onError={vi.fn()} />
				</mockbus>,
			);
			await flush();
		});

		expect(hardware.log).toContain("init:bus:stable");
	});
});
