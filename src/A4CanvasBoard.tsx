import { useEffect, useRef } from "react";

const CANVAS_WIDTH = 1240;
const CANVAS_HEIGHT = 1754;

type Point = {
  x: number;
  y: number;
};

function getCanvasPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): Point {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

export default function A4CanvasBoard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#172033";
    context.lineWidth = 4;
  }, []);

  function startDrawing(clientX: number, clientY: number): void {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    drawingRef.current = true;
    lastPointRef.current = getCanvasPoint(canvas, clientX, clientY);
  }

  function drawTo(clientX: number, clientY: number): void {
    if (!drawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const lastPoint = lastPointRef.current;
    if (!canvas || !context || !lastPoint) {
      return;
    }

    const nextPoint = getCanvasPoint(canvas, clientX, clientY);
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(nextPoint.x, nextPoint.y);
    context.stroke();
    lastPointRef.current = nextPoint;
  }

  function stopDrawing(): void {
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  function clearCanvas(): void {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  function exportCanvasPdf(): void {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const imageUrl = canvas.toDataURL("image/png");
    const exportWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!exportWindow) {
      return;
    }

    exportWindow.document.write(`
      <!doctype html>
      <html lang="zh-Hant">
        <head>
          <meta charset="UTF-8" />
          <title>A4 Canvas Export</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            html, body {
              margin: 0;
              padding: 0;
              background: #e5e7eb;
            }
            .page {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              background: #fff;
              display: flex;
              align-items: stretch;
              justify-content: center;
            }
            img {
              width: 210mm;
              height: 297mm;
              object-fit: contain;
              display: block;
            }
            @media print {
              html, body {
                background: #fff;
              }
            }
          </style>
        </head>
        <body>
          <main class="page">
            <img src="${imageUrl}" alt="A4 canvas export" />
          </main>
          <script>
            window.addEventListener("load", () => {
              window.print();
            });
          </script>
        </body>
      </html>
    `);
    exportWindow.document.close();
  }

  return (
    <div className="canvas-board">
      <div className="button-row">
        <button className="secondary-button" onClick={clearCanvas} type="button">
          清空畫布
        </button>
        <button className="primary-button" onClick={exportCanvasPdf} type="button">
          輸出成 PDF
        </button>
      </div>

      <div className="canvas-stage">
        <canvas
          className="a4-canvas"
          height={CANVAS_HEIGHT}
          onMouseDown={(event) => startDrawing(event.clientX, event.clientY)}
          onMouseLeave={stopDrawing}
          onMouseMove={(event) => drawTo(event.clientX, event.clientY)}
          onMouseUp={stopDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={(event) => {
            const touch = event.touches[0];
            if (!touch) {
              return;
            }

            event.preventDefault();
            drawTo(touch.clientX, touch.clientY);
          }}
          onTouchStart={(event) => {
            const touch = event.touches[0];
            if (!touch) {
              return;
            }

            event.preventDefault();
            startDrawing(touch.clientX, touch.clientY);
          }}
          ref={canvasRef}
          width={CANVAS_WIDTH}
        />
      </div>
    </div>
  );
}
