import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asme — Know it all",
  description: "Pioneering ideas for minds that create, build, and inspire.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-black scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-black text-white min-h-screen selection:bg-white/20 selection:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
