import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import RadarChart from "./RadarChart";
import { exportWorkbook, importWorkbook } from "./excel";
import { defaultAppData } from "./sample-data";
import { loadAppData, saveAppData } from "./storage";
import type { AppData, FitnessField, FitnessRecord } from "./types";

type TabKey =
  | "table"
  | "metric"
  | "editor"
  | "roster"
  | "analysis"
  | "pdf";

type EditableField = keyof FitnessRecord;

type ActiveCell = {
  recordId: string;
  field: EditableField;
} | null;

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "roster", label: "編輯名冊" },
  { key: "metric", label: "測驗項目" },
  { key: "analysis", label: "檢視能力分析" },
  { key: "table", label: "檢視總表" },
  { key: "pdf", label: "下載PDF" },
];

const scoreFields: FitnessField[] = [
  "item1",
  "item2",
  "item3",
  "item4",
  "item5",
  "item6",
];

function makeEmptyRecord(testDate: string): FitnessRecord {
  return {
    id: crypto.randomUUID(),
    studentName: "",
    testDate,
    item1: 0,
    item2: 0,
    item3: 0,
    item4: 0,
    item5: 0,
    item6: 0,
    comment: "",
  };
}

function upsertRecord(records: FitnessRecord[], nextRecord: FitnessRecord) {
  const foundIndex = records.findIndex((record) => record.id === nextRecord.id);
  if (foundIndex === -1) {
    return [nextRecord, ...records];
  }

  return records.map((record) =>
    record.id === nextRecord.id ? nextRecord : record,
  );
}

