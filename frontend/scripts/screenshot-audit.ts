import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5174';
const OUTPUT_DIR = path.join(process.cwd(), 'screenshot-audit');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const pages = [
  { name: 'home', path: '/', description: '首页' },
  { name: 'login', path: '/login', description: '登录页' },
  { name: 'viewer', path: '/viewer?id=demo1', description: 'Viewer页面' },
  { name: 'admin-dashboard', path: '/admin', description: '管理后台-仪表盘' },
  { name: 'admin-content', path: '/admin/content', description: '管理后台-内容' },
  { name: 'admin-uploads', path: '/admin/uploads', description: '管理后台-上传' },
  { name: 'admin-taxonomy', path: '/admin/taxonomy', description: '管理后台-分类' },
  { name: 'admin-library', path: '/admin/library', description: '管理后台-资源库' },
  { name: 'admin-system', path: '/admin/system', description: '管理后台-系统' },
  { name: 'admin-account', path: '/admin/account', description: '管理后台-账户' },
];

async function captureScreenshots() {
  const browser = await chromium.launch();
  
  // 桌面端截图
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  
  // 移动端截图
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
  });

  console.log('开始截图审计...\n');

  for (const page of pages) {
    const url = `${BASE_URL}${page.path}`;
    
    // 桌面端截图
    try {
      const desktopPage = await desktopContext.newPage();
      await desktopPage.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      await desktopPage.waitForTimeout(2000); // 等待动画完成
      
      const desktopPath = path.join(OUTPUT_DIR, `${page.name}-desktop.png`);
      await desktopPage.screenshot({ 
        path: desktopPath, 
        fullPage: true 
      });
      await desktopPage.close();
      
      console.log(`✅ ${page.description} - 桌面端`);
    } catch (e) {
      console.log(`❌ ${page.description} - 桌面端: ${e}`);
    }
    
    // 移动端截图
    try {
      const mobilePage = await mobileContext.newPage();
      await mobilePage.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      await mobilePage.waitForTimeout(2000);
      
      const mobilePath = path.join(OUTPUT_DIR, `${page.name}-mobile.png`);
      await mobilePage.screenshot({ 
        path: mobilePath, 
        fullPage: true 
      });
      await mobilePage.close();
      
      console.log(`✅ ${page.description} - 移动端`);
    } catch (e) {
      console.log(`❌ ${page.description} - 移动端: ${e}`);
    }
  }

  await browser.close();
  
  console.log(`\n截图完成！保存位置: ${OUTPUT_DIR}`);
}

captureScreenshots().catch(console.error);
