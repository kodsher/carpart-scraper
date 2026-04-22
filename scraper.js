const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function scrapeEbay({ year, make, model, part, jobId }) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Build search URL
  const searchQuery = `${year}+${make}+${model}+${part.replace(/ /g, '+')}`;
  const baseUrl = `https://www.ebay.com/sch/i.html?_nkw=${searchQuery}&_sacat=0&_from=R40&_trksid=p2334524.m570.l1313&rt=nc&LH_ItemCondition=3000&_ipg=240`;

  console.log(`[${jobId}] Scraping: ${year} ${make} ${model} ${part}`);

  const allItems = [];
  let resultCount = 'Not found';
  let currentPage = 1;
  const maxPages = 5; // Limit pages for Railway

  try {
    while (currentPage <= maxPages) {
      const pageUrl = `${baseUrl}&_pgn=${currentPage}`;
      console.log(`[${jobId}] Fetching page ${currentPage}...`);

      await page.goto(pageUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await page.waitForTimeout(2000);

      // Extract result count from first page
      if (currentPage === 1) {
        const resultCountElement = await page.locator('.srp-controls__count-heading .BOLD').first();
        resultCount = await resultCountElement.textContent().catch(() => 'Not found');
        resultCount = resultCount.trim();
      }

      // Extract items
      const items = await page.evaluate(() => {
        const mainResultsContainer = document.querySelector('.srp-river-main');
        if (!mainResultsContainer) return [];

        const cards = mainResultsContainer.querySelectorAll('.s-card');
        const extracted = [];

        cards.forEach((card) => {
          const isInCarousel = card.closest('.carousel__snap-point') || card.closest('.carousel__list');
          if (isInCarousel) return;

          const titleEl = card.querySelector('.s-card__title .su-styled-text.primary.default');
          const title = titleEl ? titleEl.textContent.trim() : '';
          if (!title || title.includes('Shop on eBay')) return;

          const priceEl = card.querySelector('.s-card__price');
          const price = priceEl ? priceEl.textContent.trim() : '';

          const conditionEl = card.querySelector('.s-card__subtitle .su-styled-text.secondary');
          const condition = conditionEl ? conditionEl.textContent.trim() : '';

          const sellerEl = card.querySelector('.su-card-container__footer .su-styled-text.primary');
          const seller = sellerEl ? sellerEl.textContent.trim() : '';

          const linkEl = card.querySelector('.s-card__link[href*="/itm/"]');
          const url = linkEl ? linkEl.href : '';

          const idMatch = url.match(/itm\/([0-9]+)/);
          const itemId = idMatch ? idMatch[1] : '';

          const imgEl = card.querySelector('img.s-card__image');
          const imageUrl = imgEl ? imgEl.src : '';

          extracted.push({
            title, price, condition, seller, url, itemId, imageUrl
          });
        });
        return extracted;
      });

      console.log(`[${jobId}] Found ${items.length} items on page ${currentPage}`);
      allItems.push(...items);

      // Check if there's a next page
      const hasNextPage = await page.evaluate((currentPageNum) => {
        const pageLinks = Array.from(document.querySelectorAll('a')).filter(a =>
          a.href.includes('_pgn=') && a.textContent.trim()
        );
        const nextPageLink = pageLinks.find(a => {
          const match = a.href.match(/_pgn=(\d+)/);
          return match && parseInt(match[1]) === currentPageNum + 1;
        });
        return nextPageLink !== undefined;
      }, currentPage);

      if (!hasNextPage) {
        break;
      }

      currentPage++;
    }

    const totalResultsInt = parseInt(resultCount.replace(/,/g, '')) || allItems.length;

    console.log(`[${jobId}] Complete: ${allItems.length} items found`);

    return {
      jobId,
      total: totalResultsInt,
      count: allItems.length,
      resultCount,
      listings: allItems
    };

  } finally {
    await context.close();
    await browser.close();
  }
}

module.exports = { scrapeEbay };