function normalizeNumber(value: string): number {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

function normalizeRosterText(text: string): string[] {
  return text
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function App() {
  const [data, setData] = useState<AppData>(() => loadAppData() ?? defaultAppData);
  const [activeTab, setActiveTab] = useState<TabKey>("roster");
  const [selectedId, setSelectedId] = useState<string>(data.records[0]?.id ?? "");
  const [draftRecord, setDraftRecord] = useState<FitnessRecord>(
    data.records[0] ?? makeEmptyRecord(data.testDate),
  );
  const [searchText, setSearchText] = useState("");
  const [message, setMessage] = useState("已載入本機資料。");
  const [activeCell, setActiveCell] = useState<ActiveCell>(null);
  const [activeMetric, setActiveMetric] = useState<FitnessField>("item1");
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [rosterText, setRosterText] = useState(() => data.rosterStudents.join("\n"));

  useEffect(() => {
    saveAppData(data);
  }, [data]);

  useEffect(() => {
    setRosterText(data.rosterStudents.join("\n"));
  }, [data.rosterStudents]);

  const selectedRecord = useMemo(
    () => data.records.find((record) => record.id === selectedId) ?? null,
    [data.records, selectedId],
  );

  useEffect(() => {
    if (selectedRecord) {
      setDraftRecord(selectedRecord);
    }
  }, [selectedRecord]);

  const filteredRecords = useMemo(() => {
    const normalized = searchText.trim().toLowerCase();
    if (!normalized) {
      return data.records;
    }

    return data.records.filter((record) =>
      record.studentName.toLowerCase().includes(normalized),
    );
  }, [data.records, searchText]);

  const tableRecords = useMemo(() => {
    const baseRecords = showIncompleteOnly
      ? data.records.filter((record) =>
          scoreFields.some((field) => !Number.isFinite(record[field]) || record[field] <= 0),
        )
      : data.records;

    const normalized = searchText.trim().toLowerCase();
    if (!normalized) {
      return baseRecords;
    }

    return baseRecords.filter((record) =>
      record.studentName.toLowerCase().includes(normalized),
    );
  }, [data.records, searchText, showIncompleteOnly]);

  const activeMetricIndex = scoreFields.indexOf(activeMetric);
  const activeMetricLabel = data.itemLabels[activeMetricIndex] ?? activeMetric;

  function startCreate(): void {
    const nextRecord = makeEmptyRecord(data.testDate);
    setDraftRecord(nextRecord);
    setSelectedId("");
    setActiveTab("editor");
    setMessage("已切換到新增模式。");
  }

  function selectRecord(record: FitnessRecord): void {
    setSelectedId(record.id);
    setDraftRecord(record);
  }

  function updateDraftField(
    field: keyof FitnessRecord,
    value: string | number,
  ): void {
    setDraftRecord((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function saveDraft(): void {
    if (!draftRecord.studentName.trim()) {
      setMessage("請先輸入學生姓名。");
      return;
    }

    const normalized = {
      ...draftRecord,
      studentName: draftRecord.studentName.trim(),
      testDate: data.testDate,
    };

    const nextRecords = upsertRecord(data.records, normalized);
    setData((current) => ({ ...current, records: nextRecords }));
    setSelectedId(normalized.id);
    setDraftRecord(normalized);
    setActiveTab("table");
    setMessage("資料已儲存。");
  }

  function deleteSelected(): void {
    if (!selectedRecord) {
      setMessage("目前沒有可刪除的資料。");
      return;
    }

    const nextRecords = data.records.filter(
      (record) => record.id !== selectedRecord.id,
    );
    setData((current) => ({ ...current, records: nextRecords }));
    setSelectedId(nextRecords[0]?.id ?? "");
    setDraftRecord(nextRecords[0] ?? makeEmptyRecord(data.testDate));
    setMessage("資料已刪除。");
  }

  function addTableRow(): void {
    const nextRecord = makeEmptyRecord(data.testDate);
    setData((current) => ({
      ...current,
      records: [nextRecord, ...current.records],
    }));
    setSelectedId(nextRecord.id);
    setDraftRecord(nextRecord);
    setMessage("已新增一筆空白資料。");
  }

  function deleteTableRow(recordId: string): void {
    const nextRecords = data.records.filter((record) => record.id !== recordId);
    setData((current) => ({
      ...current,
      records: nextRecords,
    }));

    if (selectedId === recordId) {
      setSelectedId(nextRecords[0]?.id ?? "");
      setDraftRecord(nextRecords[0] ?? makeEmptyRecord(data.testDate));
    }

    setMessage("已從資料表移除一筆資料。");
  }

  function updateTableField(
    recordId: string,
    field: EditableField,
    value: string,
  ): void {
    setData((current) => ({
      ...current,
      records: current.records.map((record) => {
        if (record.id !== recordId) {
          return record;
        }

        if (scoreFields.includes(field as FitnessField)) {
          return {
            ...record,
            [field]: normalizeNumber(value),
          };
        }

        return {
          ...record,
          [field]: value,
        };
      }),
    }));
  }

  function updateItemLabel(field: FitnessField, nextLabel: string): void {
    const index = scoreFields.indexOf(field);
    if (index === -1) {
      return;
    }

    setData((current) => ({
      ...current,
      itemLabels: current.itemLabels.map((label, labelIndex) =>
        labelIndex === index ? nextLabel : label,
      ),
    }));
  }

  function updateSharedTestDate(nextDate: string): void {
    setData((current) => ({
      ...current,
      testDate: nextDate,
      records: current.records.map((record) => ({
        ...record,
        testDate: nextDate,
      })),
    }));
  }

  function updateRosterName(nextName: string): void {
    setData((current) => ({
      ...current,
      rosterName: nextName,
    }));
  }

  function updateRosterStudentsText(text: string): void {
    setRosterText(text);
  }

  function importRosterToRecords(): void {
    const normalizedRosterStudents = normalizeRosterText(rosterText);

    if (!normalizedRosterStudents.length) {
      setMessage("目前名冊是空的。");
      return;
    }

    const existingMap = new Map(
      data.records.map((record) => [record.studentName, record] as const),
    );

    const nextRecords = normalizedRosterStudents.map((studentName) => {
      const existing = existingMap.get(studentName);
      if (existing) {
        return {
          ...existing,
          studentName,
          testDate: data.testDate,
        };
      }

      return {
        ...makeEmptyRecord(data.testDate),
        studentName,
      };
    });

    setData((current) => ({
      ...current,
      rosterStudents: normalizedRosterStudents,
      records: nextRecords,
    }));
    setSelectedId(nextRecords[0]?.id ?? "");
    setDraftRecord(nextRecords[0] ?? makeEmptyRecord(data.testDate));
    setMessage("已將名冊匯入目前資料。");
  }

  function beginCellEdit(recordId: string, field: EditableField): void {
    setActiveCell({ recordId, field });
  }

  function stopCellEdit(): void {
    setActiveCell(null);
  }

  async function handleImportChange(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const imported = await importWorkbook(file);
      setData(imported);
      setSelectedId(imported.records[0]?.id ?? "");
      setDraftRecord(imported.records[0] ?? makeEmptyRecord(imported.testDate));
      setMessage("Excel 匯入成功，已採用內嵌系統資料。");
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : "Excel 匯入失敗。";
      setMessage(nextMessage);
    } finally {
      event.target.value = "";
    }
  }

  function handlePrintPdf(): void {
    window.print();
  }

  function handleExport(): void {
    exportWorkbook(data);
    setMessage("Excel 已匯出。");
  }

  function resetSampleData(): void {
    setData(defaultAppData);
    setSelectedId(defaultAppData.records[0]?.id ?? "");
    setDraftRecord(defaultAppData.records[0] ?? makeEmptyRecord(defaultAppData.testDate));
    setActiveMetric("item1");
    setMessage("已還原為範例資料。");
  }

  function updateScore(field: FitnessField, value: string): void {
    updateDraftField(field, normalizeNumber(value));
  }

  function getTopLabel(record: FitnessRecord): string {
    const values = [
      record.item1,
      record.item2,
      record.item3,
      record.item4,
      record.item5,
      record.item6,
    ];
    const maxValue = Math.max(...values);
    const maxIndex = values.indexOf(maxValue);
    return data.itemLabels[maxIndex] ?? "未設定";
  }

  function renderTableCell(
    record: FitnessRecord,
    field: EditableField,
    value: string | number,
    options?: {
      inputType?: "text" | "number";
      min?: number;
      step?: number;
      className?: string;
    },
  ) {
    const isEditing =
      activeCell?.recordId === record.id && activeCell.field === field;

    if (isEditing) {
      return (
        <input
          autoFocus
          className={options?.className}
          min={options?.min}
          onBlur={stopCellEdit}
          onChange={(event) =>
            updateTableField(record.id, field, event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Escape") {
              stopCellEdit();
            }
          }}
          step={options?.step}
          type={options?.inputType ?? "text"}
          value={String(value)}
        />
      );
    }

    return (
      <button
        className="cell-display"
        onClick={() => beginCellEdit(record.id, field)}
        type="button"
      >
        {String(value || "") || "—"}
      </button>
    );
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Fitness Test Tool</p>
          <h1>體適能測驗管理工具</h1>
          <p className="hero-copy">
            第一版以網頁為唯一正式編輯來源，Excel 僅用於檢視、備份、列印與攜帶。
          </p>
          <div className="hero-meta">
            <label className="shared-date-field">
              班級名稱
              <input
                onChange={(event) => updateRosterName(event.target.value)}
                value={data.rosterName}
              />
            </label>
            <label className="shared-date-field">
              本次測驗日期
              <input
                onChange={(event) => updateSharedTestDate(event.target.value)}
                type="date"
                value={data.testDate}
              />
            </label>
          </div>
        </div>
        <div className="hero-actions">
          <button className="primary-button" onClick={startCreate} type="button">
            新增資料
          </button>
          <button className="secondary-button" onClick={resetSampleData} type="button">
            還原範例
          </button>
        </div>
      </header>

      <nav className="tab-bar" aria-label="主要功能">
        {tabs.map((tab) => (
          <button
            className={tab.key === activeTab ? "tab is-active" : "tab"}
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="panel-grid">
        {activeTab === "table" ? (
          <>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>檢視總表</h2>
                  <p>這一頁預設是列表檢視，點一下儲存格再就地編輯，也能直接選取學生供能力分析使用。</p>
                </div>
                <div className="button-row">
                  <label className="filter-toggle">
                    <input
                      checked={showIncompleteOnly}
                      onChange={(event) => setShowIncompleteOnly(event.target.checked)}
                      type="checkbox"
                    />
                    只看未完成學生
                  </label>
                  <button
                    className="primary-button"
                    onClick={addTableRow}
                    type="button"
                  >
                    新增列
                  </button>
                </div>
                <input
                  className="search-input table-search"
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="搜尋學生姓名"
                  value={searchText}
                />
              </div>
              <div className="table-wrap">
                <table className="table-editor">
                  <thead>
                    <tr>
                      <th>學生姓名</th>
                      <th>{data.itemLabels[0]}</th>
                      <th>{data.itemLabels[1]}</th>
                      <th>{data.itemLabels[2]}</th>
                      <th>{data.itemLabels[3]}</th>
                      <th>{data.itemLabels[4]}</th>
                      <th>{data.itemLabels[5]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRecords.map((record) => (
                      <tr
                        className={record.id === selectedId ? "is-selected" : ""}
                        key={record.id}
                        onClick={() => selectRecord(record)}
                      >
                        <td>{renderTableCell(record, "studentName", record.studentName)}</td>
                        {scoreFields.map((field) => (
                          <td key={field}>
                            {renderTableCell(record, field, record[field], {
                              inputType: "number",
                              min: 0,
                              step: 1,
                              className: "cell-input-number",
                            })}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel side-panel">
              <h2>使用方式</h2>
              <ul className="plain-list">
                <li>這一頁預設是列表檢視，不會整排都變成表單。</li>
                <li>點一下任一格才會進入編輯，按 Enter 或點別處就收起來。</li>
                <li>勾選「只看未完成學生」後，會列出六項成績中仍有缺漏的學生。</li>
                <li>如果你想只專注調整某一個項目，請改用單項編輯頁。</li>
              </ul>
            </section>
          </>
        ) : null}

        {activeTab === "metric" ? (
          <>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>測驗項目</h2>
                  <p>一次只處理一個測驗欄位，適合全班統一補分、修分或更改欄位名稱。</p>
                </div>
              </div>

              <div className="metric-toolbar">
                {scoreFields.map((field, index) => (
                  <button
                    className={field === activeMetric ? "metric-pill is-active" : "metric-pill"}
                    key={field}
                    onClick={() => setActiveMetric(field)}
                    type="button"
                  >
                    {data.itemLabels[index]}
                  </button>
                ))}
              </div>

              <div className="metric-header-card">
                <label className="metric-label-editor">
                  目前欄位名稱
                  <input
                    onChange={(event) => updateItemLabel(activeMetric, event.target.value)}
                    value={activeMetricLabel}
                  />
                </label>
                <p className="metric-header-help">
                  這裡改的是欄位標題，例如把「柔軟度」改成別的名稱。
                </p>
              </div>

              <div className="table-wrap">
                <table className="table-editor metric-editor">
                  <thead>
                    <tr>
                      <th>學生姓名</th>
                      <th>{activeMetricLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.records.map((record) => (
                      <tr
                        className={record.id === selectedId ? "is-selected" : ""}
                        key={record.id}
                        onClick={() => selectRecord(record)}
                      >
                        <td>{record.studentName}</td>
                        <td>
                          {renderTableCell(record, activeMetric, record[activeMetric], {
                            inputType: "number",
                            min: 0,
                            step: 1,
                            className: "cell-input-number",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel side-panel">
              <h2>適用情境</h2>
              <ul className="plain-list">
                <li>只想調整某一項分數，不想被其他欄位干擾。</li>
                <li>欄位名稱需要重命名，例如改成不同學期或不同測驗名稱。</li>
                <li>這一頁比整表編輯更聚焦，也更接近單欄批次處理。</li>
              </ul>
            </section>
          </>
        ) : null}

        {activeTab === "editor" ? (
          <>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>單筆編輯</h2>
                  <p>適合針對單一學生做完整填寫與調整。</p>
                </div>
              </div>
              <div className="form-grid">
                <label>
                  學生姓名
                  <input
                    onChange={(event) =>
                      updateDraftField("studentName", event.target.value)
                    }
                    value={draftRecord.studentName}
                  />
                </label>
                {scoreFields.map((field, index) => (
                  <label key={field}>
                    {data.itemLabels[index]}
                    <input
                      min="0"
                      onChange={(event) => updateScore(field, event.target.value)}
                      step="1"
                      type="number"
                      value={draftRecord[field]}
                    />
                  </label>
                ))}
                <label className="full-span">
                  評語
                  <textarea
                    onChange={(event) =>
                      updateDraftField("comment", event.target.value)
                    }
                    rows={4}
                    value={draftRecord.comment}
                  />
                </label>
              </div>
              <div className="button-row">
                <button className="primary-button" onClick={saveDraft} type="button">
                  儲存資料
                </button>
                <button className="danger-button" onClick={deleteSelected} type="button">
                  刪除目前選取
                </button>
              </div>
            </section>
            <section className="panel side-panel">
              <h2>編輯規則</h2>
              <ul className="plain-list">
                <li>網頁是唯一正式編輯來源。</li>
                <li>匯出的 Excel 只做檢視、備份、列印與攜帶。</li>
                <li>若要快速修改整班資料，請使用資料表編輯或單項編輯頁。</li>
              </ul>
            </section>
          </>
        ) : null}

        {activeTab === "roster" ? (
          <>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>編輯名冊</h2>
                  <p>這裡只管理一份目前名冊。若要切換班級，直接匯入那個班先前的資料即可。</p>
                </div>
              </div>

              <div className="roster-editor">
                <label className="metric-label-editor">
                  名冊名稱
                  <input
                    onChange={(event) => updateRosterName(event.target.value)}
                    value={data.rosterName}
                  />
                </label>

                <label className="roster-text-editor">
                  名冊內容（每行一位學生）
                  <textarea
                    onChange={(event) => updateRosterStudentsText(event.target.value)}
                    rows={14}
                    value={rosterText}
                  />
                </label>

                <div className="button-row">
                  <button
                    className="primary-button"
                    onClick={importRosterToRecords}
                    type="button"
                  >
                    儲存
                  </button>
                </div>
              </div>
            </section>
            <section className="panel side-panel">
              <h2>使用方式</h2>
              <ul className="plain-list">
                <li>這裡只保留一份目前名冊，不再管理多個班級清單。</li>
                <li>名冊內容用每行一位學生的方式輸入，最省事。</li>
                <li>按「儲存」後，會用名冊建立或對齊目前這份測驗資料。</li>
                <li>如果要切換班級，建議直接匯入該班先前存好的整份資料。</li>
              </ul>
            </section>
          </>
        ) : null}

        {activeTab === "analysis" ? (
          <>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>檢視能力分析</h2>
                  <p>快速查看單一學生六項測驗分布。</p>
                </div>
                <label className="shared-date-field">
                  選擇學生
                  <select
                    className="search-input"
                    onChange={(event) => {
                      const nextRecord = data.records.find(
                        (record) => record.id === event.target.value,
                      );
                      if (nextRecord) {
                        selectRecord(nextRecord);
                      }
                    }}
                    value={selectedId}
                  >
                    {data.records.map((record) => (
                      <option key={record.id} value={record.id}>
                        {record.studentName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <RadarChart labels={data.itemLabels} record={selectedRecord} />
            </section>
            <section className="panel side-panel">
              <h2>分析摘要</h2>
              {selectedRecord ? (
                <dl className="detail-list">
                  <div>
                    <dt>學生姓名</dt>
                    <dd>{selectedRecord.studentName}</dd>
                  </div>
                  <div>
                    <dt>最高項目</dt>
                    <dd>{getTopLabel(selectedRecord)}</dd>
                  </div>
                  <div>
                    <dt>評語</dt>
                    <dd>{selectedRecord.comment || "無"}</dd>
                  </div>
                </dl>
              ) : (
                <p>請先從檢視總表選一筆資料。</p>
              )}
            </section>
          </>
        ) : null}

        {activeTab === "pdf" ? (
          <>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>下載PDF</h2>
                  <p>先用瀏覽器列印功能輸出 PDF，適合留存、列印或交付紙本。</p>
                </div>
              </div>
              <div className="callout">
                點下面按鈕後，會開啟瀏覽器列印視窗。目的地選擇「另存為 PDF」就可以下載 PDF。
              </div>
              <div className="button-row">
                <button className="primary-button" onClick={handlePrintPdf} type="button">
                  開啟列印 / 下載 PDF
                </button>
                <button className="secondary-button" onClick={handleExport} type="button">
                  匯出 Excel
                </button>
                <label className="file-button">
                  匯入 Excel
                  <input
                    accept=".xlsx,.xls"
                    onChange={handleImportChange}
                    type="file"
                  />
                </label>
              </div>
            </section>
            <section className="panel side-panel">
              <h2>使用方式</h2>
              <ul className="plain-list">
                <li>PDF 適合列印、存檔與交給家長或行政單位查看。</li>
                <li>Excel 仍然保留給備份、搬移與重新匯入使用。</li>
                <li>若匯入的 Excel 缺少 `_system` 工作表，系統會拒絕載入。</li>
              </ul>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
