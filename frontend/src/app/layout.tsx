import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chennai Flood Pulse | Street-Level Flood Risk & Safe Navigation",
  description:
    "Real-time 3-hour street-level flood risk assessment and flood-avoiding safe routing for South Chennai (Velachery, Pallikaranai, Mudichur, Medavakkam).",
  keywords: [
    "Chennai flood",
    "Velachery flood risk",
    "safe route",
    "AWS Environmental Hacks",
    "waterlogging map",
  ],
  authors: [{ name: "Chennai Flood Pulse Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#090d16",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-300">
        {children}
      </body>
    </html>
  );
}
