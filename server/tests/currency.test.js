const { convert, ratesCache } = require('../utils/currency');
const axios = require('axios');

jest.mock('axios');

describe('currency utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ratesCache.data = null;
    ratesCache.lastUpdated = 0;
  });

  it('returns null if API call fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('API error'));
    const result = await convert(100, 'USD', 'EUR');
    expect(result).toBeNull();
  });

  it('converts amount using mocked rates', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        rates: { USD: 1, EUR: 0.9, GBP: 0.8 },
      },
    });
    const result = await convert(100, 'USD', 'EUR');
    expect(result).toBeCloseTo(90);
  });

  it('returns null if target currency is missing', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        rates: { USD: 1 },
      },
    });
    const result = await convert(100, 'USD', 'XYZ');
    expect(result).toBeNull();
  });
}); 