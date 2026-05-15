**
 * Mons Royale Price Scraper — Brand Page Edition
 *
 * Loads the Mons Royale brand page on each retailer,
 * takes sectioned screenshots, sends to Claude Vision,
 * fuzzy-matches results against the full SKU list.
 *
 * Run: node scraper.js
 * Requires: ANTHROPIC_API_KEY environment variable
 */

import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { createObjectCsvWriter } from 'csv-writer';
import { compareTwoStrings } from 'string-similarity';

// ── RETAILERS ─────────────────────────────────────────────────
const RETAILERS = [
  {
    key: 'bergfreunde_de',
    label: 'Bergfreunde DE',
    pages: [
      'https://www.bergfreunde.de/marken/mons-royale/',
      'https://www.bergfreunde.de/marken/mons-royale/2/',
    ],
  },
  {
    key: 'bergfreunde_eu',
    label: 'Bergfreunde EU',
    pages: [
      'https://www.bergfreunde.eu/brands/mons-royale/',
      'https://www.bergfreunde.eu/brands/mons-royale/2/',
    ],
  },
  {
    key: 'bergzeit',
    label: 'Bergzeit',
    pages: [
      'https://www.bergzeit.de/marken/mons-royale/',
      'https://www.bergzeit.de/marken/mons-royale/2/',
    ],
  },
  {
    key: 'varuste',
    label: 'Varuste',
    pages: [
      'https://www.varuste.net/search?q=mons+royale&sort=relevance',
    ],
  },
];

