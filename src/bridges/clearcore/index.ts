import type { IntrinsicPeripherals } from "@/reconciler/types-utils";
import { DPinIn } from "./digital-pin-in.js";
import { DPinOut } from "./digital-pin-out.js";
import { Motor } from "./motor.js";

export const peripherals = [DPinIn, DPinOut, Motor];

declare module "react" {
	namespace JSX {
		interface IntrinsicElements
			extends IntrinsicPeripherals<(typeof peripherals)[number]> {}
	}
}
