const WebSocket = require('ws');
const { handle1mKline, updateLiveKline } = require('./klineBuilder');
const { WS_BASE_URL } = require('./config');

module.exports = function startWS(symbols) {
  const streams = symbols.map(sym => `${sym}@kline_1m`).join('/');
  console.log(`${WS_BASE_URL}?streams=${streams}`)
  const ws = new WebSocket(`${WS_BASE_URL}?streams=${streams}`);

  ws.on('message', (msg) => {
    const { data } = JSON.parse(msg);
    const kline = data.k;
    const symbol = data.s.toLowerCase();

    const k1m = {
      t: parseInt(kline.t), // Asegurarnos que es número
      o: kline.o,
      h: kline.h,
      l: kline.l,
      c: kline.c,
      v: kline.v
    };

    // Si el kline está cerrado, procesarlo completamente
    if (kline.x) {
      handle1mKline(symbol, k1m);
    }
    // Si no está cerrado, actualizar precios en tiempo real
    else {
      updateLiveKline(symbol, k1m);
    }
  });

  ws.on('open', () => console.log('WebSocket de futuros conectado'));
  ws.on('close', () => console.log('WebSocket de futuros desconectado'));
  ws.on('error', (err) => console.error('WebSocket error:', err.message));
};
