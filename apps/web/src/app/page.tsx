"use client";

import {
  Hero402Animation,
  HeroWaveAnimation,
  LandingInfoSection,
  LandingProductsSection,
} from "@/components/hero";
import { Navbar } from "@/components/layout";
import { CustomCursor } from "@/components/ui/custom-cursor";

export default function Home() {
  return (
    <div className="custom-cursor-area">
      <CustomCursor />
      <Navbar />
      <main>
        <Hero402Animation />
        <HeroWaveAnimation />
        <LandingInfoSection />
        <LandingProductsSection />
      </main>
    </div>
  );
}
