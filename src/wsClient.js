const WebSocket = require('ws');
const { handle1mKline } = require('./klineBuilder');

module.exports = function startWS(symbols) {
  const streams = symbols.map(sym => `${sym}@kline_1m`).join('/');
  const ws = new WebSocket(`wss://fstream.binance.com/stream?streams=${streams}`);

  ws.on('message', (msg) => {
    const { data } = JSON.parse(msg);
    const kline = data.k;
    const symbol = data.s.toLowerCase();

    if (!kline.x) handle1mKline(symbol, kline); // vela cerrada
  });

  ws.on('open', () => console.log('WebSocket de futuros conectado'));
  ws.on('close', () => console.log('WebSocket de futuros desconectado'));
  ws.on('error', (err) => console.error('WebSocket error:', err.message));
};
