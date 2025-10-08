import { type HostConfig, ReactContext } from "react-reconciler";
import createReconciler from "react-reconciler";
import { NoEventPriority, ConcurrentRoot } from "react-reconciler/constants.js";
import { createContext } from "react";

export type NodeNames = "root" | "dpin-in" | "dpin-out";

type Props = Record<string, unknown>;

export type DOMElement = {
  type: NodeNames;
  props: Props;
  parentNode: DOMElement | null;
  children: DOMElement[];
};

type HostContext = {};

let currentUpdatePriority: number = NoEventPriority;

export const hostConfig: HostConfig<
  NodeNames,
  Props,
  DOMElement,
  DOMElement,
  never,
  DOMElement,
  unknown,
  unknown,
  unknown,
  HostContext,
  unknown,
  unknown,
  unknown,
  unknown
> = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  getRootHostContext: () => {
    console.log("getRootHostContext");
    return {};
  },
  prepareForCommit: () => {
    console.log("prepareForCommit");
    return null;
  },
  preparePortalMount: () => {},
  clearContainer: () => false,
  resetAfterCommit: () => {},
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,
  supportsMicrotasks: true,
  scheduleMicrotask: queueMicrotask,
  isPrimaryRenderer: true,
  appendInitialChild: (parent, child) => {
    console.log("appendInitialChild", { parent, child });
    parent.children.push(child);
    child.parentNode = parent;
  },
  appendChild: (parent, child) => {
    console.log("appendChild", { parent, child });
    parent.children.push(child);
    child.parentNode = parent;
  },
  appendChildToContainer: (container, child) => {
    console.log("appendChildToContainer", { container, child });
    container.children.push(child);
    child.parentNode = container;
  },
  detachDeletedInstance: () => {},
  insertBefore: (parent, child, beforeChild) =>
    parent.children.splice(parent.children.indexOf(beforeChild), 0, child),
  removeChild: (parent, child) =>
    parent.children.splice(parent.children.indexOf(child), 1),
  removeChildFromContainer: (container) => container.children.splice(0, 1),
  createTextInstance: (text) => {
    console.log("createTextInstance", { text });
    throw new Error("Robot renreer does not support text nodes");
  },
  hideTextInstance: () => {
    throw new Error("Robot renreer does not support text nodes");
  },
  commitTextUpdate: () => {
    throw new Error("Robot renreer does not support text nodes");
  },
  shouldSetTextContent: () => false,
  createInstance: (type, props) => {
    console.log("createInstance", { type, props });
    return {
      type,
      props,
      children: [],
      parentNode: null,
    };
  },
  getInstanceFromNode: () => null,
  beforeActiveInstanceBlur: () => {},
  afterActiveInstanceBlur: () => {},
  prepareScopeUpdate: () => {},
  getInstanceFromScope: () => null,
  hideInstance: () => {},
  unhideInstance: () => {},
  finalizeInitialChildren: () => {
    console.log("finalizeInitialChildren");
    return false;
  }, // TODO: not sure about whether i need this
  getChildHostContext: (parentHostContext) => parentHostContext,
  getPublicInstance: (instance) => instance,
  commitMount: (instance, type, newProps) => {
    // TODO: implement
    console.log("commitMount", { instance, type, newProps });
  },
  commitUpdate: (instance, updatePayload, type, oldProps, newProps) => {
    // TODO: implement
    console.log("commitUpdate", {
      instance,
      updatePayload,
      type,
      oldProps,
      newProps,
    });
  },
  NotPendingTransition: null,
  resetFormInstance: () => {},
  requestPostPaintCallback: () => {},
  shouldAttemptEagerTransition: () => false,
  startSuspendingCommit: () => {},
  suspendInstance: () => {},
  waitForCommitToBeReady: () => null,
  trackSchedulerEvent: () => {},
  resolveEventType: () => null,
  resolveEventTimeStamp: () => -1.1,
  maySuspendCommit: () => false,
  preloadInstance: () => true,
  HostTransitionContext: createContext(
    null,
  ) as unknown as ReactContext<unknown>,
  setCurrentUpdatePriority(newPriority: number) {
    currentUpdatePriority = newPriority;
  },
  getCurrentUpdatePriority() {
    return currentUpdatePriority;
  },
  resolveUpdatePriority() {
    // TODO: implement
    return currentUpdatePriority;
    // if (currentUpdatePriority !== NoEventPriority) return currentUpdatePriority
    //
    // switch (typeof window !== 'undefined' && window.event?.type) {
    //   case 'click':
    //   case 'contextmenu':
    //   case 'dblclick':
    //   case 'pointercancel':
    //   case 'pointerdown':
    //   case 'pointerup':
    //     return DiscreteEventPriority
    //   case 'pointermove':
    //   case 'pointerout':
    //   case 'pointerover':
    //   case 'pointerenter':
    //   case 'pointerleave':
    //   case 'wheel':
    //     return ContinuousEventPriority
    //   default:
    //     return DefaultEventPriority
    // }
  },
};

const reconciler = createReconciler(hostConfig);

function logRecoverableError(error: any): void {
  // In modern browsers, reportError will dispatch an error event,
  // emulating an uncaught JavaScript error.
  if (typeof reportError === "function") return reportError(error);
  // In older browsers and test environments, fallback to console.error.
  else return console.error(error);
}
const container: DOMElement = {
  type: "root",
  props: {},
  parentNode: null,
  children: [],
};
const root = reconciler.createContainer(
  container,
  ConcurrentRoot,
  null,
  false,
  null,
  "",
  logRecoverableError,
  null,
);

export function render(element: React.ReactNode): DOMElement {
  let container = reconciler.createContainer(div, false, false);
  reconciler.updateContainer(element, root, null, undefined);
  return container;
}