// ── FULL SKU LIST (R1-26) ─────────────────────────────────────
const SKUS = [
  { name: "Arcadia Merino Fleece Hoody", gender: "mens", category: "Men's Mid Layer", range: "eol", season: "R2-25" },
  { name: "Arcadia Merino Fleece Hoody", gender: "womens", category: "Women's Mid Layer", range: "eol", season: "R2-25" },
  { name: "Offgrid Merino Fleece 1/2 Zip Long Sleeve", gender: "mens", category: "Men's Mid Layer", range: "eol", season: "R2-25" },
  { name: "Offgrid Merino Fleece Long Sleeve", gender: "womens", category: "Women's Mid Layer", range: "eol", season: "R2-25" },
  { name: "Offgrid Merino Fleece Wind Jacket", gender: "womens", category: "Women's Mid Layer", range: "eol", season: "R2-25" },
  { name: "Offgrid Merino Fleece Wind Jacket", gender: "mens", category: "Men's Mid Layer", range: "eol", season: "R2-25" },
  { name: "Stacker Merino Insulated Jacket", gender: "unisex", category: "Unisex Insulation", range: "eol", season: "R2-25" },
  { name: "Yotei Merino Classic Long Sleeve", gender: "mens", category: "Men's Long Sleeve Top", range: "eol", season: "R2-25" },
  { name: "Yotei Merino Classic Long Sleeve", gender: "womens", category: "Women's Long Sleeve Top", range: "eol", season: "R2-25" },
  { name: "Yotei Merino High Neck Long Sleeve", gender: "womens", category: "Women's Long Sleeve Top", range: "eol", season: "R2-25" },
  { name: "Yotei Merino Long Sleeve", gender: "womens", category: "Women's Long Sleeve Top", range: "eol", season: "R2-25" },
  { name: "Yotei Merino Long Sleeve", gender: "mens", category: "Men's Long Sleeve Top", range: "eol", season: "R2-25" },
  { name: "Yotei Merino Powder Hood Long Sleeve", gender: "mens", category: "Men's Long Sleeve Top", range: "eol", season: "R2-25" },
  { name: "AT Merino Long Sleeve Shirt", gender: "mens", category: "Men's Shirt", range: "new", season: "R1-26" },
  { name: "AT Merino Long Sleeve Shirt", gender: "womens", category: "Women's Shirt", range: "new", season: "R1-26" },
  { name: "AT Merino Short Sleeve Shirt", gender: "mens", category: "Men's Shirt", range: "new", season: "R1-26" },
  { name: "AT Merino Short Sleeve Shirt", gender: "womens", category: "Women's Shirt", range: "new", season: "R1-26" },
  { name: "Aero Ultralight Merino T-Shirt", gender: "mens", category: "Men's T-Shirt", range: "new", season: "R1-26" },
  { name: "Aero Ultralight Merino T-Shirt", gender: "womens", category: "Women's T-Shirt", range: "new", season: "R1-26" },
  { name: "All Mission Cargo Shorts", gender: "mens", category: "Men's Shorts", range: "new", season: "R1-26" },
  { name: "All Mission Pants", gender: "mens", category: "Men's Pants", range: "new", season: "R1-26" },
  { name: "All Mission Pants", gender: "womens", category: "Women's Pants", range: "new", season: "R1-26" },
  { name: "All Mission Shorts", gender: "womens", category: "Women's Shorts", range: "new", season: "R1-26" },
  { name: "Bella Merino Long Sleeve", gender: "womens", category: "Women's Long Sleeve Top", range: "new", season: "R1-26" },
  { name: "Bella Merino Long Sleeve Hood", gender: "womens", category: "Women's Long Sleeve Top", range: "new", season: "R1-26" },
  { name: "Bella Merino Tank", gender: "womens", category: "Women's Tank", range: "new", season: "R1-26" },
  { name: "Breezer Merino Short Sleeve Shirt", gender: "mens", category: "Men's T-Shirt", range: "new", season: "R1-26" },
  { name: "Breezer Merino Short Sleeve Shirt", gender: "womens", category: "Women's Shirt", range: "new", season: "R1-26" },
  { name: "Diversion Merino Bike Jersey Long Sleeve", gender: "mens", category: "Men's Bike Jersey", range: "new", season: "R1-26" },
  { name: "Diversion Merino Bike Jersey Long Sleeve", gender: "womens", category: "Women's Bike Jersey", range: "new", season: "R1-26" },
  { name: "Diversion Merino Bike Jersey Short Sleeve", gender: "mens", category: "Men's Bike Jersey", range: "new", season: "R1-26" },
  { name: "Diversion Merino Bike Jersey Short Sleeve", gender: "womens", category: "Women's Bike Jersey", range: "new", season: "R1-26" },
  { name: "Diversion Merino Trail Pants", gender: "mens", category: "Men's Pants", range: "new", season: "R1-26" },
  { name: "Diversion Merino Trail Pants", gender: "womens", category: "Women's Pants", range: "new", season: "R1-26" },
  { name: "Diversion Merino Trail Shorts", gender: "mens", category: "Men's Shorts", range: "new", season: "R1-26" },
  { name: "Diversion Merino Trail Shorts", gender: "womens", category: "Women's Shorts", range: "new", season: "R1-26" },
  { name: "Diversion Merino Wind Jacket", gender: "mens", category: "Men's Jacket", range: "new", season: "R1-26" },
  { name: "Diversion Merino Wind Jacket", gender: "womens", category: "Women's Jacket", range: "new", season: "R1-26" },
  { name: "Folo Merino Briefs", gender: "womens", category: "Women's Underwear", range: "new", season: "R1-26" },
  { name: "Hannah Merino Hot Pants", gender: "womens", category: "Women's Underwear", range: "new", season: "R1-26" },
  { name: "Hold 'em Merino Boxer", gender: "mens", category: "Men's Underwear", range: "new", season: "R1-26" },
  { name: "Hold 'em Shorty Merino Boxer", gender: "mens", category: "Men's Underwear", range: "new", season: "R1-26" },
  { name: "Icon Merino Classic T-Shirt", gender: "womens", category: "Women's T-Shirt", range: "new", season: "R1-26" },
  { name: "Icon Merino Long Sleeve", gender: "womens", category: "Women's Long Sleeve Top", range: "new", season: "R1-26" },
  { name: "Icon Merino Long Sleeve", gender: "mens", category: "Men's Long Sleeve Top", range: "new", season: "R1-26" },
  { name: "Icon Merino Raglan Long Sleeve", gender: "mens", category: "Men's Long Sleeve Top", range: "new", season: "R1-26" },
  { name: "Icon Merino Raglan Long Sleeve", gender: "womens", category: "Women's Long Sleeve Top", range: "new", season: "R1-26" },
  { name: "Icon Merino T-Shirt", gender: "womens", category: "Women's T-Shirt", range: "new", season: "R1-26" },
  { name: "Icon Merino T-Shirt", gender: "mens", category: "Men's T-Shirt", range: "new", season: "R1-26" },
  { name: "Icon Merino Tank", gender: "womens", category: "Women's Tank", range: "new", season: "R1-26" },
  { name: "Inversion Merino Crew", gender: "mens", category: "Men's Sweater", range: "new", season: "R1-26" },
  { name: "Inversion Merino Crew", gender: "womens", category: "Women's Sweater", range: "new", season: "R1-26" },
  { name: "Inversion Merino Hoodie", gender: "mens", category: "Men's Hoodie", range: "new", season: "R1-26" },
  { name: "Inversion Merino Hoodie", gender: "womens", category: "Women's Hoodie", range: "new", season: "R1-26" },
  { name: "Pivot Merino Long Sleeve Hood", gender: "mens", category: "Men's Long Sleeve Top", range: "new", season: "R1-26" },
  { name: "Pivot Merino Long Sleeve Hood", gender: "womens", category: "Women's Long Sleeve Top", range: "new", season: "R1-26" },
  { name: "Proximity Merino Legging", gender: "womens", category: "Women's Leggings", range: "new", season: "R1-26" },
  { name: "Proximity Merino Sports Bra", gender: "womens", category: "Women's Underwear", range: "new", season: "R1-26" },
  { name: "Quad Merino Fleece Jacket", gender: "womens", category: "Women's Jacket", range: "new", season: "R1-26" },
  { name: "Quad Merino Fleece Jacket", gender: "mens", category: "Men's Jacket", range: "new", season: "R1-26" },
  { name: "Quad Merino Fleece Pullover", gender: "womens", category: "Women's Sweater", range: "new", season: "R1-26" },
  { name: "Quad Merino Fleece Pullover", gender: "mens", category: "Men's Sweater", range: "new", season: "R1-26" },
  { name: "Sierra Merino Sports Bra", gender: "womens", category: "Women's Underwear", range: "new", season: "R1-26" },
  { name: "Solace Merino Seamless Legging", gender: "womens", category: "Women's Leggings", range: "new", season: "R1-26" },
  { name: "Stella Merino X-Back Bra", gender: "womens", category: "Women's Underwear", range: "new", season: "R1-26" },
  { name: "Sylvia Merino Boyleg", gender: "womens", category: "Women's Underwear", range: "new", season: "R1-26" },
  { name: "Tarn Merino Bike Wind Jersey", gender: "mens", category: "Men's Bike Jersey", range: "new", season: "R1-26" },
  { name: "Tarn Merino Bike Wind Jersey", gender: "womens", category: "Women's Bike Jersey", range: "new", season: "R1-26" },
  { name: "Tarn Merino Long Sleeve", gender: "mens", category: "Men's Bike Jersey", range: "new", season: "R1-26" },
  { name: "Tarn Merino Long Sleeve", gender: "womens", category: "Women's Bike Jersey", range: "new", season: "R1-26" },
  { name: "Tarn Merino T-Shirt", gender: "mens", category: "Men's Bike Jersey", range: "new", season: "R1-26" },
  { name: "Tarn Merino T-Shirt", gender: "womens", category: "Women's Bike Jersey", range: "new", season: "R1-26" },
  { name: "Temple Merino Long Sleeve", gender: "mens", category: "Men's Long Sleeve Top", range: "new", season: "R1-26" },
  { name: "Temple Merino Long Sleeve Hood", gender: "mens", category: "Men's Long Sleeve Top", range: "new", season: "R1-26" },
  { name: "Yonder Merino Organic Cotton Long Sleeve", gender: "mens", category: "Men's Long Sleeve Top", range: "new", season: "R1-26" },
  { name: "Yonder Merino Organic Cotton Long Sleeve", gender: "womens", category: "Women's Long Sleeve Top", range: "new", season: "R1-26" },
  { name: "Yonder Merino Organic Cotton T-Shirt", gender: "mens", category: "Men's T-Shirt", range: "new", season: "R1-26" },
  { name: "Yonder Merino Organic Cotton T-Shirt", gender: "womens", category: "Women's T-Shirt", range: "new", season: "R1-26" },
  { name: "Afterbang Suspenders", gender: "unisex", category: "Unisex", range: "rollover", season: "R1-26" },
  { name: "Amp Merino Fleece Gloves", gender: "unisex", category: "Unisex Gloves", range: "rollover", season: "R1-26" },
  { name: "Ascender Merino Base Layer 3/4 Legging", gender: "mens", category: "Men's Leggings", range: "rollover", season: "R1-26" },
  { name: "Ascender Merino Base Layer Hooded Long Sleeve", gender: "mens", category: "Men's Long Sleeve Top", range: "rollover", season: "R1-26" },
  { name: "Ascender Merino Base Layer Legging", gender: "womens", category: "Women's Leggings", range: "rollover", season: "R1-26" },
  { name: "Ascender Merino Base Layer Long Sleeve", gender: "womens", category: "Women's Long Sleeve Top", range: "rollover", season: "R1-26" },
  { name: "Ascender Merino Base Layer Long Sleeve", gender: "mens", category: "Men's Long Sleeve Top", range: "rollover", season: "R1-26" },
  { name: "Ascender Merino Base Layer Mock Neck Long Sleeve", gender: "womens", category: "Women's Long Sleeve Top", range: "rollover", season: "R1-26" },
  { name: "Canyon Merino Insulated Hooded Jacket", gender: "womens", category: "Women's Jacket", range: "rollover", season: "R1-26" },
  { name: "Canyon Merino Insulated Hooded Jacket", gender: "mens", category: "Men's Jacket", range: "rollover", season: "R1-26" },
  { name: "Canyon Merino Insulated Vest", gender: "womens", category: "Women's Vest", range: "rollover", season: "R1-26" },
  { name: "Canyon Merino Insulated Vest", gender: "mens", category: "Men's Vest", range: "rollover", season: "R1-26" },
  { name: "Cascade Merino Base Layer 1/4 Zip Long Sleeve", gender: "mens", category: "Men's Long Sleeve Top", range: "rollover", season: "R1-26" },
  { name: "Cascade Merino Base Layer 1/4 Zip Long Sleeve", gender: "womens", category: "Women's Long Sleeve Top", range: "rollover", season: "R1-26" },
  { name: "Cascade Merino Base Layer 3/4 Legging", gender: "mens", category: "Men's Leggings", range: "rollover", season: "R1-26" },
  { name: "Cascade Merino Base Layer 3/4 Legging", gender: "womens", category: "Women's Leggings", range: "rollover", season: "R1-26" },
  { name: "Cascade Merino Base Layer Legging", gender: "mens", category: "Men's Leggings", range: "rollover", season: "R1-26" },
  { name: "Cascade Merino Base Layer Legging", gender: "womens", category: "Women's Leggings", range: "rollover", season: "R1-26" },
  { name: "Cascade Merino Base Layer Long Sleeve", gender: "mens", category: "Men's Long Sleeve Top", range: "rollover", season: "R1-26" },
  { name: "Cascade Merino Base Layer Long Sleeve", gender: "womens", category: "Women's Long Sleeve Top", range: "rollover", season: "R1-26" },
  { name: "Cascade Merino Base Layer Mock Neck Long Sleeve", gender: "womens", category: "Women's Long Sleeve Top", range: "rollover", season: "R1-26" },
  { name: "Chunky Logger Merino Beanie", gender: "unisex", category: "Unisex Beanie", range: "rollover", season: "R1-26" },
  { name: "Decade Merino Fleece Hood", gender: "unisex", category: "Unisex", range: "rollover", season: "R1-26" },
  { name: "Diversion Merino Wind Vest", gender: "mens", category: "Men's Vest", range: "rollover", season: "R1-26" },
  { name: "Diversion Merino Wind Vest", gender: "womens", category: "Women's Vest", range: "rollover", season: "R1-26" },
  { name: "Elevation Merino Fleece Gloves", gender: "unisex", category: "Unisex Gloves", range: "rollover", season: "R1-26" },
  { name: "Epic Merino Bike Liner", gender: "womens", category: "Women's Underwear", range: "rollover", season: "R1-26" },
  { name: "Epic Merino Bike Liner", gender: "mens", category: "Men's Underwear", range: "rollover", season: "R1-26" },
  { name: "Escapade Pants", gender: "mens", category: "Men's Pants", range: "rollover", season: "R1-26" },
  { name: "Escapade Pants", gender: "womens", category: "Women's Pants", range: "rollover", season: "R1-26" },
  { name: "Escapade Shorts", gender: "mens", category: "Men's Shorts", range: "rollover", season: "R1-26" },
  { name: "Escapade Shorts", gender: "womens", category: "Women's Shorts", range: "rollover", season: "R1-26" },
  { name: "Horizon Merino Crew", gender: "mens", category: "Men's Mid Layer", range: "rollover", season: "R1-26" },
  { name: "Horizon Merino Crew", gender: "womens", category: "Women's Mid Layer", range: "rollover", season: "R1-26" },
  { name: "MP Heavyweight Merino T-Shirt", gender: "mens", category: "Men's T-Shirt", range: "rollover", season: "R1-26" },
  { name: "MP Heavyweight Merino T-Shirt", gender: "womens", category: "Women's T-Shirt", range: "rollover", season: "R1-26" },
  { name: "Olympus Merino Base Layer 1/2 Zip Long Sleeve", gender: "womens", category: "Women's Long Sleeve Top", range: "rollover", season: "R1-26" },
  { name: "Olympus Merino Base Layer 1/2 Zip Long Sleeve", gender: "mens", category: "Men's Long Sleeve Top", range: "rollover", season: "R1-26" },
  { name: "Olympus Merino Base Layer Legging", gender: "womens", category: "Women's Leggings", range: "rollover", season: "R1-26" },
  { name: "Olympus Merino Base Layer Legging", gender: "mens", category: "Men's Leggings", range: "rollover", season: "R1-26" },
  { name: "Olympus Merino Base Layer Long Sleeve", gender: "womens", category: "Women's Long Sleeve Top", range: "rollover", season: "R1-26" },
  { name: "Olympus Merino Base Layer Long Sleeve", gender: "mens", category: "Men's Long Sleeve Top", range: "rollover", season: "R1-26" },
  { name: "Olympus Merino Glove Liners", gender: "unisex", category: "Unisex Gloves", range: "rollover", season: "R1-26" },
  { name: "Stacker Merino Insulated Vest", gender: "unisex", category: "Unisex Insulation", range: "rollover", season: "R1-26" },
  { name: "Stratos Merino Sports Bra", gender: "womens", category: "Women's Underwear", range: "rollover", season: "R1-26" },
];

