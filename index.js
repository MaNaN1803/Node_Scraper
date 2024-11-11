const express = require('express');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const cheerio = require('cheerio');
const app = express();
const PORT = 3000;
const cors = require('cors');

app.use(cors());
app.use(express.json());

// Function to initialize WebDriver in headless mode
async function initDriver() {
  const options = new chrome.Options()
    .addArguments('--headless')
    .addArguments('--disable-gpu')
    .addArguments('--no-sandbox')
    .addArguments('--disable-dev-shm-usage');
  
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  return driver;
}

// Function to scrape reviews from a Google Maps URL
async function scrapeReviews(url) {
  const driver = await initDriver();
  await driver.get(url);
  await driver.sleep(3000); // Wait for page to load

  // Scroll until no more new reviews are loaded
  let lastHeight = await driver.executeScript('return document.body.scrollHeight');
  while (true) {
    await driver.executeScript('window.scrollTo(0, document.body.scrollHeight);');
    await driver.sleep(2000); // Wait for content to load
    let newHeight = await driver.executeScript('return document.body.scrollHeight');
    if (newHeight === lastHeight) {
      break;
    }
    lastHeight = newHeight;
  }

  // Parse page source using cheerio
  const pageSource = await driver.getPageSource();
  const $ = cheerio.load(pageSource);

  // Extract overall rating
  let overallRating;
  try {
    overallRating = $('div.fontDisplayLarge').text().trim();
  } catch (error) {
    overallRating = 'N/A';
    console.error(`Error extracting overall rating: ${error}`);
  }

  // Extract star rating breakdown (e.g., 5 stars, 10 reviews)
  let starRatings = {};
  try {
    $('tr.BHOKXe').each((_, starRow) => {
      const starInfo = $(starRow).attr('aria-label');
      const parts = starInfo.split(', ');
      const stars = parts[0].split(' ')[0];
      const count = parseInt(parts[1].split(' ')[0].replace(',', ''), 10);
      starRatings[stars] = count;
    });
  } catch (error) {
    console.error(`Error extracting star ratings: ${error}`);
  }

  // Calculate total reviews
  const totalReviews = Object.values(starRatings).reduce((acc, val) => acc + val, 0);

  await driver.quit();
  return { overallRating, starRatings, totalReviews };
}

// API endpoint to scrape reviews from Google Maps
app.post('/scrape-reviews', async (req, res) => {
  const { url } = req.body;
  try {
    const reviewData = await scrapeReviews(url);
    res.json(reviewData);
  } catch (error) {
    res.status(500).send('Error scraping reviews');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
