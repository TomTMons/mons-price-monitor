/**
 * Mons Royale Price Monitor
 * Run with: node scraper.js
 */

import { chromium } from 'playwright';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { createObjectCsvWriter } from 'csv-writer';

// ─────────────────────────────────────────────────────────────
// SKU LIST — add/edit products here
// Find URLs by searching the product on each retailer's site
// Set url_bf or url_bz to null if they don't stock it
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// RETAILERS
// bf   = Bergfreunde DE (bergfreunde.de)
// bfeu = Bergfreunde EU (bergfreunde.eu)
// bz   = Bergzeit (bergzeit.de)
// va   = Varuste (varuste.net)
// range = set once ranges.csv is loaded. Leave as null until then.
// ─────────────────────────────────────────────────────────────
const SKUS = [
  {
    name: "Cascade Merino Base Layer Long Sleeve (men's)",
    category: "Base layer", range: "rollover",
    rrp: 109.95,
    url_bf:   "https://www.bergfreunde.de/mons-royale-cascade-merino-flex-200-l-s-merinounterwaesche/",
    url_bfeu: "https://www.bergfreunde.eu/mons-royale-cascade-merino-flex-200-l-s-merino-base-layer/",
    url_bz:   "https://www.bergzeit.de/p/mons-royale-herren-cascade-merino-longsleeve/1095328/",
    url_va:   null,
  },
  {
    name: "Cascade Merino Base Layer Long Sleeve (women's)",
    category: "Base layer", range: "rollover",
    rrp: 109.95,
    url_bf:   "https://www.bergfreunde.de/mons-royale-womens-cascade-merino-flex-200-l-s-merinounterwaesche/",
    url_bfeu: "https://www.bergfreunde.eu/mons-royale-womens-cascade-merino-flex-200-l-s-merino-base-layer/",
    url_bz:   "https://www.bergzeit.de/p/mons-royale-damen-cascade-merino-longsleeve/1095333/",
    url_va:   null,
  },
  {
    name: "Cascade Merino Base Layer Legging (men's)",
    category: "Base layer", range: "rollover",
    rrp: 99.95,
    url_bf:   "https://www.bergfreunde.de/mons-royale-cascade-merino-flex-200-legging-merinounterwaesche/",
    url_bfeu: "https://www.bergfreunde.eu/mons-royale-cascade-merino-flex-200-legging-merino-base-layer/",
    url_bz:   "https://www.bergzeit.de/p/mons-royale-herren-cascade-flex-200-hose/1095330/",
    url_va:   null,
  },
  {
    name: "Cascade Merino Base Layer Legging (women's)",
    category: "Base layer", range: "rollover",
    rrp: 99.95,
    url_bf:   "https://www.bergfreunde.de/mons-royale-womens-cascade-merino-flex-200-legging-merinounterwaesche/",
    url_bfeu: "https://www.bergfreunde.eu/mons-royale-womens-cascade-merino-flex-200-legging-merino-base-layer/",
    url_bz:   "https://www.bergzeit.de/p/mons-royale-damen-cascade-flex-200-hose/1095335/",
    url_va:   null,
  },
  {
    name: "Cascade Merino Base Layer 3/4 Legging (men's)",
    category: "Base layer", range: "rollover",
    rrp: 89.95,
    url_bf:   "https://www.bergfreunde.de/mons-royale-cascade-merino-flex-200-3-4-legging-merinounterwaesche/",
    url_bfeu: "https://www.bergfreunde.eu/mons-royale-cascade-merino-flex-200-3-4-legging-merino-base-layer/",
    url_bz:   null,
    url_va:   null,
  },
  {
    name: "Icon Merino Long Sleeve (men's)",
    category: "Base layer", range: "new",
    rrp: 89.95,
    url_bf:   "https://www.bergfreunde.de/mons-royale-icon-merino-air-con-raglan-merinoshirt/",
    url_bfeu: "https://www.bergfreunde.eu/mons-royale-icon-merino-air-con-raglan-merino-base-layer/",
    url_bz:   "https://www.bergzeit.de/p/mons-royale-herren-icon-merino-air-con-raglan-long-sleeve/1125967/",
    url_va:   null,
  },
  {
    name: "Tarn Merino Long Sleeve (men's)",
    category: "Base layer", range: "new",
    rrp: 109.95,
    url_bf:   "https://www.bergfreunde.de/mons-royale-tarn-merino-long-sleeve-merinoshirt/",
    url_bfeu: "https://www.bergfreunde.eu/mons-royale-tarn-merino-long-sleeve-merino-base-layer/",
    url_bz:   "https://www.bergzeit.de/p/mons-royale-herren-tarn-merino-longsleeve/1125979/",
    url_va:   null,
  },
  {
    name: "Bella Merino Long Sleeve Hood (women's)",
    category: "Base layer", range: "new",
    rrp: 119.95,
    url_bf:   "https://www.bergfreunde.de/mons-royale-womens-bella-tech-hood-merinounterwaesche/",
    url_bfeu: "https://www.bergfreunde.eu/mons-royale-womens-bella-tech-hood-merino-base-layer/",
    url_bz:   "https://www.bergzeit.de/p/mons-royale-damen-bella-tech-hood-longsleeve/1079753/",
    url_va:   null,
  },
  {
    name: "Diversion Merino Wind Jacket (men's)",
    category: "Outerwear", range: "new",
    rrp: 199.95,
    url_bf:   "https://www.bergfreunde.de/mons-royale-diversion-merino-wind-jacket-softshelljacke/",
    url_bfeu: "https://www.bergfreunde.eu/mons-royale-diversion-merino-wind-jacket-softshell-jacket/",
    url_bz:   "https://www.bergzeit.de/p/mons-royale-herren-diversion-merino-wind-jacket/1142190/",
    url_va:   null,
  },
  {
    name: "Canyon Merino Insulated Hooded Jacket (men's)",
    category: "Outerwear", range: "rollover",
    rrp: 319.95,
    url_bf:   "https://www.bergfreunde.de/mons-royale-canyon-merino-hoodie-jacket-softshelljacke/",
    url_bfeu: "https://www.bergfreunde.eu/mons-royale-canyon-merino-hoodie-jacket-softshell-jacket/",
    url_bz:   "https://www.bergzeit.de/p/mons-royale-herren-canyon-merino-hoodie-jacket/1142188/",
    url_va:   null,
  },
];

