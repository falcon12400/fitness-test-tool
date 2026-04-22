import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import RadarChart from "./RadarChart";
import { exportWorkbook, importWorkbook } from "./excel";
import { defaultAppData } from "./sample-data";
import { loadAppData, saveAppData } from "./storage";
import type { AppData, FitnessField, FitnessRecord } from "./types";

type TabKey =
  | "records"
  | "table"
  | "editor"
  | "analysis"
  | "transfer"
  | "docs";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "records", label: "資料列表" },
  { key: "table", label: "資料表編輯" },
  { key: "editor", label: "單筆編輯" },
  { key: "analysis", label: "雷達圖分析" },
  { key: "transfer", label: "匯入匯出" },
  { key: "docs", label: "規格說明" },
];

const scoreFields: FitnessField[] = [
  "item1",
  "item2",
  "item3",
  "item4",
  "item5",
  "item6",
];

function makeEmptyRecord(): FitnessRecord {
  return {
    id: crypto.randomUUID(),
    studentName: "",
    testDate: new Date().toISOString().slice(0, 10),
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

export default function App() {
  const [data, setData] = useState<AppData>(() => loadAppData() ?? defaultAppData);
  const [activeTab, setActiveTab] = useState<TabKey>("records");
  const [selectedId, setSelectedId] = useState<string>(data.records[0]?.id ?? "");
  const [draftRecord, setDraftRecord] = useState<FitnessRecord>(
    data.records[0] ?? makeEmptyRecord(),
  );
  const [searchText, setSearchText] = useState("");
  const [message, setMessage] = useState("已載入本機資料。");

  useEffect(() => {
    saveAppData(data);
  }, [data]);

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

  function startCreate(): void {
    const nextRecord = makeEmptyRecord();
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
    };

    const nextRecords = upsertRecord(data.records, normalized);
    setData((current) => ({ ...current, records: nextRecords }));
    setSelectedId(normalized.id);
    setDraftRecord(normalized);
    setActiveTab("records");
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
    setDraftRecord(nextRecords[0] ?? makeEmptyRecord());
    setMessage("資料已刪除。");
  }

  function addTableRow(): void {
    const nextRecord = makeEmptyRecord();
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
      setDraftRecord(nextRecords[0] ?? makeEmptyRecord());
    }

    setMessage("已從資料表移除一筆資料。");
  }

  function updateTableField(
    recordId: string,
    field: keyof FitnessRecord,
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
      setDraftRecord(imported.records[0] ?? makeEmptyRecord());
      setMessage("Excel 匯入成功，已採用內嵌系統資料。");
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : "Excel 匯入失敗。";
      setMessage(nextMessage);
    } finally {
      event.target.value = "";
    }
  }

  function handleExport(): void {
    exportWorkbook(data);
    setMessage("Excel 已匯出。");
  }

  function resetSampleData(): void {
    setData(defaultAppData);
    setSelectedId(defaultAppData.records[0]?.id ?? "");
    setDraftRecord(defaultAppData.records[0] ?? makeEmptyRecord());
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

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Fitness Test Tool</p>
          <h1>體適能測驗管理工具</h1>
          <p className="hero-copy">
            第一版以網頁為唯一正式編輯來源，Excel 僅用於檢視、備份、列印與攜帶。
          </p>
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

      <p className="status-banner">{message}</p>

      <main className="panel-grid">
        {activeTab === "records" ? (
          <>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>資料列表</h2>
                  <p>可搜尋學生並選取單筆資料。</p>
                </div>
                <input
                  className="search-input"
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="搜尋學生姓名"
                  value={searchText}
                />
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>學生姓名</th>
                      <th>測驗日期</th>
                      <th>{data.itemLabels[0]}</th>
                      <th>{data.itemLabels[1]}</th>
                      <th>{data.itemLabels[2]}</th>
                      <th>{data.itemLabels[3]}</th>
                      <th>{data.itemLabels[4]}</th>
                      <th>{data.itemLabels[5]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr
                        className={record.id === selectedId ? "is-selected" : ""}
                        key={record.id}
                        onClick={() => selectRecord(record)}
                      >
                        <td>{record.studentName}</td>
                        <td>{record.testDate}</td>
                        <td>{record.item1}</td>
                        <td>{record.item2}</td>
                        <td>{record.item3}</td>
                        <td>{record.item4}</td>
                        <td>{record.item5}</td>
                        <td>{record.item6}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel side-panel">
              <h2>目前選取</h2>
              {selectedRecord ? (
                <>
                  <dl className="detail-list">
                    <div>
                      <dt>學生姓名</dt>
                      <dd>{selectedRecord.studentName}</dd>
                    </div>
                    <div>
                      <dt>測驗日期</dt>
                      <dd>{selectedRecord.testDate}</dd>
                    </div>
                    <div>
                      <dt>評語</dt>
                      <dd>{selectedRecord.comment || "無"}</dd>
                    </div>
                  </dl>
                  <div className="button-row">
                    <button
                      className="primary-button"
                      onClick={() => {
                        setDraftRecord(selectedRecord);
                        setActiveTab("editor");
                      }}
                      type="button"
                    >
                      單筆編輯
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => setActiveTab("analysis")}
                      type="button"
                    >
                      查看雷達圖
                    </button>
                  </div>
                </>
              ) : (
                <p>尚未選取任何資料。</p>
              )}
            </section>
          </>
        ) : null}

        {activeTab === "table" ? (
          <>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>資料表編輯</h2>
                  <p>可直接逐格編輯所有學生資料，適合一次整理整班成績。</p>
                </div>
                <div className="button-row">
                  <button
                    className="primary-button"
                    onClick={addTableRow}
                    type="button"
                  >
                    新增列
                  </button>
                </div>
              </div>
              <div className="table-wrap">
                <table className="table-editor">
                  <thead>
                    <tr>
                      <th>選取</th>
                      <th>學生姓名</th>
                      <th>測驗日期</th>
                      <th>{data.itemLabels[0]}</th>
                      <th>{data.itemLabels[1]}</th>
                      <th>{data.itemLabels[2]}</th>
                      <th>{data.itemLabels[3]}</th>
                      <th>{data.itemLabels[4]}</th>
                      <th>{data.itemLabels[5]}</th>
                      <th>評語</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.records.map((record) => (
                      <tr
                        className={record.id === selectedId ? "is-selected" : ""}
                        key={record.id}
                      >
                        <td>
                          <button
                            className="row-action-button"
                            onClick={() => selectRecord(record)}
                            type="button"
                          >
                            {record.id === selectedId ? "已選" : "選取"}
                          </button>
                        </td>
                        <td>
                          <input
                            onChange={(event) =>
                              updateTableField(
                                record.id,
                                "studentName",
                                event.target.value,
                              )
                            }
                            value={record.studentName}
                          />
                        </td>
                        <td>
                          <input
                            onChange={(event) =>
                              updateTableField(
                                record.id,
                                "testDate",
                                event.target.value,
                              )
                            }
                            type="date"
                            value={record.testDate}
                          />
                        </td>
                        {scoreFields.map((field) => (
                          <td key={field}>
                            <input
                              min="0"
                              onChange={(event) =>
                                updateTableField(
                                  record.id,
                                  field,
                                  event.target.value,
                                )
                              }
                              step="1"
                              type="number"
                              value={record[field]}
                            />
                          </td>
                        ))}
                        <td>
                          <input
                            onChange={(event) =>
                              updateTableField(
                                record.id,
                                "comment",
                                event.target.value,
                              )
                            }
                            value={record.comment}
                          />
                        </td>
                        <td>
                          <button
                            className="row-delete-button"
                            onClick={() => deleteTableRow(record.id)}
                            type="button"
                          >
                            刪除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel side-panel">
              <h2>使用方式</h2>
              <ul className="plain-list">
                <li>每一格都可以直接修改，系統會立即存到本機。</li>
                <li>用「新增列」快速加入新的學生測驗資料。</li>
                <li>若要看單筆細節或雷達圖，可先按「選取」。</li>
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
                <label>
                  測驗日期
                  <input
                    onChange={(event) =>
                      updateDraftField("testDate", event.target.value)
                    }
                    type="date"
                    value={draftRecord.testDate}
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
                <li>若要快速修改整班資料，請使用資料表編輯頁。</li>
              </ul>
            </section>
          </>
        ) : null}

        {activeTab === "analysis" ? (
          <>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>雷達圖分析</h2>
                  <p>快速查看單一學生六項測驗分布。</p>
                </div>
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
                <p>請先從資料列表或資料表編輯頁選一筆資料。</p>
              )}
            </section>
          </>
        ) : null}

        {activeTab === "transfer" ? (
          <>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>匯入匯出</h2>
                  <p>Excel 主要用於檢視、備份、列印與跨電腦攜帶。</p>
                </div>
              </div>
              <div className="callout">
                匯出的 Excel 檔案主要用於檢視、備份與列印，不建議直接修改其中內容。若需修改資料，請回到網頁系統操作，以避免匯入失敗或資料不一致。
              </div>
              <div className="button-row">
                <button className="primary-button" onClick={handleExport} type="button">
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
              <h2>目前策略</h2>
              <ul className="plain-list">
                <li>可見工作表只提供閱讀。</li>
                <li>系統匯入時以隱藏 `_system` 工作表中的 JSON 為準。</li>
                <li>若檔案缺少 `_system`，匯入將失敗。</li>
              </ul>
            </section>
          </>
        ) : null}

        {activeTab === "docs" ? (
          <>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>規格文件</h2>
                  <p>目前規劃文件已放在專案資料夾內，供後續設計與開發使用。</p>
                </div>
              </div>
              <ul className="doc-list">
                <li>`docs/product-spec.md`</li>
                <li>`docs/excel-import-export.md`</li>
                <li>`docs/implementation-notes.md`</li>
              </ul>
            </section>
            <section className="panel side-panel">
              <h2>下一步建議</h2>
              <ul className="plain-list">
                <li>補上批次欄位套用功能。</li>
                <li>把六項測驗名稱做成可設定。</li>
                <li>加入歷次測驗紀錄與前後測比較。</li>
              </ul>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
