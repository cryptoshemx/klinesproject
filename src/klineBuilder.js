const { storeKline, klinesData, getKlines } = require('./klineStore');

// Configuraci\u00f3n de timeframes en milisegundos y sus dependencias
const timeframes = {
  '1m': { ms: 60000, base: null },
  '3m': { ms: 180000, base: '1m', count: 3 },
  '5m': { ms: 300000, base: '1m', count: 5 },
  '15m': { ms: 900000, base: '5m', count: 3 },
  '30m': { ms: 1800000, base: '15m', count: 2 },
  '1h': { ms: 3600000, base: '15m', count: 4 },
  '2h': { ms: 7200000, base: '1h', count: 2 },
  '4h': { ms: 14400000, base: '2h', count: 2 },
  '6h': { ms: 21600000, base: '2h', count: 3 },
  '8h': { ms: 28800000, base: '4h', count: 2 },
  '12h': { ms: 43200000, base: '6h', count: 2 },
  '1d': { ms: 86400000, base: '12h', count: 2 },
  '3d': { ms: 259200000, base: '1d', count: 3 },
  '1w': { ms: 604800000, base: '1d', count: 7 },
  '1M': { ms: 2592000000, base: '1w', count: 4 }
};

const buffer = {}; // buffer[symbol][tf] = current kline

// Funci\u00f3n que se llama al inicio del programa para sincronizar el buffer con los datos existentes
function initializeBuffers() {
  console.log('\n\ud83d\udd04 Inicializando buffers a partir de los datos existentes...');
  
  // Para cada s\u00edmbolo en klinesData
  Object.keys(klinesData).forEach(symbol => {
    buffer[symbol] = {};
    // Para cada timeframe en ese s\u00edmbolo
    Object.keys(klinesData[symbol]).forEach(tf => {
      if (tf === '1m') return; // Saltamos 1m, solo nos interesan timeframes superiores
      
      const klines = klinesData[symbol][tf];
      if (klines.length === 0) return;
      
      // Obtener el \u00faltimo kline cerrado de este tf
      const lastKline = klines[klines.length - 1];
      const tfMs = timeframes[tf].ms;
      
      // Calcular inicio del per\u00edodo actual
      const now = Date.now();
      const currentPeriodStart = Math.floor(now / tfMs) * tfMs;
      
      // Si el \u00faltimo kline es del per\u00edodo actual, lo usamos como base del buffer
      if (lastKline.t === currentPeriodStart) {
        buffer[symbol][tf] = {
          ...lastKline,
          processedTimes: new Set([lastKline.t]),
          count: 1,
          baseKlines: []
        };
      }
      // Si estamos en un per\u00edodo nuevo, inicializamos buffer con el \u00faltimo kline pero nuevo timestamp
      else if (lastKline.t < currentPeriodStart) {
        buffer[symbol][tf] = {
          t: currentPeriodStart,
          o: lastKline.c,
          h: lastKline.c,
          l: lastKline.c,
          c: lastKline.c,
          v: '0',
          processedTimes: new Set(),
          count: 0,
          baseKlines: []
        };
      }
    });
  });
  console.log('\u2705 Buffers inicializados correctamente.');
}

