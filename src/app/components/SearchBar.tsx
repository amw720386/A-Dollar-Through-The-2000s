import React from "react"
import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, Calendar, Hash } from "lucide-react";
import { DataPoint } from "../App";
import { getCompanyName } from "./companyData";

interface SearchBarProps {
  data: DataPoint[];
  onSearchResult: (result: SearchResult | null) => void;
}

export interface SearchResult {
  type: "date" | "ticker";
  query: string;
  matchingIndices: number[];
  dateIndex?: number;
}

export function SearchBar({ data, onSearchResult }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<
    { type: "date" | "ticker"; label: string; sub: string; value: string }[]
  >([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const tickerSet = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => map.set(d.ticker, (map.get(d.ticker) || 0) + 1));
    return map;
  }, [data]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const q = query.trim().toUpperCase();
    const results: {
      type: "date" | "ticker";
      label: string;
      sub: string;
      value: string;
    }[] = [];

    // Check if it looks like a date
    const dateMatch = query.match(/(\d{4})[-/]?(\d{1,2})[-/]?(\d{1,2})?/);
    if (dateMatch) {
      const year = dateMatch[1];
      const month = dateMatch[2]?.padStart(2, "0");
      const day = dateMatch[3]?.padStart(2, "0");
      const datePrefix = day
        ? `${year}-${month}-${day}`
        : `${year}-${month}`;

      const matchingDates = data
        .filter((d) => d.date.startsWith(datePrefix))
        .slice(0, 5);

      matchingDates.forEach((d) => {
        const name = getCompanyName(d.ticker);
        results.push({
          type: "date",
          label: new Date(d.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          sub: `${d.ticker} · ${name} · +${d.percent_gain.toFixed(2)}%`,
          value: d.date,
        });
      });
    }

    // Check tickers
    const matchingTickers = Array.from(tickerSet.entries())
      .filter(([t]) => {
        const name = getCompanyName(t).toUpperCase();
        return t.includes(q) || name.includes(q);
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    matchingTickers.forEach(([ticker, count]) => {
      const name = getCompanyName(ticker);
      results.push({
        type: "ticker",
        label: ticker,
        sub: `${name} · appeared ${count} time${count > 1 ? "s" : ""}`,
        value: ticker,
      });
    });

    setSuggestions(results.slice(0, 8));
  }, [query, data, tickerSet]);

  const handleSelect = (item: {
    type: "date" | "ticker";
    value: string;
  }) => {
    if (item.type === "date") {
      const idx = data.findIndex((d) => d.date === item.value);
      onSearchResult({
        type: "date",
        query: item.value,
        matchingIndices: [idx],
        dateIndex: idx,
      });
    } else {
      const indices = data
        .map((d, i) => (d.ticker === item.value ? i : -1))
        .filter((i) => i >= 0);
      onSearchResult({
        type: "ticker",
        query: item.value,
        matchingIndices: indices,
      });
    }
    setSuggestions([]);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    onSearchResult(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="relative">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2.5">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder="Search a ticker (AAPL) or date (2008-09-15)..."
            className="bg-transparent w-full outline-none text-gray-900 placeholder-gray-400"
            style={{ fontSize: "0.9rem" }}
          />
          {query && (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {isFocused && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
            {suggestions.map((item, i) => (
              <button
                key={`${item.type}-${item.value}-${i}`}
                onMouseDown={() => handleSelect(item)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
              >
                <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  {item.type === "date" ? (
                    <Calendar className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Hash className="w-4 h-4 text-[#FF6B35]" />
                  )}
                </span>
                <div className="min-w-0">
                  <div
                    className="text-gray-900 truncate"
                    style={{ fontSize: "0.875rem", fontWeight: 500 }}
                  >
                    {item.label}
                  </div>
                  <div
                    className="text-gray-500 truncate"
                    style={{ fontSize: "0.75rem" }}
                  >
                    {item.sub}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}