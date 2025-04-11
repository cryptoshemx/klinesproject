const axios = require('axios');
const { klinesData } = require('./klineStore');

const timeframes = ['1m', '5m', '15m', '1h', '1d'];
const REQUEST_LIMIT = 250;

async function fetchInitialKlines(symbols, total = 1000) {
  for (const tf of timeframes) {
    console.log(`📥 Descargando ${tf} para todos los símbolos...`);

    for (const symbol of symbols) {
      klinesData[symbol] = klinesData[symbol] || {};

      const tfKlines = [];

      for (let i = 0; i < Math.ceil(total / REQUEST_LIMIT); i++) {
        const endTime = Date.now() - i * REQUEST_LIMIT * getMs(tf);
        const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol.toUpperCase()}&interval=${tf}&limit=${REQUEST_LIMIT}&endTime=${endTime}`;

        try {
          const res = await axios.get(url);
          const parsed = res.data.map(k => ({
            t: k[0],
            o: k[1],
            h: k[2],
            l: k[3],
            c: k[4],
            v: k[5]
          }));

          tfKlines.unshift(...parsed); // Para mantener orden cronológico
        } catch (err) {
          console.error(`❌ Error en ${tf} para ${symbol}:`, err.message);
        }
      }

      klinesData[symbol][tf] = tfKlines;
      console.log(`✅ ${symbol} → ${tf}: ${tfKlines.length} klines`);
    }
  }
}

function getMs(tf) {
  const map = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000
  };
  return map[tf];
}

module.exports = { fetchInitialKlines };
