import type { IntrinsicPeripherals } from "@/reconciler/types-utils";
import { DPinIn } from "./digital-pin-in.js";
import { DPinOut } from "./digital-pin-out.js";
import { Motor } from "./motor.js";

// Re-export all the types
export * from "./digital-pin-in.js";
export * from "./digital-pin-out.js";
export * from "./motor.js";

export const clearCorePeripherals = [DPinIn, DPinOut, Motor];

declare module "react" {
	namespace JSX {
		interface IntrinsicElements
			extends IntrinsicPeripherals<(typeof clearCorePeripherals)[number]> {}
	}
}
