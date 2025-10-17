import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/nav/Navbar";
import { TopologyProvider } from "@/contexts/TopologyContext";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const kaiseiDecol = localFont({
  src: [
    {
      path: "../public/fonts/kaisei-decol/KaiseiDecol-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/kaisei-decol/KaiseiDecol-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/kaisei-decol/KaiseiDecol-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-kaisei-decol",
  display: "swap",
});

const suisseIntl = localFont({
  src: [
    {
      path: "../public/fonts/suisse-intl/SuisseIntl-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/suisse-intl/SuisseIntl-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/suisse-intl/SuisseIntl-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/suisse-intl/SuisseIntl-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/suisse-intl/SuisseIntl-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-suisse-intl",
  display: "swap",
});

const suisseMono = localFont({
  src: [
    {
      path: "../public/fonts/suisse-intl/SuisseIntl-Mono.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-suisse-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DoubleZero Topology",
  description: "Network topology visualization and analysis system for comparing serviceability contracts, telemetry measurements, and IS-IS protocol state.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${kaiseiDecol.variable} ${suisseIntl.variable} ${suisseMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TopologyProvider>
            <Navbar />
            {children}
          </TopologyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
