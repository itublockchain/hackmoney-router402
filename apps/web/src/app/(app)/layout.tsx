import { AppLayout, Router402Guard } from "@/components/layout";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout>
      <Router402Guard>{children}</Router402Guard>
    </AppLayout>
  );
}
