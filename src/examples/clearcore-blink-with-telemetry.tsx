import { ClearCore } from "llamajet-driver-ts";
import { useEffect, useState } from "react";
import { SerialPort } from "serialport";
import { CCDPinOut, clearCorePeripherals } from "@/bridges";
import { createReconciler } from "@/reconciler";
import {
	createTelemetryStore,
	RobotTelemetryProvider,
	useTelemetry,
} from "@/telemetry";

// Public telemetry contract consumed by external UI/observers.
type BlinkTelemetry = {
	blink: {
		isOn: boolean;
		phase: "on" | "off";
		toggles: number;
		lastChangedAt: number;
	};
};

// External telemetry store exists outside the React tree.
const telemetry = createTelemetryStore<BlinkTelemetry>({
	blink: {
		isOn: false,
		phase: "off",
		toggles: 0,
		lastChangedAt: Date.now(),
	},
});

const Blink = () => {
	const [value, setValue] = useState(false);
	const [toggles, setToggles] = useState(0);

	// Internal React state drives the hardware output and telemetry projection.
	useEffect(() => {
		const interval = setInterval(() => {
			setValue((currentValue) => !currentValue);
			setToggles((current) => current + 1);
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	// Publish stable telemetry from component state.
	useTelemetry<BlinkTelemetry, ["blink"]>(["blink"], {
		isOn: value,
		phase: value ? "on" : "off",
		toggles,
		lastChangedAt: Date.now(),
	});

	return <CCDPinOut pin={3} value={value} />;
};

async function main() {
	// Normal hardware setup (same as regular blink example).
	const clearcore = new ClearCore(
		new SerialPort({
			path: "/dev/ttyACM0",
			baudRate: 115200,
		}),
	);
	await clearcore.connect();

	// External observer subscribes without depending on React internals.
	telemetry.subscribeSelector(
		(snapshot) => snapshot.blink.phase,
		(next, previous) =>
			console.log(`Telemetry: blink changed from ${previous} to ${next}`),
	);

	const { render, runEventLoop } = createReconciler(
		clearCorePeripherals,
		clearcore,
	);

	// Provider connects the React tree to the external telemetry store.
	render(
		<RobotTelemetryProvider store={telemetry}>
			<Blink />
		</RobotTelemetryProvider>,
	);

	await runEventLoop();
}

void main();
