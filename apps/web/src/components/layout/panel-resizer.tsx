"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface PanelResizerProps {
  onResize: (delta: number) => void;
  direction?: "horizontal" | "vertical";
}

export function PanelResizer({
  onResize,
  direction = "horizontal",
}: PanelResizerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startPos.current = direction === "horizontal" ? e.clientX : e.clientY;
    },
    [direction]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const currentPos = direction === "horizontal" ? e.clientX : e.clientY;
      const delta = currentPos - startPos.current;
      startPos.current = currentPos;
      onResize(delta);
    },
    [isDragging, direction, onResize]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor =
        direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp, direction]);

  const isHorizontal = direction === "horizontal";

  return (
    <button
      type="button"
      className={`
        group relative flex items-center justify-center border-0 bg-transparent p-0
        ${isHorizontal ? "w-3 cursor-col-resize" : "h-3 cursor-row-resize"}
        ${isDragging ? "z-50" : ""}
      `}
      onMouseDown={handleMouseDown}
      aria-label="Resize panel"
      onKeyDown={(e) => {
        const step = 10;
        if (isHorizontal) {
          if (e.key === "ArrowLeft") onResize(-step);
          if (e.key === "ArrowRight") onResize(step);
        } else {
          if (e.key === "ArrowUp") onResize(-step);
          if (e.key === "ArrowDown") onResize(step);
        }
      }}
    >
      <div
        className={`
          rounded-full bg-border/40 transition-all duration-150
          group-hover:bg-muted-foreground/50
          ${isDragging ? "bg-muted-foreground/70" : ""}
          ${isHorizontal ? "h-8 w-0.5" : "h-0.5 w-8"}
        `}
      />
    </button>
  );
}
