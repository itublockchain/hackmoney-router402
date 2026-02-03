"use client";

import type p5Type from "p5";
import { useCallback, useEffect, useRef } from "react";

export function RouterAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5Type | null>(null);

  const createSketch = useCallback(() => {
    if (!containerRef.current) return;

    import("p5").then((p5Module) => {
      const p5 = p5Module.default;

      const sketch = (p: p5Type) => {
        const canvasW = 320;
        const canvasH = 200;

        // Typing animation state
        const texts = ["<router>", "</>", "<402>"];
        let typingState = 0; // 0=typing, 1=hold, 2=deleting
        let textIndex = 0;
        let charIndex = 0;
        const typeSpeed = 2;
        const holdFrames = 50;
        let holdCounter = 0;

        p.setup = () => {
          const canvas = p.createCanvas(canvasW, canvasH);
          canvas.style("display", "block");
          p.pixelDensity(1);
          p.stroke(255);
          p.strokeWeight(4);
          p.strokeCap(p.ROUND);
          p.strokeJoin(p.ROUND);
          p.textFont("monospace");
          p.textSize(28);
        };

        const drawWindow = (x: number, y: number, w: number, h: number) => {
          p.noFill();
          p.stroke(255);
          p.rect(x, y, w, h, 8); // main frame
          p.line(x, y + 28, x + w, y + 28); // top bar
          p.rect(x + 10, y + 6, 20, 16, 4); // small tab
        };

        p.draw = () => {
          p.background(0);

          const cx = p.width / 2;
          const cy = p.height / 2 + 5;
          const w = 190;
          const h = 120;

          p.push();
          p.translate(cx, cy);

          // Reset stroke for window drawing
          p.stroke(255);
          p.strokeWeight(4);
          p.strokeCap(p.ROUND);
          p.strokeJoin(p.ROUND);

          drawWindow(-w / 2, -h / 2, w, h);

          // Typing logic
          if (p.frameCount % typeSpeed === 0) {
            if (typingState === 0) {
              charIndex++;
              if (charIndex >= texts[textIndex].length) {
                charIndex = texts[textIndex].length;
                typingState = 1;
              }
            } else if (typingState === 2) {
              charIndex--;
              if (charIndex <= 0) {
                charIndex = 0;
                textIndex = (textIndex + 1) % texts.length;
                typingState = 0;
              }
            }
          }

          if (typingState === 1) {
            holdCounter++;
            if (holdCounter > holdFrames) {
              holdCounter = 0;
              typingState = 2;
            }
          }

          // Current visible text
          const shown = texts[textIndex].slice(0, charIndex);

          // Center text
          p.noStroke();
          p.fill(255);
          p.textFont("monospace");
          p.textSize(28);
          const tw = p.textWidth(shown);
          p.text(shown, -tw / 2, 24);

          // Cursor blink
          if (p.frameCount % 40 < 20) {
            p.rect(tw / 2 + 8, -8, 8, 36, 4);
          }

          p.pop();
        };
      };

      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
      }

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

  return (
    <div className="flex justify-center">
      <div ref={containerRef} className="h-[200px] w-[320px]" />
    </div>
  );
}
