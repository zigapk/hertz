import { ClearCore } from "llamajet-driver-ts";
import { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { SerialPort } from "serialport";
import { CCDPinIn, CCDPinOut, clearCorePeripherals } from "@/bridges";
import { createReconciler } from "@/reconciler";

// ErrorMaker throws an error whenever value on pin 1 is read as high.
const ErrorMaker = () => {
	console.log("ErrorMaker render");
	return (
		<>
			<CCDPinOut pin={0} value={true} />
			<CCDPinIn
				pin={1}
				onValueChange={(value) => {
					if (value) {
						throw new Error("Pin 1 is HIGH!");
					}
				}}
			/>
		</>
	);
};

// Fallback renders pin 2 as high
// It also tries to reset the error boundary 3 seconds after it renders.
const Fallback = ({
	resetErrorBoundary,
}: {
	resetErrorBoundary: () => void;
}) => {
	console.log("Fallback render");
	useEffect(() => {
		const interval = setInterval(() => {
			resetErrorBoundary();
		}, 3000);
		return () => clearInterval(interval);
	}, [resetErrorBoundary]);
	return <CCDPinOut pin={2} value={true} />;
};

// ErrorHandler tries to render ErrorMaker, but if it throws an error, it renders Fallback instead.
const ErrorHandler = () => {
	console.log("ErrorHandler render");
	return (
		<ErrorBoundary FallbackComponent={Fallback}>
			<ErrorMaker />
		</ErrorBoundary>
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
	render(<ErrorHandler />);
	await runEventLoop();
}

void main();
