import type { AppData } from "./types";
import { defaultAppData } from "./sample-data";

const STORAGE_KEY = "fitness-test-tool.app-data.v1";

function migrateAppData(data: AppData | (Omit<AppData, "testDate"> & { testDate?: string })): AppData {
  return {
    ...data,
    testDate:
      data.testDate ??
      data.records[0]?.testDate ??
      defaultAppData.testDate,
    rosterName:
      ("rosterName" in data && typeof data.rosterName === "string"
        ? data.rosterName
        : defaultAppData.rosterName),
    rosterStudents:
      ("rosterStudents" in data && Array.isArray(data.rosterStudents)
        ? data.rosterStudents
        : defaultAppData.rosterStudents),
  };
}

export function loadAppData(): AppData | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return migrateAppData(JSON.parse(raw) as AppData);
  } catch {
    return null;
  }
}

export function saveAppData(data: AppData): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
