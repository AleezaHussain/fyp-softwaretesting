import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface CapturedChartImage {
  imageData: string; // data:image/png;base64,...
  width: number;
  height: number;
}

export interface SimulationPDFData {
  simulation: {
    id: number;
    name: string;
    description?: string;
    simulation_type: string;
    created_at: string;
    status: string;
  };
  result: {
    energy_consumed_kwh: number;
    cooling_efficiency: number;
    cost_saving_percent: number;
    runtime_minutes: number;
    completed_at?: string;
    result_data: any;
    recommendation?: string;
  };
  // Optional captured chart images for embedding in PDF
  capturedCharts?: Record<string, CapturedChartImage>;
}

// RGB tuples
type RGB = [number, number, number];
const PRIMARY: RGB = [5, 165, 233];
const ACCENT: RGB = [92, 225, 229];
const DARK: RGB = [26, 31, 58];
const MID: RGB = [63, 74, 104];
const LIGHT: RGB = [241, 245, 249];
const WHITE: RGB = [255, 255, 255];
const GREEN: RGB = [16, 185, 129];
const RED: RGB = [239, 68, 68];
const YELLOW: RGB = [245, 158, 11];

// jsPDF v4 requires separate r,g,b args — no spread
const fc = (doc: jsPDF, c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
const tc = (doc: jsPDF, c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
const dc = (doc: jsPDF, c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);

function fmt(v: any, decimals = 2): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return v.toFixed(decimals);
  return String(v);
}

function addPageNumbers(doc: jsPDF) {
  const total = (doc.internal as any).getNumberOfPages?.() ?? 1;
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    tc(doc, MID);
    doc.text(`Page ${i} of ${total}`, pw / 2, ph - 6, { align: "center" });
  }
}

