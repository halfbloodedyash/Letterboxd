import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Letterboxd Image Generator - Create Beautiful Review Cards",
  description: "Transform your Letterboxd reviews into beautiful, shareable images. Perfect for Instagram, Twitter, and Stories.",
  keywords: ["letterboxd", "film reviews", "movie reviews", "image generator", "social media"],
  openGraph: {
    title: "Letterboxd Image Generator",
    description: "Transform your Letterboxd reviews into beautiful, shareable images.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
