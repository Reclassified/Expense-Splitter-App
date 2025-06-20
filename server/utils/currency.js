const axios = require('axios');

const API_URL = 'https://api.exchangerate-api.com/v4/latest/';

let ratesCache = {
  data: null,
  lastUpdated: 0,
};

async function getRates(base = 'USD') {
  const now = Date.now();
  // Cache for 1 hour
  if (ratesCache.data && (now - ratesCache.lastUpdated < 3600 * 1000)) {
    return ratesCache.data.rates;
  }

  try {
    const response = await axios.get(`${API_URL}${base}`);
    ratesCache = {
      data: response.data,
      lastUpdated: now,
    };
    return response.data.rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return null;
  }
}

async function convert(amount, from, to) {
  const rates = await getRates(from);
  if (!rates || !rates[to]) {
    return null;
  }
  return amount * rates[to];
}

module.exports = { getRates, convert }; 