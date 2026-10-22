"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { HeroSlide } from "./hero-slide";
import type { MediaItem } from "@/types/catalog";

export function HeroCarousel({ items }: { items: MediaItem[] }) {
  const [active, setActive] = useState(0);
  const reducedMotion = useReducedMotion();
  const item = items[active];
  if (!item) return null;
  function move(delta: number) {
    setActive((current) => (current + delta + items.length) % items.length);
  }
  return (
    <section
      className="hero"
      aria-label="Featured titles"
      aria-roledescription="carousel"
    >
      <motion.div
        key={item.id}
        className="hero-slide"
        initial={reducedMotion ? false : { opacity: 0.65 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.35 }}
        role="group"
        aria-roledescription="slide"
        aria-label={`${active + 1} of ${items.length}: ${item.title}`}
      >
        <HeroSlide item={item} initial={active === 0} />
      </motion.div>
      <div className="hero-bottom">
        <div
          className="hero-pagination"
          role="group"
          aria-label="Choose featured title"
        >
          {items.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => setActive(index)}
              aria-label={`Show ${slide.title}`}
              aria-pressed={active === index}
            >
              <span />
            </button>
          ))}
          <span className="slide-counter">
            {String(active + 1).padStart(2, "0")}{" "}
            <span>/ {String(items.length).padStart(2, "0")}</span>
          </span>
        </div>
        <div className="hero-controls">
          <button
            className="icon-button"
            onClick={() => move(-1)}
            disabled={items.length < 2}
            aria-label="Previous featured title"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="icon-button"
            onClick={() => move(1)}
            disabled={items.length < 2}
            aria-label="Next featured title"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Featured title {active + 1} of {items.length}: {item.title}
      </p>
    </section>
  );
}
