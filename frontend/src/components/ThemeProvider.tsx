import { useEffect } from "react";
import { useThemeStore } from "@/store/themeStore";

const THEME_COLORS: Record<"light" | "dark", string> = {
  light: "#0f766e",
  dark: "#134e4a",
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[theme]);
  }, [theme]);

  return children;
}
