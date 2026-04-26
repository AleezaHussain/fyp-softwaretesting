import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface CapturedChartImage {
  imageData: string; // data:image/png;base64,...
  width: number;
  height: number;
  explanationText?: string;
  keyInsightText?: string;
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
  capturedCharts?: Record<string, string>;
  // Optional AI-generated metrics explanation from the metrics API
  aiMetricsExplanation?: string;
  aiMetricsInsight?: string;
}

// RGB tuples
type RGB = [number, number, number];
const PRIMARY: RGB = [5, 150, 220];
const ACCENT: RGB = [92, 225, 229];
const DARK: RGB = [15, 23, 50];
const MID: RGB = [71, 95, 130];
const LIGHT: RGB = [245, 248, 252];
const WHITE: RGB = [255, 255, 255];
const GREEN: RGB = [16, 185, 129];
const RED: RGB = [220, 50, 50];
const YELLOW: RGB = [245, 158, 11];
const NAVY: RGB = [26, 42, 74];
const STEEL: RGB = [71, 95, 130];

// jsPDF v4 requires separate r,g,b args â€” no spread
const fc = (doc: jsPDF, c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
const tc = (doc: jsPDF, c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
const dc = (doc: jsPDF, c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);

function fmt(v: any, decimals = 2): string {
  if (v === null || v === undefined) return "â€”";
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
  // Gradient-style: dark navy bar with left accent stripe
  fc(doc, NAVY);
  doc.rect(14, y, pw - 28, 10, "F");
  fc(doc, ACCENT);
  doc.rect(14, y, 4, 10, "F");
  doc.setFontSize(11);
  tc(doc, WHITE);
  doc.setFont("Bricolage Grotesque", "bold");
  doc.text(title.toUpperCase(), 22, y + 7);
  doc.setFont("Bricolage Grotesque", "normal");
  return y + 15;
}

function kpiRow(
  doc: jsPDF,
  y: number,
  kpis: { label: string; value: string; unit?: string; color: RGB }[],
): number {
  const pw = doc.internal.pageSize.getWidth();
  const cw = (pw - 28 - (kpis.length - 1) * 4) / kpis.length;
  kpis.forEach((k, i) => {
    const cx = 14 + i * (cw + 4);

    // Clean white card with light border
    fc(doc, WHITE);
    doc.roundedRect(cx, y, cw, 26, 2, 2, "F");
    dc(doc, [220, 228, 240]);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, cw, 26, 2, 2, "S");

    // Top accent line — subtle, single color
    fc(doc, [26, 42, 74]);
    doc.rect(cx, y, cw, 1.5, "F");

    // Label
    doc.setFontSize(8);
    tc(doc, MID);
    doc.setFont("helvetica", "normal");
    doc.text(k.label, cx + 6, y + 9);

    // Value — measure at correct font size before switching
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    tc(doc, NAVY);
    const valueText = k.value;
    doc.text(valueText, cx + 6, y + 21);

    // Unit — placed right after value at correct offset
    if (k.unit) {
      doc.setFontSize(14);
      const valueWidth = doc.getTextWidth(valueText);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      tc(doc, MID);
      doc.text(k.unit, cx + 6 + valueWidth + 1, y + 21);
    }
  });
  return y + 32;
}

function addColumnLegend(
  doc: jsPDF,
  y: number,
  columns: { key: string; description: string }[],
): number {
  const pw = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pw - marginLeft - marginRight;

  // Legend header
  doc.setFontSize(7);
  tc(doc, MID);
  doc.setFont("Bricolage Grotesque", "bold");
  doc.text("Column Reference:", marginLeft, y);

  y += 3.5;
  doc.setFont("Bricolage Grotesque", "normal");
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
    doc.setFont("Bricolage Grotesque", "bold");
    doc.text(col.key + ":", xPos, yPos);

    doc.setFont("Bricolage Grotesque", "normal");
    const descWidth = colWidth - 2;
    const lines = doc.splitTextToSize(col.description, descWidth);
    doc.text(lines, xPos + 20, yPos);
  });

  const totalRows = Math.ceil(columns.length / colsPerRow);
  return y + totalRows * 4 + 4;
}

