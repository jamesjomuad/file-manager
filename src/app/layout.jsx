import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "../styles/themes.css";
import { StoreInitializer } from "@/components/store-initializer";
import { Toaster } from "@/components/base/toast/toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-source",
  subsets: ["latin"],
  display: "swap",
});

/** @type {import('next').Metadata} */
export const metadata = {
  title: "File Manager",
  description: "A file manager built with Next.js and BoardUI",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Prevent FOUC: Apply theme from localStorage before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Try Zustand store format first
                  var storeData = localStorage.getItem('fileManager.settings');
                  var theme, mode, accent;
                  if (storeData) {
                    var parsed = JSON.parse(storeData);
                    if (parsed.state) {
                      theme = parsed.state.currentTheme || 'midnight-pro';
                      mode = parsed.state.themeMode || 'system';
                      accent = parsed.state.accentColor || null;
                    }
                  }
                  // Fallback to old localStorage keys
                  if (!theme) {
                    theme = localStorage.getItem('theme-id') || 'midnight-pro';
                    mode = localStorage.getItem('theme-mode') || 'system';
                  }
                  var resolvedMode = mode;
                  if (mode === 'system') {
                    resolvedMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', theme);
                  document.documentElement.setAttribute('data-theme-mode', resolvedMode);
                  if (resolvedMode === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="h-full flex flex-col bg-background-full">
        <StoreInitializer />
        <Toaster />
        {children}
      </body>
    </html>
  );
}
