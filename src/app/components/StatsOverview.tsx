import React from "react"
import { motion } from "motion/react";
import { useInView } from "motion/react";
import { useRef, useMemo } from "react";
import { DataPoint } from "../App";

interface StatsOverviewProps {
  data: DataPoint[];
}

function formatFullScientific(val: number): {
  mantissa: string;
  exponent: number;
} {
  if (val <= 0) return { mantissa: "0", exponent: 0 };
  const exp = Math.floor(Math.log10(val));
  const mantissa = val / Math.pow(10, exp);
  // Show lots of digits for dramatic effect
  return { mantissa: mantissa.toFixed(8), exponent: exp };
}

export function StatsOverview({ data }: StatsOverviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.15 });

  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const finalValue = data[data.length - 1].cumulativeValue || 0;
    const totalReturnPct = ((finalValue - 1) / 1) * 100;
    const avgDailyGain =
      data.reduce((sum, d) => sum + d.percent_gain, 0) / data.length;

    const uniqueTickers = new Set(data.map((d) => d.ticker)).size;
    const daysAbove50 = data.filter((d) => d.percent_gain >= 50).length;

    const startDate = new Date(data[0].date);
    const endDate = new Date(data[data.length - 1].date);

    const startFormatted = startDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const endFormatted = endDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const returnDisplay = formatFullScientific(totalReturnPct);

    return {
      finalValue,
      totalReturnPct,
      returnDisplay,
      avgDailyGain,
      totalDays: data.length,
      uniqueTickers,
      daysAbove50,
      dateRange: `${startFormatted} — ${endFormatted}`,
    };
  }, [data]);

  if (!stats) return null;

  const cards = [
    {
      label: "Avg Daily Gain",
      value: `${stats.avgDailyGain.toFixed(2)}%`,
      sub: "Mean top gainer return per trading day",
    },
    {
      label: "Trading Days",
      value: stats.totalDays.toLocaleString(),
      sub: "Total sessions tracked in the dataset",
    },
    {
      label: "Unique Winners",
      value: stats.uniqueTickers.toLocaleString(),
      sub: "Different tickers that topped the S&P 500",
    },
    {
      label: "Days Above 50%",
      value: stats.daysAbove50.toLocaleString(),
      sub: "Trading days where the top gain exceeded 50%",
    },
  ];

  return (
    <div ref={containerRef} className="py-16 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.3 }}
          className="text-center mb-10"
        >
          <h2
            className="mb-3 text-gray-900"
            style={{ fontSize: "2rem", fontWeight: 700 }}
          >
            By the Numbers
          </h2>
          <p className="text-gray-500" style={{ fontSize: "1rem" }}>
            {stats.dateRange}
          </p>
        </motion.div>

        {/* Hero total return card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-xl border border-gray-200 p-8 md:p-10 text-center mb-6"
        >
          <div
            className="text-gray-400 mb-4"
            style={{ fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}
          >
            Total Return
          </div>
          <div className="flex items-baseline justify-center gap-1 flex-wrap">
            <span
              className="text-[#FF6B35]"
              style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
            >
              {stats.returnDisplay.mantissa}
            </span>
            <span
              className="text-gray-400"
              style={{ fontSize: "clamp(1.25rem, 3vw, 2rem)", fontWeight: 500 }}
            >
              {" "}× 10
            </span>
            <sup
              className="text-[#FF6B35]"
              style={{ fontSize: "clamp(1rem, 2.5vw, 1.5rem)", fontWeight: 700 }}
            >
              {stats.returnDisplay.exponent}
            </sup>
            <span
              className="text-gray-400 ml-1"
              style={{ fontSize: "clamp(1.25rem, 3vw, 2rem)", fontWeight: 500 }}
            >
              %
            </span>
          </div>
          <div
            className="text-gray-400 mt-4"
            style={{ fontSize: "0.85rem" }}
          >
            What $1 becomes: <span className="text-gray-600" style={{ fontWeight: 500 }}>${stats.returnDisplay.mantissa} × 10<sup>{stats.returnDisplay.exponent - 2}</sup></span>
          </div>
        </motion.div>

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, index) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.25, delay: 0.1 + index * 0.05 }}
              className="rounded-xl border border-gray-200 p-5"
            >
              <div
                className="text-gray-400 mb-2"
                style={{ fontSize: "0.8rem", fontWeight: 500 }}
              >
                {card.label}
              </div>
              <div
                className="text-[#FF6B35] mb-1"
                style={{ fontSize: "1.75rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
              >
                {card.value}
              </div>
              <div className="text-gray-400" style={{ fontSize: "0.75rem" }}>
                {card.sub}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
