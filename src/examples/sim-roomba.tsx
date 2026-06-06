import { useEffect, useRef, useState } from "react";
import {
	SimEngine,
	SimFrontSensor,
	SimMotor,
	simPeripherals,
	startSSEServer,
} from "@/bridges/sim";
import { createReconciler } from "@/reconciler";

// ============================================================================
// Sub-components — each owns its motors and calls onStageComplete when done
// ============================================================================

function DriveForward({ onStageComplete }: { onStageComplete: () => void }) {
	return (
		<>
			<SimMotor side="L" velocity={1} />
			<SimMotor side="R" velocity={1} />
			<SimFrontSensor
				onPressedChange={(pressed, isInitial) => {
					if (pressed && !isInitial) {
						onStageComplete();
					}
				}}
			/>
		</>
	);
}

function BackOff({ onStageComplete }: { onStageComplete: () => void }) {
	const durationRef = useRef(500 + Math.random() * 500); // 500-1000ms
	const [done, setDone] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDone(true);
		}, durationRef.current);
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (done) {
			onStageComplete();
		}
	}, [done, onStageComplete]);

	return (
		<>
			<SimMotor side="L" velocity={-0.5} />
			<SimMotor side="R" velocity={-0.5} />
			{/* Keep sensor mounted so collisions are still detected by engine */}
			<SimFrontSensor />
		</>
	);
}

function Rotate({ onStageComplete }: { onStageComplete: () => void }) {
	const durationRef = useRef(500 + Math.random() * 1500); // 500-2000ms
	const [done, setDone] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDone(true);
		}, durationRef.current);
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (done) {
			onStageComplete();
		}
	}, [done, onStageComplete]);

	return (
		<>
			<SimMotor side="L" velocity={-0.5} />
			<SimMotor side="R" velocity={0.5} />
			<SimFrontSensor />
		</>
	);
}

// ============================================================================
// Main Roomba component — state machine with switch
// ============================================================================

type Stage = "forward" | "backing" | "rotating";

function Roomba() {
	const [stage, setStage] = useState<Stage>("forward");

	switch (stage) {
		case "forward":
			return (
				<DriveForward
					onStageComplete={() => {
						console.log("[roomba] hit something → backing off");
						setStage("backing");
					}}
				/>
			);
		case "backing":
			return (
				<BackOff
					onStageComplete={() => {
						console.log("[roomba] done backing → rotating");
						setStage("rotating");
					}}
				/>
			);
		case "rotating":
			return (
				<Rotate
					onStageComplete={() => {
						console.log("[roomba] done rotating → driving forward");
						setStage("forward");
					}}
				/>
			);
	}
}

// ============================================================================
// Entry point
// ============================================================================

async function main() {
	// 1. Create the simulation engine
	const engine = new SimEngine();

	// 2. Start the physics tick at 60 Hz
	const TICK_HZ = 60;
	const tickInterval = setInterval(() => {
		engine.tick(1 / TICK_HZ);
	}, 1000 / TICK_HZ);

	// 3. Start SSE server so the viewer can connect
	const { broadcast } = startSSEServer(engine);

	// Broadcast state at 30 Hz (plenty for visualisation)
	const broadcastInterval = setInterval(broadcast, 1000 / 30);

	// 4. Create the Hertz reconciler with the sim bridge
	const { render, runEventLoop } = createReconciler(simPeripherals, engine);

	// 5. Render the Roomba program
	render(<Roomba />);

	console.log("[sim] Roomba simulation running.");
	console.log("[sim] Open sim-roomba-viewer.html in a browser to watch.");

	// 6. Run the reconciler event loop (blocks forever)
	try {
		await runEventLoop();
	} finally {
		clearInterval(tickInterval);
		clearInterval(broadcastInterval);
	}
}

void main();
