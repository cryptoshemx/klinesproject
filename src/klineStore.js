const klinesData = {}; // klinesData[symbol][tf] = array de velas

function storeKline(symbol, tf, kline) {
  if (!klinesData[symbol]) klinesData[symbol] = {};
  if (!klinesData[symbol][tf]) klinesData[symbol][tf] = [];

  // Añadimos la kline al almacén
  klinesData[symbol][tf].push(kline);

  // Limita a las últimas 1000
  if (klinesData[symbol][tf].length > 1000) {
    klinesData[symbol][tf].shift();
  }

  // Solo para btcusdt, mostrar la información de la kline recién cerrada
  // if (symbol === 'btcusdt') {
  //   const tfMs = getTimeframeMs(tf);
  //   const startTime = new Date(kline.t - tfMs);
  //   const endTime = new Date(kline.t);
    
  //   console.log(`==== Periodo: ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()} ====`);
  //   console.log(`✅ ${tf} cerrada:`, {
  //     o: kline.o,
  //     h: kline.h,
  //     l: kline.l,
  //     c: kline.c,
  //     v: kline.v
  //   });
  //   console.log("=======================================================================");
  // }
}

function getKlines(symbol, tf) {
  return klinesData[symbol]?.[tf] || [];
}

function getTimeframeMs(tf) {
  const map = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000
  };
  return map[tf];
}

module.exports = { storeKline, getKlines, klinesData };
