import { ClearCore } from "llamajet-driver-ts";
import { useEffect, useState } from "react";
import { SerialPort } from "serialport";
import { clearCorePeripherals } from "@/bridges";
import { createReconciler } from "@/reconciler";

// Blink simply toggles the value of PIN 0 every second.
const Blink = () => {
	const [value, setValue] = useState(false);

	// Use effect to set interval to change value every second
	useEffect(() => {
		const interval = setInterval(() => {
			setValue((value) => !value);
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	return <dpinout pin={0} value={value} />;
};

async function main() {
	// Create a new ClearCore instance and connect to it.
	const clearcore = new ClearCore(
		new SerialPort({
			path: "/dev/ttyACM0",
			baudRate: 115200,
		}),
	);
	await clearcore.connect();

	// Initialize the reconciler.
	const { render, runEventLoop } = createReconciler(
		clearCorePeripherals,
		clearcore,
	);

	// Render and run the event loop.
	render(<Blink />);
	await runEventLoop();
}

void main();
