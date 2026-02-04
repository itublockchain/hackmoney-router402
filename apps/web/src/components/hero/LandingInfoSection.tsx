"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Code, ExternalLink, Globe, Terminal } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib";

const features = [
  {
    title: "Lorem Ipsum",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  },
  {
    title: "Lorem Ipsum",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  },
  {
    title: "Lorem Ipsum",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  },
  {
    title: "Lorem Ipsum",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  },
  {
    title: "Lorem Ipsum",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  },
];

const tabs = [
  { id: "web", label: "Web", icon: Globe },
  { id: "vscode", label: "VS Code", icon: Code },
  { id: "cli", label: "Terminal", icon: Terminal },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function LandingInfoSection() {
  const [activeTab, setActiveTab] = useState<TabId>("web");

  return (
    <section className="relative -mt-[32rem] md:-mt-[32rem] w-full bg-black px-4 py-24 sm:px-8 md:px-16 lg:px-24">
      <div className="mx-auto max-w-6xl">
        {/* Logo — relative z-20 so it floats above the wave animation (z-10) */}
        <div className="relative z-20 mb-12 flex justify-center">
          <Image
            src="/logo-large.png"
            alt="Router 402"
            width={240}
            height={60}
            className="h-auto w-48 sm:w-60"
            priority
          />
        </div>

        {/* Title and Subtitle — relative z-20 so it floats above the wave animation (z-10) */}
        <div className="relative z-20 mb-16 text-center">
          <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl md:text-4xl">
            What is Router402?
          </h2>
          <p className="mx-auto max-w-3xl text-sm text-neutral-400 sm:text-base">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat.
          </p>
        </div>

        {/* Tabbed Demo */}
        <div className="relative z-20 mb-20 flex justify-center">
          <div className="w-full max-w-4xl">
            {/* Tab Buttons */}
            <div className="flex gap-1 rounded-t-lg border border-b-0 border-blue-600 bg-neutral-950 p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                      activeTab === tab.id
                        ? "bg-blue-600 text-white"
                        : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                    )}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="overflow-hidden rounded-b-lg border border-blue-600">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  }}
                  className="aspect-video w-full bg-neutral-950"
                >
                  <div className="flex h-full items-center justify-center text-neutral-500">
                    {activeTab === "web" && "Web Demo"}
                    {activeTab === "vscode" && "VS Code Demo"}
                    {activeTab === "cli" && "Terminal Demo"}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Feature Items - Row 1 */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {features.slice(0, 3).map((feature, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-600" />
              </div>
              <div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm text-neutral-400">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Items - Row 2 (centered) */}
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 md:px-[16.67%]">
          {features.slice(3).map((feature, index) => (
            <div key={index + 3} className="flex gap-4">
              <div className="shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-600" />
              </div>
              <div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm text-neutral-400">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Learn Details Button */}
        <div className="mt-12 flex justify-center">
          <Button>
            More Details
            <ExternalLink size={16} />
          </Button>
        </div>
      </div>
    </section>
  );
}
