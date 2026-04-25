import { useState, useCallback } from "react";

const STORAGE_KEY = "ui-builder:my-colors";
const MAX_COLORS = 16;

function loadColors(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === "string") : [];
  } catch {
    return [];
  }
}

function saveColors(colors: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  } catch {
    // ignore storage errors
  }
}

export function useMyColors() {
  const [myColors, setMyColors] = useState<string[]>(loadColors);

  const addColor = useCallback((hex: string) => {
    setMyColors((prev) => {
      const normalized = hex.toLowerCase();
      if (prev.includes(normalized)) return prev;
      const next = [normalized, ...prev].slice(0, MAX_COLORS);
      saveColors(next);
      return next;
    });
  }, []);

  const removeColor = useCallback((hex: string) => {
    setMyColors((prev) => {
      const next = prev.filter((c) => c !== hex.toLowerCase());
      saveColors(next);
      return next;
    });
  }, []);

  return { myColors, addColor, removeColor };
}
