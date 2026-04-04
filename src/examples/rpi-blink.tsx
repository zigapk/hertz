import { useEffect, useState } from "react";
import { RpiDOut, RpiHardware, rpiPeripherals } from "@/bridges";
import { createReconciler } from "@/reconciler";

// Blink toggles GPIO 17 every second, making the LED blink.
const Blink = () => {
	const [value, setValue] = useState(false);

	useEffect(() => {
		const interval = setInterval(() => {
			setValue((v) => !v);
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	return <RpiDOut gpio={17} value={value} />;
};

async function main() {
	const hardware = new RpiHardware();

	const { render, runEventLoop } = createReconciler(rpiPeripherals, hardware);

	render(<Blink />);
	console.log(
		"RPi Blink: toggling GPIO 17 every second. Press Ctrl+C to stop.",
	);
	await runEventLoop();
}

void main();
