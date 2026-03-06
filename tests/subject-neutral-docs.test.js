const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

test('README uses subject-neutral outward branding', () => {
  const readme = read('README.md');
  assert.match(readme, /# 学科演示集/);
  assert.match(readme, /把分散的学科演示资源整理成一个可浏览、可管理、可部署的小站/);
  assert.doesNotMatch(readme, /把分散的物理动画整理成/);
});

test('ops release runbook uses subject-neutral product naming', () => {
  const runbook = read('docs/guides/ops-release-runbook.md');
  assert.match(runbook, /适用范围：`学科演示集`/);
});

test('current branding plan no longer keeps old product wording as live docs copy', () => {
  const plan = read('docs/plans/2026-03-06-subject-neutral-branding-plan.md');
  assert.doesNotMatch(plan, /我的物理动画集/);
  assert.doesNotMatch(plan, /physics-only/);
});
