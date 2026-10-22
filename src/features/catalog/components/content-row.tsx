"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Client shell only: card content is composed on the server. */
export function ContentRow({
  id,
  heading,
  children,
}: {
  id: string;
  heading: ReactNode;
  children: ReactNode;
}) {
  const row = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState({ previous: false, next: false });
  useEffect(() => {
    const element = row.current;
    if (!element) return;
    const update = () =>
      setCanScroll({
        previous: element.scrollLeft > 8,
        next:
          element.scrollLeft + element.clientWidth < element.scrollWidth - 8,
      });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    element.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", update);
    };
  }, [children]);
  function scroll(direction: number) {
    const element = row.current;
    element?.scrollBy({
      left: direction * element.clientWidth * 0.8,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  return (
    <section className="content-section" aria-labelledby={`${id}-heading`}>
      <div className="row-heading">
        {heading}
        <div className="row-controls">
          <button
            className="icon-button"
            onClick={() => scroll(-1)}
            disabled={!canScroll.previous}
            aria-label={`Previous titles in ${id.replaceAll("-", " ")}`}
            aria-controls={id}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon-button"
            onClick={() => scroll(1)}
            disabled={!canScroll.next}
            aria-label={`Next titles in ${id.replaceAll("-", " ")}`}
            aria-controls={id}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div
        className="content-track"
        id={id}
        ref={row}
        tabIndex={0}
        role="group"
        aria-labelledby={`${id}-heading`}
      >
        {children}
      </div>
    </section>
  );
}
