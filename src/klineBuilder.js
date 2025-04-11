const { storeKline, klinesData, getKlines } = require('./klineStore');

const timeframes = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
};

const buffer = {}; // buffer[symbol][tf] = current kline

// Función que se llama al inicio del programa para sincronizar el buffer con los datos existentes
function initializeBuffers() {
  console.log('\n🔄 Inicializando buffers a partir de los datos existentes...');
  
  // Para cada símbolo en klinesData
  Object.keys(klinesData).forEach(symbol => {
    buffer[symbol] = {};
    // Para cada timeframe en ese símbolo
    Object.keys(klinesData[symbol]).forEach(tf => {
      if (tf === '1m') return; // Saltamos 1m, solo nos interesan timeframes superiores
      
      const klines = klinesData[symbol][tf];
      if (klines.length === 0) return;
      
      // Obtener el último kline cerrado de este tf
      const lastKline = klines[klines.length - 1];
      const tfMs = timeframes[tf];
      
      // Calcular inicio del período actual
      const now = Date.now();
      const currentPeriodStart = Math.floor(now / tfMs) * tfMs;
      
      // Si el último kline es del período actual, lo usamos como base del buffer
      if (lastKline.t === currentPeriodStart) {
        buffer[symbol][tf] = {
          ...lastKline,
          count: 1 // Iniciamos contador
        };
        console.log(`Sincronizado ${symbol} ${tf}: utilizando último kline existente`);  
      }
      // Si estamos en un período nuevo, inicializamos buffer con el último kline pero nuevo timestamp
      else if (lastKline.t < currentPeriodStart) {
        buffer[symbol][tf] = {
          t: currentPeriodStart,
          o: lastKline.c, // Abrimos al cierre del período anterior
          h: lastKline.c,
          l: lastKline.c,
          c: lastKline.c,
          v: '0',
          count: 0
        };
        console.log(`Sincronizado ${symbol} ${tf}: iniciando nuevo período`);  
      }
    });
  });
  console.log('✅ Buffers inicializados correctamente.');
}

