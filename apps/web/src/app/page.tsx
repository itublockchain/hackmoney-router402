"use client";

import { Hero402Animation, HeroWaveAnimation } from "@/components/hero";
import { Navbar } from "@/components/layout";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero402Animation />
        <HeroWaveAnimation />
      </main>
    </>
  );
}
