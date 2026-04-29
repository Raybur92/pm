"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { LoginPage } from "@/components/LoginPage";

export default function RootLayoutClient({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return;

    // If on login page, stay there regardless of auth state
    if (pathname === "/login") return;

    // If not authenticated and not on login page, redirect to login
    if (!isAuthenticated && pathname !== "/login") {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // Show login page if on /login route
  if (pathname === "/login") {
    return <LoginPage />;
  }

  // Show nothing while loading
  if (isLoading) {
    return null;
  }

  // Show children only if authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
