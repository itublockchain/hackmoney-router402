import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PageTransition } from "@/components/animations/page-transition";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/providers/theme-provider";
import { Web3Provider } from "@/providers/web3-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Router 402 | Decentralized Payment Routing",
  description: "Decentralized payment routing on Base",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Web3Provider>
            <div className="relative flex min-h-screen flex-col">
              <Navbar />
              <PageTransition>
                <main className="flex-1">{children}</main>
              </PageTransition>
              <Footer />
            </div>
            <Toaster />
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
