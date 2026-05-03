import { toPng } from "html-to-image"
import { jsPDF } from "jspdf"

export async function captureElementToPngDataUrl(node: HTMLElement): Promise<string> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

  return toPng(node, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    cacheBust: true,
    filter: (n) => {
      if (!(n instanceof HTMLElement)) return true
      return !n.hasAttribute("data-chart-export-exclude")
    },
  })
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a")
  a.href = dataUrl
  a.download = filename
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export async function downloadChartPdf(node: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await captureElementToPngDataUrl(node)
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error("Chart export: failed to load PNG for PDF"))
    img.src = dataUrl
  })

  const w = img.naturalWidth
  const h = img.naturalHeight
  const orientation = w >= h ? "landscape" : "portrait"
  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: [w, h],
    hotfixes: ["px_scaling"],
  })
  pdf.addImage(dataUrl, "PNG", 0, 0, w, h, undefined, "FAST")
  pdf.save(filename)
}
