"use client";

import { useEffect, useRef } from "react";

const DOT_SIZE = 6;
const RING_SIZE = 50;
const LERP_FACTOR = 0.15;

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });
  const rafId = useRef<number>(0);
  const visible = useRef(false);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      dot.style.transform = `translate(${e.clientX - DOT_SIZE / 2}px, ${e.clientY - DOT_SIZE / 2}px)`;

      if (!visible.current) {
        visible.current = true;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
        ringPos.current.x = e.clientX;
        ringPos.current.y = e.clientY;
      }
    };

    const onMouseLeave = () => {
      visible.current = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };

    const animate = () => {
      ringPos.current.x += (mouse.current.x - ringPos.current.x) * LERP_FACTOR;
      ringPos.current.y += (mouse.current.y - ringPos.current.y) * LERP_FACTOR;

      ring.style.transform = `translate(${ringPos.current.x - RING_SIZE / 2}px, ${ringPos.current.y - RING_SIZE / 2}px)`;

      rafId.current = requestAnimationFrame(animate);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);
    rafId.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  const shared = {
    position: "fixed" as const,
    top: 0,
    left: 0,
    pointerEvents: "none" as const,
    zIndex: 9999,
    mixBlendMode: "difference" as const,
    opacity: 0,
    willChange: "transform" as const,
  };

  return (
    <>
      {/* Inner dot — snaps to mouse instantly */}
      <div
        ref={dotRef}
        aria-hidden="true"
        style={{
          ...shared,
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: "50%",
          backgroundColor: "#fff",
        }}
      />
      {/* Outer ring — follows with smooth lag */}
      <div
        ref={ringRef}
        aria-hidden="true"
        style={{
          ...shared,
          width: RING_SIZE,
          height: RING_SIZE,
          borderRadius: "50%",
          backgroundColor: "#fff",
          transition: "width 0.2s, height 0.2s, margin 0.2s",
        }}
      />
    </>
  );
}
