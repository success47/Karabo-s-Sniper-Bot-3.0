import express from 'express';
import fetch from 'node-fetch';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// Serve client build if present
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

let db;
(async () => {
  db = await open({
    filename: './karabo-sniper.db',
    driver: sqlite3.Database,
  });
  await db.exec(`CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT, type TEXT, entry REAL, tp REAL, sl REAL, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
})();

app.get('/api/ohlcv', async (req, res) => {
  const symbol = req.query.symbol || 'BTC/USDT';
  try {
    const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol.replace('/', '')}&interval=15m&limit=100`);
    const raw = await response.json();
    const data = raw.map((k) => ({
      time: Math.floor(k[0] / 1000),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
    }));
    res.json(data);
  } catch (err) {
    console.error('OHLCV fetch failed:', err);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

app.get('/api/scan', async (req, res) => {
  const pairs = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'];
  const results = [];
  for (const symbol of pairs) {
    try {
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol.replace('/', '')}&interval=15m&limit=100`);
      const data = await response.json();
      const closes = data.map((k) => parseFloat(k[4]));
      const last = closes[closes.length - 1];
      const prev = closes[closes.length - 2];
      if (last > prev) {
        results.push({ symbol, type: 'Buy', entry: last, tp: Number((last * 1.03).toFixed(8)), sl: Number((last * 0.99).toFixed(8)) });
      } else {
        results.push({ symbol, type: 'Sell', entry: last, tp: Number((last * 0.97).toFixed(8)), sl: Number((last * 1.01).toFixed(8)) });
      }
    } catch (err) {
      console.error('Scan error for', symbol, err);
    }
  }
  res.json(results);
});

// Fallback to client index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Karabo's Sniper Bot backend running on port ${PORT}`));
