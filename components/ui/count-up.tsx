"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a number up when it scrolls into view.
 *
 * A score that lands rather than simply appearing reads as a result, which is
 * the right feeling for the moment somebody sees how they did. It runs once,
 * finishes inside half a second, and jumps straight to the final value for
 * anyone who has asked for reduced motion.
 */
export function CountUp({
  value,
  duration = 900,
  className,
  suffix = "",
  placeholder = "—",
}: {
  value: number | null;
  duration?: number;
  className?: string;
  suffix?: string;
  placeholder?: string;
}) {
  const [shown, setShown] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);

  useEffect(() => {
    if (value === null) return;
    const node = ref.current;
    if (!node) return;

    let frame = 0;
    const run = () => {
      if (done.current) return;
      done.current = true;

      // Anyone who asked for less movement gets the final number straight away.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setShown(value);
        return;
      }

      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        // Ease out, so it decelerates into the final number.
        setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && run()),
      { threshold: 0.4 },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {value === null ? placeholder : `${shown}${suffix}`}
    </span>
  );
}
