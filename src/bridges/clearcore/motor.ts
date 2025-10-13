import type { ClearCore, MotorState } from "llamajet-driver-ts";
import { Peripheral, type PeripheralProps } from "@/reconciler/pheripheral";

// The motor can be in either of
type MotorTargetProps =
	| { targetPosition: number; targetVelocity: number; acceleration: number }
	| { targetVelocity: number; targetPosition: never; acceleration: number }
	| { targetPosition: never; targetVelocity: never; acceleration: never };

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

	override async applyNewPropsToHardware(
		props: PeripheralProps<MotorProps, MotorState>,
	): Promise<void> {
		const oldProps = this.props;
		await super.applyNewPropsToHardware(props);

		if (props.port !== this.port || props.eStopPin !== this.eStopPin) {
			throw new Error(
				"Cannot change port or estop pin after the fact - unmount and remount the component.",
			);
		}

		if (oldProps.enabled !== props.enabled) {
			if (props.enabled) {
				await this.hardware.enableMotors(this.port);
			} else {
				await this.hardware.disableMotors(this.port);
			}
		}

		// TODO: not all cases are covered here. What if props get undefined?

		if (
			props.targetPosition != null &&
			props.targetVelocity != null &&
			oldProps.targetPosition !== props.targetPosition
		) {
			await this.hardware.stopMotors(this.port);
			const motorState = (await this.hardware.readMotors(this.port))[0];
			const currentPosition = motorState.position;
			const diff = props.targetPosition - currentPosition;

			await this.hardware.moveMotors({
				id: this.port,
				velocity: props.targetVelocity,
				acceleration: props.acceleration,
				steps: diff,
			});
		} else if (
			props.targetVelocity != null &&
			oldProps.targetVelocity !== props.targetVelocity
		) {
			await this.hardware.stopMotors(this.port);

			if (props.targetVelocity !== 0) {
				await this.hardware.setMotorsVelocity({
					id: this.port,
					velocity: props.targetVelocity,
					acceleration: props.acceleration,
				});
			}
		}
	}

	async readValuesFromHardware(): Promise<MotorState> {
		const motorState = (await this.hardware.readMotors(this.port))[0];
		return motorState;
	}
}
