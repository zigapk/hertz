import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useRef } from "react";
import type {
	TelemetryPath,
	TelemetryPathValue,
	TelemetryStore,
} from "./store.js";

type GenericTelemetryStore = TelemetryStore<Record<string, unknown>>;

// Context used by telemetry publishing hooks.
const telemetryContext = createContext<GenericTelemetryStore | null>(null);

type RobotTelemetryProviderProps<TState extends object> = PropsWithChildren<{
	store: TelemetryStore<TState>;
}>;

// Injects a telemetry store for a robot subtree.
export function RobotTelemetryProvider<TState extends object>({
	children,
	store,
}: RobotTelemetryProviderProps<TState>) {
	return (
		<telemetryContext.Provider value={store as GenericTelemetryStore}>
			{children}
		</telemetryContext.Provider>
	);
}

// Reads the telemetry store from context and enforces provider usage.
export function useTelemetryStore<
	TState extends object,
>(): TelemetryStore<TState> {
	const store = useContext(telemetryContext);
	if (store === null) {
		throw new Error(
			"useTelemetryStore must be used under <RobotTelemetryProvider>",
		);
	}

	return store as unknown as TelemetryStore<TState>;
}

type UseTelemetryOptions<TValue> = {
	enabled?: boolean;
	equals?: (a: TValue, b: TValue) => boolean;
};

const UNSET = Symbol("telemetry-unset");

// Stable path identity for detecting path changes across renders.
function getPathKey(path: readonly string[]): string {
	return path.join("\u0000");
}

// Publishes a typed telemetry value to the external store.
// - Writes on mount/update.
// - Deletes the path on unmount (or when disabled).
export function useTelemetry<
	TState extends object,
	TPath extends TelemetryPath = TelemetryPath,
>(
	path: TPath,
	value: TelemetryPathValue<TState, TPath>,
	options?: UseTelemetryOptions<TelemetryPathValue<TState, TPath>>,
): void {
	const store = useTelemetryStore<TState>();
	const enabled = options?.enabled ?? true;
	const equals = options?.equals ?? Object.is;

	const previousPathRef = useRef<TPath | null>(null);
	const previousPathKeyRef = useRef<string | null>(null);
	const previousValueRef = useRef<
		TelemetryPathValue<TState, TPath> | typeof UNSET
	>(UNSET);
	const pathKey = getPathKey(path);

	useEffect(() => {
		if (!enabled) {
			if (previousPathRef.current !== null) {
				store.deletePath(previousPathRef.current);
				previousPathRef.current = null;
				previousPathKeyRef.current = null;
				previousValueRef.current = UNSET;
			}
			return;
		}

		if (
			previousPathRef.current !== null &&
			previousPathKeyRef.current !== pathKey
		) {
			store.deletePath(previousPathRef.current);
			previousValueRef.current = UNSET;
		}

		if (
			previousPathKeyRef.current !== pathKey ||
			previousValueRef.current === UNSET ||
			!equals(previousValueRef.current, value)
		) {
			store.setPath(path, value);
			previousValueRef.current = value;
		}

		previousPathRef.current = path;
		previousPathKeyRef.current = pathKey;
	}, [enabled, equals, path, pathKey, store, value]);

	useEffect(() => {
		return () => {
			if (previousPathRef.current !== null) {
				store.deletePath(previousPathRef.current);
				previousPathRef.current = null;
				previousPathKeyRef.current = null;
				previousValueRef.current = UNSET;
			}
		};
	}, [store]);
}
