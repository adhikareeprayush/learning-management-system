import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Convolution LMS — Learning platform",
    template: "%s · Convolution LMS",
  },
  description:
    "Convolution LMS: courses, roadmaps, certificates, manual payment enrollment, and admin newsletter tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col overflow-x-hidden font-sans">
        {children}
      </body>
    </html>
  );
}
