const { Builder, By, until } = require('selenium-webdriver');
const cheerio = require('cheerio');
const chrome = require('selenium-webdriver/chrome');
const readline = require('readline');

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

  const overallRating = $('span[aria-hidden="true"]').first().text().trim();
  const totalReviews = $('span[aria-label]').first().text().trim();

  console.log(`Overall Rating: ${overallRating}`);
  console.log(`Total Reviews: ${totalReviews}`);

  const reviewElements = $('.jftiEf.fontBodyMedium').slice(0, numReviews);

  reviewElements.each((_, reviewElement) => {
    try {
      const userName = $(reviewElement).find('button.WEBjve').attr('aria-label').replace('Photo of ', '');
      const rating = $(reviewElement).find('span.kvMYJc').attr('aria-label').split(' ')[0];
      const reviewText = $(reviewElement).find('span.wiI7pd').text().trim();
      console.log(`\nUser: ${userName}\nRating: ${rating}\nReview: ${reviewText}\n`);
    } catch (error) {
      console.log(`Error extracting review: ${error}`);
    }
  });

  await driver.quit();
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the Google Maps URL of the place: ', (url) => {
  rl.question('Enter the number of latest reviews to scrape: ', (numReviews) => {
    scrapeReviews(url, parseInt(numReviews)).then(() => rl.close());
  });
});
