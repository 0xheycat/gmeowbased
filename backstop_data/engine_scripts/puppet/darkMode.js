module.exports = async (page, scenario, vp) => {
  console.log('Enabling dark mode...');
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await page.waitForTimeout(1000);
};
