#!/usr/bin/env node
/**
 * Multi-resolution Screenshot Capture for Layout Analysis
 * Captures homepage at different viewport sizes for responsive design validation
 */

const { chromium } = require("playwright-chromium");
const fs = require("fs");
const path = require("path");

// Viewport configurations matching common device categories
const VIEWPORTS = [
  { name: "mobile-small", width: 375, height: 667, device: "iPhone SE" },
  { name: "mobile", width: 390, height: 844, device: "iPhone 14" },
  { name: "tablet", width: 768, height: 1024, device: "iPad Mini" },
  { name: "laptop", width: 1366, height: 768, device: "Laptop HD" },
  { name: "desktop", width: 1920, height: 1080, device: "Desktop FHD" },
  { name: "large-desktop", width: 2560, height: 1440, device: "Desktop 2K" },
];

const OUTPUT_DIR = path.join(__dirname, "..", ".playwright-cli", "layout-analysis");
const BASE_URL = "http://localhost:4173"; // Preview server

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureScreenshots() {
  await ensureDir(OUTPUT_DIR);
  
  console.log("🎬 Starting multi-resolution screenshot capture...\n");
  
  const browser = await chromium.launch({ headless: true });
  
  for (const viewport of VIEWPORTS) {
    console.log(`📱 Capturing ${viewport.name} (${viewport.width}x${viewport.height})...`);
    
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.width >= 1920 ? 2 : 1,
    });
    
    const page = await context.newPage();
    
    try {
      // Navigate and wait for content
      await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
      
      // Wait for GSAP animations to complete
      await page.waitForTimeout(1500);
      
      // Full page screenshot
      await page.screenshot({
        path: path.join(OUTPUT_DIR, `${viewport.name}-full.png`),
        fullPage: true,
      });
      
      // Viewport screenshot (above the fold)
      await page.screenshot({
        path: path.join(OUTPUT_DIR, `${viewport.name}-viewport.png`),
        fullPage: false,
      });
      
      // Capture both light and dark modes
      // Click theme toggle if available
      const themeButton = await page.locator('button:has([data-lucide="moon"]), button:has([data-lucide="sun"])').first();
      if (await themeButton.isVisible().catch(() => false)) {
        await themeButton.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({
          path: path.join(OUTPUT_DIR, `${viewport.name}-dark-viewport.png`),
          fullPage: false,
        });
        
        // Toggle back to light
        await themeButton.click();
      }
      
      // Capture card hover state
      const firstCard = await page.locator('.gallery-card').first();
      if (await firstCard.isVisible().catch(() => false)) {
        await firstCard.hover();
        await page.waitForTimeout(300);
        
        await page.screenshot({
          path: path.join(OUTPUT_DIR, `${viewport.name}-card-hover.png`),
          fullPage: false,
        });
      }
      
      console.log(`   ✅ ${viewport.name} captured successfully`);
      
    } catch (error) {
      console.error(`   ❌ Error capturing ${viewport.name}:`, error.message);
    } finally {
      await context.close();
    }
  }
  
  await browser.close();
  
  console.log(`\n📁 Screenshots saved to: ${OUTPUT_DIR}`);
  console.log("\n📊 Layout Analysis Complete!");
}

// Run if called directly
if (require.main === module) {
  captureScreenshots().catch(console.error);
}

module.exports = { captureScreenshots, VIEWPORTS };
