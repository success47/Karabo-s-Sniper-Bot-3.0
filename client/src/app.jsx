import React, { useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import './index.css';

export default function App() {
  const [signals, setSignals] = useState([]);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const chartContainer = document.getElementById('chart-container');
    if (!chartContainer) return;
    const chart = createChart(chartContainer, {
      width: chartContainer.clientWidth,
      height: 400,
      layout: {
        background: { color: '#1f2937' },
        textColor: '#d1d5db',
      },
      rightPriceScale: { visible: true },
      timeScale: { visible: true },
    });
    const candleSeries = chart.addCandlestickSeries();

    async function fetchData() {
      try {
        const res = await fetch('/api/ohlcv?symbol=BTC/USDT');
        const data = await res.json();
        candleSeries.setData(data);
      } catch (err) {
        console.error('Chart fetch error:', err);
      }
    }

    fetchData();
    const handleResize = () => {
      chart.applyOptions({ width: chartContainer.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  async function runScan() {
    setLoading(true);
    try {
      const res = await fetch('/api/scan');
      const data = await res.json();
      setSignals(data);
    } catch (err) {
      console.error('Scan error:', err);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold text-center mb-4">Karabo&apos;s Sniper Bot</h1>
      <div id="chart-container" className="rounded-lg shadow-lg bg-gray-800 mb-6"></div>

      <div className="flex justify-center mb-4">
        <button
          onClick={runScan}
          disabled={loading}
          className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2 rounded-xl shadow-md disabled:opacity-60"
        >
          {loading ? 'Scanning...' : 'Run Market Scan'}
        </button>
      </div>

      {signals.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {signals.map((signal, i) => (
            <div
              key={i}
              className="bg-gray-800 p-4 rounded-lg border border-gray-700 cursor-pointer hover:border-rose-400"
              onClick={() => setSelectedSignal(signal)}
            >
              <h2 className="text-xl font-semibold mb-1">{signal.symbol}</h2>
              <p className="text-sm text-gray-400">Type: {signal.type}</p>
              <p className="text-sm">Entry: {signal.entry}</p>
              <p className="text-sm">Target: {signal.tp}</p>
              <p className="text-sm">Stop Loss: {signal.sl}</p>
            </div>
          ))}
        </div>
      )}

      {selectedSignal && (
        <div className="fixed bottom-4 right-4 bg-gray-800 border border-rose-400 rounded-xl p-4 shadow-lg">
          <h3 className="font-bold">Active Signal</h3>
          <p>{selectedSignal.symbol}</p>
          <p>{selectedSignal.type}</p>
          <p>Entry: {selectedSignal.entry}</p>
          <p>TP: {selectedSignal.tp}</p>
          <p>SL: {selectedSignal.sl}</p>
        </div>
      )}
    </div>
  );
}
