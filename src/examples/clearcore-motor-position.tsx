import { ClearCore } from "llamajet-driver-ts";
import { useEffect, useState } from "react";
import { SerialPort } from "serialport";
import { CCMotor, clearCorePeripherals } from "@/bridges";
import { createReconciler } from "@/reconciler";

// Traverses random positions using the motor.
const TraverseRandomPositions = () => {
	const [target, setTarget] = useState(0);

	// Change target to a random number between 0 and 30000 every 3 seconds
	useEffect(() => {
		const interval = setInterval(() => {
			const newTarget = Math.round((Math.random() * 30000) / 100) * 100;
			setTarget(newTarget);
		}, 3000);
		return () => clearInterval(interval);
	}, []);

	return (
		<CCMotor
			enabled={true}
			port={0}
			target={{
				targetPosition: target,
				acceleration: 100000,
				targetVelocity: 5000,
			}}
			onPositionChange={(position) =>
				process.stdout.write(
					`\rPosition: ${position.toString().padStart(5)}  Target: ${target.toString().padStart(5)}`.padEnd(
						50,
					),
				)
			}
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
	render(<TraverseRandomPositions />);
	await runEventLoop();
}

void main();
