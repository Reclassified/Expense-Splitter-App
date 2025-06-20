const express = require('express');
const { getRates } = require('../utils/currency');

const router = express.Router();

/**
 * @swagger
 * /currency/rates:
 *   get:
 *     summary: Get latest currency rates
 *     tags: [Currency]
 *     parameters:
 *       - in: query
 *         name: base
 *         schema:
 *           type: string
 *         description: "Base currency (default: USD)"
 *     responses:
 *       200:
 *         description: Exchange rates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Failed to fetch rates
 */
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

/**
 * @swagger
 * /currency/supported:
 *   get:
 *     summary: Get list of supported currencies
 *     tags: [Currency]
 *     responses:
 *       200:
 *         description: List of supported currencies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *       500:
 *         description: Failed to fetch currencies
 */
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
