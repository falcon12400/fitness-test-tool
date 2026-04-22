import * as XLSX from "xlsx";
import type { AppData, FitnessRecord } from "./types";

const VISIBLE_SHEET_NAME = "Records";
const SYSTEM_SHEET_NAME = "_system";

type SystemSheetMap = Record<string, string>;

function buildVisibleRows(data: AppData): Array<Record<string, string | number>> {
  return data.records.map((record) => ({
    StudentName: record.studentName,
    TestDate: record.testDate,
    [data.itemLabels[0] ?? "Item 1"]: record.item1,
    [data.itemLabels[1] ?? "Item 2"]: record.item2,
    [data.itemLabels[2] ?? "Item 3"]: record.item3,
    [data.itemLabels[3] ?? "Item 4"]: record.item4,
    [data.itemLabels[4] ?? "Item 5"]: record.item5,
    [data.itemLabels[5] ?? "Item 6"]: record.item6,
    Comment: record.comment,
  }));
}

function buildSystemRows(data: AppData): string[][] {
  return [
    ["key", "value"],
    ["schemaVersion", String(data.schemaVersion)],
    ["exportedAt", new Date().toISOString()],
    ["toolName", "fitness-test-tool"],
    ["toolVersion", "0.1.0"],
    ["itemLabels", JSON.stringify(data.itemLabels)],
    ["recordsJson", JSON.stringify(data.records)],
  ];
}

function systemRowsToMap(rows: unknown[][]): SystemSheetMap {
  const entries = rows
    .slice(1)
    .filter((row): row is [string, string] => {
      return typeof row[0] === "string" && typeof row[1] === "string";
    })
    .map(([key, value]) => [key, value] as const);

  return Object.fromEntries(entries);
}

function parseRecordsJson(recordsJson: string): FitnessRecord[] {
  const parsed = JSON.parse(recordsJson) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Embedded records data is not an array.");
  }

  return parsed as FitnessRecord[];
}

export function exportWorkbook(data: AppData): void {
  const workbook = XLSX.utils.book_new();
  const visibleSheet = XLSX.utils.json_to_sheet(buildVisibleRows(data));
  const systemSheet = XLSX.utils.aoa_to_sheet(buildSystemRows(data));

  XLSX.utils.book_append_sheet(workbook, visibleSheet, VISIBLE_SHEET_NAME);
  XLSX.utils.book_append_sheet(workbook, systemSheet, SYSTEM_SHEET_NAME);
  workbook.Workbook = {
    Sheets: [
      { name: VISIBLE_SHEET_NAME, Hidden: 0 },
      { name: SYSTEM_SHEET_NAME, Hidden: 1 },
    ],
  };

  XLSX.writeFile(workbook, "fitness-records.xlsx");
}

export async function importWorkbook(file: File): Promise<AppData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const systemSheet = workbook.Sheets[SYSTEM_SHEET_NAME];

  if (!systemSheet) {
    throw new Error("This Excel file does not contain the required system data.");
  }

  const rows = XLSX.utils.sheet_to_json(systemSheet, {
    header: 1,
    raw: false,
  }) as unknown[][];
  const values = systemRowsToMap(rows);

  if (!values.schemaVersion || !values.itemLabels || !values.recordsJson) {
    throw new Error("The embedded system data is incomplete or invalid.");
  }

  return {
    schemaVersion: Number(values.schemaVersion),
    itemLabels: JSON.parse(values.itemLabels) as string[],
    records: parseRecordsJson(values.recordsJson),
  };
}
