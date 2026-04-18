/**
 * Chart Capture Utility
 * Captures rendered Recharts components as image data URLs for PDF embedding
 */

import html2canvas from "html2canvas";

export interface CapturedChart {
  selector: string;
  imageData: string; // data:image/png;base64,...
  width: number;
  height: number;
}

/**
 * Capture a single chart element by CSS selector
 */
export async function captureChartElement(
  selector: string,
  options?: { scale?: number; backgroundColor?: string }
): Promise<CapturedChart | null> {
  try {
    const element = document.querySelector(selector);
    if (!element) {
      console.warn(`Chart element not found: ${selector}`);
      return null;
    }

    const canvas = await html2canvas(element as HTMLElement, {
      scale: options?.scale ?? 2,
      backgroundColor: options?.backgroundColor ?? "#ffffff",
      useCORS: true,
      logging: false,
      allowTaint: true,
    });

    return {
      selector,
      imageData: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    };
  } catch (error) {
    console.error(`Failed to capture chart: ${selector}`, error);
    return null;
  }
}

/**
 * Capture all chart containers in the simulation detail view
 * Returns a map of chart identifiers to their image data
 */
export async function captureAllCharts(): Promise<Record<string, CapturedChart>> {
  const charts = new Map<string, CapturedChart>();

  // Define chart selectors based on simulation view structure
  // These should match the chart container IDs in SimulationCharts.tsx
  const chartSelectors = [
    // Chilled Water charts
    { id: "chart-consumption-overview", selector: '[data-chart="consumption-overview"]' },
    { id: "chart-cop-timeline", selector: '[data-chart="cop-timeline"]' },
    { id: "chart-cooling-vs-chiller", selector: '[data-chart="cooling-vs-chiller"]' },
    { id: "chart-power-breakdown", selector: '[data-chart="power-breakdown"]' },
    { id: "chart-water-carbon", selector: '[data-chart="water-carbon"]' },
    { id: "chart-cost-structure", selector: '[data-chart="cost-structure"]' },
    { id: "chart-phase4-gates", selector: '[data-chart="phase4-gates"]' },
    { id: "chart-performance-radar", selector: '[data-chart="performance-radar"]' },
    { id: "chart-technique-comparison", selector: '[data-chart="technique-comparison"]' },
    { id: "chart-5year-projection", selector: '[data-chart="5year-projection"]' },

    // Air Economizer charts
    { id: "chart-air-power-breakdown", selector: '[data-chart="air-power-breakdown"]' },
    { id: "chart-airflow-cooling", selector: '[data-chart="airflow-cooling"]' },
    { id: "chart-mode-distribution", selector: '[data-chart="mode-distribution"]' },
    { id: "chart-cost-structure-air", selector: '[data-chart="cost-structure-air"]' },
    { id: "chart-rack-analysis", selector: '[data-chart="rack-analysis"]' },
    { id: "chart-pue-cue", selector: '[data-chart="pue-cue"]' },
    { id: "chart-ambient-conditions", selector: '[data-chart="ambient-conditions"]' },

    // Evaporative charts
    { id: "chart-evap-summary", selector: '[data-chart="evap-summary"]' },
    { id: "chart-evap-power", selector: '[data-chart="evap-power"]' },
    { id: "chart-cooling-capacity", selector: '[data-chart="cooling-capacity"]' },
    { id: "chart-pue-hourly", selector: '[data-chart="pue-hourly"]' },
    { id: "chart-temp-humidity", selector: '[data-chart="temp-humidity"]' },
    { id: "chart-supply-air", selector: '[data-chart="supply-air"]' },
    { id: "chart-cooling-mode", selector: '[data-chart="cooling-mode"]' },
    { id: "chart-cooling-assessment", selector: '[data-chart="cooling-assessment"]' },
  ];

  // Capture each chart with a short delay to allow rendering
  for (const { id, selector } of chartSelectors) {
    const captured = await captureChartElement(selector);
    if (captured) {
      charts.set(id, captured);
    }
    // Small delay to prevent overwhelming the browser
    await new Promise((r) => setTimeout(r, 50));
  }

  return Object.fromEntries(charts);
}

/**
 * Capture charts in batches to manage memory and UI responsiveness
 * Useful for simulations with many charts
 */
export async function captureChartsBatch(
  selectors: Array<{ id: string; selector: string }>,
  batchSize = 3,
  onProgress?: (current: number, total: number) => void
): Promise<Record<string, CapturedChart>> {
  const charts = new Map<string, CapturedChart>();
  const total = selectors.length;

  for (let i = 0; i < selectors.length; i += batchSize) {
    const batch = selectors.slice(i, i + batchSize);
    const promises = batch.map(({ id, selector }) =>
      captureChartElement(selector).then((result) => {
        if (result) {
          charts.set(id, result);
        }
        onProgress?.(Math.min(i + batch.length, total), total);
      })
    );
    await Promise.all(promises);
  }

  return Object.fromEntries(charts);
}

/**
 * Get a specific captured chart by ID
 */
export function getCapturedChart(
  charts: Record<string, CapturedChart>,
  chartId: string
): CapturedChart | undefined {
  return charts[chartId];
}

/**
 * Estimate total size of captured charts (in MB)
 */
export function estimateChartDataSize(
  charts: Record<string, CapturedChart>
): number {
  let totalSize = 0;
  for (const chart of Object.values(charts)) {
    // Rough estimate: each base64 character is ~0.75 bytes
    totalSize += (chart.imageData.length * 0.75) / (1024 * 1024);
  }
  return totalSize;
}
