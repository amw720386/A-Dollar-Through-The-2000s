import React from "react"
import { motion } from "motion/react";
import { useInView } from "motion/react";
import { useRef, useState } from "react";
import { DataPoint } from "../App";
import { TickerLink } from "./TickerLink";
import { getCompanyName } from "./companyData";

interface TopGainersProps {
  data: DataPoint[];
}

export function TopGainers({ data }: TopGainersProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.1 });
  const [showAll, setShowAll] = useState(false);

  if (data.length === 0) return null;

  const sortedByGain = [...data].sort(
    (a, b) => b.percent_gain - a.percent_gain
  );
  const topGainers = sortedByGain.slice(0, showAll ? 20 : 10);

  const tickerCounts = data.reduce(
    (acc, d) => {
      acc[d.ticker] = (acc[d.ticker] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const mostFrequent = Object.entries(tickerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const ranks = ["1st", "2nd", "3rd"];

  return (
    <div ref={containerRef} className="py-16 px-6 bg-[#FF6B35]">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.3 }}
          className="text-center mb-10"
        >
          <h2
            className="mb-3 text-white"
            style={{ fontSize: "2rem", fontWeight: 700 }}
          >
            Hall of Champions
          </h2>
          <p className="text-white/70" style={{ fontSize: "1rem" }}>
            The biggest single-day gains in the dataset
          </p>
        </motion.div>

        {/* Top 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {topGainers.slice(0, 3).map((item, index) => (
            <motion.div
              key={`${item.date}-${item.ticker}`}
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.25, delay: index * 0.05 }}
              className="bg-white rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className="text-gray-400"
                  style={{ fontSize: "0.8rem", fontWeight: 600 }}
                >
                  {ranks[index]}
                </span>
                <span
                  className="text-green-600"
                  style={{ fontSize: "1.5rem", fontWeight: 700 }}
                >
                  +{item.percent_gain.toFixed(2)}%
                </span>
              </div>

              <div className="mb-1">
                <TickerLink
                  ticker={item.ticker}
                  date={item.date}
                  className="text-gray-900"
                  showCompanyName
                  showAvatar
                  style={{ fontWeight: 600, fontSize: "1rem" }}
                />
              </div>

              <div
                className="text-gray-400"
                style={{ fontSize: "0.8rem" }}
              >
                {new Date(item.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Rest of the list */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.25, delay: 0.15 }}
          className="bg-white rounded-xl overflow-hidden"
        >
          {topGainers.slice(3).map((item, index) => (
            <div
              key={`${item.date}-${item.ticker}`}
              className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0"
                  style={{ fontSize: "0.75rem", fontWeight: 600 }}
                >
                  {index + 4}
                </span>
                <div>
                  <TickerLink
                    ticker={item.ticker}
                    date={item.date}
                    className="text-gray-900"
                    showCompanyName
                    style={{ fontSize: "0.9rem", fontWeight: 500 }}
                  />
                  <div
                    className="text-gray-400"
                    style={{ fontSize: "0.75rem" }}
                  >
                    {new Date(item.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </div>
              <span
                className="text-green-600"
                style={{ fontSize: "1rem", fontWeight: 600 }}
              >
                +{item.percent_gain.toFixed(2)}%
              </span>
            </div>
          ))}

          {!showAll && (
            <div className="px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowAll(true)}
                className="w-full py-2.5 bg-[#FF6B35] text-white rounded-lg hover:bg-[#e55e2e] transition-colors"
                style={{ fontWeight: 500, fontSize: "0.9rem" }}
              >
                Show more
              </button>
            </div>
          )}
        </motion.div>

        {/* Most Frequent */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.25, delay: 0.2 }}
          className="mt-10"
        >
          <h3
            className="text-center mb-5 text-white"
            style={{ fontSize: "1.25rem", fontWeight: 600 }}
          >
            Most Frequent Winners
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            {mostFrequent.map(([ticker, count]) => (
              <div
                key={ticker}
                className="bg-white rounded-lg px-4 py-3 text-center w-[calc(50%-0.375rem)] sm:w-[calc(20%-0.6rem)]"
              >
                <TickerLink
                  ticker={ticker}
                  className="text-gray-900"
                  showIcon={false}
                  style={{ fontSize: "1.1rem", fontWeight: 600 }}
                />
                <div
                  className="text-gray-400 mt-0.5"
                  style={{ fontSize: "0.75rem" }}
                >
                  {getCompanyName(ticker)}
                </div>
                <div
                  className="text-[#FF6B35] mt-1"
                  style={{ fontSize: "0.8rem", fontWeight: 500 }}
                >
                  {count} days
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}