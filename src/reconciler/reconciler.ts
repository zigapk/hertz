import { createContext } from "react";
import type { HostConfig, ReactContext } from "react-reconciler";
import Reconciler from "react-reconciler";
import {
	ConcurrentRoot,
	DefaultEventPriority,
	NoEventPriority,
} from "react-reconciler/constants";
import type { AnyPeripheralConstructor, Peripheral } from "./pheripheral";
import type { EmptyObject } from "./types-utils";
import { onShutdown } from "node-graceful-shutdown";

// Deferred Signal System
type Deferred = {
	promise: Promise<void>;
	resolve: () => void;
	reject: (reason?: unknown) => void;
};

// Map<NodeID, Deferred>
// This holds the "Lifecycle Promise" for every node.
const nodeSignals = new Map<number, Deferred>();

function createDeferred(): Deferred {
	let resolve: () => void = () => {};
	let reject: (reason?: unknown) => void = () => {};
	const promise = new Promise<void>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

function getNodeSignal(id: number): Deferred {
	if (!nodeSignals.has(id)) {
		nodeSignals.set(id, createDeferred());
	}
	// biome-ignore lint/style/noNonNullAssertion: We know it exists because we just set it if missing
	return nodeSignals.get(id)!;
}

let nextId = 0;

type Props = Record<string, unknown>;

export interface DOMNode<
	TagName extends string,
	Props = Record<string, unknown>,
> {
	id: number;
	type: TagName;
	props: Props;
	children: DOMNode<TagName, Props>[];
	parent: DOMNode<TagName, Props> | null;
	pheripheralInstance: Peripheral<unknown, object, object>;
}

interface HostContainer<TagName extends string> {
	head: DOMNode<TagName, Props> | null;
}

class ReconcilerState {
	private currentEventPriority: number = NoEventPriority;
	private readonly mountedPheriperals: Peripheral<unknown, object, object>[] =
		[];

	getCurrentEventPriority(): number {
		return this.currentEventPriority;
	}
	setCurrentEventPriority(priority: number): void {
		this.currentEventPriority = priority;
	}

	pushPheriperal(peripheral: Peripheral<unknown, object, object>): void {
		this.mountedPheriperals.push(peripheral);
	}

	removePheriperal(peripheral: Peripheral<unknown, object, object>): void {
		const index = this.mountedPheriperals.indexOf(peripheral);
		if (index !== -1) {
			this.mountedPheriperals.splice(index, 1);
		}
	}

	getIthPheriperal(i: number): Peripheral<unknown, object, object> | undefined {
		return this.mountedPheriperals[i];
	}

	getPheriperalCount(): number {
		return this.mountedPheriperals.length;
	}

	getMountedPeripherals(): Peripheral<unknown, object, object>[] {
		return this.mountedPheriperals;
	}
}

export function createReconciler<
	const T extends readonly AnyPeripheralConstructor<Hardware>[],
	Hardware,
>(peripherals: T, hardware: Hardware) {
	type TagName = T[number]["tagName"];

	const peripheralMap = new Map<TagName, AnyPeripheralConstructor<Hardware>>(
		peripherals.map((p) => [p.tagName as TagName, p]),
	);

	const reconcilerState = new ReconcilerState();

	const hostConfig: HostConfig<
		TagName,
		Props,
		HostContainer<TagName>,
		DOMNode<TagName, Props>,
		never,
		DOMNode<TagName, Props>,
		never,
		never,
		null,
		EmptyObject,
		never,
		number,
		number,
		null
	> = {
		isPrimaryRenderer: true,
		supportsMutation: true,
		warnsIfNotActing: false,
		supportsHydration: false,
		supportsPersistence: false,
		scheduleTimeout: setTimeout,
		cancelTimeout: clearTimeout,
		HostTransitionContext: createContext<"completed">(
			"completed",
		) as unknown as ReactContext<null>,
		noTimeout: -1,

		// Creation Phase (Synchronous Reservation)
		createInstance: (type: TagName, props) => {
			const instanceConstructor = peripheralMap.get(type);
			if (instanceConstructor === undefined) {
				throw new Error(`Unknown tag type: ${type}`);
			}

			const id = nextId++;
			const instance = new instanceConstructor(props, hardware);

			// Reserve the signal immediately (React goes top-down when creating instances).
			// This creates the "Slot" that children can wait on.
			getNodeSignal(id);

			// Add to runtime state (for event loop)
			reconcilerState.pushPheriperal(instance);

			return {
				id,
				type,
				props,
				children: [],
				parent: null,
				pheripheralInstance: instance,
			};
		},

		// Mount Phase (Async Initialization)
		finalizeInitialChildren: () => true, // Force commitMount to run
		commitMount: (instance) => {
			const id = instance.id;
			const parent = instance.parent;

			const mySignal = getNodeSignal(id);

			// Identify Dependency: Wait for Parent's Signal
			// If no parent, we resolve immediately (no parent means we are the root).
			const parentPromise = parent
				? getNodeSignal(parent.id).promise
				: Promise.resolve();

			// Chain Logic: Wait for Parent -> Init Self -> Resolve Self
			parentPromise
				.then(() => {
					// Parent is ready. Now we init ourselves on the hardware.
					return instance.pheripheralInstance.init();
				})
				.then(() => {
					// We are ready. Signal children/updates.
					mySignal.resolve();
				})
				.catch((err) => {
					console.error(`Failed to mount node ${id} (${instance.type})`, err);
					mySignal.reject(err);
				});
		},

		// Update Phase (Async Update)
		commitUpdate: (instance, _type, prevProps, nextProps) => {
			instance.props = nextProps;
			const id = instance.id;
			const mySignal = getNodeSignal(id);

			// Chain update onto the existing signal (ensures init is done first)
			// We update the promise in the map so subsequent updates wait for this one.
			const newPromise = mySignal.promise
				.then(() => {
					return instance.pheripheralInstance.applyNewPropsToHardware(
						prevProps,
						nextProps,
					);
				})
				.catch((err) => {
					console.error(`Failed to update node ${id}`, err);
				});

			// Update the signal pointer so future operations wait for this update
			// Note: We cast to void because getNodeSignal returns { promise, resolve, reject }
			// and we are technically monkey-patching the promise property here to maintain the chain.
			// A cleaner way is to keep a separate "tail" map, but this works for sequential ops.
			// Ideally, we shouldn't overwrite the 'resolve' capability of the original deferred,
			// just the promise chain for consumers.
			mySignal.promise = newPromise;
		},

		// Destruction Phase (Async Destroy)
		removeChild: (parent, child) => {
			// Logical Update (Sync)
			child.parent = null;
			parent.children = parent.children.filter((c) => c !== child);

			const id = child.id;
			const mySignal = getNodeSignal(id);

			// Async Destruction
			// Chain onto whatever is currently happening (init or update)
			mySignal.promise
				.then(() => {
					return child.pheripheralInstance.desconstructPeripheral();
				})
				.finally(() => {
					// Cleanup
					reconcilerState.removePheriperal(child.pheripheralInstance);
					nodeSignals.delete(id);
				});
		},

		removeChildFromContainer: (container, child) => {
			// Same logic as removeChild, but for root
			container.head = null;
			const id = child.id;
			const mySignal = getNodeSignal(id);

			mySignal.promise
				.then(() => {
					return child.pheripheralInstance.desconstructPeripheral();
				})
				.finally(() => {
					reconcilerState.removePheriperal(child.pheripheralInstance);
					nodeSignals.delete(id);
				});
		},

		// Structural Changes (Purely Logical/Sync)
		appendInitialChild: (parent, child) => {
			child.parent = parent;
			parent.children.push(child);
		},
		appendChild: (parent, child) => {
			child.parent = parent;
			parent.children.push(child);
		},
		appendChildToContainer: (container, child) => {
			container.head = child;
		},
		insertBefore: (parent, child, beforeChild) => {
			child.parent = parent;
			parent.children.splice(parent.children.indexOf(beforeChild), 0, child);
			// Note: insertBefore doesn't trigger commitMount again,
			// so the async lifecycle is handled by the original creation.
		},

		// Boilerplate / Unsupported
		getPublicInstance: () => null,
		getRootHostContext: () => ({}),
		getChildHostContext: (parentHostContext) => parentHostContext,
		shouldSetTextContent: () => false,
		prepareForCommit: () => null,
		resetAfterCommit() {},
		hideInstance: () => {},
		unhideInstance: () => {},
		createTextInstance: () => {
			throw new Error("This renderer does not support text nodes");
		},
		hideTextInstance: () => {},
		unhideTextInstance: () => {},
		commitTextUpdate: () => {},
		preparePortalMount: () => {},
		clearContainer: (container) => {
			container.head = null;
		},
		getInstanceFromNode: () => null,
		beforeActiveInstanceBlur: () => {},
		afterActiveInstanceBlur: () => {},
		detachDeletedInstance: () => {},
		prepareScopeUpdate: () => {},
		getInstanceFromScope: () => null,
		shouldAttemptEagerTransition: () => false,
		trackSchedulerEvent: () => {},
		resolveEventType: () => null,
		resolveEventTimeStamp: () => -1.1,
		requestPostPaintCallback: () => {},
		maySuspendCommit: () => false,
		preloadInstance: () => true,
		startSuspendingCommit: () => {},
		suspendInstance: () => {},
		waitForCommitToBeReady: () => null,
		NotPendingTransition: null,
		setCurrentUpdatePriority: (newPriority: number) => {
			reconcilerState.setCurrentEventPriority(newPriority);
		},
		getCurrentUpdatePriority: () => reconcilerState.getCurrentEventPriority(),
		resolveUpdatePriority: () => {
			if (reconcilerState.getCurrentEventPriority() !== NoEventPriority) {
				return reconcilerState.getCurrentEventPriority();
			}
			return DefaultEventPriority;
		},
		resetFormInstance: () => {},
	};

	const reconciler = Reconciler(hostConfig);

	const container: HostContainer<TagName> = { head: null };
	const root = reconciler.createContainer(
		container,
		ConcurrentRoot,
		null,
		false,
		null,
		"",
		(error) => console.error(error),
		null,
	);

	const render = (element: React.ReactNode) => {
		reconciler.updateContainer(element, root, null, undefined);
	};

	const runEventLoop = async () => {
		let i: number = 0;
		while (true) {
			await new Promise((resolve) => setTimeout(resolve, 1));
			const pheripheral = reconcilerState.getIthPheriperal(i);

			if (pheripheral?.isInitialized()) {
				pheripheral.queryForChanges();
			}

			const l = reconcilerState.getPheriperalCount();
			if (l === 0) {
				i = 0;
				continue;
			}
			i++;
			i %= l;
		}
	};

	const cleanup = async () => {
		await Promise.all(
			reconcilerState.getMountedPeripherals().map((p) => {
				return p.desconstructPeripheral();
			}),
		);
	};

	onShutdown("hertz", cleanup);

	return {
		render,
		runEventLoop,
	};
}
