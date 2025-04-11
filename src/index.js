const { fetchInitialKlines } = require('./initData');
const startWS = require('./wsClient');

// Símbolos fijos por ahora (más adelante dinámico con API)
const symbols = ['btcusdt', 'ethusdt', 'bnbusdt', 'solusdt'];

async function init() {
  await fetchInitialKlines(symbols);  // carga 1000 klines por símbolo
  startWS(symbols);                   // luego inicia WebSocket
}

init();
