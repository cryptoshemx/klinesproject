// Configuración de símbolos y timeframes
const SYMBOLS = ['btcusdt', 'ethusdt', 'bnbusdt', 'solusdt'];
const TIMEFRAMES = ['1m', '5m', '15m', '1h', '1d'];

// Configuración de API y WebSocket
const WS_BASE_URL = 'wss://fstream.binance.com/stream';
const REST_BASE_URL = 'https://fapi.binance.com/fapi/v1';
const REQUEST_LIMIT = 250;
const INITIAL_KLINES = 1000;

// Configuración de intervalos en milisegundos
const INTERVALS_MS = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000
};

module.exports = {
  SYMBOLS,
  TIMEFRAMES,
  WS_BASE_URL,
  REST_BASE_URL,
  REQUEST_LIMIT,
  INITIAL_KLINES,
  INTERVALS_MS
};
