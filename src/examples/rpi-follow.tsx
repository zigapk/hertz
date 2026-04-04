import { useState } from "react";
import { RpiDIn, RpiDOut, RpiHardware, rpiPeripherals } from "@/bridges";
import { createReconciler } from "@/reconciler";

// Follow makes GPIO 17 (output) mirror whatever is read from GPIO 27 (input).
const Follow = () => {
	const [value, setValue] = useState(false);

	return (
		<>
			<RpiDOut gpio={17} value={value} />
			<RpiDIn gpio={27} onValueChange={setValue} />
		</>
	);
};

async function main() {
	const hardware = new RpiHardware();

	const { render, runEventLoop } = createReconciler(rpiPeripherals, hardware);

	render(<Follow />);
	console.log("RPi Follow: GPIO 17 mirrors GPIO 27. Press Ctrl+C to stop.");
	await runEventLoop();
}

void main();
