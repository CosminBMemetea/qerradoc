import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Querra Fișă",
  description:
    "Fișă digitală de service — constatare, reparație, revizie, PIF pentru utilaje de curățenie",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Querra Fișă",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F7F5" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('querra-theme');if(t==='dark')document.documentElement.classList.add('dark');var l=localStorage.getItem('querra-locale');if(l==='en'||l==='pl'||l==='ro')document.documentElement.lang=l;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
