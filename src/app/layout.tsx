import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Edujarr — Learning platform demo",
  description:
    "Portfolio LMS with courses, roadmaps, certificates, manual payment enrollment, and admin newsletter tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Revalia loads in the browser only — avoids Google Fonts fetch during `next build` on VPS */}
        <link
          href="https://fonts.googleapis.com/css2?family=Revalia&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col overflow-x-hidden font-sans">
        {children}
      </body>
    </html>
  );
}