// ── MATCH CONFIG ──────────────────────────────────────────────
const MATCH_THRESHOLD = 0.65;
const GENDER_SIGNALS = {
  mens:   ['herren', "men's", 'men ', ' men', 'männer', 'male'],
  womens: ['damen', "women's", 'women ', ' women', 'frauen', 'female'],
  kids:   ['kinder', 'kids', 'junior', 'youth'],
};

function detectGender(text) {
  const lower = text.toLowerCase();
  for (const [gender, signals] of Object.entries(GENDER_SIGNALS)) {
    if (signals.some(s => lower.includes(s))) return gender;
  }
  return 'unisex';
}

function matchProduct(retailerName, retailerGender) {
  const cleaned = retailerName.replace(/^mons\s+royale\s*/i, '').trim();
  const cleanedLower = cleaned.toLowerCase();
  let bestMatch = null, bestScore = 0;

  for (const sku of SKUS) {
    const nameScore = compareTwoStrings(cleanedLower, sku.name.toLowerCase());
    let genderBonus = 0;
    if (retailerGender === sku.gender) genderBonus = 0.15;
    else if (sku.gender !== 'unisex' && retailerGender !== 'unisex' && retailerGender !== sku.gender) genderBonus = -0.10;
    const total = nameScore + genderBonus;
    if (total > bestScore) { bestScore = total; bestMatch = sku; }
  }
  return bestScore >= MATCH_THRESHOLD
    ? { sku: bestMatch, score: Math.min(bestScore, 1.0), matched: true }
    : { sku: null, score: bestScore, matched: false };
}

