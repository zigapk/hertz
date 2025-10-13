import { ClearCore } from "llamajet-driver-ts";
import { useEffect, useState } from "react";
import { SerialPort } from "serialport";
import { peripherals } from "@/bridges/clearcore/index.js";
import { createReconciler } from "@/reconciler/reconciler.js";

const Follow = () => {
	const [value, setValue] = useState(false);

	return (
		<>
			<dpinin pin={1} onValueChange={(value) => setValue(value)} />
			<dpinout pin={2} value={value} />
		</>
	);
};

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

const Program = () => {
	const [mode, setMode] = useState<"blink" | "follow">("blink");

	// Use effect that changes the mode every 5 seconds
	useEffect(() => {
		const interval = setInterval(() => {
			setMode((mode) => (mode === "blink" ? "follow" : "blink"));
		}, 5000);
		return () => clearInterval(interval);
	});

	console.log(mode);
	return mode === "blink" ? <Blink /> : <Follow />;
};

async function main() {
	const clearcore = new ClearCore(
		new SerialPort({
			path: "/dev/ttyACM0",
			baudRate: 115200,
		}),
	);
	await clearcore.connect();

	const { render, runEventLoop } = createReconciler(peripherals, clearcore);

	render(<Program />);
	await runEventLoop();
}

main();

// TODO: it would be better to be able to add as many peripherals as you want (and then prefix them if needed - how would this work with types though?)
// TODO: if possible also add timeout for too long renreders
