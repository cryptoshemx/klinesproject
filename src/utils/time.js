function getTFs() {
    return ['1m', '5m', '15m', '1h', '1d'];
  }
  
  function getTimestampBucket(tf, timestamp) {
    const ms = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    }[tf];
  
    return Math.floor(timestamp / ms) * ms;
  }
  
  module.exports = { getTFs, getTimestampBucket };
  