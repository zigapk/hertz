import { act } from "react";
import { describe, expect, it } from "vitest";
import { createReconciler } from "../reconciler/reconciler.js";
import { createMockHardware, mockPeripherals } from "../test/mock-bridge.js";
import { createTelemetryStore } from "./store.js";
import { RobotTelemetryProvider, useTelemetry } from "./telemetry.js";

interface TestTelemetry {
	robot: {
		phase: string;
	};
}

type PublisherProps = {
	path: readonly ["robot", "phase"];
	value: string;
	enabled?: boolean;
};

const PhasePublisher = ({ path, value, enabled }: PublisherProps) => {
	useTelemetry<TestTelemetry, readonly ["robot", "phase"]>(path, value, {
		enabled,
	});
	return null;
};

async function flush(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("useTelemetry", () => {
	it("publishes values on mount and update", async () => {
		const store = createTelemetryStore<TestTelemetry>({ robot: { phase: "" } });
		const { render } = createReconciler(mockPeripherals, createMockHardware());

		await act(async () => {
			render(
				<RobotTelemetryProvider store={store}>
					<PhasePublisher path={["robot", "phase"]} value="idle" />
				</RobotTelemetryProvider>,
			);
			await flush();
		});

		expect(store.getSnapshot()).toEqual({ robot: { phase: "idle" } });

		await act(async () => {
			render(
				<RobotTelemetryProvider store={store}>
					<PhasePublisher path={["robot", "phase"]} value="run" />
				</RobotTelemetryProvider>,
			);
			await flush();
		});

		expect(store.getSnapshot()).toEqual({ robot: { phase: "run" } });
	});

	it("deletes path on unmount", async () => {
		const store = createTelemetryStore<TestTelemetry>({ robot: { phase: "" } });
		const { render } = createReconciler(mockPeripherals, createMockHardware());

		await act(async () => {
			render(
				<RobotTelemetryProvider store={store}>
					<PhasePublisher path={["robot", "phase"]} value="idle" />
				</RobotTelemetryProvider>,
			);
			await flush();
		});

		await act(async () => {
			render(null);
			await flush();
		});

		expect(store.getSnapshot()).toEqual({});
	});

	it("removes previously published path when disabled", async () => {
		const store = createTelemetryStore<TestTelemetry>({ robot: { phase: "" } });
		const { render } = createReconciler(mockPeripherals, createMockHardware());

		await act(async () => {
			render(
				<RobotTelemetryProvider store={store}>
					<PhasePublisher
						path={["robot", "phase"]}
						value="idle"
						enabled={true}
					/>
				</RobotTelemetryProvider>,
			);
			await flush();
		});

		await act(async () => {
			render(
				<RobotTelemetryProvider store={store}>
					<PhasePublisher
						path={["robot", "phase"]}
						value="idle"
						enabled={false}
					/>
				</RobotTelemetryProvider>,
			);
			await flush();
		});

		expect(store.getSnapshot()).toEqual({});
	});
});
