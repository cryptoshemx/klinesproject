const axios = require('axios');
const { klinesData } = require('./klineStore');
const { TIMEFRAMES, REST_BASE_URL, REQUEST_LIMIT, INITIAL_KLINES, INTERVALS_MS } = require('./config');

async function fetchInitialKlines(symbols, total = INITIAL_KLINES) {
  for (const tf of TIMEFRAMES) {
    console.log(`📥 Descargando ${tf} para todos los símbolos...`);

    for (const symbol of symbols) {
      klinesData[symbol] = klinesData[symbol] || {};

      const tfKlines = [];

      for (let i = 0; i < Math.ceil(total / REQUEST_LIMIT); i++) {
        const endTime = Date.now() - i * REQUEST_LIMIT * getMs(tf);
        const url = `${REST_BASE_URL}/klines?symbol=${symbol.toUpperCase()}&interval=${tf}&limit=${REQUEST_LIMIT}&endTime=${endTime}`;

        try {
          const res = await axios.get(url);
          const parsed = res.data.map(k => ({
            t: k[0],
            o: k[1],
            h: k[2],
            l: k[3],
            c: k[4],
            v: k[5] // Volumen base
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
  return INTERVALS_MS[tf];
}

module.exports = { fetchInitialKlines };
