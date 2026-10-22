"use client";

import { ViewTransition, useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};
const supportsNativeTransitions = () =>
  typeof document.startViewTransition === "function" &&
  typeof CSS !== "undefined" &&
  CSS.supports("view-transition-class", "route-enter");

/** Route changes animate; search input and other in-place updates stay immediate. */
export function RouteTransition({ children }: { children: ReactNode }) {
  const nativeTransitions = useSyncExternalStore(
    subscribe,
    supportsNativeTransitions,
    () => false,
  );

  return (
    <ViewTransition
      default="none"
      enter={{ "open-title": "title-enter", default: "route-enter" }}
      exit="route-exit"
    >
      <div
        className={
          nativeTransitions ? "route-content" : "route-content route-fallback"
        }
      >
        {children}
      </div>
    </ViewTransition>
  );
}
