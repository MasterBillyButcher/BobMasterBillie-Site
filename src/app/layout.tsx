import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const bebas = Bebas_Neue({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BobMasterBillie Command Center",
  description:
    "Channel control room for BobMasterBillie. Prediction copy-paste setups, the bits-goal backlog counter, veto power, VIP board, the movie calendar, every Twitch and Nightbot command, and the full activity log.",
  keywords: [
    "BobMasterBillie",
    "Twitch",
    "command center",
    "predictions",
    "hype train",
    "movie backlog",
    "Nightbot",
  ],
  authors: [{ name: "BobMasterBillie" }],
};

export const viewport: Viewport = {
  themeColor: "#131313",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${bebas.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
