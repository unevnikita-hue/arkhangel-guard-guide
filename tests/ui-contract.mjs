import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const memo = readFileSync(new URL('../content/memo.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const preview = readFileSync(new URL('../preview.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
const phpPage = readFileSync(new URL('../public/index.php', import.meta.url), 'utf8');
const previewPage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const config = readFileSync(new URL('../config.php', import.meta.url), 'utf8');

const alarms = [
  ['НЕТ ПОСАДОЧНЫХ И ЧЕКОВ — НЕТ КОМПЕНСАЦИИ', 'ПОНЯЛ!'],
  ['НУЖНЫ ОРИГИНАЛЫ И КОПИИ ВАШИХ ДОКУМЕНТОВ', 'ПРИНЯЛ!'],
  ['НУЖНО ВЗЯТЬ ЛИЧНЫЕ ВЕЩИ, АПТЕЧКУ И ПРОЧЕЕ', 'ЯСНО!'],
];

for (const [message, answer] of alarms) {
  assert.ok(memo.includes(message), `memo contains alarm: ${message}`);
  assert.ok(memo.includes(`data-alarm-answer="${answer}"`), `memo contains answer: ${answer}`);
}

for (const script of [app, preview]) {
  assert.ok(script.includes('IntersectionObserver'), 'alarm triggers on entering the viewport');
  assert.ok(script.includes('showAlarm'), 'script opens the alarm modal');
  assert.ok(script.includes('alarm-open'), 'script locks background scrolling');
  assert.ok(!script.includes("} else {\n      const checkAlarms"), 'scroll fallback is active even when IntersectionObserver exists');
  assert.ok(script.includes("trigger.getBoundingClientRect().top < window.innerHeight * 0.8"), 'fast scrolling queues passed alarms');
  assert.ok(script.includes("page.inert = true"), 'modal makes background inert');
  assert.ok(script.includes("guard-guide:alarms-complete"), 'bottom unlock waits for all alarms');
}

for (const page of [phpPage, previewPage]) {
  assert.ok(page.includes('id="alarm-dialog"'), 'page contains shared alarm dialog');
  assert.ok(page.includes('id="alarm-answer"'), 'page contains alarm answer button');
  for (const field of ['last_name', 'first_name', 'middle_name']) {
    assert.ok(page.includes(`name="${field}"`), `page contains required ${field} field`);
  }
  assert.equal((page.match(/maxlength="59"/g) ?? []).length, 3, 'all three name fields share the server length limit');
  assert.ok(page.includes('name="personal_data_consent"'), 'page contains personal-data consent');
}

for (const script of [app, preview]) {
  assert.ok(script.includes('ALARM_DELAY_MS = 2000'), 'alarms have a two-second delay');
  assert.ok(script.includes('personal-data-consent'), 'submit button depends on personal-data consent');
}

assert.ok(css.includes('@keyframes warning-shimmer'), 'bright warnings shimmer');
assert.ok(css.includes('prefers-reduced-motion'), 'animation respects reduced motion');
assert.ok(css.includes('max-height:calc(100dvh - 36px)'), 'alarm fits short viewports');
assert.ok(css.includes('overflow-y:auto'), 'alarm can scroll inside short viewports');
assert.ok(config.includes("'memo_version' => '2026-08-21-01'"), 'memo version is bumped');
assert.ok(previewPage.includes('2026-08-21-01'), 'preview shows current memo version');
console.log('OK: alarm UI contract');
