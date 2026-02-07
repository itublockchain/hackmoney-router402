import { Suspense } from "react";
import { AuthLayout } from "@/components/layout";

export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthLayout>
      <Suspense>{children}</Suspense>
    </AuthLayout>
  );
}
