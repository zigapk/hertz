import { createHigherLevelComponent } from "@/reconciler/higher-level-component.js";
import {
	BasePeripheral,
	type PeripheralLifecycleMethods,
	type PeripheralProps,
} from "@/reconciler/pheripheral.js";
import type { EmptyObject } from "@/reconciler/types-utils.js";
import type { SimEngine } from "./engine.js";

interface SimMotorProps {
	side: "L" | "R";
	velocity: number;
}

export class SimMotorPeripheral
	extends BasePeripheral<SimEngine, SimMotorProps, EmptyObject>
	implements PeripheralLifecycleMethods<SimMotorProps>
{
	static readonly tagName = "simmotor";
	private readonly side: "L" | "R";

	refData = {};

	constructor(
		props: PeripheralProps<SimMotorProps, EmptyObject>,
		hardware: SimEngine,
	) {
		super(props, hardware);
		this.side = props.side;
	}

	async initPeripheral(): Promise<void> {
		// No-op — simulation motors need no hardware init
	}

	async applySide(side: "L" | "R"): Promise<void> {
		if (side !== this.side) {
			throw new Error(
				"Changing the motor side after initialization is not supported.",
			);
		}
	}

	async applyVelocity(velocity: number): Promise<void> {
		this.hardware.setMotorVelocity(this.side, velocity);
	}

	async disownVelocity(): Promise<void> {
		this.hardware.setMotorVelocity(this.side, 0);
	}

	async readValuesFromHardware(): Promise<EmptyObject> {
		return {};
	}
}

export const SimMotor = createHigherLevelComponent(SimMotorPeripheral);
