import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === "string") return err
  if (err != null && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message)
  }
  if (err != null && typeof err === "object") {
    try { return JSON.stringify(err) } catch { /* fall through */ }
  }
  return String(err)
}

export function resolveTheme(theme: "dark" | "light" | "system"): "dark" | "light" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }
  return theme
}
