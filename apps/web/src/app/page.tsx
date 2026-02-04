"use client";

import {
  Hero402Animation,
  HeroWaveAnimation,
  LandingInfoSection,
  LandingProductsSection,
} from "@/components/hero";
import { Footer, Navbar } from "@/components/layout";
import { CustomCursor } from "@/components/ui/custom-cursor";

export default function Home() {
  return (
    <div className="custom-cursor-area">
      <CustomCursor />
      <Navbar />
      <main>
        <HeroWaveAnimation />
        <LandingInfoSection />
        <LandingProductsSection />
        <div className="mb-24" />
        <Hero402Animation />
      </main>
      <Footer />
    </div>
  );
}
