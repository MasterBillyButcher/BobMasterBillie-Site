import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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
  title: "BobMasterBillie — Command Center",
  description:
    "Live community command center for BobMasterBillie: predictions, hype trains, veto power, movie backlog, command references and a full activity log — everything from the doc, now live in the browser.",
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
  icons: {
    icon: "/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#9146FF",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
