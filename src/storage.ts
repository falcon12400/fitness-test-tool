import type { AppData } from "./types";

const STORAGE_KEY = "fitness-test-tool.app-data.v1";

export function loadAppData(): AppData | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AppData;
  } catch {
    return null;
  }
}

export function saveAppData(data: AppData): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