function ensureSpace(
  doc: jsPDF,
  y: number,
  required: number,
  top = 20,
): number {
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
  fontSize = 10,
  lineHeight = 5,
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
  const chartH = capturedImage ? 85 : 56; // Extra height for captured images
  y = ensureSpace(doc, y, chartH + 56);

  // Render title and subtitle
  doc.setFontSize(10);
  tc(doc, DARK);
  doc.setFont("Bricolage Grotesque", "bold");
  doc.text(title, chartX, y);
  doc.setFont("Bricolage Grotesque", "normal");
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

      // Calculate scaling to fit within bounds — use full container width, no inner padding
      const maxWidth = chartW;
      const maxHeight = plotH - 2;
      let imgWidth = maxWidth;
      let imgHeight = (maxWidth * capturedImage.height) / capturedImage.width;

      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = (maxHeight * capturedImage.width) / capturedImage.height;
      }

      // Align image to left edge of container (no centering offset that could clip right side)
      const offsetX = chartX;
      const offsetY = plotY + (plotH - imgHeight) / 2;

      // Embed the image
      doc.addImage(
        capturedImage.imageData,
        "PNG",
        offsetX,
        offsetY,
        imgWidth,
        imgHeight,
      );

      // Add axis labels below the image
      doc.setFontSize(7);
      tc(doc, MID);
      doc.text(`X: ${xAxisLabel}`, chartX, plotY + plotH + 6.3);
      doc.text(`Y: ${yAxisLabel}`, chartX + chartW - 2, plotY + plotH + 6.3, {
        align: "right",
      });

      // Add value table below
      const summaryRows = series.map((item) => {
        const seriesValues = item.values.filter((value) =>
          Number.isFinite(value),
        );
        const first = seriesValues[0] ?? 0;
        const last = seriesValues[seriesValues.length - 1] ?? 0;
        const minValue =
          seriesValues.length > 0 ? Math.min(...seriesValues) : 0;
        const maxValue =
          seriesValues.length > 0 ? Math.max(...seriesValues) : 0;
        const average =
          seriesValues.length > 0
            ? seriesValues.reduce((sum, value) => sum + value, 0) /
              seriesValues.length
            : 0;
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
      console.warn(
        "Failed to embed captured chart image, falling back to approximation",
        error,
      );
      // Fall through to approximation rendering below
    }
  }

  // â”€â”€â”€ Fallback: Draw approximation (original logic) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fc(doc, WHITE);
  doc.roundedRect(chartX, plotY, chartW, plotH, 2, 2, "F");
  dc(doc, MID);
  doc.setLineWidth(0.2);
  doc.roundedRect(chartX, plotY, chartW, plotH, 2, 2, "S");

  const values = series
    .flatMap((s) => s.values)
    .filter((v) => Number.isFinite(v));
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

  // â”€â”€â”€ Draw prominent axes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  dc(doc, DARK);
  doc.setLineWidth(0.8); // Thick axis lines
  // Y-axis (vertical)
  doc.line(plotLeft, plotTop, plotLeft, plotTop + plotHeight);
  // X-axis (horizontal)
  doc.line(
    plotLeft,
    plotTop + plotHeight,
    plotLeft + plotWidth,
    plotTop + plotHeight,
  );

  // â”€â”€â”€ Y-axis ticks and values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    doc.setFont("Bricolage Grotesque", "normal");
    doc.text(tickValue.toFixed(2), chartX - 1, tickY + 1.2, { align: "right" });
  }

  // â”€â”€â”€ X-axis ticks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      doc.setFont("Bricolage Grotesque", "normal");
      doc.text(
        labels[tickIndex] ?? String(tickIndex + 1),
        tickX,
        plotTop + plotHeight + 4,
        { align: "center" },
      );
    });
  }

  // â”€â”€â”€ Draw data lines â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  series.forEach((item) => {
    if (!item.values || item.values.length < 2) return;
    dc(doc, item.color);
    doc.setLineWidth(1.2); // Thicker data lines
    for (let i = 1; i < item.values.length; i++) {
      const x1 =
        plotLeft + ((i - 1) / Math.max(item.values.length - 1, 1)) * plotWidth;
      const y1 =
        plotTop +
        plotHeight -
        ((item.values[i - 1] - min) / range) * plotHeight;
      const x2 =
        plotLeft + (i / Math.max(item.values.length - 1, 1)) * plotWidth;
      const y2 =
        plotTop + plotHeight - ((item.values[i] - min) / range) * plotHeight;
      doc.line(x1, y1, x2, y2);
    }
  });

  // â”€â”€â”€ Legend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let legendX = plotLeft + 2;
  const legendY = plotY + plotH - 2;
  series.slice(0, 4).forEach((item) => {
    fc(doc, item.color);
    doc.roundedRect(legendX, legendY - 3, 3, 3, 1, 1, "F");
    doc.setFontSize(6);
    tc(doc, DARK);
    doc.setFont("Bricolage Grotesque", "normal");
    doc.text(item.name, legendX + 4, legendY - 0.5);
    legendX += Math.min(32, doc.getTextWidth(item.name) + 12);
  });

  // â”€â”€â”€ Axis labels below chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  doc.setFontSize(8);
  tc(doc, DARK);
  doc.setFont("Bricolage Grotesque", "bold");
  doc.text(`X-Axis: ${xAxisLabel}`, chartX, plotY + plotH + 6.3);
  doc.text(`Y-Axis: ${yAxisLabel}`, chartX + chartW - 2, plotY + plotH + 6.3, {
    align: "right",
  });
  doc.setFont("Bricolage Grotesque", "normal");

  const summaryRows = series.map((item) => {
    const seriesValues = item.values.filter((value) => Number.isFinite(value));
    const first = seriesValues[0] ?? 0;
    const last = seriesValues[seriesValues.length - 1] ?? 0;
    const minValue = seriesValues.length > 0 ? Math.min(...seriesValues) : 0;
    const maxValue = seriesValues.length > 0 ? Math.max(...seriesValues) : 0;
    const average =
      seriesValues.length > 0
        ? seriesValues.reduce((sum, value) => sum + value, 0) /
          seriesValues.length
        : 0;
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
  const chartH = capturedImage ? 85 : 48; // Extra height for captured images
  y = ensureSpace(doc, y, chartH + 34);

  // Render title and subtitle
  doc.setFontSize(10);
  tc(doc, DARK);
  doc.setFont("Bricolage Grotesque", "bold");
  doc.text(title, chartX, y);
  doc.setFont("Bricolage Grotesque", "normal");
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

      // Calculate scaling to fit within bounds — use full container width, no inner padding
      const maxWidth = chartW;
      const maxHeight = chartH - 2;
      let imgWidth = maxWidth;
      let imgHeight = (maxWidth * capturedImage.height) / capturedImage.width;

      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = (maxHeight * capturedImage.width) / capturedImage.height;
      }

      // Align image to left edge of container (no centering offset that could clip right side)
      const offsetX = chartX;
      const offsetY = plotY + (chartH - imgHeight) / 2;

      // Embed the image
      doc.addImage(
        capturedImage.imageData,
        "PNG",
        offsetX,
        offsetY,
        imgWidth,
        imgHeight,
      );

      // Add axis labels
      doc.setFontSize(7);
      tc(doc, MID);
      doc.text("X: Category", chartX, plotY + chartH + 4.4);
      doc.text("Y: Value", chartX + chartW - 2, plotY + chartH + 4.4, {
        align: "right",
      });

      // Add value table below
      autoTable(doc, {
        startY: plotY + chartH + 6,
        head: [["Label", "Value"]],
        body: labels.map((label, index) => [
          label,
          Number(values[index] ?? 0).toFixed(2),
        ]),
        theme: "grid",
        margin: { left: chartX, right: 14 },
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
        alternateRowStyles: { fillColor: LIGHT },
      });

      return (doc as any).lastAutoTable.finalY + 6;
    } catch (error) {
      console.warn(
        "Failed to embed captured chart image, falling back to approximation",
        error,
      );
      // Fall through to approximation rendering below
    }
  }

  // â”€â”€â”€ Fallback: Draw approximation (original logic) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Draw prominent axes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  dc(doc, DARK);
  doc.setLineWidth(0.8); // Thick axis lines
  // Y-axis (vertical)
  doc.line(plotLeft, plotY + 3, plotLeft, plotBottom);
  // X-axis (horizontal)
  doc.line(plotLeft, plotBottom, chartX + chartW - 4, plotBottom);

  // â”€â”€â”€ Y-axis ticks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    doc.setFont("Bricolage Grotesque", "normal");
    doc.text(tickValue, chartX - 1, tickY + 1.2, { align: "right" });
  }

  // â”€â”€â”€ Draw bars â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  values.forEach((value, index) => {
    const bh = Math.max((Number(value) / maxVal) * plotHeight, 0.5);
    const bx = plotLeft + index * (barW + 2);
    const by = plotBottom - bh;
    fc(doc, color);
    doc.roundedRect(bx, by, barW, bh, 0.8, 0.8, "F");

    // X-axis category label
    doc.setFontSize(7);
    tc(doc, DARK);
    doc.setFont("Bricolage Grotesque", "normal");
    doc.text(
      labels[index] ?? `#${index + 1}`,
      bx + barW / 2,
      plotBottom + 3.5,
      { align: "center" },
    );
  });

  doc.setFontSize(7);
  tc(doc, MID);
  doc.text("X: Category", chartX, plotY + chartH + 4.4);
  doc.text("Y: Value", chartX + chartW - 2, plotY + chartH + 4.4, {
    align: "right",
  });

  autoTable(doc, {
    startY: plotY + chartH + 6,
    head: [["Label", "Value"]],
    body: labels.map((label, index) => [
      label,
      Number(values[index] ?? 0).toFixed(2),
    ]),
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
    head: [
      [
        "Technique",
        "Feasible",
        "Score",
        "Annual Cost",
        "CO2‚",
        "Water",
        "Violations",
      ],
    ],
    body: rows.map((r: any) => [
      r.tech ?? "â€”",
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
    headStyles: {
      fillColor: DARK,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 8.5,
    },
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
    { key: "CO2‚", description: "Annual carbon emissions (kg)" },
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

// Chart explanation lookup â€” maps chart IDs to detailed descriptions
const CHART_EXPLANATIONS: Record<
  string,
  { what: string; insight: string; axes: string }
> = {
  // Air-Side Economizer
  "hourly-power-breakdown": {
    what: "Shows IT load (kW), fan power (kW), mechanical cooling power (kW), and total facility power (kW) plotted hour-by-hour across the simulation period.",
    insight:
      "When IT load peaks (typically hours 10â€“18), fan and mechanical power rise proportionally. Hours where mechanical power dominates indicate the economizer has fallen back from free-cooling mode due to adverse outdoor conditions.",
    axes: "X-axis: Simulation hour index. Y-axis: Power (kW).",
  },
  "airflow-free-vs-mechanical": {
    what: "Plots required airflow (CFM) against the free-cooling contribution (kW) and mechanical cooling load (kW) for each hour.",
    insight:
      "When required CFM exceeds the 10,000 CFM limit, an airflow violation is triggered and the system flags the need for liquid cooling. The gap between free cooling and total load is the mechanical burden.",
    axes: "X-axis: Simulation hour. Y-axis: CFM (airflow) / kW (cooling split).",
  },
  "cooling-mode-distribution": {
    what: "Pie or bar chart showing the annual distribution of operating modes: FULL_ECON, PARTIAL_TRIM, and MECHANICAL_ONLY.",
    insight:
      "A high FULL_ECON share means the site climate is well-suited for air-side economization. A high MECHANICAL_ONLY share indicates the outdoor conditions are frequently too warm or humid for free cooling.",
    axes: "X-axis: Operating mode. Y-axis: Hours per year.",
  },
  "full-cost-structure": {
    what: "Stacked breakdown of annual costs: electricity cost (USD), carbon tax cost (USD), CAPEX (USD), and annual savings (USD).",
    insight:
      "Carbon tax is a major cost driver at the IPCC 2030 rate of $254/ton CO2‚. The electricity cost reflects total facility energy Ã— tariff. CAPEX is amortised over the payback period.",
    axes: "X-axis: Cost category. Y-axis: USD.",
  },
  "rack-analysis": {
    what: "Bar chart of rack-level workload distribution from CloudSim: average rack load (kW), maximum rack load (kW), hotspot rack count, and total rack count.",
    insight:
      "Racks 3 and 4 are classified as hotspots when peak load exceeds 7.5 kW. All five racks exceed the 400 CFM per-rack airflow limit under AI workloads, confirming the need for liquid cooling at high density.",
    axes: "X-axis: Rack metric. Y-axis: kW or count.",
  },
  "hourly-pue-cue": {
    what: "Dual line chart of hourly PUE (Power Usage Effectiveness) and CUE (Carbon Usage Effectiveness) over the simulation period.",
    insight:
      "PUE rises during MECHANICAL_ONLY hours as compressor overhead increases. CUE tracks PUE closely since the grid carbon factor is constant. Lower PUE = more efficient facility.",
    axes: "X-axis: Simulation hour. Y-axis: PUE (dimensionless) / CUE (kgCO2‚/kWh_IT).",
  },
  "ambient-conditions": {
    what: "Line chart of outdoor dry-bulb temperature (Â°C) and relative humidity (%) across all simulation hours.",
    insight:
      "Mode switching is directly driven by these values. When T_out > 24Â°C the system enters MECHANICAL_ONLY. When RH > 60% it enters PARTIAL_TRIM. This chart explains why mode distribution looks the way it does.",
    axes: "X-axis: Simulation hour. Y-axis: Temperature (Â°C) / Humidity (%).",
  },
  "performance-radar": {
    what: "Radar chart with normalised scores (0â€“10) across five dimensions: PUE efficiency, CUE efficiency, energy savings, cost savings, and carbon savings.",
    insight:
      "A larger radar area indicates better overall performance. Air-side economization typically scores well on energy savings and cost savings but lower on PUE efficiency compared to evaporative cooling.",
    axes: "Radial axes: normalised 0â€“10 score per dimension.",
  },
  "5-year-projection": {
    what: "Line or bar chart showing projected annual total cost (USD) and cumulative savings (USD) over a 5-year horizon with 15% annual carbon tax escalation.",
    insight:
      "Carbon tax escalation means costs rise each year even if energy consumption stays flat. The cumulative savings line shows when the CAPEX investment is recovered.",
    axes: "X-axis: Year (1â€“5). Y-axis: USD.",
  },
  // Evaporative Cooling
  "annual-evaporative-summary": {
    what: "Bar chart of annual energy breakdown: IT energy (kWh), fan energy (kWh), DX backup energy (kWh), and pump energy (kWh).",
    insight:
      "Fan energy is only ~0.26% of total energy (366 kWh vs 141,539 kWh total), confirming the near-zero overhead of evaporative cooling. Zero DX and pump energy means the system ran entirely on fan power.",
    axes: "X-axis: Energy component. Y-axis: kWh.",
  },
  "cooling-capacity-vs-it-load": {
    what: "Dual line chart comparing hourly cooling capacity (kW) against IT heat load (kW) for each simulation hour.",
    insight:
      "When the cooling capacity line falls below the IT load line, a thermal deficit occurs. The average deficit of 3.5% (17.11 kW capacity vs 17.73 kW load) is what causes the INSUFFICIENT_COOLING assessment.",
    axes: "X-axis: Simulation hour. Y-axis: kW.",
  },
  "pue-vs-annual-averages": {
    what: "Hourly PUE plotted against the annual average PUE (1.002) and peak PUE (1.004) reference lines.",
    insight:
      "The extremely flat PUE trace (all values between 1.001 and 1.004) confirms that evaporative cooling overhead is nearly constant regardless of IT load â€” a key advantage over mechanical systems.",
    axes: "X-axis: Simulation hour. Y-axis: PUE (dimensionless).",
  },
  "temperature-humidity": {
    what: "Ambient dry-bulb temperature (Â°C) and relative humidity (%) plotted hourly.",
    insight:
      "Evaporative effectiveness depends on the wet-bulb depression (T_db âˆ’ T_wb). Higher humidity reduces the wet-bulb depression and limits how much the supply air can be cooled.",
    axes: "X-axis: Simulation hour. Y-axis: Â°C / %.",
  },
  "supply-air-conditions": {
    what: "Hourly supply air temperature (Â°C), rack inlet temperature (Â°C), and supply humidity (%) delivered to the white space.",
    insight:
      "The inlet temperature consistently exceeds 33Â°C (vs ASHRAE A1 limit of 27Â°C), which is the root cause of the thermal compliance failure. Supply temperature is correctly reduced by evaporation but the rack thermal mass causes inlet overshoot.",
    axes: "X-axis: Simulation hour. Y-axis: Â°C / %.",
  },
  "pue-per-hour": {
    what: "Full 8,760-hour PUE trace showing every hourly efficiency value.",
    insight:
      "The near-flat trace at PUE â‰ˆ 1.001â€“1.004 is the defining characteristic of evaporative cooling. Compare this to air-side (PUE 1.23â€“1.45) and chilled water (PUE ~1.16) to see the efficiency advantage.",
    axes: "X-axis: Hour of year (0â€“8759). Y-axis: PUE.",
  },
  "cooling-assessment": {
    what: "Pass/fail checklist chart for four assessment criteria: heat balance, inlet temperature compliance, humidity compliance, and energy efficiency.",
    insight:
      "Heat balance FAIL (capacity 3.5% below load) and inlet temperature FAIL (38.5Â°C vs 27Â°C limit) are the two critical failures. Humidity and energy efficiency both PASS, confirming the system works well thermodynamically but not thermally.",
    axes: "X-axis: Assessment check. Y-axis: PASS (1) / FAIL (0).",
  },
  // Chilled Water
  "consumption-overview": {
    what: "Annual summary bar chart: total energy consumption (kWh), cooling load (kWh), water usage (L), carbon emissions (kg), and annual cost (USD).",
    insight:
      "The 515,331 L/year water consumption is the highest of all three techniques and represents a significant operational constraint in water-scarce regions. WUE of 1.786 L/kWh_IT is the key sustainability metric.",
    axes: "X-axis: Resource category. Y-axis: Respective unit.",
  },
  "cop-timeline": {
    what: "COP (Coefficient of Performance) plotted over all 8,760 simulation hours.",
    insight:
      "COP starts near 8.0 at low ambient temperatures (24Â°C) and decreases as ambient temperature rises, since the condenser rejection temperature increases. The average COP of 1.0 reflects the effective system COP including all auxiliary loads.",
    axes: "X-axis: Simulation hour. Y-axis: COP (dimensionless).",
  },
  "cooling-load-vs-chiller-power": {
    what: "Dual line chart of hourly cooling load (kW) and chiller compressor power (kW).",
    insight:
      "The ratio of cooling load to chiller power is the instantaneous COP. The tight tracking between these two lines confirms the EIR-based chiller model is responding correctly to load changes.",
    axes: "X-axis: Simulation hour. Y-axis: kW.",
  },
  "it-load-vs-chiller-power": {
    what: "IT load (kW) from CloudSim plotted against chiller power (kW) to show the compute-to-cooling coupling.",
    insight:
      "Chiller power is approximately 12.5% of IT load (cooling fraction), meaning the chilled water system adds ~12.5% overhead on top of IT power â€” much less than air-side economization (28.6% overhead).",
    axes: "X-axis: Simulation hour. Y-axis: kW.",
  },
  "water-carbon-trend": {
    what: "Dual line chart of hourly water consumption (L) and carbon emissions (kg) over the simulation period.",
    insight:
      "Water consumption scales linearly with cooling load (43â€“56 L/hr at baseline). Carbon emissions track total power consumption. Both metrics rise during peak IT load hours (10â€“18).",
    axes: "X-axis: Simulation hour. Y-axis: Litres / kg CO2‚.",
  },
  "cost-structure": {
    what: "Bar chart of chilled water cost components: annual OpEx (USD), CAPEX (USD), LCCP 15-year (USD), NPV (USD), and payback period (years).",
    insight:
      "The negative NPV (âˆ’$1,092,355) and 50-year payback reflect the high CAPEX ($630,000) relative to the simulated IT load scale (~20â€“25 kW). At MW-scale deployments, these economics improve dramatically.",
    axes: "X-axis: Cost metric. Y-axis: USD / years.",
  },
  "phase4-gates": {
    what: "Compliance gate chart showing PASS/FAIL status for four engineering gates: thermal compliance, water constraint, carbon liability, and economic viability.",
    insight:
      "Thermal compliance PASS is the critical differentiator â€” chilled water is the only technique that guarantees ASHRAE Class A2 inlet temperatures. Carbon and economic gates FAIL due to grid carbon intensity and high CAPEX.",
    axes: "X-axis: Compliance gate. Y-axis: PASS (1) / FAIL (0).",
  },
  "technique-comparison": {
    what: "Bar chart of ML recommender composite scores for all three techniques (lower score = better recommendation).",
    insight:
      "Evaporative scores 0.000 (best), ChilledWater 0.524, AirEconomizer 0.800. The ML model weights cost, emissions, and water equally. Thermal compliance is not a hard constraint in the scoring function.",
    axes: "X-axis: Cooling technique. Y-axis: Composite score (0â€“1).",
  },
};

function getChartExplanation(chartId: string): {
  what: string;
  insight: string;
  axes: string;
} {
  // Try exact match first, then partial match
  const clean = chartId.replace(/^chart-/, "").toLowerCase();
  if (CHART_EXPLANATIONS[clean]) return CHART_EXPLANATIONS[clean];
  // Partial key match
  const found = Object.keys(CHART_EXPLANATIONS).find(
    (k) => clean.includes(k) || k.includes(clean),
  );
  if (found) return CHART_EXPLANATIONS[found];
  return {
    what: "Visualisation of simulation output data for this metric.",
    insight: "Refer to the Detailed Metrics section for numerical values.",
    axes: "See chart axes for scale and units.",
  };
}

// ── AI explanation block rendered below each chart ───────────────────────────
function addAiExplanationBlock(doc: jsPDF, chartId: string, y: number): number {
  const pw = doc.internal.pageSize.getWidth();
  const exp = getChartExplanation(chartId);
  y = ensureSpace(doc, y, 36);

  // Tinted background box
  fc(doc, [235, 245, 255]);
  doc.roundedRect(14, y, pw - 28, 2, 1, 1, "F"); // top accent line
  fc(doc, [235, 245, 255]);
  doc.roundedRect(14, y + 2, pw - 28, 32, 2, 2, "F");
  fc(doc, PRIMARY);
  doc.roundedRect(14, y + 2, 3, 32, 1, 1, "F");

  // "AI Analysis" label
  doc.setFontSize(7.5);
  tc(doc, PRIMARY);
  doc.setFont("Bricolage Grotesque", "bold");
  doc.text("AI ANALYSIS", 20, y + 8);
  doc.setFont("Bricolage Grotesque", "normal");

  // What it shows
  doc.setFontSize(8.5);
  tc(doc, NAVY);
  doc.setFont("Bricolage Grotesque", "bold");
  doc.text("What it shows:", 20, y + 14);
  doc.setFont("Bricolage Grotesque", "normal");
  tc(doc, DARK);
  const whatLines = doc.splitTextToSize(exp.what, pw - 42);
  doc.text(whatLines.slice(0, 2), 20, y + 19);

  // Key insight
  const insightY = y + 19 + Math.min(whatLines.length, 2) * 4.5;
  doc.setFontSize(8.5);
  tc(doc, NAVY);
  doc.setFont("Bricolage Grotesque", "bold");
  doc.text("Key insight:", 20, insightY);
  doc.setFont("Bricolage Grotesque", "normal");
  tc(doc, [40, 60, 90]);
  const insightLines = doc.splitTextToSize(exp.insight, pw - 42);
  doc.text(insightLines.slice(0, 2), 20, insightY + 5);

  return y + 38;
}

// Per-chart: which fields to show in the sample table and their display names
const CHART_LABELS: Record<string, string> = {
  "chilled-annual-overview": "Annual Consumption Overview",
  "chilled-cop-over-time": "COP Over Time",
  "chilled-load-power": "Cooling Load vs Chiller Power",
  "chilled-it-chiller": "IT Load vs Chiller Power",
  "chilled-water-carbon": "Water Usage & Carbon Emissions",
  "chilled-cost-structure": "Cost Structure",
  "chilled-gates": "Phase 4 Compliance Gates",
  "air-power-breakdown": "Hourly Power Breakdown",
  "air-airflow": "Airflow & Free vs Mechanical Cooling",
  "air-modes": "Cooling Mode Distribution",
  "air-cost-structure": "Full Cost Structure",
  "air-rack": "Rack Analysis (CloudSim)",
  "air-pue-cue": "Hourly PUE & CUE",
  "air-weather": "Ambient Temperature & Humidity",
  "evap-annual-overview": "Annual Evaporative Summary",
  "evap-hourly-power": "Hourly Power Breakdown",
  "evap-capacity": "Cooling Capacity vs IT Load",
  "evap-pue-compare": "PUE vs Annual Averages",
  "evap-temp": "Temperature & Humidity",
  "evap-supply": "Supply Air Conditions",
  "evap-modes": "Cooling Mode Distribution",
  "evap-pue": "PUE per Hour",
  "evap-assessment": "Cooling Assessment",
  "shared-radar": "Performance Radar",
  "shared-projection": "5-Year Financial Projection",
};

// Per-chart: which fields to show in the sample table and their display names
const CHART_SAMPLE_FIELDS: Record<string, { key: string; label: string }[]> = {
  // Air-side
  "air-power-breakdown": [
    { key: "hour", label: "Hour" },
    { key: "itLoad_kW", label: "IT Load (kW)" },
    { key: "fanPower_kW", label: "Fan Power (kW)" },
    { key: "mechPower_kW", label: "Mech Power (kW)" },
    { key: "totalPower_kW", label: "Total Power (kW)" },
  ],
  "air-airflow": [
    { key: "hour", label: "Hour" },
    { key: "requiredAirflow_CFM", label: "Required CFM" },
    { key: "q_free_kW", label: "Free Cool (kW)" },
    { key: "mech_load_kW", label: "Mech Load (kW)" },
    { key: "airflowViolation", label: "Violation" },
  ],
  "air-pue-cue": [
    { key: "hour", label: "Hour" },
    { key: "pue", label: "PUE" },
    { key: "cue", label: "CUE" },
  ],
  "air-weather": [
    { key: "hour", label: "Hour" },
    { key: "outdoorTempC", label: "Outdoor Temp (°C)" },
    { key: "outdoorRH", label: "Humidity (%)" },
  ],
  "air-modes": [
    { key: "hour", label: "Hour" },
    { key: "mode", label: "Cooling Mode" },
    { key: "pue", label: "PUE" },
  ],
  // air-cost-structure intentionally omitted — no table, no chart in PDF
  "air-rack": [
    { key: "hour", label: "Hour" },
    { key: "itLoad_kW", label: "IT Load (kW)" },
    { key: "totalPower_kW", label: "Total Power (kW)" },
  ],
  // Chilled water
  "chilled-cop-over-time": [
    { key: "hour", label: "Hour" },
    { key: "cop", label: "COP" },
    { key: "chillerPower_kW", label: "Chiller Power (kW)" },
  ],
  "chilled-load-power": [
    { key: "hour", label: "Hour" },
    { key: "coolingLoad_kW", label: "Cooling Load (kW)" },
    { key: "chillerPower_kW", label: "Chiller Power (kW)" },
    { key: "itLoad_kW", label: "IT Load (kW)" },
  ],
  "chilled-it-chiller": [
    { key: "hour", label: "Hour" },
    { key: "itLoad_kW", label: "IT Load (kW)" },
    { key: "chillerPower_kW", label: "Chiller Power (kW)" },
    { key: "pue", label: "PUE" },
  ],
  "chilled-water-carbon": [
    { key: "hour", label: "Hour" },
    { key: "waterUsage_L", label: "Water Usage (L)" },
    { key: "carbonEmissions_kg", label: "CO₂ (kg)" },
  ],
  "chilled-annual-overview": [
    { key: "hour", label: "Hour" },
    { key: "coolingLoad_kW", label: "Cooling Load (kW)" },
    { key: "chillerPower_kW", label: "Chiller Power (kW)" },
    { key: "waterUsage_L", label: "Water (L)" },
  ],
  "chilled-cost-structure": [
    { key: "hour", label: "Hour" },
    { key: "costUSD", label: "Cost (USD)" },
    { key: "chillerPower_kW", label: "Chiller Power (kW)" },
  ],
  "chilled-gates": [
    { key: "hour", label: "Hour" },
    { key: "pue", label: "PUE" },
    { key: "cop", label: "COP" },
  ],
  // Evaporative
  "evap-hourly-power": [
    { key: "hour", label: "Hour" },
    { key: "itLoadKW", label: "IT Load (kW)" },
    { key: "fanPowerKW", label: "Fan Power (kW)" },
    { key: "dxPowerKW", label: "DX Backup (kW)" },
    { key: "totalElectricalKW", label: "Total (kW)" },
  ],
  "evap-capacity": [
    { key: "hour", label: "Hour" },
    { key: "coolingCapacityKW", label: "Cooling Cap (kW)" },
    { key: "itLoadKW", label: "IT Load (kW)" },
  ],
  "evap-pue-compare": [
    { key: "hour", label: "Hour" },
    { key: "pue", label: "PUE" },
  ],
  "evap-temp": [
    { key: "hour", label: "Hour" },
    { key: "ambientTempC", label: "Ambient Temp (°C)" },
    { key: "ambientHumidity", label: "Humidity (%)" },
  ],
  "evap-supply": [
    { key: "hour", label: "Hour" },
    { key: "supplyTempC", label: "Supply Temp (°C)" },
    { key: "inletTempC", label: "Inlet Temp (°C)" },
    { key: "supplyHumidity", label: "Supply Humidity (%)" },
  ],
  "evap-modes": [
    { key: "hour", label: "Hour" },
    { key: "coolingMode", label: "Cooling Mode" },
    { key: "pue", label: "PUE" },
  ],
  "evap-pue": [
    { key: "hour", label: "Hour" },
    { key: "pue", label: "PUE" },
    { key: "itLoadKW", label: "IT Load (kW)" },
  ],
  "evap-annual-overview": [
    { key: "hour", label: "Hour" },
    { key: "itLoadKW", label: "IT Load (kW)" },
    { key: "fanPowerKW", label: "Fan Power (kW)" },
    { key: "coolingCapacityKW", label: "Cooling Cap (kW)" },
  ],
  "evap-assessment": [], // Not a chart — renders PASS/FAIL cards, skip in PDF
  // Shared
  "shared-radar": [],
  "shared-projection": [
    { key: "year", label: "Year" },
    { key: "energyCostUSD", label: "Energy Cost (USD)" },
    { key: "carbonTaxUSD", label: "Carbon Tax (USD)" },
    { key: "totalCostUSD", label: "Total Cost (USD)" },
    { key: "costSavingsUSD", label: "Savings (USD)" },
    { key: "emissionsTonsCO2", label: "Emissions (tCO₂)" },
  ],
};

function renderChartSampleTable(doc: jsPDF, chartId: string, rd: any): boolean {
  // Returns true if table was rendered, false if skipped (no data)
  const fields = CHART_SAMPLE_FIELDS[chartId];
  if (!fields || fields.length === 0) return false;

  // Pick the right data array
  let rows: any[] = [];
  if (chartId.startsWith("evap-")) {
    rows = rd?.hourlyData ?? rd?.rawEvaporativeData?.hourly_data ?? [];
  } else if (chartId === "shared-projection") {
    rows =
      rd?.projection?.yearlyData ?? rd?.results?.projection?.yearlyData ?? [];
  } else {
    rows = rd?.results?.hourlyResults ?? rd?.hourlyResults ?? [];
  }

  const sample = rows.slice(0, 10);
  if (sample.length === 0) return false;

  // Table always starts on its own fresh page
  doc.addPage();
  let y = 20;

  const chartW = doc.internal.pageSize.getWidth() - 28;
  const label =
    CHART_LABELS[chartId] ??
    chartId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Title bar matching the chart page
  fc(doc, NAVY);
  doc.rect(14, y, chartW, 9, "F");
  fc(doc, ACCENT);
  doc.rect(14, y, 3, 9, "F");
  doc.setFontSize(9);
  tc(doc, WHITE);
  doc.setFont("Bricolage Grotesque", "bold");
  doc.text(`${label} — Reference Data (First 10 Values)`, 14 + 6, y + 6.2);
  doc.setFont("Bricolage Grotesque", "normal");
  y += 16;

  const head = [fields.map((f) => f.label)];
  const body = sample.map((row: any) =>
    fields.map((f) => {
      const v = row[f.key];
      if (v === null || v === undefined) return "—";
      if (typeof v === "boolean") return v ? "Yes" : "No";
      if (typeof v === "number")
        return Number.isInteger(v) ? String(v) : v.toFixed(3);
      return String(v);
    }),
  );

  autoTable(doc, {
    startY: y,
    head,
    body,
    theme: "grid",
    margin: { left: 14, right: 14 },
    styles: { fontSize: 7, cellPadding: 2.5, halign: "center" }, // Reduced from 9 to 7
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 7.5, // Reduced from 9.5 to 7.5
    },
    alternateRowStyles: { fillColor: [245, 248, 253] as any },
    columnStyles: { 0: { halign: "center" } },
  });

  return true;
}

async function appendChartsTabSection(
  doc: jsPDF,
  capturedCharts: Record<string, string> | undefined,
  rd: any,
) {
  const ph = doc.internal.pageSize.getHeight();
  const chartX = 14;
  const chartW = doc.internal.pageSize.getWidth() - 28;

  doc.addPage();
  let y = 20;
  y = sectionHeader(doc, "2. Charts & Visualisations", y);

  if (!capturedCharts || Object.keys(capturedCharts).length === 0) {
    doc.setFontSize(9);
    tc(doc, MID);
    doc.text(
      "No chart screenshots were captured. Re-export from the simulation detail page.",
      chartX,
      y + 10,
    );
    return;
  }

  let chartIndex = 0;

  for (const [chartId, dataUrl] of Object.entries(capturedCharts)) {
    if (!dataUrl || !dataUrl.startsWith("data:image")) continue;

    // Skip charts that have no table data defined or no actual rows
    const fields = CHART_SAMPLE_FIELDS[chartId];
    if (!fields || fields.length === 0) continue;

    // Pre-check rows exist before rendering anything
    let checkRows: any[] = [];
    if (chartId.startsWith("evap-")) {
      checkRows = rd?.hourlyData ?? rd?.rawEvaporativeData?.hourly_data ?? [];
    } else if (chartId === "shared-projection") {
      checkRows =
        rd?.projection?.yearlyData ?? rd?.results?.projection?.yearlyData ?? [];
    } else {
      checkRows = rd?.results?.hourlyResults ?? rd?.hourlyResults ?? [];
    }
    if (checkRows.length === 0) continue;

    const label =
      CHART_LABELS[chartId] ??
      chartId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    // ── Chart page — new page for every chart except the first ──────────
    if (chartIndex === 0) {
      // First chart: render on the same page as the section header
      y = ensureSpace(doc, y, 60);
    } else {
      doc.addPage();
      y = 20;
    }

    // Minimal heading (avoid heavy boxed styling)
    doc.setFontSize(10);
    tc(doc, NAVY);
    doc.setFont("Bricolage Grotesque", "bold");
    doc.text(`${chartIndex + 1}. ${label}`, chartX, y + 5);
    doc.setFont("Bricolage Grotesque", "normal");
    dc(doc, [220, 230, 245]);
    doc.setLineWidth(0.25);
    doc.line(chartX, y + 7, chartX + chartW, y + 7);
    y += 11;

    // Image — preserve aspect ratio, centered, with comfortable margins
    // Scale to fit within available area — constrained to chartW so right edge never clips
    const availW = chartW;
    const availH = ph - y - 16;

    try {
      // Decode base64 to get natural dimensions via a canvas
      const imgDims = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new window.Image();
        img.onload = () =>
          resolve({ w: img.naturalWidth || 800, h: img.naturalHeight || 500 });
        img.onerror = () => resolve({ w: 800, h: 500 });
        img.src = dataUrl;
      });

      // Scale to fit within available area while preserving aspect ratio
      const scale = Math.min(availW / imgDims.w, availH / imgDims.h);
      // Hard-cap imgW to chartW so it never overflows the right margin
      const imgW = Math.min(imgDims.w * scale, chartW);
      const imgH = imgDims.h * scale;

      // Center image in the available content width
      const offsetX = chartX + (chartW - imgW) / 2;
      doc.addImage(dataUrl, "PNG", offsetX, y + 2, imgW, imgH);
    } catch (e) {
      // Fallback: fixed size, centered
      const fallbackW = availW;
      const fallbackH = Math.min(availH, fallbackW * 0.6);
      const offsetX = chartX + (chartW - fallbackW) / 2;
      try {
        doc.addImage(dataUrl, "PNG", offsetX, y + 2, fallbackW, fallbackH);
      } catch {
        fc(doc, [245, 248, 253]);
        doc.roundedRect(chartX, y, chartW, 60, 2, 2, "F");
        doc.setFontSize(9);
        tc(doc, MID);
        doc.text(
          "Chart image could not be embedded.",
          chartX + chartW / 2,
          y + 32,
          { align: "center" },
        );
      }
    }

    // ── Table page — always a new page ───────────────────────────────────
    renderChartSampleTable(doc, chartId, rd);

    chartIndex++;
  }
}

// Metric explanation lookup — combines What It Measures with tooltip text from SimulationDetailedView
const METRIC_EXPLANATIONS: Record<string, string> = {
  PUE: "Power Usage Effectiveness = Total Facility Power / IT Power. Ideal = 1.0. Lower is better. Ratio of total facility power to IT power — a value of 1.0 is ideal; lower means more efficient cooling.",
  "Total Energy":
    "Total annual electricity consumed by the entire facility (IT + cooling + auxiliary) measured in kWh over 8,760 simulation hours.",
  "Carbon (kg)":
    "Total CO2 emissions for the year = Total Energy x grid carbon intensity factor. Reflects the environmental burden of the cooling strategy.",
  Runtime:
    "Wall-clock time taken by the simulation engine to complete the full 8,760-hour annual co-simulation run.",
  "Avg COP":
    "Coefficient of Performance = Cooling Output / Compressor Power Input. Higher is better. Higher values mean the chiller produces more cooling per unit of electricity consumed.",
  "Average COP":
    "Coefficient of Performance = Cooling Output / Compressor Power Input. Higher is better. Higher values mean the chiller produces more cooling per unit of electricity consumed.",
  WUE: "Water Usage Effectiveness = Annual Water Consumed (L) / Annual IT Energy (kWh). Lower is better. Reflects cooling tower evaporation losses. 0 = no water used.",
  "Peak Cool (kW)":
    "Maximum instantaneous cooling load observed during the 8,760-hour simulation. Determines the minimum chiller capacity required for the site.",
  "Cooling Load":
    "Total annual cooling energy delivered by the chiller plant to the white space. The difference between this and total energy is auxiliary overhead.",
  "Water Usage":
    "Total litres of water consumed annually by the cooling tower evaporation process. A critical constraint in water-scarce regions.",
  "Annual Cost":
    "Total annual operating expenditure including electricity and maintenance costs. Excludes capital expenditure amortisation.",
  "Ann. Savings":
    "Annual cost savings compared to a PUE 1.8 baseline mechanical-only system. Represents the financial benefit of the cooling strategy.",
  "Annual Savings":
    "Annual cost savings compared to a PUE 1.8 baseline mechanical-only system. Represents the financial benefit of the cooling strategy.",
  CAPEX:
    "Capital expenditure — the upfront installation cost for the full cooling plant including all major equipment and installation.",
  LCCP: "Life-Cycle Cost of Plant over 15 years = CAPEX + NPV of all annual OpEx. Accounts for time value of money at 9.71% discount rate.",
  NPV: "Net Present Value — present value of future savings minus CAPEX. A positive value means the investment is profitable over the analysis horizon.",
  Payback:
    "Simple payback period = CAPEX / Annual Savings. Years until the capital investment is recovered from operational savings versus the baseline system.",
  CUE: "Carbon Usage Effectiveness = Annual CO2 Emissions / Annual IT Energy. Lower is better. Kilograms of CO2 emitted per kWh of IT energy served — lower values indicate a greener cooling operation.",
  "IT Energy":
    "Total annual energy consumed by IT equipment only (servers, storage, networking). Excludes all cooling overhead.",
  "Cooling Energy":
    "Total annual energy consumed by the cooling system (fans, compressors). The difference between total facility energy and IT energy.",
  "Elec Cost":
    "Annual electricity cost = Total Energy x electricity tariff rate. Calculated from total facility energy multiplied by the configured tariff.",
  "Carbon Tax":
    "Annual carbon tax liability = CO2 emissions x carbon price per tonne. Regulatory carbon price at IPCC 2030 pathway.",
  "Annual OpEx":
    "Total annual operating expenditure — the sum of electricity cost and carbon tax for the year.",
  "Energy Sav %":
    "Percentage of energy saved compared to a PUE 1.8 baseline. Reflects how much the economizer reduces total facility energy consumption.",
  "Energy Savings":
    "Percentage of energy saved compared to a PUE 1.8 baseline mechanical-only system.",
  "Carbon Sav":
    "Kilograms of CO2 avoided compared to the baseline system. Quantifies the environmental benefit of using free cooling.",
  "Carbon Savings":
    "Kilograms of CO2 avoided compared to the baseline system. Quantifies the environmental benefit of using free cooling.",
  "PUE Max":
    "Peak Power Usage Effectiveness observed during the simulation. Represents the worst-case efficiency hour across the full year — occurs during the hottest hours when mechanical cooling is fully engaged.",
  "Fan Energy":
    "Annual energy consumed by supply and return fans. In pure evaporative mode this is the only cooling electrical load (no compressor).",
  "DX Backup":
    "Annual energy consumed by the DX compressor backup. Zero when the system operates in pure evaporative mode; non-zero if hybrid backup activates.",
  "OpEx/kWh IT":
    "Operating cost per kWh of IT energy served. Normalises cost for comparison across different IT load scales.",
  "OpEx per kWh IT":
    "Operating cost per kWh of IT energy served. Normalises cost for comparison across different IT load scales.",
  "CO2 Total":
    "Total annual CO2 emissions from facility electricity consumption, calculated using the grid carbon intensity factor.",
  "CO2 per kWh IT":
    "Carbon intensity per unit of IT work — kilograms of CO2 per kWh of IT energy. Lower values indicate a greener compute environment.",
  "Water Total":
    "Total annual water consumption. Zero in indirect evaporative mode; non-zero in direct evaporative mode where water evaporates into the supply air.",
  "Max Inlet Temp":
    "Maximum rack inlet temperature observed during the simulation. Must stay below 27 degrees C to comply with ASHRAE Class A1 thermal limits.",
  "Cooling Cap Avg":
    "Average cooling capacity delivered by the evaporative system per hour. When this falls below the average IT heat load, a thermal deficit occurs.",
  "Cooling Capacity Avg":
    "Average cooling capacity delivered by the evaporative system per hour. When this falls below the average IT heat load, a thermal deficit occurs.",
  "Failure Hours":
    "Number of hours during the year where cooling capacity was insufficient to maintain safe rack inlet temperatures. 0 = no failures.",
  "Cooling Failure Hours":
    "Number of hours during the year where cooling capacity was insufficient to maintain safe rack inlet temperatures.",
};

function appendMetricsAppendix(
  doc: jsPDF,
  rd: any,
  aiExplanation?: string,
  aiInsight?: string,
) {
  const metrics = rd?.results?.metrics ?? {};
  const annual = rd?.results?.annual ?? {};
  const econ = rd?.results?.economics ?? {};
  const s = rd?.summary ?? {};
  const evapRaw = rd?.rawEvaporativeData ?? {};
  const evapRes = evapRaw?.results ?? {};
  const evapPerf = evapRes?.performance ?? {};
  const evapAssess = rd?.coolingAdequacy ?? evapRaw?.cooling_assessment ?? {};

  // Detect technique — evap first to avoid false positives
  const isEvap =
    rd?.coolingTechnique === "evaporative" || !!rd?.rawEvaporativeData;
  const isChilled =
    !isEvap &&
    !!(
      metrics.averageCOP !== undefined ||
      rd?.coolingTechnique === "chilled_water" ||
      rd?.results?.phase4Gates
    );
  const isAir =
    !isEvap &&
    !isChilled &&
    !!(
      rd?.airflowViolations ||
      rd?.coolingTechnique === "air_economizer" ||
      s.totalItEnergy_kWh
    );
  const techniqueLabel = isEvap
    ? "Evaporative Cooling"
    : isAir
      ? "Air-Side Economizer"
      : "Chilled Water System";

  const metricRows: Array<[string, string, string, string]> = [];
  const pushMetric = (
    label: string,
    value: any,
    unit: string,
    source: string,
  ) => {
    if (value === null || value === undefined || value === "") return;
    const rendered =
      unit === "USD"
        ? `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
        : fmt(value, 4);
    metricRows.push([label, rendered, unit || "", source]);
  };

  // Common metrics
  pushMetric(
    "PUE",
    isEvap ? (evapPerf.pue_average ?? rd?.pue) : (metrics.pue ?? s.averagePUE),
    "",
    isEvap
      ? "results.performance.pue_average"
      : "results.metrics.pue / summary.averagePUE",
  );
  pushMetric(
    "Total Energy",
    isEvap
      ? (evapRes.energy?.electricity_kwh_total ?? rd?.totalEnergyConsumption)
      : (annual.energyConsumption_kWh ?? s.totalEnergy_kWh),
    "kWh",
    isEvap
      ? "results.energy.electricity_kwh_total"
      : "results.annual.energyConsumption_kWh / summary.totalEnergy_kWh",
  );
  pushMetric(
    "Carbon",
    isEvap
      ? (evapRes.emissions?.co2_kg_total ?? rd?.carbonFootprint)
      : (annual.carbonEmissions_kg ?? s.totalCarbonEmissions_kg),
    "kg",
    isEvap
      ? "results.emissions.co2_kg_total"
      : "results.annual.carbonEmissions_kg / summary.totalCarbonEmissions_kg",
  );

  // Chilled-specific
  if (isChilled) {
    pushMetric(
      "Average COP",
      metrics.averageCOP,
      "",
      "results.metrics.averageCOP",
    );
    pushMetric("WUE", metrics.wue, "L/kWh", "results.metrics.wue");
    pushMetric(
      "Peak Cooling Load",
      metrics.peakCoolingLoad_kW,
      "kW",
      "results.metrics.peakCoolingLoad_kW",
    );
    pushMetric(
      "Cooling Load",
      annual.coolingLoad_kWh,
      "kWh",
      "results.annual.coolingLoad_kWh",
    );
    pushMetric(
      "Water Usage",
      annual.waterUsage_L,
      "L",
      "results.annual.waterUsage_L",
    );
    pushMetric(
      "Annual Cost",
      annual.cost_USD ?? econ.opex_annual_USD,
      "USD",
      "results.annual.cost_USD / results.economics.opex_annual_USD",
    );
    pushMetric(
      "Annual Savings",
      rd?.annualSavingsUSD ?? econ.annualSavingsUSD,
      "USD",
      "annualSavingsUSD / results.economics.annualSavingsUSD",
    );
    pushMetric("CAPEX", econ.capex_USD, "USD", "results.economics.capex_USD");
    pushMetric("LCCP", econ.lccp_USD, "USD", "results.economics.lccp_USD");
    pushMetric("NPV", econ.npv_USD, "USD", "results.economics.npv_USD");
    pushMetric(
      "Payback",
      econ.paybackPeriod_years,
      "yrs",
      "results.economics.paybackPeriod_years",
    );
  }

  // Air-specific
  if (isAir) {
    pushMetric("CUE", s.averageCUE, "kgCO2/kWh", "summary.averageCUE");
    pushMetric(
      "IT Energy",
      s.totalItEnergy_kWh,
      "kWh",
      "summary.totalItEnergy_kWh",
    );
    pushMetric(
      "Cooling Energy",
      s.totalCoolingEnergy_kWh,
      "kWh",
      "summary.totalCoolingEnergy_kWh",
    );
    pushMetric(
      "Electricity Cost",
      s.electricityCostUSD,
      "USD",
      "summary.electricityCostUSD",
    );
    pushMetric(
      "Carbon Tax",
      s.carbonTaxCostUSD,
      "USD",
      "summary.carbonTaxCostUSD",
    );
    pushMetric("Annual OpEx", s.annualOpExUSD, "USD", "summary.annualOpExUSD");
    pushMetric("CAPEX", s.totalCapexUSD, "USD", "summary.totalCapexUSD");
    pushMetric(
      "Annual Savings",
      s.annualSavingsUSD,
      "USD",
      "summary.annualSavingsUSD",
    );
    pushMetric(
      "Energy Savings",
      s.energySavingsPercent,
      "%",
      "summary.energySavingsPercent",
    );
    pushMetric(
      "Carbon Savings",
      s.carbonSavings_kg,
      "kg",
      "summary.carbonSavings_kg",
    );
    pushMetric(
      "Payback",
      s.paybackPeriodYears,
      "yrs",
      "summary.paybackPeriodYears",
    );
  }

  // Evap-specific
  if (isEvap) {
    pushMetric(
      "PUE Max",
      rd?.pue_max ?? evapPerf?.pue_max,
      "",
      "results.performance.pue_max",
    );
    pushMetric(
      "CUE",
      rd?.cue ?? evapPerf?.cue_average,
      "kgCO2/kWh",
      "results.performance.cue_average",
    );
    pushMetric(
      "WUE",
      rd?.wue ?? evapPerf?.wue_average,
      "L/kWh",
      "results.performance.wue_average",
    );
    pushMetric(
      "IT Energy",
      rd?.it_kwh ?? evapRes.energy?.it_kwh,
      "kWh",
      "results.energy.it_kwh",
    );
    pushMetric(
      "Fan Energy",
      rd?.fan_kwh ?? evapRes.energy?.fan_kwh,
      "kWh",
      "results.energy.fan_kwh",
    );
    pushMetric(
      "DX Backup",
      rd?.dx_kwh ?? evapRes.energy?.dx_kwh,
      "kWh",
      "results.energy.dx_kwh",
    );
    pushMetric(
      "Annual Cost",
      rd?.estimatedCost ?? evapRes.cost?.total_energy_cost_usd,
      "USD",
      "results.cost.total_energy_cost_usd",
    );
    pushMetric(
      "OpEx per kWh IT",
      rd?.opex_per_kwh_it ?? evapRes.opex?.opex_per_kwh_it,
      "USD",
      "results.opex.opex_per_kwh_it",
    );
    pushMetric(
      "CO2 per kWh IT",
      rd?.co2_kg_per_kwh_it ?? evapRes.emissions?.co2_kg_per_kwh_it,
      "kg",
      "results.emissions.co2_kg_per_kwh_it",
    );
    pushMetric(
      "Water Total",
      rd?.waterConsumption ?? evapRes.water?.water_liters_total,
      "L",
      "results.water.water_liters_total",
    );
    pushMetric(
      "Max Inlet Temp",
      evapAssess?.keyMetrics?.max_inlet_temp_c ??
        evapRaw?.cooling_assessment?.key_metrics?.max_inlet_temp_c,
      "C",
      "cooling_assessment.key_metrics.max_inlet_temp_c",
    );
    pushMetric(
      "Cooling Capacity Avg",
      evapAssess?.keyMetrics?.cooling_capacity_avg_kw ??
        evapRaw?.cooling_assessment?.key_metrics?.cooling_capacity_avg_kw,
      "kW",
      "cooling_assessment.key_metrics.cooling_capacity_avg_kw",
    );
    pushMetric(
      "Cooling Failure Hours",
      rd?.cooling_failure_hours ?? evapPerf?.cooling_failure_hours,
      "hrs",
      "results.performance.cooling_failure_hours",
    );
  }

  doc.addPage();
  let y = 20;
  y = sectionHeader(doc, "3. Tab - Detailed Metrics", y);
  y = sectionHeader(doc, "3.1 KPI Metrics", y - 6);

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value", "Unit", "What It Measures"]],
    body: metricRows.map(([label, value, unit, _source]) => [
      label,
      value,
      unit,
      METRIC_EXPLANATIONS[label] ?? "Simulation output metric.",
    ]),
    theme: "grid",
    margin: { left: 14, right: 14 },
    styles: { fontSize: 7, cellPadding: 1.8, overflow: "linebreak" }, // Reduced from 7.5 to 7, padding from 2 to 1.8
    headStyles: {
      fillColor: PRIMARY,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 7.5, // Reduced from 8 to 7.5
    },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 38 },
      1: { halign: "right", cellWidth: 28 },
      2: { halign: "center", cellWidth: 16 },
      3: { cellWidth: "auto", fontSize: 6.5 }, // Reduced from 7 to 6.5 for description column
    },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // AI Metrics Explanation block
  if (aiExplanation) {
    y = ensureSpace(doc, y, 50);
    const pw2 = doc.internal.pageSize.getWidth();
    const expLines = doc.splitTextToSize(aiExplanation, pw2 - 36);
    const insLines = aiInsight ? doc.splitTextToSize(aiInsight, pw2 - 36) : [];
    const blockH = Math.min(
      expLines.length * 4.5 +
        (insLines.length > 0 ? insLines.length * 4.5 + 8 : 0) +
        12,
      120,
    );

    fc(doc, [240, 245, 255]);
    doc.roundedRect(14, y, pw2 - 28, blockH, 2, 2, "F");
    fc(doc, PRIMARY);
    doc.rect(14, y, 3, blockH, "F");

    doc.setFontSize(8);
    tc(doc, PRIMARY);
    doc.setFont("helvetica", "bold");
    doc.text("AI Metrics Analysis", 20, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    tc(doc, DARK);
    doc.text(expLines, 20, y + 13);

    if (insLines.length > 0) {
      const insY = y + 13 + expLines.length * 4.5 + 4;
      doc.setFontSize(8);
      tc(doc, MID);
      doc.setFont("helvetica", "italic");
      doc.text(insLines, 20, insY);
      doc.setFont("helvetica", "normal");
    }
    y += blockH + 6;
  }

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
      styles: { fontSize: 7, cellPadding: 1.8 }, // Reduced from 8 to 7, padding from 2 to 1.8
      headStyles: {
        fillColor: DARK,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 7.5,
      }, // Added fontSize
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
        [
          "Mode Breakdown",
          Object.entries(airflow.modeBreakdown ?? {})
            .map(([mode, count]) => `${mode}: ${count}`)
            .join(" | ") || "—",
        ],
        [
          "Messages",
          Array.isArray(airflow.uniqueMessages)
            ? airflow.uniqueMessages.join(" | ")
            : "—",
        ],
      ],
      theme: "grid",
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7, cellPadding: 1.8, overflow: "linebreak" }, // Reduced from 8 to 7, padding from 2 to 1.8
      headStyles: {
        fillColor: ACCENT,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 7.5,
      }, // Added fontSize
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 42 },
        1: { cellWidth: "auto" },
      },
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
        [
          "Average Utilization",
          rd?.averageUtilization != null
            ? `${(Number(rd.averageUtilization) * 100).toFixed(2)}%`
            : "—",
        ],
        ["Total Racks", rd?.rackAnalysis?.totalRacks ?? "—"],
        ["Hotspot Racks", rd?.rackAnalysis?.hotspotRacks ?? "—"],
        [
          "Average Rack Load",
          rd?.rackAnalysis?.averageRackLoadKW != null
            ? `${Number(rd.rackAnalysis.averageRackLoadKW).toFixed(2)} kW`
            : "—",
        ],
        [
          "Max Rack Load",
          rd?.rackAnalysis?.maxRackLoadKW != null
            ? `${Number(rd.rackAnalysis.maxRackLoadKW).toFixed(2)} kW`
            : "—",
        ],
      ],
      theme: "grid",
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7, cellPadding: 1.8 }, // Reduced from 8 to 7, padding from 2 to 1.8
      headStyles: {
        fillColor: GREEN,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 7.5,
      }, // Added fontSize
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 46 },
        1: { cellWidth: "auto" },
      },
    });
  }
}

function appendRecommendationsAppendix(
  doc: jsPDF,
  rd: any,
  result: SimulationPDFData["result"],
) {
  const mlRec = rd?.mlRecommendation;
  const fallback = result?.recommendation;
  if (!mlRec && !fallback) return;

  doc.addPage();
  let y = 20;
  y = sectionHeader(doc, "4. Tab - Recommendations", y);

  // Summary section
  const summary = [
    [
      "Current Technique",
      mlRec?.current_technique ?? rd?.simulation_type ?? "â€”",
    ],
    ["Recommended Technique", mlRec?.model_recommendation ?? fallback ?? "â€”"],
    [
      "Generated UTC",
      mlRec?.generated_at_utc
        ? new Date(mlRec.generated_at_utc).toLocaleString()
        : "â€”",
    ],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Parameter", "Value"]],
    body: summary,
    theme: "grid",
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8.5, cellPadding: 2.5, halign: "left" },
    headStyles: {
      fillColor: PRIMARY,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 60 },
      1: { fontStyle: "bold", textColor: DARK },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Why this recommendation
  if (
    Array.isArray(mlRec?.why_this_is_recommended) &&
    mlRec.why_this_is_recommended.length > 0
  ) {
    y = sectionHeader(doc, "4.1 Why This Recommendation", y);
    const reasons = mlRec.why_this_is_recommended.filter(
      (r: any) => r && !r.includes("available when"),
    );
    if (reasons.length > 0) {
      const reasonsText = reasons.join("\n\n");
      y =
        addWrappedTextBlock(
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
  if (
    mlRec?.future_impact_paragraph &&
    !mlRec.future_impact_paragraph.includes("available when")
  ) {
    y = sectionHeader(doc, "4.2 Future Impact & Analysis", y);
    y =
      addWrappedTextBlock(
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
  if (
    Array.isArray(mlRec?.comparison_table) &&
    mlRec.comparison_table.length > 0
  ) {
    y = renderTechniqueTable(
      doc,
      "4.3 Technique Comparison Table",
      mlRec.comparison_table,
      y,
    );
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
  const isEvapPDF = !!(rd?.coolingTechnique === "evaporative" || rd?.rawEvaporativeData);
  const isChilledPDF = !isEvapPDF && !!(metrics.averageCOP !== undefined || rd?.coolingTechnique === "chilled_water");
  const isAirPDF = !isEvapPDF && !isChilledPDF && !!(rd?.airflowViolations || rd?.coolingTechnique === "air_economizer" || summary.totalItEnergy_kWh);

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
        "Â°C / %",
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
        "Â°C / %",
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
        "Â°C / %",
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

function coverPage(
  doc: jsPDF,
  data: SimulationPDFData,
  logoDataUrl?: string | null,
) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // â”€â”€ Clean white background â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fc(doc, WHITE);
  doc.rect(0, 0, pw, ph, "F");

  // â”€â”€ Top header bar â€” dark navy, no neon â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const NAVY: RGB = [26, 42, 74];
  const STEEL: RGB = [71, 95, 130];
  const SLATE: RGB = [100, 116, 139];
  fc(doc, NAVY);
  doc.rect(0, 0, pw, 52, "F");

  // â”€â”€ Brand name â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  doc.setFontSize(11);
  tc(doc, WHITE);
  doc.setFont("Bricolage Grotesque", "bold");
  if (logoDataUrl) {
    // Embed logo from public folder (fetched as base64 data URL)
    try {
      doc.addImage(logoDataUrl, "PNG", 14, 12, 32, 28);
    } catch {
      // Logo embed failed, fall back to text
      doc.text("COOLIENCE", 14, 22);
    }
  } else {
    doc.text("COOLIENCE", 14, 22);
  }
  doc.setFontSize(10);
  doc.setFont("Bricolage Grotesque", "normal");
  tc(doc, [180, 195, 215]);

  // Report type right-aligned
  doc.setFontSize(10);
  tc(doc, [180, 195, 215]);
  doc.text("SIMULATION ANALYSIS REPORT", pw - 14, 22, { align: "right" });
  doc.setFontSize(9);
  tc(doc, [140, 160, 185]);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`,
    pw - 14,
    29,
    { align: "right" },
  );

  // â”€â”€ Thin accent line below header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fc(doc, STEEL);
  doc.rect(0, 52, pw, 1.5, "F");

  // â”€â”€ Main title â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  doc.setFontSize(34);
  tc(doc, NAVY);
  doc.setFont("Bricolage Grotesque", "bold");
  doc.text("Simulation", 14, 80);
  doc.setFontSize(34);
  tc(doc, STEEL);
  doc.text("Analysis Report", 14, 94);

  // â”€â”€ Simulation name â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  doc.setFontSize(16);
  tc(doc, [40, 55, 80]);
  doc.setFont("Bricolage Grotesque", "bold");
  const nameLines = doc.splitTextToSize(data.simulation.name, pw - 28);
  doc.text(nameLines.slice(0, 2), 14, 110);

  // â”€â”€ Thin divider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fc(doc, [210, 220, 235]);
  doc.rect(14, 118, pw - 28, 0.5, "F");

  // â”€â”€ Technique + status badges â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const techName = data.simulation.simulation_type;
  const badgeW = Math.min(doc.getTextWidth(techName) * 1.05 + 14, 100);
  fc(doc, NAVY);
  doc.roundedRect(14, 124, badgeW, 9, 1.5, 1.5, "F");
  doc.setFontSize(9.5);
  tc(doc, WHITE);
  doc.setFont("Bricolage Grotesque", "bold");
  doc.text(techName.toUpperCase(), 14 + badgeW / 2, 130, { align: "center" });

  const statusColor: RGB =
    data.simulation.status === "completed"
      ? [22, 101, 52]
      : data.simulation.status === "failed"
        ? [153, 27, 27]
        : [120, 90, 10];
  fc(doc, statusColor);
  doc.roundedRect(14 + badgeW + 4, 124, 30, 9, 1.5, 1.5, "F");
  doc.setFontSize(9.5);
  tc(doc, WHITE);
  doc.setFont("Bricolage Grotesque", "bold");
  doc.text(data.simulation.status.toUpperCase(), 14 + badgeW + 4 + 15, 130, {
    align: "center",
  });

  // â”€â”€ Metadata table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const meta: [string, string][] = [
    ["Simulation ID", `#${data.simulation.id}`],
    ["Status", data.simulation.status],
    ["Created", new Date(data.simulation.created_at).toLocaleString()],
    [
      "Completed",
      data.result.completed_at
        ? new Date(data.result.completed_at).toLocaleString()
        : "â€”",
    ],
    ["Runtime", `${data.result.runtime_minutes ?? "â€”"} min`],
    ["Report Date", new Date().toLocaleString()],
  ];

  const colW = (pw - 28) / 2;
  meta.forEach(([k, v], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const mx = 14 + col * (colW + 4);
    const my = 142 + row * 14;

    doc.setFontSize(8.5);
    tc(doc, SLATE);
    doc.setFont("Bricolage Grotesque", "normal");
    doc.text(k, mx, my);

    doc.setFontSize(10);
    tc(doc, NAVY);
    doc.setFont("Bricolage Grotesque", "bold");
    doc.text(doc.splitTextToSize(v, colW - 8)[0], mx, my + 5.5);
  });

  // â”€â”€ Description â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (data.simulation.description) {
    const descY = 142 + Math.ceil(meta.length / 2) * 14 + 6;
    doc.setFontSize(9);
    tc(doc, SLATE);
    doc.setFont("Bricolage Grotesque", "normal");
    doc.text("Description", 14, descY);
    doc.setFontSize(10);
    tc(doc, [40, 55, 80]);
    const descLines = doc.splitTextToSize(data.simulation.description, pw - 28);
    doc.text(descLines.slice(0, 3), 14, descY + 5.5);
  }

  // â”€â”€ KPI strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const rd = data.result.result_data ?? {};
  const pue =
    rd?.results?.metrics?.pue ??
    rd?.summary?.averagePUE ??
    rd?.rawEvaporativeData?.results?.performance?.pue_average;
  const energy =
    rd?.results?.annual?.energyConsumption_kWh ??
    rd?.summary?.totalEnergy_kWh ??
    rd?.rawEvaporativeData?.results?.energy?.electricity_kwh_total;
  const carbon =
    rd?.results?.annual?.carbonEmissions_kg ??
    rd?.summary?.totalCarbonEmissions_kg ??
    rd?.rawEvaporativeData?.results?.emissions?.co2_kg_total;
  const cost =
    rd?.results?.annual?.cost_USD ??
    rd?.summary?.annualOpExUSD ??
    rd?.rawEvaporativeData?.results?.cost?.total_energy_cost_usd;

  const kpis = [
    { label: "PUE", value: pue != null ? Number(pue).toFixed(4) : "â€”" },
    {
      label: "Energy (kWh)",
      value:
        energy != null
          ? Number(energy).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })
          : "â€”",
    },
    {
      label: "Carbon (kg)",
      value:
        carbon != null
          ? Number(carbon).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })
          : "â€”",
    },
    {
      label: "Annual Cost",
      value:
        cost != null
          ? `$${Number(cost).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
          : "â€”",
    },
  ];

  const kpiY = ph - 50;
  fc(doc, [245, 248, 252]);
  doc.rect(0, kpiY - 8, pw, 42, "F");
  fc(doc, [210, 220, 235]);
  doc.rect(0, kpiY - 8, pw, 0.5, "F");

  doc.setFontSize(8.5);
  tc(doc, SLATE);
  doc.setFont("Bricolage Grotesque", "normal");
  doc.text("KEY PERFORMANCE INDICATORS", 14, kpiY - 2);

  const kpiW = (pw - 28 - 9) / 4;
  kpis.forEach((k, i) => {
    const kx = 14 + i * (kpiW + 3);
    doc.setFontSize(8.5);
    tc(doc, SLATE);
    doc.setFont("Bricolage Grotesque", "normal");
    doc.text(k.label, kx, kpiY + 6);
    doc.setFontSize(14);
    tc(doc, NAVY);
    doc.setFont("Bricolage Grotesque", "bold");
    doc.text(k.value, kx, kpiY + 15);
  });

  // â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fc(doc, NAVY);
  doc.rect(0, ph - 10, pw, 10, "F");
  doc.setFontSize(9);
  tc(doc, [180, 195, 215]);
  doc.setFont("Bricolage Grotesque", "normal");
}

export const generateSimulationPDF = async (data: SimulationPDFData) => {
  try {
    // Fetch logo from public folder and convert to base64 data URL
    let logoDataUrl: string | null = null;
    try {
      const resp = await fetch("/logo1.png");
      if (resp.ok) {
        const blob = await resp.blob();
        logoDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch {
      // Logo not available, continue without it
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const rd = data.result.result_data ?? {};

    coverPage(doc, data, logoDataUrl);
    // â”€â”€ Page 2: Overview Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    doc.addPage();
    let y = 20;
    y = sectionHeader(doc, "1. Overview", y);

    // KPI Cards — technique-specific (mirrors SimulationDetail.tsx)
    const simType = (data.simulation.simulation_type ?? "").toLowerCase();
    const isEvapPDF =
      rd?.coolingTechnique === "evaporative" || simType.includes("evap");
    const isAirPDF =
      rd?.coolingTechnique === "air_economizer" || simType.includes("air");

    const evapPerf2 = rd?.rawEvaporativeData?.results?.performance ?? {};
    const evapAssess2 =
      rd?.coolingAdequacy ?? rd?.rawEvaporativeData?.cooling_assessment ?? {};
    const km2 = evapAssess2?.keyMetrics ?? evapAssess2?.key_metrics ?? {};

    if (isEvapPDF) {
      y = kpiRow(doc, y, [
        {
          label: "Runtime",
          value: fmt(data.result.runtime_minutes),
          unit: "min",
          color: ACCENT,
        },
        {
          label: "PUE Average",
          value: (evapPerf2.pue_average ?? rd?.pue ?? 0).toFixed(4),
          unit: "",
          color: PRIMARY,
        },
        {
          label: "Cooling Cap Avg",
          value: (km2.cooling_capacity_avg_kw ?? 0).toFixed(2),
          unit: "kW",
          color: GREEN,
        },
        {
          label: "Annual Cost",
          value: `$${(rd?.rawEvaporativeData?.results?.cost?.total_energy_cost_usd ?? rd?.estimatedCost ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          unit: "",
          color: [139, 92, 246] as RGB,
        },
      ]);
    } else if (isAirPDF) {
      y = kpiRow(doc, y, [
        {
          label: "Runtime",
          value: fmt(data.result.runtime_minutes),
          unit: "min",
          color: ACCENT,
        },
        {
          label: "Energy Consumed",
          value: (data.result.energy_consumed_kwh ?? 0).toFixed(2),
          unit: "kWh",
          color: PRIMARY,
        },
        {
          label: "Energy Savings",
          value: (
            rd?.summary?.energySavingsPercent ??
            data.result.cost_saving_percent ??
            0
          ).toFixed(1),
          unit: "%",
          color: GREEN,
        },
        {
          label: "Annual Savings",
          value: `$${(rd?.summary?.annualSavingsUSD ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          unit: "",
          color: [139, 92, 246] as RGB,
        },
      ]);
    } else {
      y = kpiRow(doc, y, [
        {
          label: "Runtime",
          value: fmt(data.result.runtime_minutes),
          unit: "min",
          color: ACCENT,
        },
        {
          label: "Energy Consumed",
          value: (data.result.energy_consumed_kwh ?? 0).toFixed(2),
          unit: "kWh",
          color: PRIMARY,
        },
        {
          label: "PUE",
          value: (
            rd?.results?.metrics?.pue ??
            data.result.cooling_efficiency ??
            0
          ).toFixed(4),
          unit: "",
          color: GREEN,
        },
        {
          label: "Annual Cost",
          value: `$${(rd?.results?.annual?.cost_USD ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          unit: "",
          color: [139, 92, 246] as RGB,
        },
      ]);
    }

    // Performance Summary — technique-specific metrics
    y = ensureSpace(doc, y, 60);
    const annual = rd?.results?.annual ?? rd?.summary ?? {};
    const metrics = rd?.results?.metrics ?? {};
    const econ = rd?.results?.economics ?? {};
    const s = rd?.summary ?? {};

    let perfRows: [string, string][] = [];
    if (isEvapPDF) {
      const evapRes = rd?.rawEvaporativeData?.results ?? {};
      const evapCost = evapRes?.cost ?? {};
      const evapEnergy = evapRes?.energy ?? {};
      const evapWater = evapRes?.water ?? {};
      perfRows = [
        ["PUE Average", (evapPerf2.pue_average ?? rd?.pue ?? 0).toFixed(4)],
        ["Peak PUE", (evapPerf2.pue_peak ?? 0).toFixed(4)],
        [
          "Cooling Capacity Avg",
          `${(km2.cooling_capacity_avg_kw ?? 0).toFixed(2)} kW`,
        ],
        ["IT Load Avg", `${(km2.it_load_avg_kw ?? 0).toFixed(2)} kW`],
        [
          "Total IT Energy",
          `${(evapEnergy.it_kwh ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh`,
        ],
        [
          "Fan Energy",
          `${(evapEnergy.fan_kwh ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh`,
        ],
        [
          "Total Electricity",
          `${(evapEnergy.electricity_kwh_total ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh`,
        ],
        [
          "Annual Water Usage",
          `${(evapWater.total_liters ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} L`,
        ],
        ["WUE", `${(evapWater.wue_liters_per_kwh ?? 0).toFixed(4)} L/kWh`],
        [
          "Annual Energy Cost",
          `$${(evapCost.total_energy_cost_usd ?? rd?.estimatedCost ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        ],
        [
          "Cooling Assessment",
          String(
            rd?.rawEvaporativeData?.cooling_assessment?.assessment ??
              rd?.coolingAdequacy?.assessment ??
              "—",
          ),
        ],
        ["Thermal Violations", String(km2.thermal_violations ?? 0)],
      ];
    } else if (isAirPDF) {
      perfRows = [
        [
          "Total IT Energy",
          `${(s.totalItEnergy_kWh ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh`,
        ],
        [
          "Total Facility Energy",
          `${(s.totalFacilityEnergy_kWh ?? data.result.energy_consumed_kwh ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh`,
        ],
        [
          "Energy Savings",
          `${(s.energySavingsPercent ?? data.result.cost_saving_percent ?? 0).toFixed(1)} %`,
        ],
        [
          "Annual Savings",
          `$${(s.annualSavingsUSD ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        ],
        ["Average PUE", (s.averagePUE ?? 0).toFixed(4)],
        ["Average CUE", (s.averageCUE ?? 0).toFixed(4)],
        [
          "Electricity Cost",
          `$${(s.electricityCostUSD ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        ],
        [
          "Carbon Tax Cost",
          `$${(s.carbonTaxCostUSD ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        ],
        [
          "Total CAPEX",
          `$${(s.totalCapexUSD ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        ],
        ["Payback Period", `${(s.paybackPeriodYears ?? 0).toFixed(1)} years`],
        [
          "Carbon Savings",
          `${(s.carbonSavings_kg ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg CO2`,
        ],
        [
          "Airflow Violations",
          String(rd?.airflowViolations?.totalViolations ?? 0),
        ],
      ];
    } else {
      perfRows = [
        ["Average COP", fmt(metrics.averageCOP)],
        ["PUE", (metrics.pue ?? 0).toFixed(4)],
        ["WUE", `${(metrics.wue ?? 0).toFixed(4)} L/kWh`],
        ["CUE", `${(metrics.cue ?? 0).toFixed(4)} kgCO2/kWh`],
        [
          "Peak Cooling Load",
          `${(metrics.peakCoolingLoad_kW ?? 0).toFixed(2)} kW`,
        ],
        [
          "Annual Energy",
          `${(annual.energyConsumption_kWh ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh`,
        ],
        [
          "Annual Cooling Load",
          `${(annual.coolingLoad_kWh ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh`,
        ],
        [
          "Annual Water Usage",
          `${(annual.waterUsage_L ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} L`,
        ],
        [
          "Annual Carbon Emissions",
          `${(annual.carbonEmissions_kg ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg CO2`,
        ],
        [
          "Annual Cost",
          `$${(annual.cost_USD ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        ],
        [
          "CAPEX",
          `$${(econ.capex_USD ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        ],
        [
          "Annual OpEx",
          `$${(econ.opex_annual_USD ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        ],
        [
          "LCCP",
          `$${(econ.lccp_USD ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        ],
        [
          "NPV",
          `$${(econ.npv_USD ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        ],
        [
          "Payback Period",
          `${(econ.paybackPeriod_years ?? 0).toFixed(1)} years`,
        ],
      ];
    }

    const techniqueLabel2 = isEvapPDF
      ? "Evaporative Cooling"
      : isAirPDF
        ? "Air-Side Economizer"
        : "Chilled Water";
    y = sectionHeader(doc, `Performance Summary — ${techniqueLabel2}`, y);
    autoTable(doc, {
      startY: y,
      head: [["Metric", "Value"]],
      body: perfRows.filter(([, v]) => v !== "—" && v !== "$0" && v !== "0"),
      theme: "grid",
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: {
        fillColor: PRIMARY,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 10,
      },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 72 },
        1: { halign: "right", fontStyle: "bold" },
      },
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
        [
          "Completed At",
          data.result.completed_at
            ? new Date(data.result.completed_at).toLocaleString()
            : "—",
        ],
        ["Runtime (minutes)", fmt(data.result.runtime_minutes)],
      ],
      theme: "grid",
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8.5, cellPadding: 2.4 },
      headStyles: {
        fillColor: DARK,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 9,
      },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 52 },
        1: { cellWidth: "auto" },
      },
    });

    // â”€â”€ Pages 3+: Detailed Sections â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    await appendChartsTabSection(doc, data.capturedCharts, rd);
    appendMetricsAppendix(
      doc,
      rd,
      data.aiMetricsExplanation,
      data.aiMetricsInsight,
    );
    appendRecommendationsAppendix(doc, rd, data.result);

    // â”€â”€ Final: Page Numbers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
