import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BodyBalance",
  description:
    "The AI-powered front desk for clinics — patients get clear guidance and book with licensed practitioners, 24/7.",
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
