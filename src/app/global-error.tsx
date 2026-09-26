"use client";

import { useEffect } from "react";

// Replaces the root layout when it fails, so it renders its own document.
// Inline styles on purpose: importing globals.css here makes Next preload a
// second copy of the stylesheet on every page.
const button = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 10,
  padding: "12px 24px",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
} as const;

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          boxSizing: "border-box",
          background: "#f4f6fb",
          color: "#1b2336",
          fontFamily: "Saira, system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <title>Something went wrong</title>
        <main
          style={{
            width: "100%",
            maxWidth: 480,
            padding: 32,
            boxSizing: "border-box",
            textAlign: "center",
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.05)",
            borderRadius: 24,
            boxShadow: "0 1px 2px rgba(16,24,40,0.06)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 26, color: "#04016c" }}>
            Something went wrong
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.6, color: "#4e596b" }}>
            The site hit an unexpected problem. It&apos;s usually temporary —
            try again in a moment.
          </p>
          {error.digest ? (
            <p style={{ margin: "12px 0 0", fontSize: 12, color: "#4e596b", fontFamily: "monospace" }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <div
            style={{
              marginTop: 28,
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                ...button,
                border: "none",
                color: "#ffffff",
                backgroundImage: "linear-gradient(115deg, #083f9b 0%, #7f56d9 100%)",
              }}
            >
              Try again
            </button>
            {/* A full page load: the client router may be what failed. */}
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              style={{
                ...button,
                border: "1px solid rgba(0,0,0,0.1)",
                color: "#04016c",
                background: "#ffffff",
              }}
            >
              Go to homepage
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
