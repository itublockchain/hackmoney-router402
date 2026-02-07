export const metadata = {
  title: "Router402 Next.js Example",
  description: "Chat with AI using @router402/sdk",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
