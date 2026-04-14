import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

import Providers from "./providers";

export const metadata: Metadata = {
  title: "Odisea Cloud | WHM Console",
  description: "Advanced Web Host Manager"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-zinc-100 font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
