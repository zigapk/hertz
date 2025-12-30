import type { ClearCore, MotorState } from "llamajet-driver-ts";
import {
	BasePeripheral,
	type PeripheralLifecycleMethods,
	type PeripheralProps,
} from "@/reconciler/pheripheral";

// The motor can be in either of
export type MotorTargetProps =
	| { targetPosition: number; targetVelocity: number; acceleration: number } // Target position movement
	| { targetVelocity: number; targetPosition?: never; acceleration: number } // Target velocity movement
	| { targetPosition?: never; targetVelocity?: never; acceleration?: never }; // None of those

interface MotorProps {
	port: number;
	enabled?: boolean;
	eStopPin?: number;
	target?: MotorTargetProps;
}

export interface MotorRefData {
	setHome: () => Promise<void>;
}

export class Motor
	extends BasePeripheral<ClearCore, MotorProps, MotorState, MotorRefData>
	implements PeripheralLifecycleMethods<MotorProps>
{
	static readonly tagName = "motor";
	readonly port: number;
	readonly eStopPin?: number;
	refData = {
		setHome: async () => {
			await this.hardware.setMotorsHome(this.port);
		},
	};

	constructor(
		props: PeripheralProps<MotorProps, MotorState>,
		hardware: ClearCore,
	) {
		super(props, hardware);
		this.port = props.port;
		this.eStopPin = props.eStopPin;
	}

	async initPeripheral(): Promise<void> {
		if (this.eStopPin) {
			await this.hardware.motorsSetEStopPin(this.eStopPin);
		}
	}

	async applyPort(port: number) {
		if (port !== this.port) {
			throw new Error(
				"Changing the port after initialization is not supported.",
			);
		}
	}

	async applyEStopPin(pin: number) {
		if (pin !== this.eStopPin) {
			throw new Error(
				"Changing the eStopPin after initialization is not supported.",
			);
		}
	}

	async applyEnabled(enabled: boolean) {
		if (enabled) {
			await this.hardware.enableMotors(this.port);
		} else {
			await this.hardware.disableMotors(this.port);
		}
	}
	async disownEnabled() {
		await this.hardware.stopMotors(this.port);
		await this.hardware.disableMotors(this.port);
	}

	async applyTarget(target: MotorTargetProps) {
		const { targetPosition, targetVelocity, acceleration } = target;

		const isVelocityMovement =
			acceleration != null && targetVelocity != null && targetPosition == null;
		const isPositionMovement =
			acceleration != null && targetVelocity != null && targetPosition != null;

		// If none of the types are set, there is something wrong
		if (!isVelocityMovement && !isPositionMovement) {
			throw new Error("Target must be set");
		}

		// Stop the motor first no matter what
		await this.hardware.stopMotors(this.port);

		// The acceleration cannot be non-positive
		if (acceleration <= 0) {
			throw new Error("Acceleration must be positive");
		}

		// If target velocity is 0, no movement is needed
		if (targetVelocity === 0) {
			return;
		}

		if (isVelocityMovement && targetVelocity !== 0) {
			await this.hardware.setMotorsVelocity({
				id: this.port,
				velocity: targetVelocity,
				acceleration,
			});
			return;
		}

		if (isPositionMovement) {
			const state = await this.hardware.readMotors(this.port);
			const currentPosition = state[0].position;
			const diff = targetPosition - currentPosition;

			if (diff === 0) {
				return;
			}

			await this.hardware.moveMotors({
				id: this.port,
				steps: diff,
				velocity: targetVelocity,
				acceleration,
			});
		}
	}

	async disownTarget() {
		await this.hardware.stopMotors(this.port);
	}

	async readValuesFromHardware(): Promise<MotorState> {
		// Get motor state
		const motorState = (await this.hardware.readMotors(this.port))[0];
		return motorState;
	}
}
