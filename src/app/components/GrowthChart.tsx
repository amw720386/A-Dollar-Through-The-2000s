import React from "react"
import { motion } from "motion/react";
import { useInView } from "motion/react";
import {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { ChevronDown, X } from "lucide-react";
import { DataPoint } from "../App";
import { TickerLink } from "./TickerLink";
import { SearchResult } from "./SearchBar";
import { getCompanyName } from "./companyData";

interface GrowthChartProps {
  data: DataPoint[];
  searchResult: SearchResult | null;
  searchBar: React.ReactNode;
}

const CHART_PADDING = { top: 20, right: 20, bottom: 40, left: 20 };

function formatScientific(val: number): string {
  if (val === 0) return "$0";
  if (val < 0.01) return `$${val.toExponential(2)}`;
  if (val < 1000) return `$${val.toFixed(2)}`;
  if (val < 1_000_000) return `$${(val / 1000).toFixed(1)}k`;
  if (val < 1_000_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val < 1_000_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
  const exp = Math.floor(Math.log10(val));
  const mantissa = val / Math.pow(10, exp);
  return `$${mantissa.toFixed(2)} × 10^${exp}`;
}

export interface GrowthChartRef {
  scrollIntoView: () => void;
}

type ChartMode = "cumulative" | "daily";

export const GrowthChart = forwardRef<GrowthChartRef, GrowthChartProps>(
  function GrowthChart({ data, searchResult, searchBar }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const isInView = useInView(containerRef, { once: true, amount: 0.1 });

    // pinnedIndex persists when mouse/finger leaves the chart
    // hoveredIndex is ephemeral (only while actively moving over chart)
    const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    // When jumping to a date not in sampled chartData, hold the real data point
    const [overridePoint, setOverridePoint] = useState<DataPoint | null>(null);
    const [svgWidth, setSvgWidth] = useState(800);
    const [selectedHighlightDate, setSelectedHighlightDate] = useState<
      string | null
    >(null);
    const [chartMode, setChartMode] = useState<ChartMode>("cumulative");
    const svgHeight = 500;

    useImperativeHandle(ref, () => ({
      scrollIntoView: () => {
        containerRef.current?.scrollIntoView({ behavior: "smooth" });
      },
    }));

    // When search changes, jump to first match & pin it
    useEffect(() => {
      if (!searchResult) {
        setSelectedHighlightDate(null);
        return;
      }
      if (searchResult.type === "date" && searchResult.dateIndex != null) {
        setSelectedHighlightDate(null);
        containerRef.current?.scrollIntoView({ behavior: "smooth" });
      } else if (searchResult.type === "ticker") {
        setSelectedHighlightDate(null);
        containerRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, [searchResult]);

    useEffect(() => {
      const el = svgRef.current?.parentElement;
      if (!el) return;
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setSvgWidth(entry.contentRect.width);
        }
      });
      observer.observe(el);
      setSvgWidth(el.clientWidth);
      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      const svg = svgRef.current;
      if (!svg) return;
    
      svg.addEventListener("touchstart", (e) => e.preventDefault(), {
        passive: false,
      });
      svg.addEventListener("touchmove", (e) => e.preventDefault(), {
        passive: false,
      });
    
      return () => {
        svg.removeEventListener("touchstart", (e) => e.preventDefault());
        svg.removeEventListener("touchmove", (e) => e.preventDefault());
      };
    }, []);

    // Sample data for rendering
    const chartData = useMemo(() => {
      if (data.length === 0) return [];
      const sampleRate = Math.max(1, Math.floor(data.length / 600));
      return data.filter(
        (_, index) => index % sampleRate === 0 || index === data.length - 1
      );
    }, [data]);

    // ─── Cumulative scales ───
    const cumulativeScales = useMemo(() => {
      if (chartData.length === 0)
        return {
          xScale: () => 0,
          yScale: () => 0,
          yearTicks: [] as { x: number; year: number }[],
        };

      const plotW = svgWidth - CHART_PADDING.left - CHART_PADDING.right;
      const plotH = svgHeight - CHART_PADDING.top - CHART_PADDING.bottom;

      const timestamps = chartData.map((d) => new Date(d.date).getTime());
      const minTime = timestamps[0];
      const maxTime = timestamps[timestamps.length - 1];
      const timeRange = maxTime - minTime || 1;

      const xS = (dateStr: string) => {
        const t = (new Date(dateStr).getTime() - minTime) / timeRange;
        return CHART_PADDING.left + t * plotW;
      };

      const values = chartData
        .map((d) => d.cumulativeValue ?? 1)
        .filter((v) => v > 0);
      const minVal = Math.max(0.01, Math.min(...values));
      const maxVal = Math.max(...values);
      const logMin = Math.floor(Math.log10(minVal));
      const logMax = Math.ceil(Math.log10(maxVal));

      const yS = (val: number) => {
        const log = Math.log10(Math.max(val, 0.01));
        const t = (log - logMin) / (logMax - logMin || 1);
        return CHART_PADDING.top + plotH * (1 - t);
      };

      const startYear = new Date(chartData[0].date).getFullYear();
      const endYear = new Date(
        chartData[chartData.length - 1].date
      ).getFullYear();
      const allYears: { x: number; year: number }[] = [];
      for (let y = startYear; y <= endYear; y++) {
        const jan1 = new Date(y, 0, 1).getTime();
        if (jan1 >= minTime && jan1 <= maxTime) {
          const t = (jan1 - minTime) / timeRange;
          allYears.push({ x: CHART_PADDING.left + t * plotW, year: y });
        }
      }
      const maxLabels = Math.max(2, Math.floor(plotW / 50));
      const step = Math.max(1, Math.ceil(allYears.length / maxLabels));
      const thinned = allYears.filter((_, i) => i % step === 0);

      return { xScale: xS, yScale: yS, yearTicks: thinned };
    }, [chartData, svgWidth]);

    // ─── Daily % scales ───
    const dailyScales = useMemo(() => {
      if (chartData.length === 0)
        return {
          xScale: () => 0,
          yScale: () => 0,
          zeroY: 0,
          yearTicks: [] as { x: number; year: number }[],
        };

      const plotW = svgWidth - CHART_PADDING.left - CHART_PADDING.right;
      const plotH = svgHeight - CHART_PADDING.top - CHART_PADDING.bottom;

      const timestamps = chartData.map((d) => new Date(d.date).getTime());
      const minTime = timestamps[0];
      const maxTime = timestamps[timestamps.length - 1];
      const timeRange = maxTime - minTime || 1;

      const xS = (dateStr: string) => {
        const t = (new Date(dateStr).getTime() - minTime) / timeRange;
        return CHART_PADDING.left + t * plotW;
      };

      const gains = chartData.map((d) => d.percent_gain);
      const maxGain = Math.max(...gains);
      const minGain = Math.min(0, Math.min(...gains));
      const range = maxGain - minGain || 1;

      const yS = (val: number) => {
        const t = (val - minGain) / range;
        return CHART_PADDING.top + plotH * (1 - t);
      };

      const zeroY = yS(0);

      const startYear = new Date(chartData[0].date).getFullYear();
      const endYear = new Date(
        chartData[chartData.length - 1].date
      ).getFullYear();
      const allYears: { x: number; year: number }[] = [];
      for (let y = startYear; y <= endYear; y++) {
        const jan1 = new Date(y, 0, 1).getTime();
        if (jan1 >= minTime && jan1 <= maxTime) {
          const t = (jan1 - minTime) / timeRange;
          allYears.push({ x: CHART_PADDING.left + t * plotW, year: y });
        }
      }
      const maxLabels = Math.max(2, Math.floor(plotW / 50));
      const step = Math.max(1, Math.ceil(allYears.length / maxLabels));
      const thinned = allYears.filter((_, i) => i % step === 0);

      return { xScale: xS, yScale: yS, zeroY, yearTicks: thinned };
    }, [chartData, svgWidth]);

    const scales =
      chartMode === "cumulative" ? cumulativeScales : dailyScales;
    const { xScale, yearTicks } = scales;

    // ─── Paths ───
    const cumulativePath = useMemo(() => {
      if (chartData.length === 0) return "";
      return chartData
        .map((d, i) => {
          const x = cumulativeScales.xScale(d.date);
          const y = cumulativeScales.yScale(d.cumulativeValue ?? 1);
          return `${i === 0 ? "M" : "L"}${x},${y}`;
        })
        .join(" ");
    }, [chartData, cumulativeScales]);

    const dailyBars = useMemo(() => {
      if (chartData.length === 0) return [];
      const barW = Math.max(
        1,
        (svgWidth - CHART_PADDING.left - CHART_PADDING.right) /
          chartData.length -
          0.5
      );
      return chartData.map((d) => {
        const x = dailyScales.xScale(d.date);
        const yVal = dailyScales.yScale(d.percent_gain);
        const yZero = dailyScales.zeroY;
        return {
          x: x - barW / 2,
          y: Math.min(yVal, yZero),
          width: barW,
          height: Math.abs(yVal - yZero),
          date: d.date,
        };
      });
    }, [chartData, dailyScales, svgWidth]);

    // ─── Highlight dots from FULL data ───
    const highlightDots = useMemo(() => {
      if (
        !searchResult ||
        searchResult.type !== "ticker" ||
        data.length === 0
      )
        return [];
      const ticker = searchResult.query;

      return data
        .filter((d) => d.ticker === ticker)
        .map((d) => {
          const x = xScale(d.date);
          const y =
            chartMode === "cumulative"
              ? cumulativeScales.yScale(d.cumulativeValue ?? 1)
              : dailyScales.yScale(d.percent_gain);
          return { x, y, point: d };
        });
    }, [searchResult, data, xScale, chartMode, cumulativeScales, dailyScales]);

    // All matching dates for dropdown
    const highlightDates = useMemo(() => {
      if (!searchResult || searchResult.type !== "ticker") return [];
      return data
        .filter((d) => d.ticker === searchResult.query)
        .map((d) => ({
          date: d.date,
          gain: d.percent_gain,
          label: new Date(d.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
        }));
    }, [searchResult, data]);

    // ─── Find closest chart point to a pixel X ───
    const findClosestIndex = useCallback(
      (mouseX: number): number | null => {
        if (chartData.length === 0) return null;
        const plotLeft = CHART_PADDING.left;
        const plotRight = svgWidth - CHART_PADDING.right;
        if (mouseX < plotLeft - 10 || mouseX > plotRight + 10) return null;

        let closest = 0;
        let closestDist = Infinity;
        for (let i = 0; i < chartData.length; i++) {
          const px = xScale(chartData[i].date);
          const dist = Math.abs(px - mouseX);
          if (dist < closestDist) {
            closestDist = dist;
            closest = i;
          }
        }
        return closest;
      },
      [chartData, svgWidth, xScale]
    );

    // Convert a client-X to a chart-space X
    const clientXToChartX = useCallback(
      (clientX: number): number => {
        const svg = svgRef.current;
        if (!svg) return 0;
        const rect = svg.getBoundingClientRect();
        return ((clientX - rect.left) / rect.width) * svgWidth;
      },
      [svgWidth]
    );

    // ─── Mouse handlers ───
    const handleMouseMove = useCallback(
      (e: React.MouseEvent<SVGSVGElement>) => {
        if (pinnedIndex != null) return; // locked — don't update hover
        const mouseX = clientXToChartX(e.clientX);
        const idx = findClosestIndex(mouseX);
        setHoveredIndex(idx);
      },
      [clientXToChartX, findClosestIndex, pinnedIndex]
    );

    const handleClick = useCallback(
      (e: React.MouseEvent<SVGSVGElement>) => {
        const mouseX = clientXToChartX(e.clientX);
        const idx = findClosestIndex(mouseX);
        if (idx != null) {
          setPinnedIndex(idx);
          setOverridePoint(null); // clear override on manual chart click
        }
      },
      [clientXToChartX, findClosestIndex]
    );

    const handleMouseLeave = useCallback(() => {
      if (pinnedIndex != null) return; // locked — keep showing pinned
      setHoveredIndex(null);
    }, [pinnedIndex]);

    // ─── Touch handlers for mobile ───
    const handleTouchStart = useCallback(
      (e: React.TouchEvent<SVGSVGElement>) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseX = clientXToChartX(touch.clientX);
        const idx = findClosestIndex(mouseX);
        if (idx != null) {
          setHoveredIndex(idx);
          setPinnedIndex(idx);
          setOverridePoint(null); // clear override on manual touch
        }
      },
      [clientXToChartX, findClosestIndex]
    );

    const handleTouchMove = useCallback(
      (e: React.TouchEvent<SVGSVGElement>) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseX = clientXToChartX(touch.clientX);
        const idx = findClosestIndex(mouseX);
        if (idx != null) {
          setHoveredIndex(idx);
          setPinnedIndex(idx);
          setOverridePoint(null); // clear override on manual touch
        }
      },
      [clientXToChartX, findClosestIndex]
    );

    const handleTouchEnd = useCallback(() => {
      setHoveredIndex(null);
      // pinnedIndex stays — that's the point
    }, []);

    // When user picks a date from dropdown, pin it
    const jumpToDate = useCallback(
      (date: string) => {
        setSelectedHighlightDate(date);
        // Look up the real data point from full dataset
        const realPoint = data.find((d) => d.date === date);
        if (realPoint) {
          setOverridePoint(realPoint);
        }
        // Find closest point in chartData for approximate visual position
        const targetTime = new Date(date).getTime();
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < chartData.length; i++) {
          const dist = Math.abs(new Date(chartData[i].date).getTime() - targetTime);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        }
        setPinnedIndex(bestIdx);
      },
      [chartData, data]
    );

    // When search result is a date, pin it
    useEffect(() => {
      if (searchResult?.type === "date" && searchResult.dateIndex != null) {
        const realPoint = data[searchResult.dateIndex];
        if (realPoint) {
          setOverridePoint(realPoint);
          const targetTime = new Date(realPoint.date).getTime();
          let bestIdx = 0;
          let bestDist = Infinity;
          for (let i = 0; i < chartData.length; i++) {
            const dist = Math.abs(new Date(chartData[i].date).getTime() - targetTime);
            if (dist < bestDist) {
              bestDist = dist;
              bestIdx = i;
            }
          }
          setPinnedIndex(bestIdx);
        }
      }
    }, [searchResult, data, chartData]);

    const handleUnpin = useCallback(() => {
      setPinnedIndex(null);
      setOverridePoint(null);
    }, []);

    if (data.length === 0) return null;

    // Active point: pinned takes priority, then hover, then last
    const activeIdx =
      pinnedIndex ?? hoveredIndex ?? chartData.length - 1;
    const isPinned = pinnedIndex != null;
    // When overridePoint is set (from dropdown/search jump), use the real data
    // for the info panel; otherwise fall back to sampled chartData
    const displayPoint =
      overridePoint && isPinned
        ? overridePoint
        : chartData[activeIdx] || chartData[chartData.length - 1];
    // Marker position uses the displayPoint's actual date for accurate placement
    const hoverX = xScale(displayPoint.date);
    const hoverY =
      chartMode === "cumulative"
        ? cumulativeScales.yScale(displayPoint.cumulativeValue ?? 1)
        : dailyScales.yScale(displayPoint.percent_gain);

    const hasHighlight = searchResult?.type === "ticker";

    return (
      <div ref={containerRef} className="py-16 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.3 }}
            className="text-center mb-6"
          >
            <h2
              className="mb-3 text-gray-900"
              style={{ fontSize: "2rem", fontWeight: 700 }}
            >
              The Growth Journey
            </h2>
            <p
              className="text-gray-500 max-w-xl mx-auto"
              style={{ fontSize: "1rem" }}
            >
              How $1 compounds with daily momentum investing
            </p>
          </motion.div>

          {/* Search bar — sticky when scrolled past */}
          <div className="sticky top-0 z-50 bg-white pb-4">{searchBar}</div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6"
          >
            {/* Chart mode toggle */}
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setChartMode("cumulative")}
                  className={`px-3 sm:px-4 py-1.5 rounded-md transition-colors ${
                    chartMode === "cumulative"
                      ? "bg-white text-[#FF6B35] shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  style={{ fontSize: "0.85rem", fontWeight: 500 }}
                >
                  Cumulative Growth
                </button>
                <button
                  onClick={() => setChartMode("daily")}
                  className={`px-3 sm:px-4 py-1.5 rounded-md transition-colors ${
                    chartMode === "daily"
                      ? "bg-white text-[#FF6B35] shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  style={{ fontSize: "0.85rem", fontWeight: 500 }}
                >
                  Daily % Gain
                </button>
              </div>
            </div>

            {/* Highlight bar */}
            <div
              className="mb-3 px-3 sm:px-4 py-2.5 bg-orange-50 rounded-lg flex items-center justify-between gap-3 flex-wrap"
              style={{ fontSize: "0.875rem", minHeight: "44px" }}
            >
              {hasHighlight ? (
                <>
                  <span className="text-gray-700">
                    Highlighting{" "}
                    <span
                      className="text-[#FF6B35]"
                      style={{ fontWeight: 600 }}
                    >
                      {searchResult!.query}
                    </span>{" "}
                    · {getCompanyName(searchResult!.query)} ·{" "}
                    {searchResult!.matchingIndices.length} occurrences
                  </span>
                  <div className="relative">
                    <select
                      value={selectedHighlightDate || ""}
                      onChange={(e) => jumpToDate(e.target.value)}
                      className="appearance-none bg-white border border-gray-200 rounded-md pl-3 pr-7 py-1.5 text-gray-700 cursor-pointer outline-none"
                      style={{ fontSize: "0.8rem" }}
                    >
                      <option value="">Jump to date...</option>
                      {highlightDates.map((d) => (
                        <option key={d.date} value={d.date}>
                          {d.label} (+{d.gain.toFixed(1)}%)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </>
              ) : (
                <span className="text-gray-400">
                  Search a ticker above to highlight its appearances on the
                  chart
                </span>
              )}
            </div>

            {/* Info panel */}
            <div
              className="mb-4 px-3 sm:px-4 py-3 bg-gray-50 rounded-lg"
              style={{ minHeight: "72px" }}
            >
              {/* Desktop: side-by-side. Mobile: stacked to prevent jitter */}
              <div className="hidden sm:flex items-center justify-between gap-4">
                <div>
                  <div
                    className="text-gray-500"
                    style={{ fontSize: "0.8rem" }}
                  >
                    {new Date(displayPoint.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <div
                    className="text-[#FF6B35]"
                    style={{ fontSize: "1.25rem", fontWeight: 700 }}
                  >
                    {chartMode === "cumulative"
                      ? formatScientific(displayPoint.cumulativeValue ?? 0)
                      : `+${displayPoint.percent_gain.toFixed(2)}%`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div
                      className="text-gray-500"
                      style={{ fontSize: "0.8rem" }}
                    >
                      Top Gainer
                    </div>
                    <TickerLink
                      ticker={displayPoint.ticker}
                      date={displayPoint.date}
                      className="text-gray-900"
                      showCompanyName
                      style={{ fontSize: "1rem", fontWeight: 600 }}
                    />
                    <div
                      className="text-green-600"
                      style={{ fontSize: "0.8rem", fontWeight: 600 }}
                    >
                      +{displayPoint.percent_gain.toFixed(2)}%
                    </div>
                  </div>
                  {isPinned && (
                    <button
                      onClick={handleUnpin}
                      className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors shrink-0"
                      title="Unpin"
                    >
                      <X className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                  )}
                </div>
              </div>
              {/* Mobile: always stacked, left-aligned, fixed structure */}
              <div className="sm:hidden space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div
                      className="text-gray-500"
                      style={{ fontSize: "0.8rem" }}
                    >
                      {new Date(displayPoint.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                    <div
                      className="text-[#FF6B35]"
                      style={{ fontSize: "1.25rem", fontWeight: 700 }}
                    >
                      {chartMode === "cumulative"
                        ? formatScientific(displayPoint.cumulativeValue ?? 0)
                        : `+${displayPoint.percent_gain.toFixed(2)}%`}
                    </div>
                  </div>
                  {isPinned && (
                    <button
                      onClick={handleUnpin}
                      className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors shrink-0"
                      title="Unpin"
                    >
                      <X className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                  )}
                </div>
                <div className="border-t border-gray-200 pt-2">
                  <div
                    className="text-gray-500"
                    style={{ fontSize: "0.8rem" }}
                  >
                    Top Gainer
                  </div>
                  <TickerLink
                    ticker={displayPoint.ticker}
                    date={displayPoint.date}
                    className="text-gray-900"
                    showCompanyName
                    style={{ fontSize: "1rem", fontWeight: 600 }}
                  />
                  <div
                    className="text-green-600"
                    style={{ fontSize: "0.8rem", fontWeight: 600 }}
                  >
                    +{displayPoint.percent_gain.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* SVG Chart */}
            <div
              className="w-full cursor-crosshair"
              style={{ height: svgHeight, touchAction: "none" }}
            >
              <svg
                ref={svgRef}
                width="100%"
                height={svgHeight}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                preserveAspectRatio="none"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="select-none"
              >
                {/* Grid lines */}
                {yearTicks.map((t) => (
                  <line
                    key={`vgrid-${t.year}`}
                    x1={t.x}
                    x2={t.x}
                    y1={CHART_PADDING.top}
                    y2={svgHeight - CHART_PADDING.bottom}
                    stroke="#f0f0f0"
                    strokeDasharray="3 3"
                  />
                ))}

                {yearTicks.map((t) => (
                  <text
                    key={`xlabel-${t.year}`}
                    x={t.x}
                    y={svgHeight - CHART_PADDING.bottom + 24}
                    textAnchor="middle"
                    fill="#9ca3af"
                    fontSize={12}
                  >
                    {t.year}
                  </text>
                ))}

                <line
                  x1={CHART_PADDING.left}
                  x2={svgWidth - CHART_PADDING.right}
                  y1={svgHeight - CHART_PADDING.bottom}
                  y2={svgHeight - CHART_PADDING.bottom}
                  stroke="#e5e7eb"
                />

                {/* Daily mode: zero line */}
                {chartMode === "daily" && (
                  <line
                    x1={CHART_PADDING.left}
                    x2={svgWidth - CHART_PADDING.right}
                    y1={dailyScales.zeroY}
                    y2={dailyScales.zeroY}
                    stroke="#d1d5db"
                    strokeDasharray="4 3"
                  />
                )}

                {/* Cumulative line */}
                {chartMode === "cumulative" && (
                  <path
                    d={cumulativePath}
                    fill="none"
                    stroke="#FF6B35"
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                  />
                )}

                {/* Daily bars */}
                {chartMode === "daily" &&
                  dailyBars.map((bar, i) => (
                    <rect
                      key={`bar-${i}`}
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={Math.max(0.5, bar.height)}
                      fill="#FF6B35"
                      opacity={0.65}
                    />
                  ))}

                {/* Highlight dots for ticker search */}
                {highlightDots.map((dot, i) => (
                  <g key={`hl-${i}`}>
                    <circle
                      cx={dot.x}
                      cy={dot.y}
                      r={7}
                      fill="white"
                      stroke="#FF6B35"
                      strokeWidth={2.5}
                    />
                    <circle cx={dot.x} cy={dot.y} r={3} fill="#FF6B35" />
                  </g>
                ))}

                {/* Hover/pin crosshair + dot */}
                <line
                  x1={hoverX}
                  x2={hoverX}
                  y1={CHART_PADDING.top}
                  y2={svgHeight - CHART_PADDING.bottom}
                  stroke="#FF6B35"
                  strokeWidth={1.5}
                  opacity={0.3}
                />
                <circle
                  cx={hoverX}
                  cy={hoverY}
                  r={isPinned && hoveredIndex == null ? 8 : 6}
                  fill="#FF6B35"
                  stroke="white"
                  strokeWidth={2}
                />
              </svg>
            </div>

            <div
              className="mt-3 text-center text-gray-400"
              style={{ fontSize: "0.75rem", height: "1.25rem" }}
            >
              {isPinned
                ? "Pinned — press ✕ to unlock and explore"
                : "Click or tap to pin · Hover to explore"}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div
                className="flex items-center justify-center gap-6 text-gray-400"
                style={{ fontSize: "0.8rem" }}
              >
                {chartMode === "cumulative" ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-[#FF6B35] rounded" />
                    <span>Portfolio Value (Log Scale)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#FF6B35] rounded-sm opacity-65" />
                    <span>Top Daily Gainer %</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }
);