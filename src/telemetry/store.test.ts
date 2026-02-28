import { describe, expect, it, vi } from "vitest";
import { createTelemetryStore } from "./store.js";

interface TelemetryState {
	robot: {
		phase: "idle" | "run";
		status: {
			enabled: boolean;
		};
	};
}

describe("createTelemetryStore", () => {
	it("sets nested values immutably", () => {
		const store = createTelemetryStore<TelemetryState>({
			robot: { phase: "idle", status: { enabled: false } },
		});

		store.setPath(["robot", "phase"] as const, "run");

		expect(store.getSnapshot()).toEqual({
			robot: { phase: "run", status: { enabled: false } },
		});
	});

	it("deletes nested paths and prunes empty objects", () => {
		const store = createTelemetryStore({
			robot: { status: { enabled: true } },
		} as {
			robot?: { status?: { enabled?: boolean } };
		});

		store.deletePath(["robot", "status", "enabled"]);

		expect(store.getSnapshot()).toEqual({});
	});

	it("subscribes to selected slices", () => {
		const store = createTelemetryStore<TelemetryState>({
			robot: { phase: "idle", status: { enabled: false } },
		});
		const listener = vi.fn();

		const unsubscribe = store.subscribeSelector(
			(snapshot) => snapshot.robot.phase,
			listener,
		);

		store.setPath(["robot", "phase"] as const, "run");
		store.setPath(["robot", "phase"] as const, "run");

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith("run", "idle");

		unsubscribe();
	});
});
