module.exports = async (page, scenario, vp) => {
  console.log('SCENARIO > ' + scenario.label);
  await page.waitForSelector(scenario.readySelector || 'body', { timeout: 10000 });
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
};
