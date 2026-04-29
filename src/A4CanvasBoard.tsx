import { jsPDF } from "jspdf";
import { useEffect, useRef, useState } from "react";
import type { FitnessRecord } from "./types";

const CANVAS_WIDTH = 1240;
const CANVAS_HEIGHT = 1754;

type CanvasTextBlock = {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: "normal" | "bold";
};

type CanvasImageBlock = {
  id: string;
  name: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type A4CanvasBoardProps = {
  labels: string[];
  record: FitnessRecord | null;
  rosterName: string;
  testDate: string;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("圖片載入失敗。"));
    image.src = src;
  });
}

function getRadarPolygonPoints(
  values: number[],
  centerX: number,
  centerY: number,
  radius: number,
): Array<{ x: number; y: number }> {
  return values.map((value, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length;
    const normalized = Math.max(0, Math.min(1, value / 20));

    return {
      x: centerX + Math.cos(angle) * radius * normalized,
      y: centerY + Math.sin(angle) * radius * normalized,
    };
  });
}

export default function A4CanvasBoard({
  labels,
  record,
  rosterName,
  testDate,
}: A4CanvasBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [title, setTitle] = useState("A4 版面測試");
  const [textBlocks, setTextBlocks] = useState<CanvasTextBlock[]>([
    {
      id: crypto.randomUUID(),
      content: "這裡可以放標題或說明文字",
      x: 120,
      y: 180,
      fontSize: 42,
      color: "#172033",
      fontWeight: "bold",
    },
    {
      id: crypto.randomUUID(),
      content: "下一步可以在這裡放入雷達圖、班級資訊或評量摘要。",
      x: 120,
      y: 260,
      fontSize: 24,
      color: "#475569",
      fontWeight: "normal",
    },
  ]);
  const [imageBlocks, setImageBlocks] = useState<CanvasImageBlock[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const selectedText =
    textBlocks.find((block) => block.id === selectedTextId) ?? null;
  const selectedImage =
    imageBlocks.find((block) => block.id === selectedImageId) ?? null;

  async function drawCanvas(): Promise<void> {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "#e2e8f0";
    context.lineWidth = 2;
    context.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

    context.fillStyle = "#94a3b8";
    context.font = "600 18px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    context.textAlign = "right";
    context.fillText(title, canvas.width - 80, 90);

    context.textAlign = "left";
    context.fillStyle = "#172033";
    context.font = "700 34px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    context.fillText(rosterName || "未設定班級", 90, 88);
    context.font = "500 22px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    context.fillStyle = "#475569";
    context.fillText(`測驗日期：${testDate || "未設定"}`, 92, 126);

    const chartCenterX = 620;
    const chartCenterY = 820;
    const chartRadius = 280;
    const values = record
      ? [
          record.item1,
          record.item2,
          record.item3,
          record.item4,
          record.item5,
          record.item6,
        ]
      : [0, 0, 0, 0, 0, 0];

    for (let ring = 1; ring <= 5; ring += 1) {
      const currentRadius = (chartRadius / 5) * ring;
      context.beginPath();
      labels.forEach((_, index) => {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / labels.length;
        const x = chartCenterX + Math.cos(angle) * currentRadius;
        const y = chartCenterY + Math.sin(angle) * currentRadius;

        if (index === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      });
      context.closePath();
      context.strokeStyle = ring % 2 === 0 ? "#dbe4ee" : "#eef2f7";
      context.lineWidth = 2;
      context.stroke();
    }

    labels.forEach((label, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / labels.length;
      const axisX = chartCenterX + Math.cos(angle) * chartRadius;
      const axisY = chartCenterY + Math.sin(angle) * chartRadius;

      context.beginPath();
      context.moveTo(chartCenterX, chartCenterY);
      context.lineTo(axisX, axisY);
      context.strokeStyle = "#cbd5e1";
      context.lineWidth = 2;
      context.stroke();

      const labelX = chartCenterX + Math.cos(angle) * (chartRadius + 56);
      const labelY = chartCenterY + Math.sin(angle) * (chartRadius + 56);
      context.fillStyle = "#0f172a";
      context.font = "600 24px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(label, labelX, labelY);
    });

    const polygonPoints = getRadarPolygonPoints(
      values,
      chartCenterX,
      chartCenterY,
      chartRadius,
    );
    context.beginPath();
    polygonPoints.forEach((point, index) => {
      if (index === 0) {
        context.moveTo(point.x, point.y);
      } else {
        context.lineTo(point.x, point.y);
      }
    });
    context.closePath();
    context.fillStyle = "rgba(15, 118, 110, 0.24)";
    context.strokeStyle = "#0f766e";
    context.lineWidth = 5;
    context.fill();
    context.stroke();

    polygonPoints.forEach((point) => {
      context.beginPath();
      context.arc(point.x, point.y, 8, 0, Math.PI * 2);
      context.fillStyle = "#0f766e";
      context.fill();
    });

    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillStyle = "#172033";
    context.font = "700 32px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    context.fillText(record?.studentName || "尚未選擇學生", 92, 1410);
    context.font = "24px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    context.fillStyle = "#475569";
    context.fillText(`身高：${record?.height || "—"} cm`, 92, 1460);
    context.fillText(`體重：${record?.weight || "—"} kg`, 92, 1500);
    context.fillText(`評語：${record?.comment || "—"}`, 92, 1560);

    for (const imageBlock of imageBlocks) {
      try {
        const image = await loadImage(imageBlock.src);
        context.drawImage(
          image,
          imageBlock.x,
          imageBlock.y,
          imageBlock.width,
          imageBlock.height,
        );
      } catch {
        context.fillStyle = "#fecaca";
        context.fillRect(
          imageBlock.x,
          imageBlock.y,
          imageBlock.width,
          imageBlock.height,
        );
      }
    }

    for (const block of textBlocks) {
      context.textAlign = "left";
      context.textBaseline = "top";
      context.fillStyle = block.color;
      context.font = `${block.fontWeight} ${block.fontSize}px "Noto Sans TC", "Microsoft JhengHei", sans-serif`;

      const lines = block.content.split("\n");
      lines.forEach((line, index) => {
        context.fillText(line || " ", block.x, block.y + index * (block.fontSize + 10));
      });
    }
  }

  useEffect(() => {
    void drawCanvas();
  }, [title, textBlocks, imageBlocks, labels, record, rosterName, testDate]);

  function addTextBlock(): void {
    const nextBlock: CanvasTextBlock = {
      id: crypto.randomUUID(),
      content: "新的文字區塊",
      x: 120,
      y: 360,
      fontSize: 28,
      color: "#172033",
      fontWeight: "normal",
    };
    setTextBlocks((current) => [...current, nextBlock]);
    setSelectedTextId(nextBlock.id);
    setSelectedImageId(null);
  }

  function updateSelectedText(
    field: keyof Omit<CanvasTextBlock, "id">,
    value: string,
  ): void {
    if (!selectedTextId) {
      return;
    }

    setTextBlocks((current) =>
      current.map((block) => {
        if (block.id !== selectedTextId) {
          return block;
        }

        if (field === "x" || field === "y" || field === "fontSize") {
          return { ...block, [field]: Number(value) || 0 };
        }

        if (field === "fontWeight") {
          return {
            ...block,
            fontWeight: value === "bold" ? "bold" : "normal",
          };
        }

        return { ...block, [field]: value };
      }),
    );
  }

  function updateSelectedImage(
    field: keyof Omit<CanvasImageBlock, "id" | "name" | "src">,
    value: string,
  ): void {
    if (!selectedImageId) {
      return;
    }

    setImageBlocks((current) =>
      current.map((block) =>
        block.id === selectedImageId
          ? {
              ...block,
              [field]: Number(value) || 0,
            }
          : block,
      ),
    );
  }

  function removeSelectedText(): void {
    if (!selectedTextId) {
      return;
    }

    setTextBlocks((current) =>
      current.filter((block) => block.id !== selectedTextId),
    );
    setSelectedTextId(null);
  }

  function removeSelectedImage(): void {
    if (!selectedImageId) {
      return;
    }

    setImageBlocks((current) =>
      current.filter((block) => block.id !== selectedImageId),
    );
    setSelectedImageId(null);
  }

  async function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : "";
      if (!src) {
        return;
      }

      const nextBlock: CanvasImageBlock = {
        id: crypto.randomUUID(),
        name: file.name,
        src,
        x: 120,
        y: 440,
        width: 360,
        height: 240,
      };
      setImageBlocks((current) => [...current, nextBlock]);
      setSelectedImageId(nextBlock.id);
      setSelectedTextId(null);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function exportCanvasPdf(): Promise<void> {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    await drawCanvas();
    const imageUrl = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    pdf.addImage(imageUrl, "PNG", 0, 0, 210, 297, undefined, "FAST");
    pdf.save("a4-canvas-export.pdf");
  }

  return (
    <div className="canvas-board">
      <div className="canvas-tool-grid">
        <section className="canvas-tools">
          <div className="canvas-tool-card">
            <label className="metric-label-editor">
              版面標題
              <input
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
            </label>
          </div>

          <div className="canvas-tool-card">
            <div className="button-row">
              <button className="secondary-button" onClick={addTextBlock} type="button">
                新增文字
              </button>
              <label className="file-button">
                上傳圖片
                <input accept="image/*" onChange={handleImageUpload} type="file" />
              </label>
              <button className="primary-button" onClick={exportCanvasPdf} type="button">
                下載 PDF
              </button>
            </div>
          </div>

          <div className="canvas-tool-card">
            <h3>文字圖層</h3>
            <div className="layer-list">
              {textBlocks.map((block, index) => (
                <button
                  className={block.id === selectedTextId ? "layer-item is-active" : "layer-item"}
                  key={block.id}
                  onClick={() => {
                    setSelectedTextId(block.id);
                    setSelectedImageId(null);
                  }}
                  type="button"
                >
                  <span>文字 {index + 1}</span>
                  <small>{block.content.slice(0, 14) || "空白文字"}</small>
                </button>
              ))}
            </div>

            {selectedText ? (
              <div className="canvas-form-grid">
                <label>
                  內容
                  <textarea
                    onChange={(event) =>
                      updateSelectedText("content", event.target.value)
                    }
                    rows={4}
                    value={selectedText.content}
                  />
                </label>
                <label>
                  X
                  <input
                    onChange={(event) => updateSelectedText("x", event.target.value)}
                    type="number"
                    value={selectedText.x}
                  />
                </label>
                <label>
                  Y
                  <input
                    onChange={(event) => updateSelectedText("y", event.target.value)}
                    type="number"
                    value={selectedText.y}
                  />
                </label>
                <label>
                  字級
                  <input
                    onChange={(event) =>
                      updateSelectedText("fontSize", event.target.value)
                    }
                    type="number"
                    value={selectedText.fontSize}
                  />
                </label>
                <label>
                  顏色
                  <input
                    onChange={(event) => updateSelectedText("color", event.target.value)}
                    type="color"
                    value={selectedText.color}
                  />
                </label>
                <label>
                  字重
                  <select
                    onChange={(event) =>
                      updateSelectedText("fontWeight", event.target.value)
                    }
                    value={selectedText.fontWeight}
                  >
                    <option value="normal">一般</option>
                    <option value="bold">粗體</option>
                  </select>
                </label>
                <button
                  className="danger-button"
                  onClick={removeSelectedText}
                  type="button"
                >
                  刪除這段文字
                </button>
              </div>
            ) : null}
          </div>

          <div className="canvas-tool-card">
            <h3>圖片圖層</h3>
            <div className="layer-list">
              {imageBlocks.map((block, index) => (
                <button
                  className={block.id === selectedImageId ? "layer-item is-active" : "layer-item"}
                  key={block.id}
                  onClick={() => {
                    setSelectedImageId(block.id);
                    setSelectedTextId(null);
                  }}
                  type="button"
                >
                  <span>圖片 {index + 1}</span>
                  <small>{block.name}</small>
                </button>
              ))}
            </div>

            {selectedImage ? (
              <div className="canvas-form-grid">
                <label>
                  X
                  <input
                    onChange={(event) => updateSelectedImage("x", event.target.value)}
                    type="number"
                    value={selectedImage.x}
                  />
                </label>
                <label>
                  Y
                  <input
                    onChange={(event) => updateSelectedImage("y", event.target.value)}
                    type="number"
                    value={selectedImage.y}
                  />
                </label>
                <label>
                  寬度
                  <input
                    onChange={(event) =>
                      updateSelectedImage("width", event.target.value)
                    }
                    type="number"
                    value={selectedImage.width}
                  />
                </label>
                <label>
                  高度
                  <input
                    onChange={(event) =>
                      updateSelectedImage("height", event.target.value)
                    }
                    type="number"
                    value={selectedImage.height}
                  />
                </label>
                <button
                  className="danger-button"
                  onClick={removeSelectedImage}
                  type="button"
                >
                  刪除這張圖片
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <div className="canvas-stage">
          <canvas
            className="a4-canvas"
            height={CANVAS_HEIGHT}
            ref={canvasRef}
            width={CANVAS_WIDTH}
          />
        </div>
      </div>
    </div>
  );
}
