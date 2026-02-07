import Image from "next/image";
import { RouterAnimation } from "./router-animation";

const products = [
  { name: "x402", logo: "/product/x402.png", size: 96 },
  { name: "ZeroDev", logo: "/product/zerodev.png", size: 160 },
  { name: "base", logo: "/product/base.png", size: 112 },
  { name: "Claude", logo: "/product/claude.png", size: 144 },
  { name: "LI.FI", logo: "/product/lifi.png", size: 112 },
  { name: "ChatGPT", logo: "/product/chatgpt.png", size: 160 },
];

const sizeClasses: Record<number, string> = {
  96: "w-24",
  112: "w-28",
  128: "w-32",
  144: "w-36",
  160: "w-40",
};

export function LandingProductsSection() {
  return (
    <section className="w-full bg-black px-4 py-24 sm:px-8 md:px-16 lg:px-24">
      <div className="mx-auto max-w-6xl">
        {/* Router Animation */}
        <RouterAnimation />

        {/* Title and Subtitle */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl md:text-4xl">
            Tools we use
          </h2>
          <p className="mx-auto max-w-3xl text-sm text-neutral-400 sm:text-base">
            Router402 is built on x402 for micropayments, Pimlico for smart
            account abstraction, Base (Flashblocks) for ~0.2s settlement, and
            Li.Fi for cross-chain bridge & swap.
          </p>
        </div>

        {/* Product Logos - Row 1 */}
        <div className="flex flex-wrap items-center justify-center gap-12 md:gap-16">
          {products.slice(0, 4).map((product) => (
            <div
              key={product.name}
              className="flex items-center justify-center"
            >
              <Image
                src={product.logo}
                alt={product.name}
                width={product.size}
                height={product.size}
                className={`${sizeClasses[product.size]} h-auto object-contain`}
              />
            </div>
          ))}
        </div>

        {/* Product Logos - Row 2 (centered) */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-12 md:gap-16">
          {products.slice(4).map((product) => (
            <div
              key={product.name}
              className="flex items-center justify-center"
            >
              <Image
                src={product.logo}
                alt={product.name}
                width={product.size}
                height={product.size}
                className={`${sizeClasses[product.size]} h-auto object-contain`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
