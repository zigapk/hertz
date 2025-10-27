import { createContext } from "react";
import type { HostConfig, ReactContext } from "react-reconciler"; // It may or may not be exportd, if not, we can define it.
import Reconciler from "react-reconciler";
import {
	ConcurrentRoot,
	DefaultEventPriority,
	NoEventPriority,
} from "react-reconciler/constants";
import type { AnyPeripheralConstructor, Peripheral } from "./pheripheral";
import type { EmptyObject } from "./types-utils";

// A generic prop type - the real JSX type safety is done with overriding intrinsic elements.
type Props = Record<string, unknown>;

export interface DOMNode<
	TagName extends string,
	Props = Record<string, unknown>,
> {
	type: TagName;
	props: Props;
	children: never[]; // Hardware nodes need to be leaf nodes - they cannot have children.
	pheripheralInstance: Peripheral<unknown, object, object>;
}

interface HostContainer<TagName extends string> {
	head: DOMNode<TagName, Props> | null;
}

// Class that holds current event priority during runtime.
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

	popPheriperal(peripheral: Peripheral<unknown, object, object>): void {
		this.mountedPheriperals.splice(
			this.mountedPheriperals.indexOf(peripheral),
			1,
		);
	}

	getIthPheriperal(i: number): Peripheral<unknown, object, object> | undefined {
		return this.mountedPheriperals[i];
	}

	getPheriperalCount(): number {
		return this.mountedPheriperals.length;
	}
}

export function createReconciler<
	// By using `const T`, we ask TypeScript to infer the narrowest possible type,
	// preserving the literal values of `tagName` and the tuple structure of the array.
	const T extends readonly AnyPeripheralConstructor<Hardware>[],
	Hardware,
>(peripherals: T, hardware: Hardware) {
	// Infer all possible tag names from the peripherals.
	type TagName = T[number]["tagName"];

	// Runtime map of all tag names to their constructors.
	const peripheralMap = new Map<TagName, AnyPeripheralConstructor<Hardware>>(
		peripherals.map((p) => [p.tagName as TagName, p]),
	);

	// Construct the reconciler state holder
	const reconcilerState = new ReconcilerState();

	const hostConfig: HostConfig<
		TagName, // Type
		Props, // Props
		HostContainer<TagName>, // Container
		DOMNode<TagName, Props>, // Instance
		never, // TextInstance
		DOMNode<TagName, Props>, // SuspenseInstance
		never, // HydratableInstance
		never, // FormInstance
		null, // PublicInstance
		EmptyObject, // HostContext
		never, // ChildSet
		number, // TimeoutHandle
		number, // NoTimeout
		null // TransitionStatus
	> = {
		// Base settings
		isPrimaryRenderer: true,
		supportsMutation: true,
		warnsIfNotActing: false,
		supportsHydration: false,
		supportsPersistence: false,
		scheduleTimeout: setTimeout,
		cancelTimeout: clearTimeout,
		// Casting here is not ideal, but we haven't found a better solution yet due to lack of documentation.
		HostTransitionContext: createContext<"completed">(
			"completed",
		) as unknown as ReactContext<null>,
		noTimeout: -1,

		// DOM manipulation
		createInstance: (type: TagName, props) => {
			const instanceConstructor = peripheralMap.get(type);

			if (instanceConstructor === undefined) {
				throw new Error(`Unknown tag type: ${type}`);
			}

			const instance = new instanceConstructor(props, hardware);

			// Push the instance to the reconciler state
			reconcilerState.pushPheriperal(instance);

			return {
				type,
				props,
				children: [],
				pheripheralInstance: instance,
			};
		},
		removeChild: (_parent, child) => {
			reconcilerState.popPheriperal(child.pheripheralInstance);
		},
		finalizeInitialChildren: () => true, // Signal that `commitMount` should be called later.
		commitMount: (instance) => {
			instance.pheripheralInstance.initPeripheral();
		},
		commitUpdate: (instance, _type, _prevProps, nextProps) => {
			instance.props = nextProps;
			instance.pheripheralInstance.applyNewPropsToHardware(nextProps);
		},

		// Context and instance access.
		getPublicInstance: () => null, // TODO: this needs to be implemented
		getRootHostContext: () => ({}),
		getChildHostContext: (parentHostContext) => parentHostContext,
		shouldSetTextContent: () => false,

		// We do not need to prepare and reset after each commit
		prepareForCommit: () => null,
		resetAfterCommit() {},

		// (Un)hiding does nothing because it does not make sense for peripherals.
		hideInstance: () => {},
		unhideInstance: () => {},

		// Text instances are not supported.
		createTextInstance: () => {
			throw new Error("This renderer does not support text nodes");
		},
		hideTextInstance() {
			throw new Error("This renderer does not support text nodes");
		},
		unhideTextInstance() {
			throw new Error("This renderer does not support text nodes");
		},
		commitTextUpdate: () => {
			throw new Error("This renderer does not support text nodes");
		},

		// Handling of children is not supported as pheripherals cannot have children.
		appendInitialChild: () => {
			throw new Error("Peripherals cannot have children");
		},
		appendChild: () => {
			throw new Error("Peripherals cannot have children");
		},
		appendChildToContainer: (container, child) => {
			container.head = child;
		},
		insertBefore: () => {
			throw new Error("Peripherals cannot have children");
		},

		removeChildFromContainer: (container, child) => {
			container.head = null;
			reconcilerState.popPheriperal(child.pheripheralInstance);
		},

		// Other things that are not supported but are fine as they are
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
		// TODO: in order to use suspense, we'll need to implement this.
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

	// Now that we have the host config, we can create the reconciler.
	const reconciler = Reconciler(hostConfig);

	// Now create the host container and root
	const container: HostContainer<TagName> = { head: null };
	const root = reconciler.createContainer(
		container, // containerInfo
		ConcurrentRoot, // tag
		null, // hydrationCallbacks
		false, // isStrictMode
		null, // concurrentUpdatesByDefaultOverride
		"", // identifierPrefix
		(error) => console.error(error), // onUncaughtError
		null, // transitionCallbacks
	);

	// Construct the render function that will be used to render the app
	const render = (element: React.ReactNode) => {
		reconciler.updateContainer(element, root, null, undefined);
	};

	const runEventLoop = async () => {
		let i: number = 0;
		while (true) {
			await new Promise((resolve) => setTimeout(resolve, 1));

			const pheripheral = reconcilerState.getIthPheriperal(i);

			if (pheripheral) {
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

	return {
		render,
		runEventLoop,
	};
}
