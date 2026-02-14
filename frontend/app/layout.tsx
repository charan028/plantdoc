import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pladoc",
  description: "Your AI Plant Doctor",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pladoc",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#172521",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zooming on inputs, feels native
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
