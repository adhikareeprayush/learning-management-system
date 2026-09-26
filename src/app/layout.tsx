import type { Metadata, Viewport } from "next";
import { appUrl } from "@/lib/app-url";
import { getInstituteProfile } from "@/lib/institute";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { name } = await getInstituteProfile();

  return {
    metadataBase: new URL(appUrl()),
    applicationName: name,
    title: {
      default: `${name} — Online courses and certificates`,
      template: `%s · ${name}`,
    },
    description: `Learn with ${name}: self-paced courses, structured learning paths, and certificates anyone can verify online.`,
    // No title/description here: Next fills og/twitter text from each page's
    // own title and description. The image comes from app/opengraph-image.tsx.
    openGraph: {
      type: "website",
      siteName: name,
      locale: "en_US",
    },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  themeColor: "#04016C",
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
