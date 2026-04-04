import type { IntrinsicPeripherals } from "@/reconciler/types-utils";
import { RpiDPinInPeripheral } from "./digital-pin-in.js";
import { RpiDPinOutPeripheral } from "./digital-pin-out.js";

// Re-export all the types
export * from "./digital-pin-in.js";
export * from "./digital-pin-out.js";
export * from "./hardware.js";

export const rpiPeripherals = [RpiDPinInPeripheral, RpiDPinOutPeripheral];

declare module "react" {
	namespace JSX {
		interface IntrinsicElements
			extends IntrinsicPeripherals<(typeof rpiPeripherals)[number]> {}
	}
}
