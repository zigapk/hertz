// A type representing a constructor for any peripheral.
export type AnyPeripheralConstructor<Hardware> = {
	new (
		// biome-ignore lint/suspicious/noExplicitAny: Needs to be ambiguous because we cannot always know the type in advance.
		props: PeripheralProps<any, any>,
		hardware: Hardware,
	): Peripheral<unknown, object, object>;
	readonly tagName: string;
};

/**
 * Creates `on...Change` callback props from an object's keys and value types.
 * Each callback receives the new value and a boolean `isInitialRead`.
 *
 * @example
 * // For input: { value: boolean; count: number }
 * // Produces: {
 * //   onValueChange?: (value: boolean, isInitialRead: boolean) => void;
 * //   onCountChange?: (count: number, isInitialRead: boolean) => void;
 * // }
 */
type OnChangeProps<V extends object> = {
	[K in keyof V as `on${Capitalize<string & K>}Change`]?: (
		value: V[K],
		isInitialRead: boolean,
	) => void;
};

/**
 * A Mapped Type that creates "apply" methods for each key in T.
 */
export type ApplyMethods<T extends object> = {
	[K in keyof T as `apply${Capitalize<string & K>}`]: (
		value: T[K],
	) => Promise<void>;
};

/**
 * Combines required `apply` and optional `disown` methods.
 * A concrete class will `implements` this single type.
 */
type PeripheralLifecycleMethods<T extends object> = ApplyMethods<T> &
	DisownMethods<T>;
/**
 * Creates *optional* `disown...` methods for each key in T.
 */
type DisownMethods<T extends object> = {
	[K in keyof T as `disown${Capitalize<string & K>}`]?: () => Promise<void>;
};

/**
 * Combines a peripheral's base props with the auto-generated OnChangeProps.
 */
export type PeripheralProps<P, V extends object> = P & OnChangeProps<V>;

export abstract class BasePeripheral<
	Hardware,
	WritableProps,
	ReadableValues extends object,
> {
	// The current props for the peripheral, including `on...Change` callbacks.
	protected props: PeripheralProps<WritableProps, ReadableValues>;

	// The last known values from the peripheral, used for change detection.
	private lastValues?: ReadableValues;

	// Hardware allows us to have a reference to an instance of the hardware we're using.
	protected readonly hardware: Hardware;

	constructor(
		props: PeripheralProps<WritableProps, ReadableValues>,
		hardware: Hardware,
	) {
		this.props = props;
		this.hardware = hardware;
	}

	/**
	 * Performs the initial one-time setup for the peripheral (e.g., setting pin modes).
	 */
	abstract initPeripheral(): Promise<void> | void;

	/**
	 * Reads the latest values from the physical peripheral.
	 */
	abstract readValuesFromHardware(): Promise<ReadableValues>;

	/**
	 * Applys new props to hardware. In other words - it reconciles the new props with the real hardware state.
	 */
	async applyNewPropsToHardware(
		props: PeripheralProps<WritableProps, ReadableValues>,
	): Promise<void> {
		this.props = props;

		// TODO: call the onChange methods in a memoized way (memoization needs to be done in the same way as for onChange callbacks)
		// TODO: if the prop has become undefined, call the disown method
	}

	async desconstructPeripheral(): Promise<void> {
		// TODO: call all the disown methods
	}

	/**
	 * Polls the peripheral for new values and fires `on...Change` callbacks.
	 * Fires callbacks for all values on the first run, and only for changed values on subsequent runs.
	 */
	async queryForChanges(): Promise<void> {
		const newValues = await this.readValuesFromHardware();

		// Check if this is the initial read (no previous values stored).
		const isInitial = this.lastValues === undefined;

		const keys = Object.keys(newValues) as Array<keyof ReadableValues>;

		for (const key of keys) {
			const newValue = newValues[key];

			const callbackName = `on${
				(key as string).charAt(0).toUpperCase() + (key as string).slice(1)
			}Change` as keyof OnChangeProps<ReadableValues>;

			const callback = this.props[callbackName] as
				| ((value: unknown, isInitial: boolean) => void)
				| undefined;

			if (typeof callback !== "function") {
				continue;
			}

			if (isInitial) {
				// On the initial read, fire the callback for every value.
				callback(newValue, true);
			} else {
				// On subsequent reads, only fire if the value has changed.
				// biome-ignore lint/style/noNonNullAssertion: Because this is not an initial read, we know the key exists in lastValues.
				const oldValue = this.lastValues![key];
				// Compare the values using JSON.stringify, because this might be an object or array.
				if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
					callback(newValue, false);
				}
			}
		}

		// Store the latest values for the next comparison
		this.lastValues = newValues;
	}
}

/**
 * This type represents a fully implemented peripheral instance.
 * It combines the base Peripheral class with the dynamic ApplyMethods.
 */
export type Peripheral<
	Hardware,
	WritableProps extends object,
	ReadableValues extends object,
> = BasePeripheral<Hardware, WritableProps, ReadableValues> &
	PeripheralLifecycleMethods<WritableProps>;
