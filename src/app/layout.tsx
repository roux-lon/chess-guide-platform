import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppNav } from "@/ui/AppNav";
import { DiaryBanner } from "@/ui/DiaryBanner";
import { OfflineHelper } from "@/ui/OfflineHelper";
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
        <OfflineHelper />
        <PasscodeGate>
          <a href="#content" className="skip-link">
            Skip to the main content
          </a>
          <AppNav />
          <DiaryBanner />
          <div id="content" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </div>
        </PasscodeGate>
      </body>
    </html>
  );
}
