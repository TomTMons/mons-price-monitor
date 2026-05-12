# Mons Royale Price Monitor

Tracks Bergfreunde and Bergzeit pricing vs your EU RRP.
Includes a browser dashboard for management reporting.

---

## Before you start

Open PowerShell and check Node is installed:

    node --version

If you get an error (not a version number), download and install Node.js
from https://nodejs.org — use the LTS version. Restart PowerShell after.

---

## First-time setup (do this once)

1. Unzip the folder somewhere easy, e.g. your Desktop

2. Open PowerShell and navigate to the folder:

    cd C:\Users\YourName\Desktop\mons-price-scraper

3. Install dependencies:

    npm install

4. Install the browser used for scraping:

    npx playwright install chromium

   This downloads ~130MB. Wait for it to finish before moving on.

---

## Running a price check

    node scraper.js

Visits every product page, extracts live prices, saves results.
Takes roughly 1-2 minutes for 10 SKUs.

---

## Opening the dashboard

Run the server in PowerShell:

    node server.js

Then open your browser and go to:

    http://localhost:3000

The dashboard reads your prices automatically and shows:
- Summary stats (critical/warning SKU counts, avg discounts)
- Bar charts per retailer
- Full price table with sort and filter
- Trend charts once you have multiple runs
- CSV export button

To update the data: run node scraper.js in a separate PowerShell window,
then reload the browser page.

To stop the server: press Ctrl+C in PowerShell.

---

## Workflow

Step 1 — Open PowerShell, navigate to the folder
Step 2 — node scraper.js   (run the price check)
Step 3 — node server.js    (start the dashboard)
Step 4 — Open http://localhost:3000 in your browser

---

## Troubleshooting

"node is not recognized"
  Install Node.js from nodejs.org, restart PowerShell.

"Cannot find module"
  Run npm install first, or check you are in the right folder (ls should show scraper.js).

"ERROR: price not found"
  The retailer may have changed their page layout, or the URL is outdated.
  Check the URL loads correctly in a browser.

Dashboard shows "No price data yet"
  Run node scraper.js first to generate prices.json, then reload the page.

---

## Adding or updating SKUs

Open scraper.js in a text editor. Find the SKUS list near the top.

Each entry:

    {
      name: "Product name",
      category: "Base layer",
      rrp: 109.95,
      url_bf: "https://www.bergfreunde.de/...",
      url_bz: "https://www.bergzeit.de/...",
    },

Set url_bf or url_bz to null if a retailer does not stock that product.
