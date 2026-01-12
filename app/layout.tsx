import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/nav/Navbar";
import { TopologyProvider } from "@/contexts/TopologyContext";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-jetbrains",
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
        className={`${jetbrainsMono.variable} antialiased h-full min-h-screen flex flex-col`}
        // className={`${kaiseiDecol.variable} ${suisseIntl.variable} ${suisseMono.variable} antialiased h-full min-h-screen flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TopologyProvider>
            <Navbar />
            <main className="flex-1 min-h-0">
              {children}
            </main>
          </TopologyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
