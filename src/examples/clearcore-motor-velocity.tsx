import { ClearCore } from "llamajet-driver-ts";
import { useEffect, useState } from "react";
import { SerialPort } from "serialport";
import { clearCorePeripherals } from "@/bridges";
import { createReconciler } from "@/reconciler";

// Blink simply toggles the value of PIN 0 every second.
const AlternateDirection = () => {
	const [direction, setDirection] = useState<"forward" | "reverse">("forward");

	// Use effect to set interval to change value every second
	useEffect(() => {
		const interval = setInterval(() => {
			setDirection((direction) =>
				direction === "forward" ? "reverse" : "forward",
			);
		}, 2000);
		return () => clearInterval(interval);
	}, []);

	return (
		<motor
			enabled={true}
			port={0}
			target={{
				acceleration: 100000,
				targetVelocity: direction === "forward" ? 10000 : -10000,
			}}
			onPositionChange={(position) => console.log(position)}
		/>
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
	await clearcore.stopMotors(0);
	await clearcore.setMotorsHome(0);

	// Initialize the reconciler.
	const { render, runEventLoop } = createReconciler(
		clearCorePeripherals,
		clearcore,
	);

	// Render and run the event loop.
	render(<AlternateDirection />);
	await runEventLoop();
}

main();
