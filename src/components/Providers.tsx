"use client";

import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>{children}</I18nProvider>
    </ThemeProvider>
  );
}
