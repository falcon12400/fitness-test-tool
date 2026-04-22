export type FitnessField =
  | "item1"
  | "item2"
  | "item3"
  | "item4"
  | "item5"
  | "item6";

export type FitnessRecord = {
  id: string;
  studentName: string;
  testDate: string;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  comment: string;
};

export type AppData = {
  schemaVersion: number;
  itemLabels: string[];
  records: FitnessRecord[];
};