// ── PAGE CAPTURE ──────────────────────────────────────────────
async function capturePageSections(page, url) {
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const status = response?.status();
    if (status === 404) return { sections: [], status: 'not_found' };
    if (status === 403 || status === 503) return { sections: [], status: 'blocked' };

    await page.waitForTimeout(4000);
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportH = 900;
    const overlap = 150;
    const sections = [];
    let scrollY = 0, cap = 0;

    while (scrollY < pageHeight && cap < 25) {
      await page.evaluate(y => window.scrollTo(0, y), scrollY);
      await page.waitForTimeout(400);
      const buf = await page.screenshot({ type: 'jpeg', quality: 80 });
      sections.push(buf.toString('base64'));
      scrollY += viewportH - overlap;
      cap++;
    }
    return { sections, status: 'ok', pageHeight };
  } catch (e) {
    return { sections: [], status: `error: ${e.message.slice(0, 80)}` };
  }
}

// ── VISION EXTRACT ────────────────────────────────────────────
async function extractFromSection(client, imageB64, sectionNum) {
  try {
    const res = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageB64 } },
          { type: 'text', text: `Section ${sectionNum} of a Mons Royale product listing page on an outdoor gear retailer.

Extract every product visible with its price. Return ONLY a JSON array, nothing else.

Each item: {"name": "full product name including Men's/Women's/Herren/Damen if shown", "price": 89.95, "original_price": 109.95}

Rules:
- price = current selling price as a number. null if not clearly readable.
- original_price = crossed-out RRP if shown, otherwise null.
- Never guess or fabricate a price.
- Return [] if page is blocked, shows captcha, or has no products.` }
        ],
      }],
    });
    const clean = res.content[0].text.trim().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// ── MAIN ──────────────────────────────────────────────────────
