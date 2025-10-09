import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RMDY CV-Tool",
  description: "Professional CV management and AI-powered candidate search platform",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('cvtool-settings-storage');
                  if (stored) {
                    const data = JSON.parse(stored);
                    const brandColor = data.state?.brandColor;
                    if (brandColor) {
                      // Apply color immediately before page renders
                      const root = document.documentElement;
                      
                      // Parse hex to RGB
                      const hex = brandColor.replace('#', '');
                      const r = parseInt(hex.substring(0, 2), 16);
                      const g = parseInt(hex.substring(2, 4), 16);
                      const b = parseInt(hex.substring(4, 6), 16);
                      
                      // Calculate lightness for dark mode
                      const rNorm = r / 255;
                      const gNorm = g / 255;
                      const bNorm = b / 255;
                      const max = Math.max(rNorm, gNorm, bNorm);
                      const min = Math.min(rNorm, gNorm, bNorm);
                      const l = (max + min) / 2;
                      
                      // Create lighter version for dark mode
                      let darkModeColor = brandColor;
                      if (l < 0.7) {
                        const factor = 0.15;
                        const rLight = Math.round(r + (255 - r) * factor);
                        const gLight = Math.round(g + (255 - g) * factor);
                        const bLight = Math.round(b + (255 - b) * factor);
                        darkModeColor = 'rgb(' + rLight + ', ' + gLight + ', ' + bLight + ')';
                      }
                      
                      // Apply immediately
                      root.style.setProperty('--primary', brandColor);
                      root.style.setProperty('--primary-dark', darkModeColor);
                      root.style.setProperty('--sidebar-primary', brandColor);
                      root.style.setProperty('--sidebar-ring', brandColor);
                      root.style.setProperty('--ring', brandColor);
                      root.style.setProperty('--chart-1', brandColor);
                    }
                  }
                } catch (e) {
                  // Silently fail if there's an error
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SettingsProvider>
            {children}
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
