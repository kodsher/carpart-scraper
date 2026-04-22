const express = require('express');
const cors = require('cors');
const { scrapeEbay } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'carpart-scraper' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Scrape endpoint
app.post('/scrape', async (req, res) => {
  try {
    const { year, make, model, part, jobId } = req.body;

    console.log('[SCRAPER] Request received:', { year, make, model, part, jobId });

    if (!year || !make || !model || !part) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['year', 'make', 'model', 'part']
      });
    }

    // Start scraping
    const results = await scrapeEbay({ year, make, model, part, jobId });

    res.json({
      success: true,
      results: results.listings,
      total: results.total,
      jobId: results.jobId
    });
  } catch (error) {
    console.error('[SCRAPER] Error:', error);
    res.status(500).json({
      error: error.message,
      success: false
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Scraper service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