async function run() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('\nERROR: ANTHROPIC_API_KEY not set. Run: $env:ANTHROPIC_API_KEY="sk-..."');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const runDate = new Date().toISOString().slice(0, 10);
  const runTs = new Date().toISOString();

  console.log('\nMons Royale Price Scraper — Brand Page Edition');
  console.log(`Date: ${runDate} | SKUs: ${SKUS.length} | Retailers: ${RETAILERS.length}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=de-DE'],
  });
  const context = await browser.newContext({
    locale: 'de-DE',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    extraHTTPHeaders: { 'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8' },
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await page.route('**/*.{woff,woff2,ttf,otf,mp4,webm}', r => r.abort());

  // priceMap[skuKey][retailerKey] = { price, original_price, match_score, retailer_name }
  const priceMap = {};
  for (const sku of SKUS) priceMap[sku.name + '||' + sku.gender] = {};

  const allRaw = {};

  for (const retailer of RETAILERS) {
    console.log(`\n── ${retailer.label} ─────────────────────`);
    const retailerProducts = [];

    for (const pageUrl of retailer.pages) {
      console.log(`  Fetching: ${pageUrl}`);
      const { sections, status, pageHeight } = await capturePageSections(page, pageUrl);
      if (status !== 'ok') { console.log(`  Status: ${status} — skipping`); continue; }
      console.log(`  Height: ${pageHeight}px | Sections: ${sections.length}`);

      for (let i = 0; i < sections.length; i++) {
        process.stdout.write(`  Section ${i+1}/${sections.length}... `);
        const products = await extractFromSection(client, sections[i], i + 1);
        console.log(`${products.length} products`);
        retailerProducts.push(...products);
      }
    }

    allRaw[retailer.key] = retailerProducts;

    // Deduplicate — keep lowest price per name+gender
    const deduped = {};
    for (const p of retailerProducts) {
      if (!p.name || p.price == null) continue;
      const g = detectGender(p.name);
      const k = p.name.toLowerCase().replace(/^mons\s+royale\s*/i, '').trim() + '||' + g;
      if (!deduped[k] || p.price < deduped[k].price) deduped[k] = { ...p, gender: g };
    }

    console.log(`\n  Matching ${Object.keys(deduped).length} unique products...`);
    let matched = 0, unmatched = 0;

    for (const product of Object.values(deduped)) {
      const { sku, score, matched: isMatch } = matchProduct(product.name, product.gender);
      if (isMatch && sku) {
        const skuKey = sku.name + '||' + sku.gender;
        const existing = priceMap[skuKey][retailer.key];
        if (!existing || product.price < existing.price) {
          priceMap[skuKey][retailer.key] = {
            price: product.price,
            original_price: product.original_price ?? null,
            match_score: Math.round(score * 100),
            retailer_name: product.name,
          };
        }
        matched++;
      } else { unmatched++; }
    }
    console.log(`  Matched: ${matched} | Unmatched (below threshold): ${unmatched}`);
  }

  await browser.close();

  // ── BUILD RESULTS ─────────────────────────────────────────────
  const results = [];
  for (const sku of SKUS) {
    const skuKey = sku.name + '||' + sku.gender;
    const row = {
      date: runDate, timestamp: runTs,
      name: sku.name, gender: sku.gender,
      category: sku.category, range: sku.range, season: sku.season,
    };

    let worstPrice = null, worstDisc = null, worstRetailer = null;

    for (const retailer of RETAILERS) {
      const entry = priceMap[skuKey]?.[retailer.key];
      row[retailer.key + '_price']       = entry?.price ?? null;
      row[retailer.key + '_original']    = entry?.original_price ?? null;
      row[retailer.key + '_match_score'] = entry?.match_score ?? null;
      row[retailer.key + '_disc_pct']    = null;

      if (entry?.price != null && entry?.original_price != null) {
        const disc = Math.round(((entry.original_price - entry.price) / entry.original_price) * 100);
        row[retailer.key + '_disc_pct'] = disc;
        if (worstDisc == null || disc > worstDisc) {
          worstDisc = disc; worstPrice = entry.price; worstRetailer = retailer.label;
        }
      }
    }

    row.worst_price = worstPrice;
    row.worst_disc_pct = worstDisc;
    row.worst_retailer = worstRetailer;
    results.push(row);
  }

  // Save
  const jsonPath = 'prices.json';
  let history = [];
  if (existsSync(jsonPath)) { try { history = JSON.parse(readFileSync(jsonPath, 'utf8')); } catch {} }
  history.push(...results);
  writeFileSync(jsonPath, JSON.stringify(history, null, 2));
  writeFileSync('raw_extracted.json', JSON.stringify(allRaw, null, 2));

  const csvHeaders = [
    { id: 'date', title: 'Date' }, { id: 'name', title: 'Product' },
    { id: 'gender', title: 'Gender' }, { id: 'category', title: 'Category' },
    { id: 'range', title: 'Range' }, { id: 'season', title: 'Season' },
  ];
  for (const r of RETAILERS) {
    csvHeaders.push(
      { id: r.key + '_price', title: r.label + ' Price' },
      { id: r.key + '_original', title: r.label + ' RRP' },
      { id: r.key + '_disc_pct', title: r.label + ' Disc %' },
    );
  }
  csvHeaders.push(
    { id: 'worst_price', title: 'Worst Price' },
    { id: 'worst_disc_pct', title: 'Worst Disc %' },
    { id: 'worst_retailer', title: 'Worst Retailer' },
  );
  await createObjectCsvWriter({ path: 'prices.csv', header: csvHeaders }).writeRecords(results);

  // Summary
  const withPrices = results.filter(r => RETAILERS.some(ret => r[ret.key + '_price'] != null));
  const newDisc    = results.filter(r => r.range === 'new' && r.worst_disc_pct >= 20);
  const rolDisc    = results.filter(r => r.range === 'rollover' && r.worst_disc_pct >= 20);

  console.log('\n────────────────────────────────────────');
  console.log('SUMMARY\n');
  console.log(`Products with prices found: ${withPrices.length}/${results.length}`);
  console.log(`New range discounted 20%+:  ${newDisc.length}`);
  console.log(`Rollover discounted 20%+:   ${rolDisc.length}`);

  if (newDisc.length) {
    console.log('\n⚠ NEW RANGE — DISCOUNTED 20%+:');
    newDisc.sort((a,b)=>(b.worst_disc_pct||0)-(a.worst_disc_pct||0))
      .forEach(r => console.log(`  ${(r.worst_retailer||'').padEnd(16)} ${r.name} (${r.gender}) -${r.worst_disc_pct}%`));
  }

  console.log('\nSaved: prices.json | prices.csv | raw_extracted.json\n');
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
