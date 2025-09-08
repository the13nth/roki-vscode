import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FileWatcherInitializer } from "@/components/FileWatcherInitializer";
import { NavigationHeader } from "@/components/NavigationHeader";
import { DotMatrixBackground } from "@/components/ui/dot-matrix-background";
import { ClerkProvider } from '@clerk/nextjs';
import { ClientOnly } from "@/components/ClientOnly";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ROKI Project Manager",
  description: "Manage your development projects with AI-powered assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased relative`}
        >
          <DotMatrixBackground opacity="light" dotSize="sm" spacing="normal" />
          <div className="relative z-10">
            <ClientOnly>
              <FileWatcherInitializer />
              <NavigationHeader />
            </ClientOnly>
            {children}
          </div>
          <Toaster />
          <SpeedInsights />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
