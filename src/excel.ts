import * as XLSX from "xlsx";
import type { AppData, FitnessRecord } from "./types";

const VISIBLE_SHEET_NAME = "Records";
const SYSTEM_SHEET_NAME = "_system";

type SystemSheetMap = Record<string, string>;

function buildVisibleSheet(data: AppData): XLSX.WorkSheet {
  const headerRow = [
    "姓名",
    data.itemLabels[0] ?? "測驗項目 1",
    data.itemLabels[1] ?? "測驗項目 2",
    data.itemLabels[2] ?? "測驗項目 3",
    data.itemLabels[3] ?? "測驗項目 4",
    data.itemLabels[4] ?? "測驗項目 5",
    data.itemLabels[5] ?? "測驗項目 6",
    "評語",
  ];
  const recordRows = data.records.map((record) => [
    record.studentName,
    record.item1,
    record.item2,
    record.item3,
    record.item4,
    record.item5,
    record.item6,
    record.comment,
  ]);
  const rows = [
    ["班級名稱", data.rosterName],
    ["測驗日期", data.testDate],
    [],
    headerRow,
    ...recordRows,
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);

  sheet["!cols"] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 24 },
  ];

  return sheet;
}

function buildSystemRows(data: AppData): string[][] {
  return [
    ["key", "value"],
    ["schemaVersion", String(data.schemaVersion)],
    ["exportedAt", new Date().toISOString()],
    ["toolName", "fitness-test-tool"],
    ["toolVersion", "0.1.0"],
    ["testDate", data.testDate],
    ["itemLabels", JSON.stringify(data.itemLabels)],
    ["rosterName", data.rosterName],
    ["rosterStudentsJson", JSON.stringify(data.rosterStudents)],
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
  const visibleSheet = buildVisibleSheet(data);
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

  const records = parseRecordsJson(values.recordsJson).map((record) => ({
    ...record,
    testDate: values.testDate || record.testDate,
  }));

  return {
    schemaVersion: Number(values.schemaVersion),
    testDate: values.testDate || records[0]?.testDate || new Date().toISOString().slice(0, 10),
    itemLabels: JSON.parse(values.itemLabels) as string[],
    rosterName: values.rosterName || "目前名冊",
    rosterStudents: values.rosterStudentsJson
      ? (JSON.parse(values.rosterStudentsJson) as string[])
      : [],
    records,
  };
}
