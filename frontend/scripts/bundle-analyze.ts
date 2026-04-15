#!/usr/bin/env node
/**
 * Bundle 分析脚本
 * 检查构建产物大小，确保不超过性能预算
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

interface BundleBudget {
  name: string;
  pattern: RegExp;
  maxSize: number; // bytes
}

const BUDGETS: BundleBudget[] = [
  { name: "Main JS Bundle", pattern: /^index-.*\.js$/, maxSize: 120 * 1024 }, // 120KB
  { name: "Vendor Bundle", pattern: /^vendor-.*\.js$/, maxSize: 120 * 1024 }, // 120KB
  { name: "CSS Bundle", pattern: /^index-.*\.css$/, maxSize: 120 * 1024 }, // 120KB (Tailwind + Shadcn)
];

const DIST_DIR = "./dist/assets";

interface FileResult {
  name: string;
  size: number;
  gzipSize: number;
  budget?: number;
  withinBudget: boolean;
}

function getFileSize(filePath: string): number {
  try {
    return statSync(filePath).size;
  } catch {
    return 0;
  }
}

// 简单的 gzip 大小估算
function estimateGzipSize(originalSize: number): number {
  // JS/CSS 通常压缩到 25-35%
  return Math.round(originalSize * 0.3);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function analyzeBundle() {
  console.log("📦 Bundle 分析\n");
  console.log("=" .repeat(60));

  let totalSize = 0;
  let totalGzip = 0;
  let violations: string[] = [];

  try {
    const files = readdirSync(DIST_DIR);

    const results: FileResult[] = files
      .filter((file) => file.endsWith(".js") || file.endsWith(".css"))
      .map((file) => {
        const filePath = join(DIST_DIR, file);
        const size = getFileSize(filePath);
        const gzipSize = estimateGzipSize(size);

        // 检查是否匹配预算规则
        const budget = BUDGETS.find((b) => b.pattern.test(file));

        totalSize += size;
        totalGzip += gzipSize;

        return {
          name: file,
          size,
          gzipSize,
          budget: budget?.maxSize,
          withinBudget: budget ? size <= budget.maxSize : true,
        };
      })
      .sort((a, b) => b.size - a.size);

    // 打印结果
    console.log("\n📊 文件大小排名 (Top 10):\n");
    results.slice(0, 10).forEach((result, index) => {
      const indicator = result.withinBudget ? "✅" : "❌";
      const budgetInfo = result.budget
        ? ` (预算: ${formatBytes(result.budget)})`
        : "";
      console.log(
        `${index + 1}. ${indicator} ${result.name}`
      );
      console.log(
        `   原始: ${formatBytes(result.size)} | Gzip: ${formatBytes(result.gzipSize)}${budgetInfo}`
      );

      if (!result.withinBudget && result.budget) {
        const overage = result.size - result.budget;
        violations.push(
          `${result.name} 超出预算 ${formatBytes(overage)}`
        );
      }
    });

    // 打印总计
    console.log("\n" + "=".repeat(60));
    console.log(`\n📈 总计:`);
    console.log(`   原始大小: ${formatBytes(totalSize)}`);
    console.log(`   Gzip 后:  ${formatBytes(totalGzip)}`);

    // 打印违规
    if (violations.length > 0) {
      console.log("\n❌ 预算违规:\n");
      violations.forEach((v) => console.log(`   • ${v}`));
      console.log("\n");
      process.exit(1);
    } else {
      console.log("\n✅ 所有文件都在预算范围内\n");
    }

    // 打印预算概览
    console.log("📋 性能预算:\n");
    BUDGETS.forEach((b) => {
      console.log(`   • ${b.name}: ${formatBytes(b.maxSize)}`);
    });
    console.log("");

  } catch (error) {
    console.error("❌ 分析失败:", error);
    process.exit(1);
  }
}

analyzeBundle();