function handle1mKline(symbol, kline) {
  // Inicializamos buffers si no se ha hecho (primera ejecuci\u00f3n)
  if (Object.keys(buffer).length === 0) {
    initializeBuffers();
  }
  
  // Primero, manejar el timeframe de 1m
  const kline1m = {
    t: parseInt(kline.t),
    o: kline.o,
    h: kline.h,
    l: kline.l,
    c: kline.c,
    v: kline.v
  };
  
  // Verificar si ya procesamos este kline
  if (!buffer[symbol]) buffer[symbol] = {};
  if (!buffer[symbol]['1m']) {
    buffer[symbol]['1m'] = { 
      processedTimes: new Set(),
      baseKlines: []
    };
  }
  
  // Si ya procesamos este kline, no lo procesamos de nuevo
  if (buffer[symbol]['1m'].processedTimes.has(kline1m.t)) {
    return;
  }
  
  // Marcar este kline como procesado y guardarlo
  buffer[symbol]['1m'].processedTimes.add(kline1m.t);
  buffer[symbol]['1m'].baseKlines.push(kline1m);
  
  storeKline(symbol, '1m', kline1m);
  
  // Procesar timeframes en orden, construyendo cada uno a partir de su base
  const processedKlines = { '1m': kline1m };
  
  Object.entries(timeframes)
    .filter(([tf]) => tf !== '1m')
    .sort((a, b) => a[1].ms - b[1].ms)
    .forEach(([tf, config]) => {
      const tfMs = config.ms;
      const baseTF = config.base;
      
      // Alinear el timestamp al inicio del período actual
      const currentPeriodStart = Math.floor(kline1m.t / tfMs) * tfMs;
      
      if (!buffer[symbol]) buffer[symbol] = {};
      
      // Usar el timeframe base definido en la configuración
      const baseKlines = getKlines(symbol, baseTF);
      if (!baseKlines || baseKlines.length === 0) {
        return;
      }
      
      if (symbol === 'btcusdt') {
        console.log(`📄 Procesando ${tf} usando ${baseTF} como base`);
      }
      
      // Filtrar klines base para este período
      if (symbol === 'btcusdt' && tf === '3m') {
        console.log(`📋 Total klines de 1m disponibles: ${baseKlines.length}`);
        console.log(`📂 Periodo actual: ${new Date(currentPeriodStart).toLocaleTimeString()} - ${new Date(currentPeriodStart + tfMs).toLocaleTimeString()}`);
      }
      
      const periodBaseKlines = baseKlines
        .sort((a, b) => parseInt(a.t) - parseInt(b.t))
        .filter(k => {
          const klineTime = parseInt(k.t);
          const inPeriod = klineTime >= currentPeriodStart && klineTime < (currentPeriodStart + tfMs);
          
          if (symbol === 'btcusdt' && tf === '3m' && inPeriod) {
            console.log(`📃 Kline de 1m encontrado: ${new Date(klineTime).toLocaleTimeString()} - v:${k.v}`);
          }
          
          return inPeriod;
        });
      
      // Si no existe el buffer para este timeframe, lo inicializamos
      if (!buffer[symbol][tf] || buffer[symbol][tf].t !== currentPeriodStart) {
        if (periodBaseKlines.length === 0) return;
        
        // Agrupar klines por timestamp y tomar el de mayor volumen
        const klinesMap = new Map();
        for (const k of periodBaseKlines) {
          const existingKline = klinesMap.get(k.t);
          if (!existingKline || parseFloat(k.v) > parseFloat(existingKline.v)) {
            klinesMap.set(k.t, k);
          }
        }
        
        // Ordenar klines por timestamp
        const uniqueKlines = Array.from(klinesMap.values())
          .sort((a, b) => parseInt(a.t) - parseInt(b.t));
        
        const firstKline = uniqueKlines[0];
        buffer[symbol][tf] = {
          t: currentPeriodStart,
          o: firstKline.o,
          h: firstKline.h,
          l: firstKline.l,
          c: firstKline.c,
          v: firstKline.v,
          processedTimes: new Set([firstKline.t]),
          count: 1,
          baseKlines: [firstKline]
        };
      }
      
      const current = buffer[symbol][tf];
      
      // Agrupar klines por timestamp y tomar el de mayor volumen
      const klinesMap = new Map();
      for (const k of periodBaseKlines) {
        const existingKline = klinesMap.get(k.t);
        if (!existingKline || parseFloat(k.v) > parseFloat(existingKline.v)) {
          klinesMap.set(k.t, k);
        }
      }
      
      // Procesar klines únicos ordenados por timestamp
      const uniqueKlines = Array.from(klinesMap.values())
        .sort((a, b) => parseInt(a.t) - parseInt(b.t));
      
      for (const baseKline of uniqueKlines) {
        if (!current.processedTimes.has(baseKline.t)) {
          current.processedTimes.add(baseKline.t);
          current.count++;
          
          // Actualizar precios
          current.h = Math.max(parseFloat(current.h), parseFloat(baseKline.h)).toString();
          current.l = Math.min(parseFloat(current.l), parseFloat(baseKline.l)).toString();
          current.c = baseKline.c;
          
          // Debug volumen
          if (symbol === 'btcusdt') {
            console.log(`📈 [${tf}] Agregando volumen ${baseKline.v} (${new Date(baseKline.t).toLocaleTimeString()}) al total ${current.v}`);
          }
          
          // Sumar volumen
          current.v = (parseFloat(current.v) + parseFloat(baseKline.v)).toString();
          
          // Debug volumen actualizado
          if (symbol === 'btcusdt') {
            console.log(`📉 [${tf}] Nuevo total: ${current.v}`);
          }
          
          // Agregar a la lista de klines base
          current.baseKlines.push(baseKline);
        }
      }
      
      // Verificar si este kline marca el fin de un período
      let isEndOfPeriod = false;
      if (baseTF === '1m') {
        // Para timeframes que usan 1m como base, verificar si el kline de 1m marca el fin
        isEndOfPeriod = (kline1m.t + timeframes['1m'].ms) % tfMs === 0;
      } else {
        // Para timeframes que usan otros timeframes como base, verificar si tenemos todos los klines base
        const expectedCount = timeframes[tf].count;
        isEndOfPeriod = current.count >= expectedCount;
      }
      
      // Si este kline marca el final de un período, procesarlo inmediatamente
      if (isEndOfPeriod && current) {
        // Solo para btcusdt (para debugging)
        if (symbol === 'btcusdt') {
          const startTime = new Date(current.t);
          const endTime = new Date(current.t + tfMs);
          const baseCount = current.baseKlines?.length || 0;
          const expectedBaseCount = timeframes[tf].count;
          const baseDesc = baseCount > 0 ? ` con ${baseCount}/${expectedBaseCount} klines de ${baseTF}` : '';
          
          console.log(`\n\ud83d\udd35 ${tf} completado: ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}${baseDesc}:`, {
            o: current.o,
            h: current.h,
            l: current.l,
            c: current.c,
            v: current.v
          });
        }
        
        // Crear y guardar el kline completado
        const completedKline = {
          t: current.t,
          o: current.o,
          h: current.h,
          l: current.l,
          c: current.c,
          v: current.v,
          baseCount: current.baseKlines?.length || 0
        };
        
        storeKline(symbol, tf, completedKline);
        processedKlines[tf] = completedKline;
        
        // Iniciar nuevo per\u00edodo
        buffer[symbol][tf] = {
          t: currentPeriodStart,
          o: current.c,
          h: current.c,
          l: current.c,
          c: current.c,
          v: '0',
          processedTimes: new Set(),
          count: 0,
          baseKlines: []
        };
      }
    });
}

function updateLiveKline(symbol, kline) {
  // Solo actualizamos precios en tiempo real, el volumen se maneja en handle1mKline
  Object.entries(timeframes).forEach(([tf]) => {
    if (!buffer[symbol] || !buffer[symbol][tf]) return;
    
    const current = buffer[symbol][tf];
    
    // Actualizar precios del kline actual
    current.h = Math.max(parseFloat(current.h), parseFloat(kline.h)).toString();
    current.l = Math.min(parseFloat(current.l), parseFloat(kline.l)).toString();
    current.c = kline.c;
  });
}

module.exports = { handle1mKline, initializeBuffers, updateLiveKline };
