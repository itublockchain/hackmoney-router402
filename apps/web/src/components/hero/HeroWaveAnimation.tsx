"use client";

import type p5Type from "p5";
import { useCallback, useEffect, useRef } from "react";

export function HeroWaveAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5Type | null>(null);

  const createSketch = useCallback(() => {
    if (!containerRef.current) return;

    import("p5").then((p5Module) => {
      const p5 = p5Module.default;

      const sketch = (p: p5Type) => {
        let t = 0;

        const getContainerDimensions = () => {
          const container = containerRef.current;
          if (!container)
            return { width: p.windowWidth, height: p.windowHeight };
          return {
            width: container.clientWidth,
            height: container.clientHeight,
          };
        };

        const drawArm = (
          side: number,
          ax: number,
          ay: number,
          ang: number,
          s: number
        ) => {
          p.push();
          p.translate(ax, ay);
          p.rotate(ang);
          p.scale(-1, 1);

          if (side > 0) p.scale(-1, 1);

          p.scale(s);
          p.translate(-160, -160);

          for (let i = 5000; i--; ) {
            const z = (i % 200) / 200;
            const pp = 1 / (0.3 + z);
            const x = p.round(160 + ((i / 200) | 0) - 72) * pp;
            const y = p.round(160 + 40 * p.sin(i / 50 + t)) * pp;
            p.point(x, y);
          }

          p.pop();
        };

        p.setup = () => {
          const dims = getContainerDimensions();
          const canvas = p.createCanvas(dims.width, dims.height);
          canvas.style("display", "block");
          p.pixelDensity(1);
          p.noSmooth();
        };

        p.windowResized = () => {
          const dims = getContainerDimensions();
          p.resizeCanvas(dims.width, dims.height);
          p.noSmooth();
        };

        p.draw = () => {
          p.background(0);
          p.stroke(255);

          const s = p.min(p.width, p.height) / 320;
          t += 0.03;

          drawArm(-1, p.width * 0.2, p.height * 0.48, p.PI / 2, s);
          drawArm(1, p.width * 0.8, p.height * 0.48, -p.PI / 2, s);
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
    <div className="relative z-10 -mt-[28rem] md:-mt-80 h-screen w-full">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
