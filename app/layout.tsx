import "@/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import type { Metadata } from "next";

import type React from "react";

export const metadata: Metadata = {
  title: "Next Cursors",
  description: "Interactive cursor demos built with Next.js",
  icons: {
    icon: "/next-cursors.svg",
  },
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="shortcut icon" href="https://images.sftcdn.net/images/t_favicon-v2/p/c2924546-8051-4518-9e67-c81da4ad1649/397647819/cursor-sh-logo" type="image/x-icon" />
      </head>
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
