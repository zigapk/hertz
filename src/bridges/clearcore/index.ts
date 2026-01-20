import type { IntrinsicPeripherals } from "@/reconciler/types-utils";
import { CCDPinInPeripheral } from "./digital-pin-in.js";
import { CCDPinOutPeripheral } from "./digital-pin-out.js";
import { CCMotorPeripheral } from "./motor.js";

// Re-export all the types
export * from "./digital-pin-in.js";
export * from "./digital-pin-out.js";
export * from "./motor.js";

export const clearCorePeripherals = [
	CCDPinInPeripheral,
	CCDPinOutPeripheral,
	CCMotorPeripheral,
];

declare module "react" {
	namespace JSX {
		interface IntrinsicElements
			extends IntrinsicPeripherals<(typeof clearCorePeripherals)[number]> {}
	}
}
