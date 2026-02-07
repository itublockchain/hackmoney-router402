import { Suspense } from "react";
import { AppLayout, Router402Guard } from "@/components/layout";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout>
      <Suspense>
        <Router402Guard>{children}</Router402Guard>
      </Suspense>
    </AppLayout>
  );
}
