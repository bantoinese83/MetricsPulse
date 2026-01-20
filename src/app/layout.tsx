import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { QueryProvider } from "@/lib/providers/query-provider";
import ErrorBoundary from "@/components/error-boundary";
import { validateConfig } from "@/lib/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Validate configuration on startup (skip during build)
if (typeof window === 'undefined' && process.env.npm_lifecycle_event !== 'build') {
  const { valid, errors } = validateConfig();
  if (!valid) {
    console.error('Configuration validation failed:', errors);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Invalid configuration: ${errors.join(', ')}`);
    }
  }
}

export const metadata: Metadata = {
  title: {
    default: "MetricsPulse - SaaS Analytics Dashboard",
    template: "%s | MetricsPulse"
  },
  description: "AI-powered analytics dashboard for SaaS founders. Track MRR, churn rate, CAC, LTV and other critical metrics in one place.",
  keywords: ["SaaS", "analytics", "dashboard", "MRR", "churn rate", "metrics", "founders"],
  authors: [{ name: "MetricsPulse Team" }],
  creator: "MetricsPulse",
  publisher: "MetricsPulse",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://metricspulse.app",
    title: "MetricsPulse - SaaS Analytics Dashboard",
    description: "AI-powered analytics dashboard for SaaS founders. Track MRR, churn rate, CAC, LTV and other critical metrics in one place.",
    siteName: "MetricsPulse",
  },
  twitter: {
    card: "summary_large_image",
    title: "MetricsPulse - SaaS Analytics Dashboard",
    description: "AI-powered analytics dashboard for SaaS founders. Track MRR, churn rate, CAC, LTV and other critical metrics in one place.",
    creator: "@metricspulse",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900`}
      >
        <ErrorBoundary>
          <QueryProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
