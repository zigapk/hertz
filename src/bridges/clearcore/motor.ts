import type { ClearCore, MotorState } from "llamajet-driver-ts";
import { Peripheral, type PeripheralProps } from "@/reconciler/pheripheral";

// The motor can be in either of
type MotorTargetProps =
	| { targetPosition: number; targetVelocity: number; acceleration: number } // Target position movement
	| { targetVelocity: number; targetPosition?: never; acceleration: number } // Target velocity movement
	| { targetPosition?: never; targetVelocity?: never; acceleration?: never }; // None of those

interface BaseMotorProps {
	port: number;
	enabled?: boolean;
	eStopPin?: number;
}

type MotorProps = BaseMotorProps & MotorTargetProps;

export class Motor extends Peripheral<ClearCore, MotorProps, MotorState> {
	static readonly tagName = "motor";
	readonly port: number;
	readonly eStopPin?: number;

	constructor(
		props: PeripheralProps<MotorProps, MotorState>,
		hardware: ClearCore,
	) {
		super(props, hardware);
		this.port = props.port;
		this.eStopPin = props.eStopPin;
	}

	initPeripheral(): void {
		if (this.eStopPin) {
			this.hardware.motorsSetEStopPin(this.eStopPin);
		}
	}

	// Stop the motor on disconnect
	async disconnectPeripheral(): Promise<void> {
		await this.hardware.stopMotors(this.port);
		// TODO: we should disable motors here
	}

	override async applyNewPropsToHardware(
		props: PeripheralProps<MotorProps, MotorState>,
	): Promise<void> {
		await super.applyNewPropsToHardware(props);

		if (props.port !== this.port || props.eStopPin !== this.eStopPin) {
			throw new Error(
				"Cannot change port or estop pin after the fact - unmount and remount the component.",
			);
		}

		if (props.enabled) {
			await this.hardware.enableMotors(this.port);
		} else {
			await this.hardware.disableMotors(this.port);
		}

		// If not enabled, we won't perform any movements
		if (!props.enabled) {
			await this.hardware.stopMotors(this.port);
			return;
		}

		const isVelocityMovement =
			props.targetVelocity != null &&
			props.targetPosition == null &&
			props.acceleration != null;
		const isPositionMovement =
			props.targetPosition != null &&
			props.targetVelocity != null &&
			props.acceleration != null;

		// If none of those movements are specified, throw
		if (!isVelocityMovement && !isPositionMovement) {
			throw new Error("Must specify a velocity or position movement");
		}

		if (isPositionMovement) {
			// Stop motor first
			await this.hardware.stopMotors(this.port);

			// Read where we are and calculate the difference
			const motorState = (await this.hardware.readMotors(this.port))[0];
			const currentPosition = motorState.position;
			const diff = props.targetPosition - currentPosition;

			// Set target position on the motor to the desired new position
			await this.hardware.moveMotors({
				id: this.port,
				velocity: props.targetVelocity,
				acceleration: props.acceleration,
				steps: diff,
			});
		} else if (isVelocityMovement) {
			// Stop motor first
			await this.hardware.stopMotors(this.port);

			if (props.targetVelocity !== 0) {
				// Set velocity if any
				await this.hardware.setMotorsVelocity({
					id: this.port,
					velocity: props.targetVelocity,
					acceleration: props.acceleration,
				});
			}
		}
	}

	async readValuesFromHardware(): Promise<MotorState> {
		// Get motor state
		const motorState = (await this.hardware.readMotors(this.port))[0];
		return motorState;
	}
}
