import "@/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import type React from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-regular antialiased min-h-screen flex flex-col`}
        suppressHydrationWarning
      >
         <main className="grid place-items-center h-screen w-screen">
            {children}
          </main>
      </body>
    </html>
  );
}
