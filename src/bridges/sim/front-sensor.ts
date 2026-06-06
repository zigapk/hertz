import { createHigherLevelComponent } from "@/reconciler/higher-level-component.js";
import { BasePeripheral } from "@/reconciler/pheripheral.js";
import type { SimEngine } from "./engine.js";

interface FrontSensorValues {
	pressed: boolean;
}

// biome-ignore lint/complexity/noBannedTypes: Using {} instead of EmptyObject (Record<string, never>) to avoid poisoning intersection types — EmptyObject makes all string-keyed props `never`, which breaks OnChangeProps.
type NoProps = {};

export class SimFrontSensorPeripheral extends BasePeripheral<
	SimEngine,
	NoProps,
	FrontSensorValues
> {
	static readonly tagName = "simfrontsensor";

	refData = {};

	async initPeripheral(): Promise<void> {
		// No-op
	}

	async readValuesFromHardware(): Promise<FrontSensorValues> {
		return { pressed: this.hardware.getFrontSensorPressed() };
	}
}

export const SimFrontSensor = createHigherLevelComponent(
	SimFrontSensorPeripheral,
);
