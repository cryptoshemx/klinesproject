const { fetchInitialKlines } = require('./initData');
const startWS = require('./wsClient');
const { SYMBOLS } = require('./config');

async function init() {
  console.log('🔄 Cargando klines iniciales...');
  await fetchInitialKlines(SYMBOLS);  // carga klines iniciales por símbolo
  console.log('✅ Klines iniciales cargados');
  console.log('🔌 Iniciando WebSocket...');
  startWS(SYMBOLS);                   // luego inicia WebSocket
}

init();
