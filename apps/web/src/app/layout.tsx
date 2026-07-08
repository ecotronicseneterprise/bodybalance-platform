import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BodyBalance",
  description:
    "AI-powered front desk for physiotherapy clinics — understand your pain, get educated guidance, and book with a licensed physiotherapist.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
