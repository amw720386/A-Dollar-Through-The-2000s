import React from "react"
import { motion } from "motion/react";
import { useInView } from "motion/react";
import { useRef } from "react";
import { Infinity, DollarSign, Clock, Zap, BarChart3, Shield } from "lucide-react";

const assumptions = [
  {
    icon: Infinity,
    title: "Infinite Liquidity",
    description:
      "Assumes you can buy and sell any amount of any stock at the closing price, regardless of market cap or trading volume.",
  },
  {
    icon: DollarSign,
    title: "Zero Trading Fees",
    description:
      "No commissions, no bid-ask spread, no brokerage fees of any kind are factored into the returns.",
  },
  {
    icon: Clock,
    title: "Perfect Hindsight",
    description:
      "The top gainer is only known after the market closes. This strategy requires knowing the future — it's not executable in real time.",
  },
  {
    icon: Zap,
    title: "No Slippage",
    description:
      "Trades execute at exact prices with no market impact, even when moving the entire portfolio into a single stock each day.",
  },
  {
    icon: BarChart3,
    title: "No Tax Implications",
    description:
      "Capital gains taxes are ignored entirely. In reality, daily short-term trades would be taxed at ordinary income rates.",
  },
  {
    icon: Shield,
    title: "No Trading Halts",
    description:
      "Assumes continuous ability to trade. Real markets have circuit breakers, halts, and restrictions during extreme volatility.",
  },
];

export function Assumptions() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.1 });

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
            The Fine Print
          </h2>
          <p
            className="text-gray-500 max-w-2xl mx-auto"
            style={{ fontSize: "1rem" }}
          >
            This is a thought experiment, not investment advice. Here are the
            impossible assumptions baked into these numbers.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assumptions.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.25, delay: index * 0.04 }}
              className="rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-[#FF6B35]" />
                </div>
                <div
                  className="text-gray-900"
                  style={{ fontSize: "0.95rem", fontWeight: 600 }}
                >
                  {item.title}
                </div>
              </div>
              <div className="text-gray-500" style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
                {item.description}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
