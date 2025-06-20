const express = require('express');
const { getRates } = require('../utils/currency');

const router = express.Router();

// Get latest rates for a base currency
router.get('/rates', async (req, res) => {
  const { base = 'USD' } = req.query;
  const rates = await getRates(base);
  if (rates) {
    res.json(rates);
  } else {
    res.status(500).json({ error: 'Failed to fetch rates' });
  }
});

// Get list of supported currencies
router.get('/supported', async (req, res) => {
  const rates = await getRates('USD');
  if (rates) {
    res.json(Object.keys(rates));
  } else {
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
});

module.exports = router;
