import React, { useState } from "react";
import type { AnyPeripheralConstructor } from "./pheripheral";
import type { EmptyObject } from "./types-utils";

/**
 * Extract props type from a peripheral constructor.
 * This gets the first parameter type of the constructor.
 */
// biome-ignore lint/suspicious/noExplicitAny: Need any to accept peripheral with any hardware type
type ExtractPeripheralProps<T extends AnyPeripheralConstructor<any>> =
	T extends {
		// biome-ignore lint/suspicious/noExplicitAny: Need any to extract constructor parameter type
		new (props: infer P, hw: any): any;
	}
		? P
		: never;

/**
 * Extract the ref data type from a peripheral instance.
 * This is what gets exposed via React refs.
 */
// biome-ignore lint/suspicious/noExplicitAny: Need any to accept peripheral with any hardware type
type ExtractRefData<T extends AnyPeripheralConstructor<any>> = T extends {
	// biome-ignore lint/suspicious/noExplicitAny: Need any for type extraction
	new (props: any, hw: any): { refData: infer R };
}
	? R
	: EmptyObject;

/**
 * Extract the tag name (lowercase intrinsic element name) from a peripheral class.
 */
// biome-ignore lint/suspicious/noExplicitAny: Need any to accept peripheral with any hardware type
type ExtractTagName<T extends AnyPeripheralConstructor<any>> = T extends {
	tagName: infer N;
}
	? N
	: never;

/**
 * The props for a higher-level component.
 * Same as peripheral props but without the onError callback (we handle that internally).
 */
// biome-ignore lint/suspicious/noExplicitAny: Need any to accept peripheral with any hardware type
type HigherLevelProps<T extends AnyPeripheralConstructor<any>> = Omit<
	ExtractPeripheralProps<T>,
	"onError"
>;

// ============================================================================
// Main Factory Function
// ============================================================================

/**
 * Creates a higher-level component that wraps a peripheral with error handling.
 *
 * The returned component:
 * - Accepts all the same props as the peripheral (except onError)
 * - Internally manages error state
 * - Throws errors on the next render to propagate them up the React tree
 * - Supports refs that expose the peripheral's refData
 *
 * @param PeripheralClass - The peripheral class to wrap (e.g., CCMotorPeripheral)
 * @returns A React component that wraps the peripheral with error handling
 *
 * @example
 * ```tsx
 * // In your bridge file:
 * export const CCMotor = createHigherLevelComponent(CCMotorPeripheral);
 *
 * // Usage in your app:
 * <CCMotor
 *   port={0}
 *   enabled={true}
 *   target={{ targetVelocity: 100, acceleration: 50 }}
 * />
 * ```
 */
export function createHigherLevelComponent<
	// biome-ignore lint/suspicious/noExplicitAny: Need any to accept peripheral with any hardware type
	T extends AnyPeripheralConstructor<any>,
>(PeripheralClass: T) {
	type Props = HigherLevelProps<T>;
	type RefData = ExtractRefData<T>;
	type TagName = ExtractTagName<T>;

	const Component = React.forwardRef<RefData, Props>((props, ref) => {
		const [error, setError] = useState<Error | null>(null);

		// If an error was set by the onError callback, throw it on the next render
		// This allows React error boundaries to catch it
		if (error) {
			throw error;
		}

		// Create the lowercase intrinsic element with all props plus our onError handler
		const elementProps = {
			...props,
			onError: setError,
			ref,
		};

		// Use React.createElement to create the lowercase peripheral element
		// This will be picked up by your custom reconciler
		return React.createElement(
			PeripheralClass.tagName as TagName,
			elementProps,
		);
	});

	// Set display name for better debugging in React DevTools
	Component.displayName = `HigherLevel(${PeripheralClass.tagName})`;

	return Component;
}
