const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'screenshot-audit');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const BASE_URL = 'http://localhost:5173';

async function capturePage(page, name, url, options = {}) {
  console.log(`📸 Capturing: ${name}`);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  const filename = path.join(OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ 
    path: filename, 
    fullPage: options.fullPage ?? true 
  });
  console.log(`✅ Saved: ${filename}`);
}

async function captureWithInteraction(page, name, url, interactions) {
  console.log(`📸 Capturing with interaction: ${name}`);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  // 执行交互
  for (const action of interactions) {
    if (action.type === 'click') {
      await page.click(action.selector);
    } else if (action.type === 'fill') {
      await page.fill(action.selector, action.value);
    } else if (action.type === 'wait') {
      await page.waitForTimeout(action.ms);
    }
    await page.waitForTimeout(500);
  }
  
  const filename = path.join(OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`✅ Saved: ${filename}`);
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    // 1. 首页 - Desktop
    await capturePage(page, '01-home-desktop', `${BASE_URL}/`);
    
    // 2. 首页 - Mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await capturePage(page, '01-home-mobile', `${BASE_URL}/`);
    
    // 3. 资源库 - Desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await capturePage(page, '02-library-desktop', `${BASE_URL}/library`);
    
    // 4. 登录页 - Desktop
    await capturePage(page, '03-login-desktop', `${BASE_URL}/login`);
    
    // 5. 登录页 - Mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await capturePage(page, '03-login-mobile', `${BASE_URL}/login`);
    
    // 6. 管理后台 - Dashboard
    await page.setViewportSize({ width: 1440, height: 900 });
    await capturePage(page, '04-admin-dashboard', `${BASE_URL}/admin/dashboard`);
    
    // 7. 管理后台 - Content
    await capturePage(page, '05-admin-content', `${BASE_URL}/admin/content`);
    
    // 8. 管理后台 - Mobile Nav Open
    await page.setViewportSize({ width: 390, height: 844 });
    await captureWithInteraction(page, '06-admin-mobile-nav', `${BASE_URL}/admin/content`, [
      { type: 'click', selector: '.admin-mobile-nav-trigger' },
      { type: 'wait', ms: 800 }
    ]);
    
    // 9. 管理后台 - Library
    await page.setViewportSize({ width: 1440, height: 900 });
    await capturePage(page, '07-admin-library', `${BASE_URL}/admin/library`);
    
    // 10. 管理后台 - Taxonomy
    await capturePage(page, '08-admin-taxonomy', `${BASE_URL}/admin/taxonomy`);
    
    // 11. 管理后台 - System
    await capturePage(page, '09-admin-system', `${BASE_URL}/admin/system`);
    
    // 12. 查看器
    await capturePage(page, '10-viewer', `${BASE_URL}/viewer/free-fall`);
    
    console.log('\n🎉 All audit screenshots captured!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

main();
