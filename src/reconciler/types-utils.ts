import type { AnyPeripheralConstructor } from "./pheripheral";

export type EmptyObject = Record<string, never>;

// Extracts the props type from a peripheral constructor.
type Props<T> = T extends {
	// biome-ignore lint/suspicious/noExplicitAny: Needs to be any to be able to extract from constructor
	new (props: infer P, hw: any): any;
}
	? P
	: never;

// Extracts the static tagName from a peripheral constructor.
type Tag<T> = T extends { tagName: infer N } ? N : never;

/**
 * Creates a map of intrinsic element types from a union of peripheral constructors.
 * @example
 * type MyPeripherals = IntrinsicPeripherals<typeof DPinIn | typeof Motor>
 * // Result:
 * // {
 * //   dpinin: DPinInProps;
 * //   motor: MotorProps;
 * // }
 */

// biome-ignore lint/suspicious/noExplicitAny: Hardware is not crucial to the type here - this is used mostly for onXYZChange inference.
export type IntrinsicPeripherals<T extends AnyPeripheralConstructor<any>> = {
	[K in T as Tag<K>]: Props<K>;
};
