const axios = require('axios');

async function getFuturesSymbols() {
  const url = 'https://fapi.binance.com/fapi/v1/exchangeInfo';
  const res = await axios.get(url);
  return res.data.symbols
    .filter(s => s.contractType === 'PERPETUAL' && s.status === 'TRADING')
    .map(s => s.symbol.toLowerCase());
}

module.exports = { getFuturesSymbols };
