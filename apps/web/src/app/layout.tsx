import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import clsx from "clsx";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider, Web3Provider } from "@/providers";

const interSans = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Router 402 | Access AI Models with Your Smart Account",
  description:
    "Router 402 lets you access AI models through your smart account on Base. Use crypto to pay for AI inference with session keys and smart wallets.",
  openGraph: {
    title: "Router 402 | Access AI Models with Your Smart Account",
    description:
      "Router 402 lets you access AI models through your smart account on Base. Use crypto to pay for AI inference with session keys and smart wallets.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Router 402",
      },
    ],
    type: "website",
    siteName: "Router 402",
  },
  twitter: {
    card: "summary_large_image",
    title: "Router 402 | Access AI Models with Your Smart Account",
    description:
      "Router 402 lets you access AI models through your smart account on Base. Use crypto to pay for AI inference with session keys and smart wallets.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className="dark h-full"
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <body
        suppressHydrationWarning
        className={clsx(
          interSans.variable,
          jetbrainsMono.variable,
          "antialiased h-full"
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Web3Provider>
            {children}
            <Toaster />
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
