import { ClearCore } from "llamajet-driver-ts";
import { useState } from "react";
import { SerialPort } from "serialport";
import { CCDPinIn, CCDPinOut, clearCorePeripherals } from "@/bridges";
import { createReconciler } from "@/reconciler";

// Follow simply makes pin 1 follow whatever it reads from pin 0.
const Follow = () => {
	const [value, setValue] = useState(false);

	return (
		<>
			<CCDPinOut pin={1} value={value} />
			<CCDPinIn pin={0} onValueChange={setValue} />
		</>
	);
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
	render(<Follow />);
	await runEventLoop();
}

void main();
