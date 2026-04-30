import { useState } from "react";
import {
  defaultDebugSettings,
  loadDebugSettings,
  normalizeDebugSettings,
  resetDebugSettings,
  saveDebugSettings,
  type DebugSettings,
} from "./debug-settings";

type DraftSettings = {
  sheetVisibleRows: string;
  sheetScrollRightPadding: string;
  summaryFrozenColumnWidth: string;
  showSheetDebug: boolean;
};

function toDraft(settings: DebugSettings): DraftSettings {
  return {
    sheetVisibleRows: String(settings.sheetVisibleRows),
    sheetScrollRightPadding: String(settings.sheetScrollRightPadding),
    summaryFrozenColumnWidth: String(settings.summaryFrozenColumnWidth),
    showSheetDebug: settings.showSheetDebug,
  };
}

export default function DebugPage() {
  const initialSettings = loadDebugSettings();
  const [draft, setDraft] = useState<DraftSettings>(() => toDraft(initialSettings));
  const [message, setMessage] = useState("目前顯示的是已儲存在瀏覽器裡的 debug 設定。");

  function saveDraftSettings(): void {
    const nextSettings = normalizeDebugSettings({
      sheetVisibleRows: draft.sheetVisibleRows,
      sheetScrollRightPadding: draft.sheetScrollRightPadding,
      summaryFrozenColumnWidth: draft.summaryFrozenColumnWidth,
      showSheetDebug: draft.showSheetDebug,
    });
    saveDebugSettings(nextSettings);
    setDraft(toDraft(nextSettings));
    setMessage("設定已儲存。回到主頁後重新聚焦頁面，就會重新讀取這些參數。");
  }

  function restoreDefaults(): void {
    resetDebugSettings();
    setDraft(toDraft(defaultDebugSettings));
    setMessage("已恢復預設值。");
  }

  return (
    <div className="debug-shell">
      <header className="debug-hero">
        <div>
          <p className="eyebrow">Debug</p>
          <h1>體適能工具除錯頁</h1>
          <p className="hero-copy">
            這個頁面用來調整試算表相關參數，儲存在目前瀏覽器的 localStorage。
          </p>
        </div>
        <a className="secondary-button debug-link" href="../">
          回主頁
        </a>
      </header>

      <main className="debug-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>試算表參數</h2>
              <p>先從顯示筆數、凍結欄寬和右側拖移補正開始。</p>
            </div>
          </div>

          <div className="form-grid">
            <label>
              顯示筆數
              <input
                min="4"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    sheetVisibleRows: event.target.value,
                  }))
                }
                type="number"
                value={draft.sheetVisibleRows}
              />
            </label>

            <label>
              凍結欄寬度
              <input
                min="80"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    summaryFrozenColumnWidth: event.target.value,
                  }))
                }
                type="number"
                value={draft.summaryFrozenColumnWidth}
              />
            </label>

            <label>
              右側拖移補正
              <input
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    sheetScrollRightPadding: event.target.value,
                  }))
                }
                type="number"
                value={draft.sheetScrollRightPadding}
              />
            </label>

            <label className="debug-checkbox">
              <span>顯示 debug 數值</span>
              <input
                checked={draft.showSheetDebug}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    showSheetDebug: event.target.checked,
                  }))
                }
                type="checkbox"
              />
            </label>
          </div>

          <div className="button-row">
            <button className="primary-button" onClick={saveDraftSettings} type="button">
              儲存設定
            </button>
            <button className="secondary-button" onClick={restoreDefaults} type="button">
              恢復預設
            </button>
          </div>

          <p className="debug-message">{message}</p>
        </section>

        <section className="panel">
          <h2>目前設定</h2>
          <dl className="detail-list">
            <div>
              <dt>顯示筆數</dt>
              <dd>{draft.sheetVisibleRows}</dd>
            </div>
            <div>
              <dt>凍結欄寬度</dt>
              <dd>{draft.summaryFrozenColumnWidth}px</dd>
            </div>
            <div>
              <dt>右側拖移補正</dt>
              <dd>{draft.sheetScrollRightPadding}px</dd>
            </div>
            <div>
              <dt>顯示 debug 數值</dt>
              <dd>{draft.showSheetDebug ? "開啟" : "關閉"}</dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