// ─────────────────────────────────────────────────────────────
// PRICE EXTRACTION
// ─────────────────────────────────────────────────────────────
async function extractPrice(page, url, retailer, rrp) {
  // Minimum credible price: 40% of RRP. Filters out shipping costs, voucher amounts, etc.
  const minPrice = rrp * 0.5;
  const maxPrice = rrp * 1.2; // also ignore anything suspiciously above RRP (VAT-inclusive anomalies)

  function credible(p) { return p >= minPrice && p <= maxPrice; }

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);

    // Strategy 1: JSON-LD structured data
    const jsonLdPrice = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const s of scripts) {
        try {
          const data = JSON.parse(s.textContent);
          const find = (obj) => {
            if (!obj || typeof obj !== 'object') return null;
            if (obj['@type'] === 'Offer' && obj.price) return parseFloat(obj.price);
            if (obj['@type'] === 'Product' && obj.offers) {
              const offers = Array.isArray(obj.offers) ? obj.offers : [obj.offers];
              for (const o of offers) {
                if (o.price) return parseFloat(o.price);
              }
            }
            for (const val of Object.values(obj)) {
              const found = find(val);
              if (found) return found;
            }
            return null;
          };
          const price = find(data);
          if (price && price > 0) return price;
        } catch {}
      }
      return null;
    });
    if (jsonLdPrice && credible(jsonLdPrice)) return { price: jsonLdPrice, error: null };

    // Strategy 2: meta itemprop
    const metaPrice = await page.$eval('meta[itemprop="price"]', el => el.content).catch(() => null);
    if (metaPrice && credible(parseFloat(metaPrice))) return { price: parseFloat(metaPrice), error: null };

    // Strategy 3: common price selectors
    const domPrice = await page.evaluate((min, max) => {
      const selectors = [
        '.js-product-price', '[data-js-product-price]', '.price--current',
        '.product-price__price', '[class*="CurrentPrice"]', '[class*="current-price"]',
        '[class*="product-price"]', '.price-tag', '[data-price]', '.price',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          const match = el.textContent.trim().match(/(\d{1,3}[.,]\d{2})/);
          if (match) {
            const p = parseFloat(match[1].replace(',', '.'));
            if (p >= min && p <= max) return p;
          }
        }
      }
      // Fallback: scan all text for price pattern, apply credibility window
      const pattern = /(\d{1,3}[.,]\d{2})\s*€/g;
      const prices = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        let m;
        while ((m = pattern.exec(node.textContent)) !== null) {
          const p = parseFloat(m[1].replace(',', '.'));
          if (p >= min && p <= max) prices.push(p);
        }
      }
      // Return lowest credible price (most likely to be the discounted sale price)
      return prices.length ? Math.min(...prices) : null;
    }, minPrice, maxPrice);
    if (domPrice) return { price: domPrice, error: null };

    return { price: null, error: 'price not found on page' };

  } catch (err) {
    return { price: null, error: err.message.slice(0, 100) };
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
async function run() {
  const runDate = new Date().toISOString().slice(0, 10);
  const runTs = new Date().toISOString();
  const results = [];

  console.log('');
  console.log('Mons Royale Price Monitor');
  console.log('Run date: ' + runDate);
  console.log('SKUs: ' + SKUS.length + ' x 2 retailers');
  console.log('');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=de-DE'],
  });

  const context = await browser.newContext({
    locale: 'de-DE',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    extraHTTPHeaders: { 'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8' },
  });

  const page = await context.newPage();
  await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf}', r => r.abort());
  await page.route('**/{analytics,gtm,hotjar}*', r => r.abort());

  for (const sku of SKUS) {
    const row = {
      date: runDate,
      timestamp: runTs,
      name: sku.name,
      category: sku.category,
      range: sku.range,
      rrp: sku.rrp,
      bf_price: null,   bf_disc_pct: null,   bf_error: null,
      bfeu_price: null, bfeu_disc_pct: null, bfeu_error: null,
      bz_price: null,   bz_disc_pct: null,   bz_error: null,
      va_price: null,   va_disc_pct: null,   va_error: null,
      worst_price: null, worst_disc_pct: null, worst_retailer: null,
    };

    const retailers = [
      { key: 'bf',   label: 'Bergfreunde DE', url: sku.url_bf },
      { key: 'bfeu', label: 'Bergfreunde EU', url: sku.url_bfeu },
      { key: 'bz',   label: 'Bergzeit',       url: sku.url_bz },
      { key: 'va',   label: 'Varuste',        url: sku.url_va },
    ];

    for (const ret of retailers) {
      if (!ret.url) continue;
      process.stdout.write('[' + ret.key.toUpperCase().padEnd(4) + '] ' + sku.name + ' ... ');
      const result = await extractPrice(page, ret.url, ret.key, sku.rrp);
      row[ret.key + '_price'] = result.price;
      row[ret.key + '_error'] = result.error;
      if (result.price) {
        row[ret.key + '_disc_pct'] = Math.round(((sku.rrp - result.price) / sku.rrp) * 100);
        console.log('EUR ' + result.price.toFixed(2) + ' (' + row[ret.key + '_disc_pct'] + '% off RRP)');
      } else {
        console.log('ERROR: ' + result.error);
      }
    }

    // Worst price across all retailers
    const candidates = retailers
      .map(ret => row[ret.key + '_price'] && { price: row[ret.key + '_price'], retailer: ret.label, disc: row[ret.key + '_disc_pct'] })
      .filter(Boolean);
    if (candidates.length) {
      const worst = candidates.sort((a, b) => b.disc - a.disc)[0];
      row.worst_price = worst.price;
      row.worst_disc_pct = worst.disc;
      row.worst_retailer = worst.retailer;
    }

    results.push(row);
  }

  await browser.close();

  // Save JSON (append — keeps full history)
  const jsonPath = 'prices.json';
  let history = [];
  if (existsSync(jsonPath)) {
    try { history = JSON.parse(readFileSync(jsonPath, 'utf8')); } catch {}
  }
  history.push(...results);
  writeFileSync(jsonPath, JSON.stringify(history, null, 2));

  // Save CSV (latest run only)
  const csvWriter = createObjectCsvWriter({
    path: 'prices.csv',
    header: [
      { id: 'date',           title: 'Date' },
      { id: 'name',           title: 'Product' },
      { id: 'category',       title: 'Category' },
      { id: 'range',          title: 'Range' },
      { id: 'rrp',            title: 'EU RRP' },
      { id: 'bf_price',       title: 'Bergfreunde DE' },
      { id: 'bf_disc_pct',    title: 'BF DE disc %' },
      { id: 'bfeu_price',     title: 'Bergfreunde EU' },
      { id: 'bfeu_disc_pct',  title: 'BF EU disc %' },
      { id: 'bz_price',       title: 'Bergzeit' },
      { id: 'bz_disc_pct',    title: 'BZ disc %' },
      { id: 'va_price',       title: 'Varuste' },
      { id: 'va_disc_pct',    title: 'VA disc %' },
      { id: 'worst_price',    title: 'Worst price' },
      { id: 'worst_disc_pct', title: 'Worst disc %' },
      { id: 'worst_retailer', title: 'Worst retailer' },
    ],
  });
  await csvWriter.writeRecords(results);

  // Summary
  console.log('');
  console.log('----------------------------------------');
  const bfAvg = results.filter(r => r.bf_disc_pct != null).map(r => r.bf_disc_pct);
  const bzAvg = results.filter(r => r.bz_disc_pct != null).map(r => r.bz_disc_pct);
  if (bfAvg.length) console.log('Bergfreunde avg discount: ' + Math.round(bfAvg.reduce((a,b)=>a+b,0)/bfAvg.length) + '%');
  if (bzAvg.length) console.log('Bergzeit avg discount:    ' + Math.round(bzAvg.reduce((a,b)=>a+b,0)/bzAvg.length) + '%');

  const alerts = results.filter(r => r.worst_disc_pct >= 20).sort((a,b) => b.worst_disc_pct - a.worst_disc_pct);
  if (alerts.length) {
    console.log('');
    console.log('SKUs 20%+ below RRP:');
    alerts.forEach(r => console.log('  ' + r.worst_retailer + ' | ' + r.name + ' | -' + r.worst_disc_pct + '% | EUR ' + r.worst_price?.toFixed(2)));
  }

  console.log('');
  console.log('Saved: prices.csv (this run) and prices.json (full history)');
  console.log('');
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
