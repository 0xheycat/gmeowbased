module.exports = async (page, scenario) => {
  const hoverSelector = scenario.hoverSelectors || scenario.hoverSelector;
  const clickSelector = scenario.clickSelectors || scenario.clickSelector;

  if (hoverSelector) {
    await page.waitForSelector(hoverSelector);
    await page.hover(hoverSelector);
  }

  if (clickSelector) {
    await page.waitForSelector(clickSelector);
    await page.click(clickSelector);
  }
};