function handle1mKline(symbol, kline) {
  // Inicializamos buffers si no se ha hecho (primera ejecución)
  if (Object.keys(buffer).length === 0) {
    initializeBuffers();
  }
  
  // Primero, manejar el timeframe de 1m
  storeKline(symbol, '1m', {
    t: kline.t,
    o: kline.o,
    h: kline.h,
    l: kline.l,
    c: kline.c,
    v: kline.v
  });
  
  // Ahora procesamos los timeframes superiores
  const higherTFs = Object.keys(timeframes).filter(tf => tf !== '1m');
  
  higherTFs.forEach(tf => {
    const tfMs = timeframes[tf];
    // Alineamos el timestamp al inicio del período actual
    const currentPeriodStart = Math.floor(kline.t / tfMs) * tfMs;
    
    // Verificamos si este kline de 1m marca el fin de un período mayor
    const isEndOfPeriod = (kline.t + 60000) % tfMs === 0;
    
    if (!buffer[symbol]) buffer[symbol] = {};
    if (!buffer[symbol][tf]) {
      // Inicializar el buffer para este TF si no existe
      // Si tenemos datos en klinesData, usamos el último como referencia
      if (klinesData[symbol] && klinesData[symbol][tf] && klinesData[symbol][tf].length > 0) {
        const existingKlines = klinesData[symbol][tf];
        const lastKline = existingKlines[existingKlines.length - 1];
        
        // Si el último kline cerrado es del período actual
        if (lastKline.t === currentPeriodStart) {
          buffer[symbol][tf] = {
            ...lastKline,
            h: Math.max(parseFloat(lastKline.h), parseFloat(kline.h)).toString(),
            l: Math.min(parseFloat(lastKline.l), parseFloat(kline.l)).toString(),
            c: kline.c,
            v: lastKline.v, // Mantenemos el volumen original, solo agregamos el del nuevo kline
            baseVolume: parseFloat(lastKline.v), // Guardamos el volumen base
            addedVolume: parseFloat(kline.v), // Y el volumen añadido por este kline
            count: 1
          };
        } 
        // Si es un nuevo período
        else {
          buffer[symbol][tf] = {
            t: currentPeriodStart,
            o: kline.o,
            h: kline.h,
            l: kline.l,
            c: kline.c,
            v: kline.v,
            count: 1
          };
        }
      } 
      // No tenemos datos previos
      else {
        buffer[symbol][tf] = {
          t: currentPeriodStart,
          o: kline.o,
          h: kline.h,
          l: kline.l,
          c: kline.c,
          v: kline.v,
          count: 1
        };
      }
    } 
    // El buffer ya existe, actualizamos si es para el período actual
    else if (buffer[symbol][tf].t === currentPeriodStart) {
      // Actualizar el buffer existente para el período actual
      const current = buffer[symbol][tf];
      current.h = Math.max(parseFloat(current.h), parseFloat(kline.h)).toString();
      current.l = Math.min(parseFloat(current.l), parseFloat(kline.l)).toString();
      current.c = kline.c; // Actualiza el precio de cierre
      
      // Manejo correcto de volumen
      if (!current.baseVolume) {
        current.baseVolume = parseFloat(current.v);
        current.addedVolume = 0;
      }
      current.addedVolume += parseFloat(kline.v);
      // El volumen mostrado será solo el base + lo añadido
      current.v = current.baseVolume.toString();
      current.count++;
    } 
    // Nuevo período, guardamos el anterior y creamos uno nuevo
    else {
      // Estamos en un nuevo período, guardar el anterior y crear uno nuevo
      const completedKline = { ...buffer[symbol][tf] };
      
      // Solo para btcusdt (para debugging)
      if (symbol === 'btcusdt') {
        const startTime = new Date(completedKline.t);
        const endTime = new Date(completedKline.t + tfMs);
        
        // Preparar datos de volumen para el log
        let reportedVolume = completedKline.v;
        if (completedKline.baseVolume) {
          // Si tenemos datos separados, mostramos el correcto
          reportedVolume = completedKline.baseVolume.toString();
        }
        
        console.log(`\n🔵 ${tf} completado: ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()} con ${completedKline.count} klines de 1m:`, {
          o: completedKline.o,
          h: completedKline.h,
          l: completedKline.l,
          c: completedKline.c,
          v: reportedVolume
        });
      }
      
      // Preparar el kline completado para almacenamiento
      const klineToStore = {
        t: completedKline.t,
        o: completedKline.o,
        h: completedKline.h,
        l: completedKline.l,
        c: completedKline.c,
        v: completedKline.baseVolume ? completedKline.baseVolume.toString() : completedKline.v
      };
      
      // Guardar el kline completado (limpio, sin propiedades extras)
      storeKline(symbol, tf, klineToStore);
      
      // Iniciar un nuevo período
      buffer[symbol][tf] = {
        t: currentPeriodStart,
        o: kline.o,
        h: kline.h,
        l: kline.l,
        c: kline.c,
        v: kline.v,
        baseVolume: parseFloat(kline.v), // Inicializamos con el volumen base correcto
        addedVolume: 0,
        count: 1
      };
    }
    
    // Si este kline marca el final de un período mayor, podríamos hacer algo aquí
    // pero no vamos a generar logs para cada uno para evitar sobrecarga
    if (isEndOfPeriod) {
      // Aquí podríamos implementar lógica adicional si es necesario
      // sin generar logs excesivos
    }
  });
}

function generateHigherTFKline(symbol, tf, tfMs) {
  // Verifica si ya tenemos suficientes datos para el timeframe
  if (klinesData[symbol] && klinesData[symbol][tf]) {
    const klineArray = klinesData[symbol][tf];

    // Asegura que haya al menos un kline
    if (klineArray.length > 0) {
      // Obtener el último kline cerrado
      const closedKline = klineArray.slice(-1)[0]; // Ahora tomamos el último kline

      const closeTime = new Date(closedKline.t);
      const formattedCloseTime = closeTime.toLocaleTimeString();

      console.log(`✅ ${tf} cerrada a ${formattedCloseTime}:`, {
        o: closedKline.o,
        h: closedKline.h,
        l: closedKline.l,
        c: closedKline.c,
        v: closedKline.v
      });
    }
  }
}


function buildInitialKline(tf, k1m) {
  const tfMs = timeframes[tf];
  const alignedTime = Math.floor(k1m.t / tfMs) * tfMs;

  return {
    t: alignedTime,
    o: k1m.o,
    h: k1m.h,
    l: k1m.l,
    c: k1m.c,
    v: k1m.v,
  };
}

function updateBufferedKline(current, k1m) {
  current.h = Math.max(parseFloat(current.h), parseFloat(k1m.h)).toString();
  current.l = Math.min(parseFloat(current.l), parseFloat(k1m.l)).toString();
  current.c = k1m.c;
  current.v = (parseFloat(current.v) + parseFloat(k1m.v)).toString();
}

module.exports = { handle1mKline, initializeBuffers };
