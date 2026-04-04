import { useEffect, useRef, useState } from "react";
import { RpiDIn, RpiDOut, RpiHardware, rpiPeripherals } from "@/bridges";
import { createReconciler } from "@/reconciler";

// LoopbackTest toggles GPIO 17 (output) every 2 seconds and reads GPIO 27 (input).
// Since GPIO 17 is wired to GPIO 27, the input should follow the output.
// Logs the time delta between writing a new value and reading it back.
const LoopbackTest = () => {
	const [outValue, setOutValue] = useState(false);
	const lastToggleTime = useRef<number>(Date.now());
	const expectedValue = useRef<boolean>(false);
	const settled = useRef<boolean>(false);

	useEffect(() => {
		// Wait a bit for initial read to settle before starting toggles.
		const startDelay = setTimeout(() => {
			settled.current = true;
			console.log("Loopback test started. Toggling every 2 seconds.\n");

			const interval = setInterval(() => {
				const next = !expectedValue.current;
				expectedValue.current = next;
				lastToggleTime.current = Date.now();
				setOutValue(next);
				console.log(`[OUT] Set GPIO 17 = ${next ? "HIGH" : "LOW"}`);
			}, 2000);

			return () => clearInterval(interval);
		}, 1000);

		return () => clearTimeout(startDelay);
	}, []);

	const handleInputChange = (value: boolean) => {
		if (!settled.current) {
			console.log(`[IN]  Initial read GPIO 27 = ${value ? "HIGH" : "LOW"}`);
			return;
		}

		const delta = Date.now() - lastToggleTime.current;
		const match = value === expectedValue.current;
		console.log(
			`[IN]  Read GPIO 27 = ${value ? "HIGH" : "LOW"} | ` +
				`delta: ${delta}ms | ` +
				`${match ? "MATCH" : "MISMATCH"}`,
		);
	};

	return (
		<>
			<RpiDOut gpio={17} value={outValue} />
			<RpiDIn gpio={27} onValueChange={handleInputChange} />
		</>
	);
};

async function main() {
	const hardware = new RpiHardware();

	const { render, runEventLoop } = createReconciler(rpiPeripherals, hardware);

	render(<LoopbackTest />);
	console.log("RPi Loopback Test: GPIO 17 -> GPIO 27. Press Ctrl+C to stop.");
	await runEventLoop();
}

void main();
