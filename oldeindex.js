const express = require('express');
const { Builder, By } = require('selenium-webdriver');
const cheerio = require('cheerio');
const chrome = require('selenium-webdriver/chrome');
const app = express();
const PORT = 3000;
const cors = require('cors');

app.use(cors());

app.use(express.json());

async function initDriver() {
  const options = new chrome.Options()
    .addArguments('--headless')
    .addArguments('--disable-gpu')
    .addArguments('--no-sandbox')
    .addArguments('--disable-dev-shm-usage');
  
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  return driver;
}

async function scrapeReviews(url, numReviews) {
  const driver = await initDriver();
  await driver.get(url);
  await driver.sleep(3000);

  for (let i = 0; i < Math.ceil(numReviews / 10); i++) {
    await driver.executeScript('window.scrollTo(0, document.body.scrollHeight);');
    await driver.sleep(2000); 
  }

  const pageSource = await driver.getPageSource();
  const $ = cheerio.load(pageSource);
  
  const reviews = [];
  const reviewElements = $('.jftiEf.fontBodyMedium').slice(0, numReviews);
  
  reviewElements.each((_, reviewElement) => {
    try {
      const userName = $(reviewElement).find('button.WEBjve').attr('aria-label').replace('Photo of ', '');
      const rating = $(reviewElement).find('span.kvMYJc').attr('aria-label').split(' ')[0];
      const reviewText = $(reviewElement).find('span.wiI7pd').text().trim();
      reviews.push({ userName, rating, reviewText });
    } catch (error) {
      console.error(`Error extracting review: ${error}`);
    }
  });

  await driver.quit();
  return reviews;
}

app.post('/scrape-reviews', async (req, res) => {
  const { url, numReviews } = req.body;
  try {
    const reviews = await scrapeReviews(url, numReviews);
    res.json(reviews);
  } catch (error) {
    res.status(500).send('Error scraping reviews');
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
