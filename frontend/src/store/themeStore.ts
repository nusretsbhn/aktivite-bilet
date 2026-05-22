import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";

type ThemeState = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => set({ theme }),
    }),
    { name: "theme-storage" }
  )
);

export function getStoredTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem("theme-storage");
    if (!raw) return "light";
    const parsed = JSON.parse(raw) as { state?: { theme?: ThemeMode } };
    return parsed.state?.theme === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}
