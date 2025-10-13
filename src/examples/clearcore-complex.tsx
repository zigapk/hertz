import { ClearCore } from "llamajet-driver-ts";
import { useEffect, useState } from "react";
import { SerialPort } from "serialport";
import { clearCorePeripherals } from "@/bridges";
import { createReconciler } from "@/reconciler";

// Follow makes sure PIN 2 has the same value as PIN 1.
const Follow = () => {
	const [value, setValue] = useState(false);

	return (
		<>
			<dpinin pin={1} onValueChange={(value) => setValue(value)} />
			<dpinout pin={2} value={value} />
		</>
	);
};

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

// Program alternates between renering Follow and Blink.
const Program = () => {
	const [mode, setMode] = useState<"blink" | "follow">("blink");

	// Use effect that changes the mode every 5 seconds
	useEffect(() => {
		const interval = setInterval(() => {
			setMode((mode) => (mode === "blink" ? "follow" : "blink"));
		}, 5000);
		return () => clearInterval(interval);
	});

	return mode === "blink" ? <Blink /> : <Follow />;
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
	render(<Program />);
	await runEventLoop();
}

main();
