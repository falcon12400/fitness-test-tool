# Implementation Notes

## Recommended First-Version Stack

- React for the UI
- Apache ECharts for radar charts
- SheetJS (`xlsx`) for Excel import and export
- `localStorage` or `IndexedDB` for browser-side storage

## Recommended Internal Model

Use JSON as the internal canonical format even when exporting Excel.

Example shape:

```json
{
  "schemaVersion": 1,
  "itemLabels": [
    "Flexibility",
    "Balance",
    "Core",
    "Power",
    "Agility",
    "Coordination"
  ],
  "records": [
    {
      "id": "rec_001",
      "studentName": "Student A",
      "testDate": "2026-04-22",
      "item1": 10,
      "item2": 12,
      "item3": 15,
      "item4": 11,
      "item5": 14,
      "item6": 13,
      "comment": ""
    }
  ]
}
```

## Useful Data Helpers

Because the dataset is small, the app can use simple helpers instead of a heavy spreadsheet component.

Suggested helpers:

- `insertRecord(record)`
- `updateRecord(id, patch)`
- `deleteRecord(id)`
- `updateCell(id, field, value)`
- `replaceAllRecords(records)`

If batch editing is added later, a helper like this is enough:

- `updateColumn(field, updater)`

## Suggested Phased Rollout

### Phase 1

- record list
- record editor
- radar chart
- Excel export with embedded JSON
- Excel import from embedded JSON

### Phase 2

- detect visible-sheet edits
- prompt on mismatch
- limited structured batch editing

### Phase 3

- historical file management
- before/after comparison
- multi-class support

## Practical Product Rule

Keep the first version strict.

- editing happens in the web app
- Excel is a delivery and backup format
- import trusts hidden JSON only

This keeps the implementation simple and the user expectations clear.
