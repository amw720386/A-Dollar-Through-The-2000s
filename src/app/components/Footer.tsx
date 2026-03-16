import React from "react"

export function Footer() {
  return (
    <footer className="bg-[#FF6B35] text-white py-12 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="mb-4" style={{ fontSize: "1.5rem", fontWeight: 700 }}>
          A Dollar Through the 2000s
        </div>
        <p
          className="text-white/70 mb-6 max-w-lg mx-auto"
          style={{ fontSize: "0.85rem", lineHeight: 1.7 }}
        >
          A data visualization tracking what happens when you invest $1 in the
          top S&P 500 gainer every trading day. This is for fun and education —
          not financial advice. Ignores transaction costs, taxes, and practical
          limitations.
        </p>
        <div
          className="text-white/40"
          style={{ fontSize: "0.75rem" }}
        >
          Built with historical S&P 500 data · {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );
}
