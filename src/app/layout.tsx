import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppNav } from "@/ui/AppNav";
import { PasscodeGate } from "@/ui/PasscodeGate";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chess Coach",
  description: "Learn chess from zero by playing with a friendly coach.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <PasscodeGate>
          <AppNav />
          {children}
        </PasscodeGate>
      </body>
    </html>
  );
}