function sectionHeader(doc: jsPDF, title: string, y: number): number {
  const pw = doc.internal.pageSize.getWidth();
  fc(doc, DARK);
  doc.rect(14, y, pw - 28, 8, "F");
  fc(doc, ACCENT);
  doc.rect(14, y, 3, 8, "F");
  doc.setFontSize(10);
  tc(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.text(title, 20, y + 5.5);
  doc.setFont("helvetica", "normal");
  return y + 12;
}

function kpiRow(
  doc: jsPDF,
  y: number,
  kpis: { label: string; value: string; unit?: string; color: RGB }[],
): number {
  const pw = doc.internal.pageSize.getWidth();
  const cw = (pw - 28 - (kpis.length - 1) * 3) / kpis.length;
  kpis.forEach((k, i) => {
    const cx = 14 + i * (cw + 3);
    fc(doc, LIGHT);
    doc.roundedRect(cx, y, cw, 18, 2, 2, "F");
    fc(doc, k.color);
    doc.roundedRect(cx, y, 3, 18, 1, 1, "F");
    doc.setFontSize(7);
    tc(doc, MID);
    doc.text(k.label, cx + 5, y + 5);
    doc.setFontSize(10);
    tc(doc, DARK);
    doc.setFont("helvetica", "bold");
    doc.text(k.value, cx + 5, y + 13);
    doc.setFont("helvetica", "normal");
    if (k.unit) {
      doc.setFontSize(7);
      tc(doc, MID);
      doc.text(k.unit, cx + 5 + doc.getTextWidth(k.value) + 1, y + 13);
    }
  });
  return y + 22;
}

function addColumnLegend(doc: jsPDF, y: number, columns: { key: string; description: string }[]): number {
  const pw = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pw - marginLeft - marginRight;
  
  // Legend header
  doc.setFontSize(7);
  tc(doc, MID);
  doc.setFont("helvetica", "bold");
  doc.text("Column Reference:", marginLeft, y);
  
  y += 3.5;
  doc.setFont("helvetica", "normal");
  tc(doc, DARK);
  
  // Columns in 2-column layout for space efficiency
  const colsPerRow = 2;
  const colWidth = (contentWidth - 5) / colsPerRow;
  
  columns.forEach((col, idx) => {
    const row = Math.floor(idx / colsPerRow);
    const col_idx = idx % colsPerRow;
    const xPos = marginLeft + col_idx * (colWidth + 5);
    const yPos = y + row * 4;
    
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text(col.key + ":", xPos, yPos);
    
    doc.setFont("helvetica", "normal");
    const descWidth = colWidth - 2;
    const lines = doc.splitTextToSize(col.description, descWidth);
    doc.text(lines, xPos + 20, yPos);
  });
  
  const totalRows = Math.ceil(columns.length / colsPerRow);
  return y + totalRows * 4 + 4;
}

function ensureSpace(doc: jsPDF, y: number, required: number, top = 20): number {
  const ph = doc.internal.pageSize.getHeight();
  if (y + required > ph - 16) {
    doc.addPage();
    return top;
  }
  return y;
}

function addWrappedTextBlock(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  fontSize = 9,
  lineHeight = 4.4,
  color: RGB = DARK,
): number {
  doc.setFontSize(fontSize);
  tc(doc, color);
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

type SnapshotSeries = {
  name: string;
  values: number[];
  color: RGB;
};

/**
 * Embed a captured chart image in the PDF
 * If chart image is provided, embed it. Otherwise fall back to drawing approximation.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
/**
 * Renders a line chart snapshot in the PDF
 * Currently unused but kept for potential future chart visualization features
 */
function renderLineSnapshot(
  doc: jsPDF,
  title: string,
  subtitle: string,
  xAxisLabel: string,
  yAxisLabel: string,
  labels: string[],
  series: SnapshotSeries[],
  y: number,
  capturedImage?: CapturedChartImage,
): number {
  const pw = doc.internal.pageSize.getWidth();
  const chartX = 14;
  const chartW = pw - 28;
  const chartH = capturedImage ? 70 : 56; // Extra height for captured images
  y = ensureSpace(doc, y, chartH + 56);

  // Render title and subtitle
  doc.setFontSize(10);
  tc(doc, DARK);
  doc.setFont("helvetica", "bold");
  doc.text(title, chartX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  tc(doc, MID);
  const subtitleLines = doc.splitTextToSize(subtitle, chartW);
  doc.text(subtitleLines, chartX, y + 4);

  const plotY = y + 10;
  const plotH = chartH;

  // If captured image available, embed it
  if (capturedImage && capturedImage.imageData) {
    try {
      fc(doc, WHITE);
      doc.roundedRect(chartX, plotY, chartW, plotH, 2, 2, "F");
      dc(doc, MID);
      doc.setLineWidth(0.2);
      doc.roundedRect(chartX, plotY, chartW, plotH, 2, 2, "S");

      // Calculate scaling to fit within bounds
      const maxWidth = chartW - 4;
      const maxHeight = plotH - 4;
      let imgWidth = maxWidth;
      let imgHeight = (maxWidth * capturedImage.height) / capturedImage.width;

      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = (maxHeight * capturedImage.width) / capturedImage.height;
      }

      // Center the image
      const offsetX = chartX + (chartW - imgWidth) / 2;
      const offsetY = plotY + (plotH - imgHeight) / 2;

      // Embed the image
      doc.addImage(
        capturedImage.imageData,
        "PNG",
        offsetX,
        offsetY,
        imgWidth,
        imgHeight
      );

      // Add axis labels below the image
      doc.setFontSize(7);
      tc(doc, MID);
      doc.text(`X: ${xAxisLabel}`, chartX, plotY + plotH + 6.3);
      doc.text(`Y: ${yAxisLabel}`, chartX + chartW - 2, plotY + plotH + 6.3, { align: "right" });

      // Add value table below
      const summaryRows = series.map((item) => {
        const seriesValues = item.values.filter((value) => Number.isFinite(value));
        const first = seriesValues[0] ?? 0;
        const last = seriesValues[seriesValues.length - 1] ?? 0;
        const minValue = seriesValues.length > 0 ? Math.min(...seriesValues) : 0;
        const maxValue = seriesValues.length > 0 ? Math.max(...seriesValues) : 0;
        const average = seriesValues.length > 0 ? seriesValues.reduce((sum, value) => sum + value, 0) / seriesValues.length : 0;
        return [
          item.name,
          first.toFixed(2),
          last.toFixed(2),
          minValue.toFixed(2),
          maxValue.toFixed(2),
          average.toFixed(2),
        ];
      });

      autoTable(doc, {
        startY: plotY + plotH + 10,
        head: [["Series", "First", "Last", "Min", "Max", "Avg"]],
        body: summaryRows,
        theme: "grid",
        margin: { left: chartX, right: 14 },
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
        alternateRowStyles: { fillColor: LIGHT },
      });

      return (doc as any).lastAutoTable.finalY + 6;
    } catch (error) {
      console.warn("Failed to embed captured chart image, falling back to approximation", error);
      // Fall through to approximation rendering below
    }
  }

  // ─── Fallback: Draw approximation (original logic) ────────────────────────
  fc(doc, WHITE);
  doc.roundedRect(chartX, plotY, chartW, plotH, 2, 2, "F");
  dc(doc, MID);
  doc.setLineWidth(0.2);
  doc.roundedRect(chartX, plotY, chartW, plotH, 2, 2, "S");

  const values = series.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 1;
  const range = Math.max(max - min, 0.001);
  const leftPad = 12;
  const rightPad = 12;
  const topPad = 6;
  const bottomPad = 10;
  const plotLeft = chartX + leftPad;
  const plotTop = plotY + topPad;
  const plotWidth = chartW - leftPad - rightPad;
  const plotHeight = plotH - topPad - bottomPad;

  // ─── Draw prominent axes ────────────────────────────────────────
  dc(doc, DARK);
  doc.setLineWidth(0.8); // Thick axis lines
  // Y-axis (vertical)
  doc.line(plotLeft, plotTop, plotLeft, plotTop + plotHeight);
  // X-axis (horizontal)
  doc.line(plotLeft, plotTop + plotHeight, plotLeft + plotWidth, plotTop + plotHeight);

  // ─── Y-axis ticks and values ────────────────────────────────────
  const tickCount = 4;
  for (let i = 0; i <= tickCount; i++) {
    const ratio = i / tickCount;
    const tickY = plotTop + plotHeight - ratio * plotHeight;
    const tickValue = min + ratio * range;
    
    // Draw tick mark on Y-axis
    dc(doc, DARK);
    doc.setLineWidth(0.5);
    doc.line(plotLeft - 1.5, tickY, plotLeft, tickY);
    
    // Y-axis value label
    tc(doc, DARK);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(tickValue.toFixed(2), chartX - 1, tickY + 1.2, { align: "right" });
  }

  // ─── X-axis ticks ──────────────────────────────────────────────
  const maxLen = Math.max(...series.map((s) => s.values.length), 0);
  if (maxLen > 1) {
    const xTicks = [0, Math.floor((maxLen - 1) / 2), maxLen - 1];
    xTicks.forEach((tickIndex) => {
      const ratio = tickIndex / Math.max(maxLen - 1, 1);
      const tickX = plotLeft + ratio * plotWidth;
      
      // Draw tick mark on X-axis
      dc(doc, DARK);
      doc.setLineWidth(0.5);
      doc.line(tickX, plotTop + plotHeight, tickX, plotTop + plotHeight + 1.5);
      
      // X-axis label
      tc(doc, DARK);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(labels[tickIndex] ?? String(tickIndex + 1), tickX, plotTop + plotHeight + 4, { align: "center" });
    });
  }

  // ─── Draw data lines ───────────────────────────────────────────
  series.forEach((item) => {
    if (!item.values || item.values.length < 2) return;
    dc(doc, item.color);
    doc.setLineWidth(1.2); // Thicker data lines
    for (let i = 1; i < item.values.length; i++) {
      const x1 = plotLeft + ((i - 1) / Math.max(item.values.length - 1, 1)) * plotWidth;
      const y1 = plotTop + plotHeight - ((item.values[i - 1] - min) / range) * plotHeight;
      const x2 = plotLeft + (i / Math.max(item.values.length - 1, 1)) * plotWidth;
      const y2 = plotTop + plotHeight - ((item.values[i] - min) / range) * plotHeight;
      doc.line(x1, y1, x2, y2);
    }
  });

  // ─── Legend ─────────────────────────────────────────────────────
  let legendX = plotLeft + 2;
  const legendY = plotY + plotH - 2;
  series.slice(0, 4).forEach((item) => {
    fc(doc, item.color);
    doc.roundedRect(legendX, legendY - 3, 3, 3, 1, 1, "F");
    doc.setFontSize(6);
    tc(doc, DARK);
    doc.setFont("helvetica", "normal");
    doc.text(item.name, legendX + 4, legendY - 0.5);
    legendX += Math.min(32, doc.getTextWidth(item.name) + 12);
  });

  // ─── Axis labels below chart ────────────────────────────────────
  doc.setFontSize(8);
  tc(doc, DARK);
  doc.setFont("helvetica", "bold");
  doc.text(`X-Axis: ${xAxisLabel}`, chartX, plotY + plotH + 6.3);
  doc.text(`Y-Axis: ${yAxisLabel}`, chartX + chartW - 2, plotY + plotH + 6.3, { align: "right" });
  doc.setFont("helvetica", "normal");

  const summaryRows = series.map((item) => {
    const seriesValues = item.values.filter((value) => Number.isFinite(value));
    const first = seriesValues[0] ?? 0;
    const last = seriesValues[seriesValues.length - 1] ?? 0;
    const minValue = seriesValues.length > 0 ? Math.min(...seriesValues) : 0;
    const maxValue = seriesValues.length > 0 ? Math.max(...seriesValues) : 0;
    const average = seriesValues.length > 0 ? seriesValues.reduce((sum, value) => sum + value, 0) / seriesValues.length : 0;
    return [
      item.name,
      first.toFixed(2),
      last.toFixed(2),
      minValue.toFixed(2),
      maxValue.toFixed(2),
      average.toFixed(2),
    ];
  });

  autoTable(doc, {
    startY: plotY + plotH + 10,
    head: [["Series", "First", "Last", "Min", "Max", "Avg"]],
    body: summaryRows,
    theme: "grid",
    margin: { left: chartX, right: 14 },
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
    alternateRowStyles: { fillColor: LIGHT },
  });

  return (doc as any).lastAutoTable.finalY + 6;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
/**
 * Renders a bar chart snapshot in the PDF
 * Currently unused but kept for potential future chart visualization features
 */
function renderBarSnapshot(
  doc: jsPDF,
  title: string,
  subtitle: string,
  labels: string[],
  values: number[],
  color: RGB,
  y: number,
  capturedImage?: CapturedChartImage,
): number {
  const pw = doc.internal.pageSize.getWidth();
  const chartX = 14;
  const chartW = pw - 28;
  const chartH = capturedImage ? 70 : 48; // Extra height for captured images
  y = ensureSpace(doc, y, chartH + 34);

  // Render title and subtitle
  doc.setFontSize(10);
  tc(doc, DARK);
  doc.setFont("helvetica", "bold");
  doc.text(title, chartX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  tc(doc, MID);
  const subtitleLines = doc.splitTextToSize(subtitle, chartW);
  doc.text(subtitleLines, chartX, y + 4);

  const plotY = y + 10;

  // If captured image available, embed it
  if (capturedImage && capturedImage.imageData) {
    try {
      fc(doc, WHITE);
      doc.roundedRect(chartX, plotY, chartW, chartH, 2, 2, "F");
      dc(doc, MID);
      doc.setLineWidth(0.2);
      doc.roundedRect(chartX, plotY, chartW, chartH, 2, 2, "S");

      // Calculate scaling to fit within bounds
      const maxWidth = chartW - 4;
      const maxHeight = chartH - 4;
      let imgWidth = maxWidth;
      let imgHeight = (maxWidth * capturedImage.height) / capturedImage.width;

      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = (maxHeight * capturedImage.width) / capturedImage.height;
      }

      // Center the image
      const offsetX = chartX + (chartW - imgWidth) / 2;
      const offsetY = plotY + (chartH - imgHeight) / 2;

      // Embed the image
      doc.addImage(
        capturedImage.imageData,
        "PNG",
        offsetX,
        offsetY,
        imgWidth,
        imgHeight
      );

      // Add axis labels
      doc.setFontSize(7);
      tc(doc, MID);
      doc.text("X: Category", chartX, plotY + chartH + 4.4);
      doc.text("Y: Value", chartX + chartW - 2, plotY + chartH + 4.4, { align: "right" });

      // Add value table below
      autoTable(doc, {
        startY: plotY + chartH + 6,
        head: [["Label", "Value"]],
        body: labels.map((label, index) => [label, Number(values[index] ?? 0).toFixed(2)]),
        theme: "grid",
        margin: { left: chartX, right: 14 },
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
        alternateRowStyles: { fillColor: LIGHT },
      });

      return (doc as any).lastAutoTable.finalY + 6;
    } catch (error) {
      console.warn("Failed to embed captured chart image, falling back to approximation", error);
      // Fall through to approximation rendering below
    }
  }

  // ─── Fallback: Draw approximation (original logic) ────────────────────────
  fc(doc, WHITE);
  doc.roundedRect(chartX, plotY, chartW, chartH, 2, 2, "F");
  dc(doc, MID);
  doc.setLineWidth(0.2);
  doc.roundedRect(chartX, plotY, chartW, chartH, 2, 2, "S");

  const maxVal = Math.max(...values.map((v) => Number(v) || 0), 1);
  const barW = Math.max((chartW - 16) / Math.max(values.length, 1) - 2, 3);
  const plotLeft = chartX + 10;
  const plotBottom = plotY + chartH - 8;
  const plotHeight = chartH - 14;

  // ─── Draw prominent axes ────────────────────────────────────────
  dc(doc, DARK);
  doc.setLineWidth(0.8); // Thick axis lines
  // Y-axis (vertical)
  doc.line(plotLeft, plotY + 3, plotLeft, plotBottom);
  // X-axis (horizontal)
  doc.line(plotLeft, plotBottom, chartX + chartW - 4, plotBottom);

  // ─── Y-axis ticks ───────────────────────────────────────────────
  const yTicks = 4;
  for (let i = 0; i <= yTicks; i++) {
    const ratio = i / yTicks;
    const tickY = plotBottom - ratio * plotHeight;
    const tickValue = (ratio * maxVal).toFixed(2);
    
    // Draw tick mark on Y-axis
    dc(doc, DARK);
    doc.setLineWidth(0.5);
    doc.line(plotLeft - 1.5, tickY, plotLeft, tickY);
    
    // Y-axis value label
    tc(doc, DARK);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(tickValue, chartX - 1, tickY + 1.2, { align: "right" });
  }

  // ─── Draw bars ──────────────────────────────────────────────────
  values.forEach((value, index) => {
    const bh = Math.max((Number(value) / maxVal) * plotHeight, 0.5);
    const bx = plotLeft + index * (barW + 2);
    const by = plotBottom - bh;
    fc(doc, color);
    doc.roundedRect(bx, by, barW, bh, 0.8, 0.8, "F");
    
    // X-axis category label
    doc.setFontSize(7);
    tc(doc, DARK);
    doc.setFont("helvetica", "normal");
    doc.text(labels[index] ?? `#${index + 1}`, bx + barW / 2, plotBottom + 3.5, { align: "center" });
  });

  doc.setFontSize(7);
  tc(doc, MID);
  doc.text("X: Category", chartX, plotY + chartH + 4.4);
  doc.text("Y: Value", chartX + chartW - 2, plotY + chartH + 4.4, { align: "right" });

  autoTable(doc, {
    startY: plotY + chartH + 6,
    head: [["Label", "Value"]],
    body: labels.map((label, index) => [label, Number(values[index] ?? 0).toFixed(2)]),
    theme: "grid",
    margin: { left: chartX, right: 14 },
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
    alternateRowStyles: { fillColor: LIGHT },
  });

  return (doc as any).lastAutoTable.finalY + 6;
}

function renderTechniqueTable(
  doc: jsPDF,
  title: string,
  rows: any[],
  y: number,
): number {
  y = ensureSpace(doc, y, 30);
  y = sectionHeader(doc, title, y);
  if (!rows || rows.length === 0) return y;

  autoTable(doc, {
    startY: y,
    head: [["Technique", "Feasible", "Score", "Annual Cost", "CO₂", "Water", "Violations"]],
    body: rows.map((r: any) => [
      r.tech ?? "—",
      r.feasible ? "Yes" : "No",
      fmt(r.score, 4),
      `$${(r.annual_cost ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      `${(r.annual_emissions_kg ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg`,
      `${(r.annual_water_liters ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} L`,
      String(r.violations ?? 0),
    ]),
    theme: "grid",
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 2.5, halign: "center" },
    headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold", fontSize: 8.5 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: { 0: { halign: "left" } },
    didParseCell: (d) => {
      if (d.section === "body" && d.column.index === 0) {
        const bestTech = rows[0]?.tech;
        if (String(d.cell.raw) === bestTech) {
          d.cell.styles.fillColor = [220, 252, 231] as any;
          d.cell.styles.fontStyle = "bold";
        }
      }
    },
  });
  
  let legendY = (doc as any).lastAutoTable.finalY + 5;
  legendY = addColumnLegend(doc, legendY, [
    { key: "Technique", description: "Cooling technique name" },
    { key: "Feasible", description: "Technical feasibility" },
    { key: "Score", description: "Recommendation score (0-1)" },
    { key: "Annual Cost", description: "Total annual operating cost (USD)" },
    { key: "CO₂", description: "Annual carbon emissions (kg)" },
    { key: "Water", description: "Annual water usage (liters)" },
    { key: "Violations", description: "Number of constraint violations" },
  ]);
  return legendY;
}

function humanizeChartId(chartId: string): string {
  return chartId
    .replace(/^chart-/, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function appendChartsTabSection(doc: jsPDF, capturedCharts?: Record<string, CapturedChartImage>) {
  doc.addPage();
  let y = 20;
  y = sectionHeader(doc, "2. Tab - Charts", y);

  const chartEntries = Object.entries(capturedCharts ?? {});
  if (chartEntries.length === 0) {
    addWrappedTextBlock(
      doc,
      "No chart snapshots were captured for this simulation export. Open the Charts tab before exporting if charts are still missing.",
      14,
      y,
      doc.internal.pageSize.getWidth() - 28,
      9,
      4.4,
      DARK,
    );
    return;
  }

  y = addWrappedTextBlock(
    doc,
    `This section contains all captured chart visualizations from the simulation (${chartEntries.length} chart snapshots).`,
    14,
    y,
    doc.internal.pageSize.getWidth() - 28,
    8.5,
    4,
    MID,
  ) + 3;

  const pageWidth = doc.internal.pageSize.getWidth();
  const chartX = 14;
  const chartW = pageWidth - 28;
  const framePad = 2;
  const maxImageH = 78;

  chartEntries.forEach(([chartId, chart], idx) => {
    const title = `${idx + 1}. ${humanizeChartId(chartId)}`;
    y = ensureSpace(doc, y, 102);

    doc.setFontSize(9.5);
    tc(doc, DARK);
    doc.setFont("helvetica", "bold");
    doc.text(title, chartX, y);
    doc.setFont("helvetica", "normal");

    const frameY = y + 3;
    fc(doc, WHITE);
    doc.roundedRect(chartX, frameY, chartW, maxImageH + framePad * 2, 2, 2, "F");
    dc(doc, MID);
    doc.setLineWidth(0.2);
    doc.roundedRect(chartX, frameY, chartW, maxImageH + framePad * 2, 2, 2, "S");

    let imgW = chartW - framePad * 2;
    let imgH = (imgW * chart.height) / Math.max(chart.width, 1);
    if (imgH > maxImageH) {
      imgH = maxImageH;
      imgW = (imgH * chart.width) / Math.max(chart.height, 1);
    }

    const imgX = chartX + (chartW - imgW) / 2;
    const imgY = frameY + framePad + (maxImageH - imgH) / 2;

    try {
      doc.addImage(chart.imageData, "PNG", imgX, imgY, imgW, imgH);
    } catch (error) {
      console.warn("Failed to add captured chart image", chartId, error);
      doc.setFontSize(8);
      tc(doc, RED);
      doc.text("Failed to render this chart snapshot in PDF.", chartX + 4, frameY + 8);
    }

    y = frameY + maxImageH + framePad * 2 + 8;
  });
}

function appendRawDataAppendix(doc: jsPDF, rd: any) {
  const hourly: any[] = rd?.results?.hourlyResults ?? rd?.hourlyResults ?? [];
  if (hourly.length === 0) return;

  doc.addPage();
  let y = 20;
  y = sectionHeader(doc, "5. Tab - Raw Data", y);
  y = addWrappedTextBlock(
    doc,
    `This section contains ALL ${hourly.length} hourly records with every available field. Data includes detailed measurements for all simulation hours.`,
    14,
    y,
    doc.internal.pageSize.getWidth() - 28,
    8,
    4,
    DARK,
  );
  y += 4;

  // Get ALL available keys from the data
  const allKeys = Array.from(new Set(hourly.flatMap((row) => Object.keys(row))));
  const keys = allKeys.length > 0 ? allKeys : Object.keys(hourly[0] ?? {});

  // Display all records
  const rows = hourly.map((row) => keys.map((key) => fmt(row?.[key], 2)));

  autoTable(doc, {
    startY: y,
    head: [keys],
    body: rows,
    theme: "striped",
    margin: { left: 12, right: 12 },
    styles: { fontSize: 6, cellPadding: 0.8, overflow: "ellipsize" },
    headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold", fontSize: 6 },
    alternateRowStyles: { fillColor: LIGHT },
    rowPageBreak: "auto",
    pageBreak: "auto",
  });
}

function appendMetricsAppendix(doc: jsPDF, rd: any) {
  const metrics = rd?.results?.metrics ?? {};
  const annual = rd?.results?.annual ?? {};
  const econ = rd?.results?.economics ?? {};
  const s = rd?.summary ?? {};
  const evapRaw = rd?.rawEvaporativeData ?? {};
  const evapRes = evapRaw?.results ?? {};
  const evapPerf = evapRes?.performance ?? {};
  const evapAssess = rd?.coolingAdequacy ?? evapRaw?.cooling_assessment ?? {};

  const isChilled = !!(metrics.averageCOP !== undefined || rd?.coolingTechnique === "chilled_water" || rd?.results?.phase4Gates);
  const isAir = !!(rd?.airflowViolations || rd?.coolingTechnique === "air_economizer" || s.totalItEnergy_kWh);
  const isEvap = rd?.coolingTechnique === "evaporative" || (!isChilled && !isAir);

  const metricRows: Array<[string, string, string, string]> = [];
  const pushMetric = (label: string, value: any, unit: string, source: string) => {
    if (value === null || value === undefined || value === "") return;
    const rendered = unit === "USD"
      ? `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
      : fmt(value, 4);
    metricRows.push([label, rendered, unit || "—", source]);
  };

  // Common metrics
  pushMetric(
    "PUE",
    isEvap ? (evapPerf.pue_average ?? rd?.pue) : (metrics.pue ?? s.averagePUE),
    "",
    isEvap ? "results.performance.pue_average" : "results.metrics.pue / summary.averagePUE",
  );
  pushMetric(
    "Total Energy",
    isEvap ? (evapRes.energy?.electricity_kwh_total ?? rd?.totalEnergyConsumption) : (annual.energyConsumption_kWh ?? s.totalEnergy_kWh),
    "kWh",
    isEvap ? "results.energy.electricity_kwh_total" : "results.annual.energyConsumption_kWh / summary.totalEnergy_kWh",
  );
  pushMetric(
    "Carbon",
    isEvap ? (evapRes.emissions?.co2_kg_total ?? rd?.carbonFootprint) : (annual.carbonEmissions_kg ?? s.totalCarbonEmissions_kg),
    "kg",
    isEvap ? "results.emissions.co2_kg_total" : "results.annual.carbonEmissions_kg / summary.totalCarbonEmissions_kg",
  );

  // Chilled-specific
  if (isChilled) {
    pushMetric("Average COP", metrics.averageCOP, "", "results.metrics.averageCOP");
    pushMetric("WUE", metrics.wue, "L/kWh", "results.metrics.wue");
    pushMetric("Peak Cooling Load", metrics.peakCoolingLoad_kW, "kW", "results.metrics.peakCoolingLoad_kW");
    pushMetric("Cooling Load", annual.coolingLoad_kWh, "kWh", "results.annual.coolingLoad_kWh");
    pushMetric("Water Usage", annual.waterUsage_L, "L", "results.annual.waterUsage_L");
    pushMetric("Annual Cost", annual.cost_USD ?? econ.opex_annual_USD, "USD", "results.annual.cost_USD / results.economics.opex_annual_USD");
    pushMetric("Annual Savings", rd?.annualSavingsUSD ?? econ.annualSavingsUSD, "USD", "annualSavingsUSD / results.economics.annualSavingsUSD");
    pushMetric("CAPEX", econ.capex_USD, "USD", "results.economics.capex_USD");
    pushMetric("LCCP", econ.lccp_USD, "USD", "results.economics.lccp_USD");
    pushMetric("NPV", econ.npv_USD, "USD", "results.economics.npv_USD");
    pushMetric("Payback", econ.paybackPeriod_years, "yrs", "results.economics.paybackPeriod_years");
  }

  // Air-specific
  if (isAir) {
    pushMetric("CUE", s.averageCUE, "kgCO2/kWh", "summary.averageCUE");
    pushMetric("IT Energy", s.totalItEnergy_kWh, "kWh", "summary.totalItEnergy_kWh");
    pushMetric("Cooling Energy", s.totalCoolingEnergy_kWh, "kWh", "summary.totalCoolingEnergy_kWh");
    pushMetric("Electricity Cost", s.electricityCostUSD, "USD", "summary.electricityCostUSD");
    pushMetric("Carbon Tax", s.carbonTaxCostUSD, "USD", "summary.carbonTaxCostUSD");
    pushMetric("Annual OpEx", s.annualOpExUSD, "USD", "summary.annualOpExUSD");
    pushMetric("CAPEX", s.totalCapexUSD, "USD", "summary.totalCapexUSD");
    pushMetric("Annual Savings", s.annualSavingsUSD, "USD", "summary.annualSavingsUSD");
    pushMetric("Energy Savings", s.energySavingsPercent, "%", "summary.energySavingsPercent");
    pushMetric("Carbon Savings", s.carbonSavings_kg, "kg", "summary.carbonSavings_kg");
    pushMetric("Payback", s.paybackPeriodYears, "yrs", "summary.paybackPeriodYears");
  }

  // Evap-specific
  if (isEvap) {
    pushMetric("PUE Max", rd?.pue_max ?? evapPerf?.pue_max, "", "results.performance.pue_max");
    pushMetric("CUE", rd?.cue ?? evapPerf?.cue_average, "kgCO2/kWh", "results.performance.cue_average");
    pushMetric("WUE", rd?.wue ?? evapPerf?.wue_average, "L/kWh", "results.performance.wue_average");
    pushMetric("IT Energy", rd?.it_kwh ?? evapRes.energy?.it_kwh, "kWh", "results.energy.it_kwh");
    pushMetric("Fan Energy", rd?.fan_kwh ?? evapRes.energy?.fan_kwh, "kWh", "results.energy.fan_kwh");
    pushMetric("DX Backup", rd?.dx_kwh ?? evapRes.energy?.dx_kwh, "kWh", "results.energy.dx_kwh");
    pushMetric("Annual Cost", rd?.estimatedCost ?? evapRes.cost?.total_energy_cost_usd, "USD", "results.cost.total_energy_cost_usd");
    pushMetric("OpEx per kWh IT", rd?.opex_per_kwh_it ?? evapRes.opex?.opex_per_kwh_it, "USD", "results.opex.opex_per_kwh_it");
    pushMetric("CO2 per kWh IT", rd?.co2_kg_per_kwh_it ?? evapRes.emissions?.co2_kg_per_kwh_it, "kg", "results.emissions.co2_kg_per_kwh_it");
    pushMetric("Water Total", rd?.waterConsumption ?? evapRes.water?.water_liters_total, "L", "results.water.water_liters_total");
    pushMetric("Max Inlet Temp", evapAssess?.keyMetrics?.max_inlet_temp_c ?? evapRaw?.cooling_assessment?.key_metrics?.max_inlet_temp_c, "C", "cooling_assessment.key_metrics.max_inlet_temp_c");
    pushMetric("Cooling Capacity Avg", evapAssess?.keyMetrics?.cooling_capacity_avg_kw ?? evapRaw?.cooling_assessment?.key_metrics?.cooling_capacity_avg_kw, "kW", "cooling_assessment.key_metrics.cooling_capacity_avg_kw");
    pushMetric("Cooling Failure Hours", rd?.cooling_failure_hours ?? evapPerf?.cooling_failure_hours, "hrs", "results.performance.cooling_failure_hours");
  }

  doc.addPage();
  let y = 20;
  y = sectionHeader(doc, "3. Tab - Detailed Metrics", y);
  y = sectionHeader(doc, "3.1 KPI Metrics (Aligned with Detailed Metrics Tab)", y - 6);

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value", "Unit", "Source Field"]],
    body: metricRows,
    theme: "grid",
    margin: { left: 14, right: 14 },
    styles: { fontSize: 7.5, cellPadding: 1.6, overflow: "linebreak" },
    headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 44 },
      1: { halign: "right", cellWidth: 34 },
      2: { halign: "center", cellWidth: 18 },
      3: { cellWidth: "auto" },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  const gates = rd?.results?.phase4Gates ?? rd?.phase4Gates ?? {};
  if (Object.keys(gates).length > 0) {
    y = ensureSpace(doc, y, 30);
    y = sectionHeader(doc, "3.2 Phase 4 Compliance Gates", y);
    autoTable(doc, {
      startY: y,
      head: [["Gate", "Status"]],
      body: Object.entries(gates).map(([k, v]) => [k, String(v)]),
      theme: "grid",
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
      alternateRowStyles: { fillColor: LIGHT },
      didParseCell: (d) => {
        if (d.section === "body" && d.column.index === 1) {
          const value = String(d.cell.raw).toUpperCase();
          if (value === "PASS") d.cell.styles.textColor = [16, 185, 129] as any;
          if (value === "FAIL") d.cell.styles.textColor = [239, 68, 68] as any;
          d.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  const airflow = rd?.airflowViolations;
  if (airflow) {
    y = ensureSpace(doc, y, 36);
    y = sectionHeader(doc, "3.3 Airflow Analysis", y);
    autoTable(doc, {
      startY: y,
      head: [["Field", "Value"]],
      body: [
        ["Violation Hours", String(airflow.totalViolationHours ?? "—")],
        ["Violation Percentage", `${airflow.percentageHours ?? "—"}%`],
        ["Mode Breakdown", Object.entries(airflow.modeBreakdown ?? {}).map(([mode, count]) => `${mode}: ${count}`).join(" | ") || "—"],
        ["Messages", Array.isArray(airflow.uniqueMessages) ? airflow.uniqueMessages.join(" | ") : "—"],
      ],
      theme: "grid",
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: ACCENT, textColor: WHITE, fontStyle: "bold" },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 42 }, 1: { cellWidth: "auto" } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  if (rd?.cloudSimEnabled) {
    y = ensureSpace(doc, y, 30);
    y = sectionHeader(doc, "3.4 CloudSim Workload Metadata", y);
    autoTable(doc, {
      startY: y,
      head: [["Field", "Value"]],
      body: [
        ["CloudSim Enabled", "Yes"],
        ["Workload Mode", rd?.workloadMode ?? "—"],
        ["Average Utilization", rd?.averageUtilization != null ? `${(Number(rd.averageUtilization) * 100).toFixed(2)}%` : "—"],
        ["Total Racks", rd?.rackAnalysis?.totalRacks ?? "—"],
        ["Hotspot Racks", rd?.rackAnalysis?.hotspotRacks ?? "—"],
        ["Average Rack Load", rd?.rackAnalysis?.averageRackLoadKW != null ? `${Number(rd.rackAnalysis.averageRackLoadKW).toFixed(2)} kW` : "—"],
        ["Max Rack Load", rd?.rackAnalysis?.maxRackLoadKW != null ? `${Number(rd.rackAnalysis.maxRackLoadKW).toFixed(2)} kW` : "—"],
      ],
      theme: "grid",
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: "bold" },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 46 }, 1: { cellWidth: "auto" } },
    });
  }
}

function appendRecommendationsAppendix(doc: jsPDF, rd: any, result: SimulationPDFData["result"]) {
  const mlRec = rd?.mlRecommendation;
  const fallback = result?.recommendation;
  if (!mlRec && !fallback) return;

  doc.addPage();
  let y = 20;
  y = sectionHeader(doc, "4. Tab - Recommendations", y);

  // Summary section
  const summary = [
    ["Current Technique", mlRec?.current_technique ?? rd?.simulation_type ?? "—"],
    ["Recommended Technique", mlRec?.model_recommendation ?? fallback ?? "—"],
    ["Confidence", mlRec?.confidence ?? "—"],
    ["Generated UTC", mlRec?.generated_at_utc ? new Date(mlRec.generated_at_utc).toLocaleString() : "—"],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Parameter", "Value"]],
    body: summary,
    theme: "grid",
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8.5, cellPadding: 2.5, halign: "left" },
    headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: "bold", fontSize: 9 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 }, 1: { fontStyle: "bold", textColor: DARK } },
  });
  
  let legendY = (doc as any).lastAutoTable.finalY + 5;
  legendY = addColumnLegend(doc, legendY, [
    { key: "Current Technique", description: "Active cooling technique" },
    { key: "Recommended Technique", description: "ML-suggested optimal technique" },
    { key: "Confidence", description: "Recommendation confidence level" },
    { key: "Generated UTC", description: "Timestamp of recommendation generation" },
  ]);
  y = legendY + 4;

  // Why this recommendation
  if (Array.isArray(mlRec?.why_this_is_recommended) && mlRec.why_this_is_recommended.length > 0) {
    y = sectionHeader(doc, "4.1 Why This Recommendation", y);
    const reasons = mlRec.why_this_is_recommended.filter((r: any) => r && !r.includes("available when"));
    if (reasons.length > 0) {
      const reasonsText = reasons.join("\n\n");
      y = addWrappedTextBlock(
        doc,
        reasonsText,
        14,
        y,
        doc.internal.pageSize.getWidth() - 28,
        8.5,
        4,
        DARK,
      ) + 4;
    }
  }

  // Future impact
  if (mlRec?.future_impact_paragraph && !mlRec.future_impact_paragraph.includes("available when")) {
    y = sectionHeader(doc, "4.2 Future Impact & Analysis", y);
    y = addWrappedTextBlock(
      doc,
      mlRec.future_impact_paragraph,
      14,
      y,
      doc.internal.pageSize.getWidth() - 28,
      8.5,
      4,
      DARK,
    ) + 4;
  }

  // Technique comparison table
  if (Array.isArray(mlRec?.comparison_table) && mlRec.comparison_table.length > 0) {
    y = renderTechniqueTable(doc, "4.3 Technique Comparison Table", mlRec.comparison_table, y);
  }


}

// Removed: appendChartSnapshots - focus is now on complete raw data and metrics
// This function has been removed to prioritize data-driven reporting over visualizations

/*
function appendChartSnapshots(doc: jsPDF, rd: any, capturedCharts?: Record<string, CapturedChartImage>) {
  const hourly: any[] = rd?.results?.hourlyResults ?? rd?.hourlyResults ?? [];
  const yearly: any[] = rd?.projection?.yearlyData ?? rd?.results?.projection?.yearlyData ?? [];
  const comp: any[] = rd?.mlRecommendation?.comparison_table ?? [];
  const copOverTime: number[] = Array.isArray(rd?.copOverTime) ? rd.copOverTime : [];
  const modeBreakdown = rd?.airflowViolations?.modeBreakdown ?? {};
  const metrics = rd?.results?.metrics ?? {};
  const summary = rd?.summary ?? {};
  const isChilledPDF = !!(metrics.averageCOP !== undefined || rd?.coolingTechnique === "chilled_water");
  const isAirPDF = !!(rd?.airflowViolations || rd?.coolingTechnique === "air_economizer" || summary.totalItEnergy_kWh);
  const isEvapPDF = !isChilledPDF && !isAirPDF;

  // Helper to get captured chart image by ID
  const getChartImage = (chartId: string): CapturedChartImage | undefined => {
    return capturedCharts?.[chartId];
  };

  const renderChartOrder = (title: string, rows: [string, string][], y: number) => {
    y = ensureSpace(doc, y, 30);
    y = sectionHeader(doc, title, y);
    autoTable(doc, {
      startY: y,
      head: [["Order", "Chart"]],
      body: rows,
      theme: "grid",
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8.5, cellPadding: 2.2 },
      headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: { 0: { halign: "center", fontStyle: "bold" } },
    });
    return (doc as any).lastAutoTable.finalY + 8;
  };

  const renderPerformanceRadar = (y: number) => {
    const values = [
      Math.max(0, 10 - ((metrics.pue ?? summary.averagePUE ?? 1.5) - 1) * 5),
      Math.max(0, 10 - (metrics.cue ?? summary.averageCUE ?? 0.5) * 10),
      Math.min(10, (summary.energySavingsPercent ?? 0) / 5),
      Math.min(10, (summary.annualSavingsUSD ?? 0) / 20000),
      Math.min(10, (summary.carbonSavings_kg ?? 0) / 10000),
    ];

    return renderBarSnapshot(
      doc,
      "Performance Radar",
      "Source: normalised scores (0-10) for PUE, CUE, energy savings, cost savings, and carbon savings.",
      ["PUE Eff", "CUE Eff", "Energy Sav", "Cost Sav", "Carbon Sav"],
      values,
      ACCENT,
      y,
      getChartImage("chart-performance-radar"),
    );
  };

  doc.addPage();
  let y = 20;
  y = sectionHeader(doc, "10. Chart Snapshot Appendix", y);

  if (isChilledPDF) {
    y = renderChartOrder(
      "10.1 Chilled Water Chart Order",
      [
        ["1", "Annual Consumption Overview"],
        ["2", "COP Over Time (8760 h sampled)"],
        ["3", "Hourly Cooling Load vs Chiller Power (kW)"],
        ["4", "Hourly Power Breakdown (kW)"],
        ["5", "Hourly Water Usage & Carbon Emissions"],
        ["6", "Chilled Water Cost Structure"],
        ["7", "Phase 4 Compliance Gates"],
        ["8", "Performance Radar"],
        ["9", "Technique Comparison (ML)"],
        ["10", "5-Year Financial & Environmental Projection"],
      ],
      y,
    );

    y = renderBarSnapshot(
      doc,
      "Annual Consumption Overview",
      "Source: annual energy, cooling load, water usage, carbon emissions, and cost fields.",
      ["Energy", "Cooling", "Water", "Carbon", "Cost"],
      [
        Number(rd?.results?.annual?.energyConsumption_kWh ?? 0),
        Number(rd?.results?.annual?.coolingLoad_kWh ?? 0),
        Number(rd?.results?.annual?.waterUsage_L ?? 0),
        Number(rd?.results?.annual?.carbonEmissions_kg ?? 0),
        Number(rd?.results?.annual?.cost_USD ?? 0),
      ],
      PRIMARY,
      y,
      getChartImage("chart-consumption-overview"),
    );

    if (copOverTime.length > 0) {
      const step = Math.max(1, Math.ceil(copOverTime.length / 80));
      const cops = copOverTime.filter((_, i) => i % step === 0);
      y = renderLineSnapshot(
        doc,
        "COP Over Time (8760 h sampled)",
        "Source: copOverTime / hourly results.",
        "Sample Index",
        "COP",
        cops.map((_, i) => `P${i + 1}`),
        [{ name: "COP", values: cops, color: ACCENT }],
        y,
        getChartImage("chart-cop-timeline"),
      );
    }

    y = renderPerformanceRadar(y);

    if (comp.length > 0) {
      const labels = comp.map((r) => r.tech ?? "");
      const values = comp.map((r) => Number(r.score ?? 0));
      y = renderBarSnapshot(doc, "Technique Comparison (ML)", "Source: mlRecommendation.comparison_table.score.", labels, values, PRIMARY, y);
    }

    if (hourly.length > 0) {
      const step = Math.max(1, Math.ceil(hourly.length / 80));
      const sample = hourly.filter((_, i) => i % step === 0);
      y = renderLineSnapshot(
        doc,
        "Hourly Cooling Load vs Chiller Power (kW)",
        "Source: hourlyResults.coolingLoad_kW and chillerPower_kW.",
        "Sample Index",
        "kW",
        sample.map((_, i) => `H${i + 1}`),
        [
          { name: "Cooling Load", values: sample.map((h) => Number(h.coolingLoad_kW ?? 0)), color: PRIMARY },
          { name: "Chiller Power", values: sample.map((h) => Number(h.chillerPower_kW ?? 0)), color: GREEN },
          { name: "IT Load", values: sample.map((h) => Number(h.itLoad_kW ?? 0)), color: YELLOW },
        ],
        y,
      );

      y = renderLineSnapshot(
        doc,
        "Hourly Power Breakdown (kW)",
        "Source: hourlyResults.itLoad_kW, fanPower_kW, chillerPower_kW, totalPower_kW.",
        "Sample Index",
        "kW",
        sample.map((_, i) => `H${i + 1}`),
        [
          { name: "IT Load", values: sample.map((h) => Number(h.itLoad_kW ?? 0)), color: ACCENT },
          { name: "Fan Power", values: sample.map((h) => Number(h.fanPower_kW ?? 0)), color: GREEN },
          { name: "Chiller Power", values: sample.map((h) => Number(h.chillerPower_kW ?? 0)), color: YELLOW },
          { name: "Total", values: sample.map((h) => Number(h.totalPower_kW ?? h.totalElectricalKW ?? 0)), color: RED },
        ],
        y,
      );

      y = renderLineSnapshot(
        doc,
        "Hourly Water Usage & Carbon Emissions",
        "Source: hourlyResults.waterUsage_L and carbonEmissions_kg.",
        "Sample Index",
        "L / kg",
        sample.map((_, i) => `H${i + 1}`),
        [
          { name: "Water Usage", values: sample.map((h) => Number(h.waterUsage_L ?? 0)), color: PRIMARY },
          { name: "Carbon", values: sample.map((h) => Number(h.carbonEmissions_kg ?? 0)), color: RED },
        ],
        y,
      );
    }

    y = renderBarSnapshot(
      doc,
      "Chilled Water Cost Structure",
      "Source: results.economics and annual cost fields.",
      ["OPEX", "CAPEX", "LCCP", "NPV", "Payback"],
      [
        Number(rd?.results?.annual?.cost_USD ?? rd?.results?.economics?.opex_annual_USD ?? 0),
        Number(rd?.results?.economics?.capex_USD ?? 0),
        Number(rd?.results?.economics?.lccp_USD ?? 0),
        Math.abs(Number(rd?.results?.economics?.npv_USD ?? 0)),
        Number(rd?.results?.economics?.paybackPeriod_years ?? 0),
      ],
      PRIMARY,
      y,
    );

    const gates = rd?.results?.phase4Gates ?? {};
    if (Object.keys(gates).length > 0) {
      y = renderBarSnapshot(
        doc,
        "Phase 4 Compliance Gates",
        "Source: results.phase4Gates.*.",
        Object.keys(gates),
        Object.values(gates).map((v: any) => (String(v).toUpperCase() === "PASS" ? 1 : 0)),
        GREEN,
        y,
      );
    }

    if (yearly.length > 0) {
      y = renderBarSnapshot(
        doc,
        "5-Year Financial & Environmental Projection",
        "Source: projection.yearlyData.totalCostUSD and costSavingsUSD.",
        yearly.map((d) => `Y${d.year}`),
        yearly.map((d) => Number(d.totalCostUSD ?? 0)),
        PRIMARY,
        y,
      );
    }
  }

  if (isAirPDF) {
    y = renderChartOrder(
      "10.2 Air Economizer Chart Order",
      [
        ["1", "Hourly Power Breakdown (kW)"],
        ["2", "Airflow & Free Cooling vs Mechanical (kW)"],
        ["3", "Cooling Mode Distribution"],
        ["4", "Full Cost Structure"],
        ["5", "Rack Analysis (CloudSim)"],
        ["6", "Hourly PUE & CUE"],
        ["7", "Ambient Temperature & Humidity"],
        ["8", "Performance Radar"],
        ["9", "Technique Comparison (ML)"],
        ["10", "5-Year Financial & Environmental Projection"],
      ],
      y,
    );

    if (hourly.length > 0) {
      const step = Math.max(1, Math.ceil(hourly.length / 80));
      const sample = hourly.filter((_, i) => i % step === 0);

      y = renderLineSnapshot(
        doc,
        "Hourly Power Breakdown (kW)",
        "Source: hourlyResults.itLoad_kW, fanPower_kW, mechPower_kW, totalPower_kW.",
        "Sample Index",
        "kW",
        sample.map((_, i) => `H${i + 1}`),
        [
          { name: "IT Load", values: sample.map((h) => Number(h.itLoad_kW ?? 0)), color: ACCENT },
          { name: "Fan Power", values: sample.map((h) => Number(h.fanPower_kW ?? 0)), color: GREEN },
          { name: "Mech Power", values: sample.map((h) => Number(h.mechPower_kW ?? 0)), color: YELLOW },
          { name: "Total", values: sample.map((h) => Number(h.totalPower_kW ?? 0)), color: RED },
        ],
        y,
      );

      y = renderLineSnapshot(
        doc,
        "Airflow & Free Cooling vs Mechanical (kW)",
        "Source: requiredAirflow_CFM, q_free_kW, mech_load_kW, and airflowViolation.",
        "Sample Index",
        "CFM / kW",
        sample.map((_, i) => `H${i + 1}`),
        [
          { name: "Required Airflow", values: sample.map((h) => Number(h.requiredAirflow_CFM ?? 0)), color: PRIMARY },
          { name: "Free Cooling", values: sample.map((h) => Number(h.q_free_kW ?? 0)), color: GREEN },
          { name: "Mechanical Load", values: sample.map((h) => Number(h.mech_load_kW ?? 0)), color: YELLOW },
        ],
        y,
      );

      if (Object.keys(modeBreakdown).length > 0) {
        y = renderBarSnapshot(
          doc,
          "Cooling Mode Distribution",
          "Source: airflowViolations.modeBreakdown.",
          Object.keys(modeBreakdown),
          Object.values(modeBreakdown).map((v: any) => Number(v ?? 0)),
          GREEN,
          y,
        );
      }

      y = renderBarSnapshot(
        doc,
        "Full Cost Structure",
        "Source: summary.electricityCostUSD, carbonTaxCostUSD, totalCapexUSD, annualSavingsUSD.",
        ["Electricity", "Carbon Tax", "CAPEX", "Savings"],
        [
          Number(summary.electricityCostUSD ?? 0),
          Number(summary.carbonTaxCostUSD ?? 0),
          Number(summary.totalCapexUSD ?? 0),
          Number(summary.annualSavingsUSD ?? 0),
        ],
        PRIMARY,
        y,
      );

      if (rd?.rackAnalysis) {
        y = renderBarSnapshot(
          doc,
          "Rack Analysis (CloudSim)",
          "Source: rackAnalysis.averageRackLoadKW, maxRackLoadKW, hotspotRacks, totalRacks.",
          ["Avg", "Max", "Hotspots", "Total"],
          [
            Number(rd.rackAnalysis.averageRackLoadKW ?? 0),
            Number(rd.rackAnalysis.maxRackLoadKW ?? 0),
            Number(rd.rackAnalysis.hotspotRacks ?? 0),
            Number(rd.rackAnalysis.totalRacks ?? 0),
          ],
          ACCENT,
          y,
        );
      }

      y = renderLineSnapshot(
        doc,
        "Hourly PUE & CUE",
        "Source: hourlyResults.pue and hourlyResults.cue.",
        "Sample Index",
        "PUE / CUE",
        sample.map((_, i) => `H${i + 1}`),
        [
          { name: "PUE", values: sample.map((h) => Number(h.pue ?? 0)), color: ACCENT },
          { name: "CUE", values: sample.map((h) => Number(h.cue ?? 0)), color: GREEN },
        ],
        y,
      );

      y = renderLineSnapshot(
        doc,
        "Ambient Temperature & Humidity",
        "Source: hourlyResults.outdoorTempC and outdoorRH.",
        "Sample Index",
        "°C / %",
        sample.map((_, i) => `H${i + 1}`),
        [
          { name: "Temperature", values: sample.map((h) => Number(h.outdoorTempC ?? h.tempC ?? 0)), color: YELLOW },
          { name: "Humidity", values: sample.map((h) => Number(h.outdoorRH ?? h.rh ?? 0)), color: PRIMARY },
        ],
        y,
      );

      y = renderPerformanceRadar(y);

      if (comp.length > 0) {
        y = renderBarSnapshot(
          doc,
          "Technique Comparison (ML)",
          "Source: mlRecommendation.comparison_table.score.",
          comp.map((r) => r.tech ?? ""),
          comp.map((r) => Number(r.score ?? 0)),
          PRIMARY,
          y,
        );
      }
    }

    if (yearly.length > 0) {
      y = renderBarSnapshot(
        doc,
        "5-Year Financial & Environmental Projection",
        "Source: projection.yearlyData.totalCostUSD and costSavingsUSD.",
        yearly.map((d) => `Y${d.year}`),
        yearly.map((d) => Number(d.totalCostUSD ?? 0)),
        PRIMARY,
        y,
      );
    }
  }

  if (isEvapPDF) {
    const hourlyEvap: any[] = rd?.hourlyData ?? rd?.rawEvaporativeData?.hourly_data ?? [];
    const step = Math.max(1, Math.ceil(Math.max(hourlyEvap.length, hourly.length) / 80));
    const sample = (hourlyEvap.length > 0 ? hourlyEvap : hourly).filter((_: any, i: number) => i % step === 0);

    y = renderChartOrder(
      "10.3 Evaporative Chart Order",
      [
        ["1", "Annual Evaporative Cooling Summary"],
        ["2", "Hourly Power Breakdown (kW)"],
        ["3", "Cooling Capacity vs IT Load per Hour (kW)"],
        ["4", "Hourly PUE vs Annual Average & Max"],
        ["5", "Temperature & Humidity per Hour"],
        ["6", "Supply Air Conditions per Hour"],
        ["7", "Cooling Mode Distribution"],
        ["8", "PUE per Hour"],
        ["9", "Cooling Assessment"],
        ["10", "Performance Radar"],
        ["11", "Technique Comparison (ML)"],
        ["12", "5-Year Financial & Environmental Projection"],
      ],
      y,
    );

    if (sample.length > 0) {
      y = renderBarSnapshot(
        doc,
        "Annual Evaporative Cooling Summary",
        "Source: results.energy, results.cost, results.performance, and cooling assessment metrics.",
        ["IT", "Fan", "DX", "Pump"],
        [
          Number(rd?.rawEvaporativeData?.results?.energy?.it_kwh ?? 0),
          Number(rd?.rawEvaporativeData?.results?.energy?.fan_kwh ?? 0),
          Number(rd?.rawEvaporativeData?.results?.energy?.dx_kwh ?? 0),
          Number(rd?.rawEvaporativeData?.results?.energy?.pump_kwh ?? 0),
        ],
        PRIMARY,
        y,
      );

      y = renderLineSnapshot(
        doc,
        "Hourly Power Breakdown (kW)",
        "Source: itLoadKW, fanPowerKW, dxPowerKW, totalElectricalKW, coolingCapacityKW.",
        "Sample Index",
        "kW",
        sample.map((_, i) => `H${i + 1}`),
        [
          { name: "IT Load", values: sample.map((h) => Number(h.itLoadKW ?? 0)), color: ACCENT },
          { name: "Fan Power", values: sample.map((h) => Number(h.fanPowerKW ?? 0)), color: GREEN },
          { name: "DX Backup", values: sample.map((h) => Number(h.dxPowerKW ?? 0)), color: RED },
          { name: "Total", values: sample.map((h) => Number(h.totalElectricalKW ?? 0)), color: YELLOW },
        ],
        y,
      );

      y = renderLineSnapshot(
        doc,
        "Cooling Capacity vs IT Load per Hour (kW)",
        "Source: coolingCapacityKW, itLoadKW, waterEvaporationLph.",
        "Sample Index",
        "kW",
        sample.map((_, i) => `H${i + 1}`),
        [
          { name: "Cooling Capacity", values: sample.map((h) => Number(h.coolingCapacityKW ?? 0)), color: GREEN },
          { name: "IT Load", values: sample.map((h) => Number(h.itLoadKW ?? 0)), color: ACCENT },
        ],
        y,
      );

      y = renderLineSnapshot(
        doc,
        "Hourly PUE vs Annual Average & Max",
        "Source: hourly PUE compared with annual average and max.",
        "Sample Index",
        "PUE",
        sample.map((_, i) => `H${i + 1}`),
        [{ name: "PUE", values: sample.map((h) => Number(h.pue ?? 0)), color: PRIMARY }],
        y,
      );

      y = renderLineSnapshot(
        doc,
        "Temperature & Humidity per Hour",
        "Source: ambientTempC and ambientHumidity.",
        "Sample Index",
        "°C / %",
        sample.map((_, i) => `H${i + 1}`),
        [
          { name: "Temperature", values: sample.map((h) => Number(h.ambientTempC ?? 0)), color: YELLOW },
          { name: "Humidity", values: sample.map((h) => Number(h.ambientHumidity ?? 0)), color: PRIMARY },
        ],
        y,
      );

      y = renderLineSnapshot(
        doc,
        "Supply Air Conditions per Hour",
        "Source: supplyTempC, supplyHumidity, ambientHumidity, inletTempC.",
        "Sample Index",
        "°C / %",
        sample.map((_, i) => `H${i + 1}`),
        [
          { name: "Supply Temp", values: sample.map((h) => Number(h.supplyTempC ?? 0)), color: GREEN },
          { name: "Inlet Temp", values: sample.map((h) => Number(h.inletTempC ?? 0)), color: RED },
          { name: "Humidity", values: sample.map((h) => Number(h.supplyHumidity ?? 0)), color: PRIMARY },
        ],
        y,
      );

      y = renderBarSnapshot(
        doc,
        "Cooling Mode Distribution",
        "Source: hourly_data[i].coolingMode.",
        sample.map((_, i) => `H${i + 1}`),
        sample.map((h) => Number(h.coolingMode ? 1 : 0)),
        GREEN,
        y,
      );

      y = renderLineSnapshot(
        doc,
        "PUE per Hour",
        "Source: pue series from hourly evaporative results.",
        "Sample Index",
        "PUE",
        sample.map((_, i) => `H${i + 1}`),
        [{ name: "PUE", values: sample.map((h) => Number(h.pue ?? 0)), color: PRIMARY }],
        y,
      );
    }

    const checks = rd?.coolingAdequacy?.checks ?? rd?.rawEvaporativeData?.cooling_assessment?.checks ?? {};
    if (Object.keys(checks).length > 0) {
      y = renderBarSnapshot(
        doc,
        "Cooling Assessment",
        "Source: cooling_assessment.checks.",
        Object.keys(checks),
        Object.values(checks).map((v: any) => (String(v).toLowerCase() === "true" ? 1 : 0)),
        GREEN,
        y,
      );
    }

    y = renderPerformanceRadar(y);

    if (comp.length > 0) {
      y = renderBarSnapshot(
        doc,
        "Technique Comparison (ML)",
        "Source: mlRecommendation.comparison_table.score.",
        comp.map((r) => r.tech ?? ""),
        comp.map((r) => Number(r.score ?? 0)),
        PRIMARY,
        y,
      );
    }

    if (yearly.length > 0) {
      y = renderBarSnapshot(
        doc,
        "5-Year Financial & Environmental Projection",
        "Source: projection.yearlyData.totalCostUSD and costSavingsUSD.",
        yearly.map((d) => `Y${d.year}`),
        yearly.map((d) => Number(d.totalCostUSD ?? 0)),
        PRIMARY,
        y,
      );
    }
  }
}
*/

function coverPage(doc: jsPDF, data: SimulationPDFData) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // ── Full dark background ──────────────────────────────────────────────────
  fc(doc, [10, 14, 39]);
  doc.rect(0, 0, pw, ph, "F");

  // ── Left accent bar ───────────────────────────────────────────────────────
  fc(doc, ACCENT);
  doc.rect(0, 0, 5, ph, "F");

  // ── Top gradient band ─────────────────────────────────────────────────────
  fc(doc, [15, 23, 58]);
  doc.rect(5, 0, pw - 5, 90, "F");

  // ── Decorative corner circle ──────────────────────────────────────────────
  fc(doc, [92, 225, 229, 0.08] as any);
  doc.circle(pw - 20, 20, 60, "F");
  fc(doc, [14, 165, 233, 0.05] as any);
  doc.circle(pw, 80, 50, "F");

  // ── COOLIENCE brand mark ──────────────────────────────────────────────────
  fc(doc, ACCENT);
  doc.roundedRect(14, 14, 8, 8, 1.5, 1.5, "F");
  doc.setFontSize(7);
  tc(doc, [10, 14, 39]);
  doc.setFont("helvetica", "bold");
  doc.text("C", 18, 20, { align: "center" });

  doc.setFontSize(13);
  tc(doc, ACCENT);
  doc.setFont("helvetica", "bold");
  doc.text("COOLIENCE", 26, 20);
  doc.setFontSize(7);
  tc(doc, [148, 163, 184]);
  doc.setFont("helvetica", "normal");
  doc.text("Data Center Cooling Intelligence Platform", 26, 25);

  // ── Report type label ─────────────────────────────────────────────────────
  doc.setFontSize(8);
  tc(doc, [148, 163, 184]);
  doc.setFont("helvetica", "normal");
  doc.text("TECHNICAL SIMULATION REPORT", pw - 14, 20, { align: "right" });
  doc.setFontSize(7);
  tc(doc, [100, 116, 139]);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`, pw - 14, 25, { align: "right" });

  // ── Horizontal rule ───────────────────────────────────────────────────────
  fc(doc, [30, 41, 82]);
  doc.rect(14, 32, pw - 28, 0.4, "F");

  // ── Main title block ──────────────────────────────────────────────────────
  doc.setFontSize(36);
  tc(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.text("Simulation", 14, 58);

  doc.setFontSize(36);
  tc(doc, ACCENT);
  doc.setFont("helvetica", "bold");
  doc.text("Analysis Report", 14, 74);

  // ── Simulation name ───────────────────────────────────────────────────────
  fc(doc, [20, 30, 70]);
  doc.roundedRect(14, 84, pw - 28, 0.5, 0, 0, "F");

  doc.setFontSize(14);
  tc(doc, WHITE);
  doc.setFont("helvetica", "bold");
  const nameLines = doc.splitTextToSize(data.simulation.name, pw - 28);
  doc.text(nameLines.slice(0, 2), 14, 96);

  // ── Technique badge ───────────────────────────────────────────────────────
  const techName = data.simulation.simulation_type;
  const badgeW = Math.min(doc.getTextWidth(techName) * 1.1 + 16, 100);
  fc(doc, PRIMARY);
  doc.roundedRect(14, 106, badgeW, 10, 2, 2, "F");
  doc.setFontSize(8);
  tc(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.text(techName.toUpperCase(), 14 + badgeW / 2, 112.5, { align: "center" });

  // ── Status badge ──────────────────────────────────────────────────────────
  const statusColor: RGB = data.simulation.status === "completed" ? GREEN : data.simulation.status === "failed" ? RED : YELLOW;
  fc(doc, statusColor);
  doc.roundedRect(14 + badgeW + 4, 106, 28, 10, 2, 2, "F");
  doc.setFontSize(8);
  tc(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.text(data.simulation.status.toUpperCase(), 14 + badgeW + 4 + 14, 112.5, { align: "center" });

  // ── Divider ───────────────────────────────────────────────────────────────
  fc(doc, [30, 41, 82]);
  doc.rect(14, 122, pw - 28, 0.4, "F");

  // ── Metadata grid ─────────────────────────────────────────────────────────
  const meta: [string, string][] = [
    ["Simulation ID", `#${data.simulation.id}`],
    ["Status", data.simulation.status.toUpperCase()],
    ["Created", new Date(data.simulation.created_at).toLocaleString()],
    ["Completed", data.result.completed_at ? new Date(data.result.completed_at).toLocaleString() : "—"],
    ["Runtime", `${data.result.runtime_minutes ?? "—"} min`],
    ["Report Generated", new Date().toLocaleString()],
  ];

  const colW = (pw - 28) / 2;
  meta.forEach(([k, v], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const mx = 14 + col * (colW + 4);
    const my = 132 + row * 16;

    fc(doc, [20, 28, 65]);
    doc.roundedRect(mx, my - 4, colW - 4, 13, 1.5, 1.5, "F");

    doc.setFontSize(6.5);
    tc(doc, [100, 116, 139]);
    doc.setFont("helvetica", "normal");
    doc.text(k.toUpperCase(), mx + 4, my + 1);

    doc.setFontSize(8.5);
    tc(doc, WHITE);
    doc.setFont("helvetica", "bold");
    const vLines = doc.splitTextToSize(v, colW - 10);
    doc.text(vLines[0], mx + 4, my + 7);
  });

  // ── Description ───────────────────────────────────────────────────────────
  if (data.simulation.description) {
    const descY = 132 + Math.ceil(meta.length / 2) * 16 + 6;
    fc(doc, [20, 28, 65]);
    doc.roundedRect(14, descY, pw - 28, 20, 2, 2, "F");
    doc.setFontSize(7);
    tc(doc, [148, 163, 184]);
    doc.setFont("helvetica", "normal");
    doc.text("DESCRIPTION", 18, descY + 5);
    doc.setFontSize(8);
    tc(doc, WHITE);
    const descLines = doc.splitTextToSize(data.simulation.description, pw - 36);
    doc.text(descLines.slice(0, 2), 18, descY + 11);
  }

  // ── Key metrics strip ─────────────────────────────────────────────────────
  const rd = data.result.result_data ?? {};
  const pue = rd?.results?.metrics?.pue ?? rd?.summary?.averagePUE ?? rd?.pue;
  const energy = rd?.results?.annual?.energyConsumption_kWh ?? rd?.summary?.totalEnergy_kWh;
  const carbon = rd?.results?.annual?.carbonEmissions_kg ?? rd?.summary?.totalCarbonEmissions_kg;
  const cost = rd?.results?.annual?.cost_USD ?? rd?.summary?.annualOpExUSD;

  const kpis = [
    { label: "PUE", value: pue != null ? Number(pue).toFixed(4) : "—", color: ACCENT },
    { label: "Energy (kWh)", value: energy != null ? Number(energy).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—", color: PRIMARY },
    { label: "Carbon (kg)", value: carbon != null ? Number(carbon).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—", color: GREEN },
    { label: "Annual Cost", value: cost != null ? `$${Number(cost).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—", color: YELLOW },
  ];

  const kpiY = ph - 55;
  fc(doc, [15, 23, 58]);
  doc.rect(0, kpiY - 6, pw, 42, "F");

  doc.setFontSize(7);
  tc(doc, [100, 116, 139]);
  doc.setFont("helvetica", "normal");
  doc.text("KEY PERFORMANCE INDICATORS", 14, kpiY - 1);

  const kpiW = (pw - 28 - 9) / 4;
  kpis.forEach((k, i) => {
    const kx = 14 + i * (kpiW + 3);
    fc(doc, [20, 30, 70]);
    doc.roundedRect(kx, kpiY + 3, kpiW, 22, 2, 2, "F");
    fc(doc, k.color);
    doc.roundedRect(kx, kpiY + 3, 3, 22, 1, 1, "F");
    doc.setFontSize(6.5);
    tc(doc, [148, 163, 184]);
    doc.setFont("helvetica", "normal");
    doc.text(k.label, kx + 5, kpiY + 9);
    doc.setFontSize(11);
    tc(doc, WHITE);
    doc.setFont("helvetica", "bold");
    doc.text(k.value, kx + 5, kpiY + 20);
  });

  // ── Footer ────────────────────────────────────────────────────────────────
  fc(doc, [5, 8, 22]);
  doc.rect(0, ph - 12, pw, 12, "F");
  fc(doc, ACCENT);
  doc.rect(0, ph - 12, 5, 12, "F");
  doc.setFontSize(7);
  tc(doc, [100, 116, 139]);
  doc.setFont("helvetica", "normal");
  doc.text("COOLIENCE Platform  ·  Confidential Simulation Report", pw / 2, ph - 5.5, { align: "center" });
  doc.setFontSize(6.5);
  tc(doc, [60, 75, 100]);
  doc.text(`Report ID: SIM-${data.simulation.id}-${Date.now().toString(36).toUpperCase()}`, pw - 14, ph - 5.5, { align: "right" });
}

export const generateSimulationPDF = (data: SimulationPDFData) => {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const rd = data.result.result_data ?? {};

    // ── Page 1: Cover Page ────────────────────────────────────────────────────
    coverPage(doc, data);

    // ── Page 2: Overview Tab ──────────────────────────────────────────────────
    doc.addPage();
    let y = 20;
    y = sectionHeader(doc, "1. Tab - Overview", y);

    // KPI Cards
    y = kpiRow(doc, y, [
      {
        label: "Energy Consumed",
        value: (data.result.energy_consumed_kwh ?? 0).toFixed(2),
        unit: "kWh",
        color: PRIMARY,
      },
      {
        label: "Cooling Efficiency (PUE)",
        value: (data.result.cooling_efficiency ?? 0).toFixed(3),
        unit: "",
        color: ACCENT,
      },
      {
        label: "Cost Savings",
        value: (data.result.cost_saving_percent ?? 0).toFixed(1),
        unit: "%",
        color: GREEN,
      },
      {
        label: "Runtime",
        value: (data.result.runtime_minutes ?? 0).toFixed(2),
        unit: "min",
        color: [139, 92, 246] as RGB,
      },
    ]);

    // Summary metrics table
    y = ensureSpace(doc, y, 60);
    const annual = rd?.results?.annual ?? rd?.summary ?? {};
    const metrics = rd?.results?.metrics ?? {};
    const econ = rd?.results?.economics ?? {};
    const s = rd?.summary ?? {};

    const summaryData = [
      ["PUE (Power Usage Efficiency)", fmt(metrics.pue ?? s.averagePUE)],
      ["CUE (Carbon Usage Effectiveness)", fmt(metrics.cue ?? s.averageCUE)],
      ["Total Energy Consumption", fmt(annual.energyConsumption_kWh ?? s.totalEnergy_kWh) + " kWh"],
      ["Annual Carbon Emissions", fmt(annual.carbonEmissions_kg ?? s.totalCarbonEmissions_kg) + " kg CO₂"],
      ["Annual Operating Cost", "$" + (annual.cost_USD ?? econ.opex_annual_USD ?? s.annualOpExUSD ?? 0).toLocaleString()],
      ["Payback Period", fmt(econ.paybackPeriod_years ?? s.paybackPeriodYears) + " years"],
    ].filter(([, v]) => !v.includes("—"));

    autoTable(doc, {
      startY: y,
      head: [["Metric", "Value"]],
      body: summaryData,
      theme: "grid",
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: "bold", fontSize: 10 },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right", fontStyle: "bold" } },
    });

    y = (doc as any).lastAutoTable.finalY + 6;
    y = sectionHeader(doc, "1.1 Simulation Information", y);
    autoTable(doc, {
      startY: y,
      head: [["Field", "Value"]],
      body: [
        ["Simulation ID", String(data.simulation.id)],
        ["Simulation Name", data.simulation.name],
        ["Simulation Type", data.simulation.simulation_type],
        ["Status", data.simulation.status],
        ["Created At", new Date(data.simulation.created_at).toLocaleString()],
        ["Completed At", data.result.completed_at ? new Date(data.result.completed_at).toLocaleString() : "—"],
        ["Runtime (minutes)", fmt(data.result.runtime_minutes)],
      ],
      theme: "grid",
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8.5, cellPadding: 2.4 },
      headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold", fontSize: 9 },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 52 }, 1: { cellWidth: "auto" } },
    });

    // ── Pages 3+: Detailed Sections ───────────────────────────────────────────
    appendChartsTabSection(doc, data.capturedCharts);
    appendMetricsAppendix(doc, rd);
    appendRecommendationsAppendix(doc, rd, data.result);
    appendRawDataAppendix(doc, rd);

    // ── Final: Page Numbers ───────────────────────────────────────────────────
    addPageNumbers(doc);

    const fileName = `TechnicalReport_${data.simulation.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  } catch (err) {
    console.error("[PDF Export] Failed:", err);
    alert(
      `PDF generation failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
};
