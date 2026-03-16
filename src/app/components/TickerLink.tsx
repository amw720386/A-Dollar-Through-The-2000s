import React from "react"
import { ExternalLink } from "lucide-react";
import { getCompanyName, getCompanyInitial } from "./companyData";

interface TickerLinkProps {
  ticker: string;
  date?: string;
  className?: string;
  style?: React.CSSProperties;
  showIcon?: boolean;
  showCompanyName?: boolean;
  showAvatar?: boolean;
  size?: "sm" | "md" | "lg";
}

function getYahooFinanceUrl(ticker: string, date?: string): string {
  const base = `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`;
  if (!date) return base;
  const d = new Date(date);
  const oneDayMs = 86400000;
  const period1 = Math.floor((d.getTime() - 30 * oneDayMs) / 1000);
  const period2 = Math.floor((d.getTime() + 30 * oneDayMs) / 1000);
  return `${base}/chart/?period1=${period1}&period2=${period2}`;
}

export function TickerLink({
  ticker,
  date,
  className = "",
  style,
  showIcon = true,
  showCompanyName = false,
  showAvatar = false,
  size = "md",
}: TickerLinkProps) {
  const companyName = getCompanyName(ticker);
  const initial = getCompanyInitial(ticker);

  const avatarSizes = { sm: "w-6 h-6 text-xs", md: "w-8 h-8 text-sm", lg: "w-10 h-10 text-base" };

  return (
    <a
      href={getYahooFinanceUrl(ticker, date)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 hover:opacity-70 transition-opacity ${className}`}
      style={style}
      title={`${companyName} (${ticker}) on Yahoo Finance`}
    >
      {showAvatar && (
        <span
          className={`${avatarSizes[size]} bg-[#FF6B35] text-white rounded-full flex items-center justify-center shrink-0`}
          style={{ fontWeight: 700 }}
        >
          {initial}
        </span>
      )}
      <span className="inline-flex items-center gap-1">
        {ticker}
        {showCompanyName && companyName !== ticker && (
          <span className="text-gray-500" style={{ fontWeight: 400 }}>
            {" "}· {companyName}
          </span>
        )}
        {showIcon && <ExternalLink className="w-3 h-3 opacity-40 shrink-0" />}
      </span>
    </a>
  );
}
