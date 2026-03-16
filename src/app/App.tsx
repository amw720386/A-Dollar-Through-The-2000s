import React from "react";
import { useEffect, useState, useRef } from "react";
import { Hero } from "./components/Hero";
import { StatsOverview } from "./components/StatsOverview";
import { GrowthChart, GrowthChartRef } from "./components/GrowthChart";
import { TopGainers } from "./components/TopGainers";
import { Footer } from "./components/Footer";
import { SearchBar, SearchResult } from "./components/SearchBar";
import { Assumptions } from "./components/Assumptions";
import dataCSV from "../imports/data.csv?raw";

export interface DataPoint {
  date: string;
  ticker: string;
  percent_gain: number;
  cumulativeValue?: number;
  dayNumber?: number;
}

function parseCSV(csv: string): DataPoint[] {
  const lines = csv.trim().split("\n");
  const data: DataPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(",");
    if (parts.length >= 3) {
      data.push({
        date: parts[0],
        ticker: parts[1],
        percent_gain: parseFloat(parts[2]),
      });
    }
  }

  return data;
}

function calculateCumulativeReturns(data: DataPoint[]): DataPoint[] {
  let cumulativeValue = 1;

  return data.map((item, index) => {
    cumulativeValue = cumulativeValue * (1 + item.percent_gain / 100);
    return {
      ...item,
      cumulativeValue,
      dayNumber: index + 1,
    };
  });
}

export default function App() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const chartRef = useRef<GrowthChartRef>(null);

  useEffect(() => {
    try {
      const parsed = parseCSV(dataCSV);
      const withCumulative = calculateCumulativeReturns(parsed);
      setData(withCumulative);
      setIsLoading(false);
    } catch (error) {
      console.error("Error parsing CSV:", error);
      setIsLoading(false);
    }
  }, []);

  const handleSearchResult = (result: SearchResult | null) => {
    setSearchResult(result);
    if (result) {
      setTimeout(() => chartRef.current?.scrollIntoView(), 100);
    }
  };

  if (isLoading) {
    return (
      <div className="size-full flex items-center justify-center bg-white">
        <div className="text-[#FF6B35]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white">
      <Hero />
      <StatsOverview data={data} />
      <GrowthChart
        ref={chartRef}
        data={data}
        searchResult={searchResult}
        searchBar={
          <SearchBar data={data} onSearchResult={handleSearchResult} />
        }
      />
      <TopGainers data={data} />
      <Assumptions />
      <Footer />
    </div>
  );
}