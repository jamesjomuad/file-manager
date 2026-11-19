import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "../styles/themes.css";
import { ThemeProvider } from "@/contexts/theme-context";
import { HashRouterProvider } from "@/contexts/hash-router-context";

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
                  var theme = localStorage.getItem('theme-id') || 'midnight-pro';
                  var mode = localStorage.getItem('theme-mode') || 'system';
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
        <HashRouterProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </HashRouterProvider>
      </body>
    </html>
  );
}
