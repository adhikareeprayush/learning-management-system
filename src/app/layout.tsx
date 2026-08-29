import type { Metadata } from "next";
import { Revalia, Rowdies, Saira } from "next/font/google";
import "./globals.css";

const saira = Saira({
  variable: "--font-saira",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const rowdies = Rowdies({
  variable: "--font-rowdies",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

const revalia = Revalia({
  variable: "--font-revalia",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Edujarr — Learning platform demo",
  description:
    "Portfolio LMS with courses, roadmaps, certificates, Khalti sandbox checkout, and admin newsletter tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${saira.variable} ${rowdies.variable} ${revalia.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col overflow-x-hidden font-sans">
        {children}
      </body>
    </html>
  );
}
