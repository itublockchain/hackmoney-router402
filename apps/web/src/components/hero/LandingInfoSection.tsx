import Image from "next/image";

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

export function LandingInfoSection() {
  return (
    <section className="relative -mt-[28rem] md:-mt-[28rem] w-full bg-black px-4 py-24 sm:px-8 md:px-16 lg:px-24">
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
            What are the advantages of using Router402
          </h2>
          <p className="mx-auto max-w-3xl text-sm text-neutral-400 sm:text-base">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat.
          </p>
        </div>

        {/* Demo Placeholder */}
        <div className="mb-20 flex justify-center">
          <div className="aspect-video w-full max-w-4xl rounded-lg border border-blue-600" />
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
      </div>
    </section>
  );
}
