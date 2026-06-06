import type { IntrinsicPeripherals } from "@/reconciler/types-utils.js";
import { SimFrontSensorPeripheral } from "./front-sensor.js";
import { SimMotorPeripheral } from "./motor.js";

// Re-export all the types
export * from "./engine.js";
export * from "./front-sensor.js";
export * from "./motor.js";
export * from "./sse-server.js";

export const simPeripherals = [SimMotorPeripheral, SimFrontSensorPeripheral];

declare module "react" {
	namespace JSX {
		interface IntrinsicElements
			extends IntrinsicPeripherals<(typeof simPeripherals)[number]> {}
	}
}
