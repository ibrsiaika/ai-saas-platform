import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Multi-AI Platform - Intelligent AI Solutions",
  description: "Advanced AI platform with multi-provider support, cost optimization, and workflow automation",
  keywords: "AI, Machine Learning, OpenAI, Anthropic, Google AI, Local AI, Ollama, Cost Optimization",
  authors: [{ name: "AI SaaS Platform Team" }],
};

export const viewport = "width=device-width, initial-scale=1";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#3B82F6" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-text-primary`}
        style={{
          backgroundColor: 'var(--color-background)',
          color: 'var(--color-text-primary)'
        }}
        suppressHydrationWarning
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
