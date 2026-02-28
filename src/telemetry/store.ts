import { subscribeWithSelector } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

// Generic callback used by full-state subscriptions.
type TelemetryListener = () => void;

// Tuple path used for nested telemetry updates, e.g. ["robot", "phase"].
export type TelemetryPath = readonly [string, ...string[]];

// Resolves the value type at a tuple path.
export type TelemetryPathValue<
	TState extends object,
	TPath extends readonly string[],
> = TPath extends readonly [
	infer TKey extends string,
	...infer TRest extends string[],
]
	? TKey extends keyof TState
		? TRest extends []
			? TState[TKey]
			: TState[TKey] extends object
				? TelemetryPathValue<TState[TKey], TRest>
				: never
		: never
	: TState;

// Selector for partial subscriptions.
export type TelemetrySelector<TState extends object, TSlice> = (
	state: TState,
) => TSlice;

// Public telemetry API exposed to code outside the React tree.
export interface TelemetryStore<TState extends object> {
	getSnapshot: () => TState;
	subscribe: (listener: TelemetryListener) => () => void;
	subscribeSelector: <TSlice>(
		selector: TelemetrySelector<TState, TSlice>,
		listener: (next: TSlice, previous: TSlice) => void,
		isEqual?: (a: TSlice, b: TSlice) => boolean,
	) => () => void;
	setPath: <TPath extends TelemetryPath>(
		path: TPath,
		value: TelemetryPathValue<TState, TPath>,
	) => void;
	deletePath: (path: TelemetryPath) => void;
}

type RecordValue = Record<string, unknown>;

// Guard for plain object traversal during nested updates.
function isRecord(value: unknown): value is RecordValue {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Immutable nested set helper.
function setValueAtPath(
	current: unknown,
	path: readonly string[],
	value: unknown,
): unknown {
	const [key, ...rest] = path;

	if (key === undefined) {
		return value;
	}

	const currentRecord = isRecord(current) ? current : {};
	const currentChild = currentRecord[key];
	const nextChild = setValueAtPath(currentChild, rest, value);

	if (Object.is(currentChild, nextChild)) {
		return currentRecord;
	}

	return {
		...currentRecord,
		[key]: nextChild,
	};
}

// Immutable nested delete helper that also removes empty parent objects.
function deleteValueAtPath(current: unknown, path: readonly string[]): unknown {
	if (!isRecord(current)) {
		return current;
	}

	const [key, ...rest] = path;
	if (key === undefined) {
		return current;
	}

	if (!(key in current)) {
		return current;
	}

	if (rest.length === 0) {
		const next: RecordValue = { ...current };
		delete next[key];
		return next;
	}

	const currentChild = current[key];
	const nextChild = deleteValueAtPath(currentChild, rest);

	if (Object.is(currentChild, nextChild)) {
		return current;
	}

	const next: RecordValue = { ...current };

	if (isRecord(nextChild) && Object.keys(nextChild).length === 0) {
		delete next[key];
	} else {
		next[key] = nextChild;
	}

	return next;
}

// Creates a standalone telemetry store backed by Zustand vanilla.
// This keeps telemetry readable from outside React while still supporting selectors.
export function createTelemetryStore<TState extends object>(
	initialState: TState,
): TelemetryStore<TState> {
	const store = createStore<TState>()(
		subscribeWithSelector(() => initialState),
	);

	// Reads the current full telemetry snapshot.
	const getSnapshot = (): TState => store.getState();

	// Subscribes to any telemetry change.
	const subscribe = (listener: TelemetryListener): (() => void) => {
		return store.subscribe(() => {
			listener();
		});
	};

	// Sets a nested telemetry value.
	const setPath = <TPath extends TelemetryPath>(
		path: TPath,
		value: TelemetryPathValue<TState, TPath>,
	): void => {
		store.setState((currentState) => {
			const nextState = setValueAtPath(currentState, path, value) as TState;

			if (Object.is(currentState, nextState)) {
				return currentState;
			}

			return nextState;
		});
	};

	// Deletes a nested telemetry value.
	const deletePath = (path: TelemetryPath): void => {
		store.setState((currentState) => {
			const nextState = deleteValueAtPath(currentState, path) as TState;

			if (Object.is(currentState, nextState)) {
				return currentState;
			}

			return nextState;
		});
	};

	// Subscribes to a selected slice with optional custom equality.
	const subscribeSelector = <TSlice>(
		selector: TelemetrySelector<TState, TSlice>,
		listener: (next: TSlice, previous: TSlice) => void,
		isEqual: (a: TSlice, b: TSlice) => boolean = Object.is,
	): (() => void) => {
		return store.subscribe(selector, listener, {
			equalityFn: isEqual,
		});
	};

	return {
		getSnapshot,
		subscribe,
		subscribeSelector,
		setPath,
		deletePath,
	};
}
