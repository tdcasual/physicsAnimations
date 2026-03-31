const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'screenshot-review');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const BASE_URL = 'http://localhost:5173';

async function capturePage(page, name, url, options = {}) {
  console.log(`📸 Capturing: ${name}`);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500); // 等待数据加载和动画完成
  
  const filename = path.join(OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ 
    path: filename, 
    fullPage: options.fullPage ?? true 
  });
  console.log(`✅ Saved: ${filename}`);
}

async function captureResponsive(page, name, url) {
  // Desktop (1440px)
  await page.setViewportSize({ width: 1440, height: 900 });
  await capturePage(page, `${name}-desktop`, url);
  
  // Tablet (768px)
  await page.setViewportSize({ width: 768, height: 1024 });
  await capturePage(page, `${name}-tablet`, url);
  
  // Mobile (390px)
  await page.setViewportSize({ width: 390, height: 844 });
  await capturePage(page, `${name}-mobile`, url);
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. 首页
    await captureResponsive(page, '01-home', `${BASE_URL}/`);
    
    // 2. 资源库
    await captureResponsive(page, '02-library', `${BASE_URL}/library`);
    
    // 3. 后台管理 - 仪表盘
    await captureResponsive(page, '03-admin-dashboard', `${BASE_URL}/admin`);
    
    // 4. 后台管理 - 内容管理
    await captureResponsive(page, '04-admin-content', `${BASE_URL}/admin/content`);
    
    // 5. 后台管理 - 分类管理
    await captureResponsive(page, '05-admin-taxonomy', `${BASE_URL}/admin/taxonomy`);
    
    // 6. 后台管理 - 上传管理
    await captureResponsive(page, '06-admin-uploads', `${BASE_URL}/admin/uploads`);
    
    // 7. 移动端导航菜单 (需要交互)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/admin/content`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    
    // 点击打开导航菜单
    const navTrigger = await page.$('.admin-mobile-nav-trigger');
    if (navTrigger) {
      await navTrigger.click();
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: path.join(OUTPUT_DIR, '07-admin-mobile-nav.png'),
        fullPage: true 
      });
      console.log('✅ Saved: 07-admin-mobile-nav.png');
    }
    
    // 8. 移动端编辑器面板
    await page.goto(`${BASE_URL}/admin/content`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    
    // 尝试点击一个列表项打开编辑器
    const listItem = await page.$('.admin-list-item, .library-list-item, [class*="list-item"]');
    if (listItem) {
      await listItem.click();
      await page.waitForTimeout(800);
      await page.screenshot({ 
        path: path.join(OUTPUT_DIR, '08-admin-mobile-editor.png'),
        fullPage: true 
      });
      console.log('✅ Saved: 08-admin-mobile-editor.png');
    }
    
    console.log('\n🎉 All screenshots captured!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

main();
