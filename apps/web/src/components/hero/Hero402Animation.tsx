"use client";

import type p5Type from "p5";
import { useCallback, useEffect, useRef, useState } from "react";

interface Point {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

export function Hero402Animation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5Type | null>(null);
  const animationStateRef = useRef<{
    isFocused: boolean;
    currentFrame: number;
    idleOscillationDirection: 1 | -1; // 1 = moving up, -1 = moving down
  }>({
    isFocused: false,
    currentFrame: 120, // Start at frame 120 (expanded/particles spread out)
    idleOscillationDirection: -1, // Start by moving down (towards 115)
  });
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFocus = useCallback(() => {
    animationStateRef.current.isFocused = true;
  }, []);

  const handleBlur = useCallback(() => {
    animationStateRef.current.isFocused = false;
  }, []);

  const createSketch = useCallback(() => {
    if (!containerRef.current) return;

    import("p5").then((p5Module) => {
      const p5 = p5Module.default;

      const sketch = (p: p5Type) => {
        // Base dimensions for the text rendering
        const W = 180;
        const H = 100;
        const T = 240;
        const pts: Point[] = [];
        let g: p5Type.Graphics;
        let scale: number;
        let containerHeight: number;

        const getContainerDimensions = () => {
          const container = containerRef.current;
          if (!container)
            return { width: p.windowWidth, height: p.windowHeight };
          return {
            width: container.clientWidth,
            height: container.clientHeight,
          };
        };

        p.setup = () => {
          const dims = getContainerDimensions();
          containerHeight = dims.height;
          const canvas = p.createCanvas(dims.width, dims.height);
          canvas.style("display", "block");
          p.pixelDensity(1);
          p.noSmooth();

          // Calculate scale to fit the animation
          // Use 2x scale multiplier on mobile (< 768px) for better visibility
          const isMobile = dims.width < 768;
          const scaleMultiplier = isMobile ? 1.5 : 1;
          scale = Math.min(dims.width / W, dims.height / H) * scaleMultiplier;

          g = p.createGraphics(W, H);
          g.pixelDensity(1);
          g.noSmooth();
          g.background(0);
          g.fill(1);
          g.noStroke();
          g.textAlign(p.CENTER, p.CENTER);
          g.textSize(72);
          g.textStyle(p.BOLD);
          g.text("402", W / 2, H / 2 + 4);
          g.loadPixels();

          for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
              const i = 4 * (x + y * W);
              if (g.pixels[i] > 0 && (x + y) % 2 === 0) {
                const sx = x - W / 2;
                const sy = y - H / 2;
                const ang = p.random(p.TWO_PI);
                const rad = p.random(35, 90);
                pts.push({
                  x: sx,
                  y: sy,
                  dx: p.cos(ang) * rad + p.random(-30, 30),
                  dy: p.sin(ang) * rad + p.random(-20, 20),
                });
              }
            }
          }
        };

        p.windowResized = () => {
          const dims = getContainerDimensions();
          containerHeight = dims.height;
          p.resizeCanvas(dims.width, dims.height);
          // Use 2x scale multiplier on mobile (< 768px) for better visibility
          const isMobile = dims.width < 768;
          const scaleMultiplier = isMobile ? 1.2 : 0.6;
          scale = Math.min(dims.width / W, dims.height / H) * scaleMultiplier;
        };

        p.draw = () => {
          p.background(0);

          // Update frame based on animation state
          // Frame 0 = contracted (text visible "402")
          // Frame T/2 (120) = expanded (particles spread out)
          // On focus: contract to show text (frame 0)
          // On blur: oscillate between frames 115-120 (last 5 frames)
          const state = animationStateRef.current;
          const animationSpeed = 3; // How many frames to advance per draw call
          const idleOscillationSpeed = 0.2; // Slower oscillation when idle
          const idleMinFrame = 80; // Oscillate between 115-120
          const idleMaxFrame = 120;

          if (state.isFocused) {
            // When focused, contract to frame 0
            if (state.currentFrame > 0) {
              state.currentFrame = Math.max(
                state.currentFrame - animationSpeed,
                0
              );
            }
          } else {
            // When blurred, first expand to idleMinFrame range, then oscillate
            if (state.currentFrame < idleMinFrame) {
              // Expanding from contracted state towards idle range
              state.currentFrame = Math.min(
                state.currentFrame + animationSpeed,
                idleMinFrame
              );
            } else {
              // Oscillate between idleMinFrame and idleMaxFrame
              state.currentFrame +=
                idleOscillationSpeed * state.idleOscillationDirection;

              // Reverse direction at boundaries
              if (state.currentFrame >= idleMaxFrame) {
                state.currentFrame = idleMaxFrame;
                state.idleOscillationDirection = -1;
              } else if (state.currentFrame <= idleMinFrame) {
                state.currentFrame = idleMinFrame;
                state.idleOscillationDirection = 1;
              }
            }
          }

          const t = state.currentFrame / T;
          let a = 0.5 - 0.5 * p.cos(p.TWO_PI * t);
          a = a * a * (3 - 2 * a);

          p.push();
          // Center the animation in the middle of the container
          p.translate(p.width / 2, containerHeight / 2);
          p.scale(scale);
          p.stroke(255);
          p.strokeWeight(1);

          const drift = 6 * p.sin(p.TWO_PI * t);
          for (const pt of pts) {
            const x = p.lerp(pt.x, pt.dx, a);
            const y = p.lerp(pt.y, pt.dy, a) + drift * (1 - a);
            p.point(p.round(x), p.round(y));
          }

          p.pop();
        };
      };

      // Clean up previous instance if it exists
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
      }

      // Create new p5 instance
      const container = containerRef.current;
      if (container) {
        p5InstanceRef.current = new p5(sketch, container);
      }
    });
  }, []);

  useEffect(() => {
    createSketch();

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, [createSketch]);

  const handleSubmit = useCallback(() => {
    if (!inputValue.trim()) return;
    // Handle submission - for now just clear the input
    console.log("Submit:", inputValue);
    setInputValue("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [inputValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter to send, Shift+Enter for new line
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.target.value);
      // Auto-resize textarea
      const textarea = e.target;
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    },
    []
  );

  const hasContent = inputValue.trim().length > 0;

  return (
    <div className="relative z-20 w-full h-[calc(100vh-120px)]">
      {/* Input box overlay - centered in the middle of the animation, slightly lower on mobile */}
      <div className="absolute inset-0 z-10 flex items-center justify-center px-3 pt-16 sm:px-4 sm:pt-0">
        <div className="flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl p-4 sm:gap-5 sm:p-6">
          {/* Heading */}
          <h1 className="text-center text-lg font-medium tracking-tight text-blue-100 sm:text-xl md:text-2xl">
            Where should we start?
          </h1>

          {/* Input container */}
          <div className="group relative w-full">
            <div
              className={`
                relative overflow-hidden rounded-xl border
                shadow-2xl shadow-black/20 backdrop-blur-xl transition-all duration-300
                sm:rounded-2xl
                ${
                  hasContent
                    ? "border-indigo-500/50 ring-1 ring-indigo-500/20"
                    : "hover:border-indigo-900/70"
                }
              `}
              style={{
                backgroundColor: "rgba(0, 2, 47, 0.6)",
                borderColor: "#00022F",
              }}
            >
              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleTextareaChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder="Describe your idea..."
                rows={1}
                className="max-h-[150px] min-h-[48px] w-full resize-none bg-transparent px-3 py-3 pr-20 text-sm text-neutral-300 placeholder:text-gray-500 focus:outline-none sm:max-h-[200px] sm:min-h-[56px] sm:px-4 sm:py-4 sm:pr-24 sm:text-base"
                aria-label="Message input"
              />

              {/* Action buttons - positioned absolute on the right */}
              <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 sm:bottom-3 sm:right-2 sm:gap-1">
                {/* Attachment button */}
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-all duration-200 hover:bg-neutral-800 hover:text-white sm:h-9 sm:w-9"
                  aria-label="Add attachment"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                    />
                  </svg>
                </button>

                {/* Send button */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!hasContent}
                  className={`
                    flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200
                    sm:h-9 sm:w-9
                    ${
                      hasContent
                        ? "bg-blue-600 text-white hover:bg-blue-500"
                        : "cursor-not-allowed bg-blue-900/30 text-blue-800"
                    }
                  `}
                  aria-label="Send message"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Helper text - hidden on mobile, visible on larger screens */}
            <p className="mt-4 hidden text-center text-xs text-blue-400/70 sm:block">
              Press{" "}
              <kbd className="rounded bg-blue-900/30 px-1.5 py-0.5 font-mono text-blue-400">
                Enter
              </kbd>{" "}
              to send,{" "}
              <kbd className="rounded bg-blue-900/30 px-1.5 py-0.5 font-mono text-blue-400">
                Shift + Enter
              </kbd>{" "}
              for new line
            </p>
          </div>
        </div>
      </div>

      {/* p5.js canvas container */}
      <div ref={containerRef} className="h-full w-full opacity-30" />
    </div>
  );
}
