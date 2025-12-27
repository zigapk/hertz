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
	[K in keyof T as `apply${Capitalize<string & K>}`]-?: (
		value: Exclude<T[K], undefined>, // Peripheral calls disown mehods if undefined is present, we know that here this will not happen
	) => Promise<void>;
};

/**
 * Creates *optional* `disown...` methods for each key in T.
 */
type DisownMethods<T extends object> = {
	[K in keyof T as `disown${Capitalize<string & K>}`]?: () => Promise<void>;
};

/**
 * Combines required `apply` and optional `disown` methods.
 * A concrete class will `implements` this single type.
 */
export type PeripheralLifecycleMethods<T extends object> = ApplyMethods<T> &
	DisownMethods<T>;

/**
 * Combines a peripheral's base props with the auto-generated OnChangeProps.
 */
export type PeripheralProps<P, V extends object> = P & OnChangeProps<V>;

export abstract class BasePeripheral<
	Hardware,
	WritableProps extends object,
	ReadableValues extends object,
> {
	// The current props for the peripheral, including `on...Change` callbacks.
	protected props: PeripheralProps<WritableProps, ReadableValues>;

	// The last known values from the peripheral, used for change detection.
	private lastValues?: ReadableValues;

	// Hardware allows us to have a reference to an instance of the hardware we're using.
	protected readonly hardware: Hardware;

	// Remembers whether the peripheral was already initialized.
	private initialized = false;

	// Remember whether props have already been applied at least once.
	private appliedProps = false;

	constructor(
		props: PeripheralProps<WritableProps, ReadableValues>,
		hardware: Hardware,
	) {
		this.props = props;
		this.hardware = hardware;
	}

	/**
	 * Real init that calls the initPeripheral method and sets the initialized flag.
	 */
	async init(): Promise<void> {
		await this.initPeripheral();
		this.initialized = true;
	}

	/**
	 * Returns whether the peripheral is initialized.
	 */
	isInitialized(): boolean {
		return this.initialized;
	}

	/**
	 * Performs the initial one-time setup for the peripheral (e.g., setting pin modes).
	 */
	abstract initPeripheral(): Promise<void>;

	/**
	 * Reads the latest values from the physical peripheral.
	 */
	abstract readValuesFromHardware(): Promise<ReadableValues>;

	/**
	 * Applys new props to hardware. In other words - it reconciles the new props with the real hardware state.
	 */
	async applyNewPropsToHardware(
		prevProps: PeripheralProps<WritableProps, ReadableValues>,
		nextProps: PeripheralProps<WritableProps, ReadableValues>,
	): Promise<void> {
		// Check that the peripheral is initialized.
		if (!this.isInitialized()) {
			throw new Error("Peripheral is not initialized");
		}

		// Remember the new props.
		this.props = nextProps;

		const prevPropKeys = Object.keys(prevProps) as Array<keyof WritableProps>;
		const nextPropKeys = Object.keys(this.props) as Array<keyof WritableProps>;

		// We neet to iterate over the union of keys from prevProps and newProps
		const allKeys = [...new Set([...nextPropKeys, ...prevPropKeys])];

		for (const key of allKeys) {
			const newValue = this.props[key];
			const oldValue = prevProps[key];

			const applyMethodName = `apply${
				(key as string).charAt(0).toUpperCase() + (key as string).slice(1)
			}` as keyof PeripheralLifecycleMethods<WritableProps>;

			const applyMethod = (
				this as unknown as PeripheralLifecycleMethods<WritableProps>
			)[applyMethodName] as ((value: unknown) => Promise<void>) | undefined;
			const disownMethodName = `disown${
				(key as string).charAt(0).toUpperCase() + (key as string).slice(1)
			}` as keyof DisownMethods<WritableProps>;

			const disownMethod = (this as unknown as DisownMethods<WritableProps>)[
				disownMethodName
			] as (() => Promise<void>) | undefined;

			const propDiffersOrFirstApply =
				!this.appliedProps ||
				JSON.stringify(oldValue) !== JSON.stringify(newValue);

			// Apply the new value if it differs from previous real-world state
			if (
				newValue !== undefined &&
				propDiffersOrFirstApply &&
				typeof applyMethod === "function"
			) {
				await applyMethod.call(this, newValue);
			}

			// Disown the value if the new props do not specify it
			if (
				newValue === undefined &&
				oldValue !== undefined &&
				typeof disownMethod === "function"
			) {
				if (typeof disownMethod === "function") {
					await disownMethod.call(this);
				}
			}
		}

		// Remember that we applied props at least once.
		this.appliedProps = true;
	}

	async desconstructPeripheral(): Promise<void> {
		const propKeys = Object.keys(this.props) as Array<keyof WritableProps>;

		for (const key of propKeys) {
			const disownMethodName = `disown${
				(key as string).charAt(0).toUpperCase() + (key as string).slice(1)
			}` as keyof DisownMethods<WritableProps>;

			const disownMethod = (this as unknown as DisownMethods<WritableProps>)[
				disownMethodName
			] as (() => Promise<void>) | undefined;

			if (typeof disownMethod === "function") {
				await disownMethod.call(this);
			}
		}
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
