/**
 * AIIA CTMS — Fifth Pass: Study workspace sections + Milestones + Sites + Dashboard
 * Now knowing: study workspace has NO tabs, it's one scrolling page with sections.
 * Milestones: filter is by study protocol.
 * Sites: display-only table, no detail modals.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const OUT_DIR = path.resolve(__dirname, '..', 'demo_ui_inventory');
const VIEWPORT = { width: 1440, height: 900 };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
let sc = 0;

async function shot(page, fp, label) {
  ensureDir(path.dirname(fp));
  if (fs.existsSync(fp)) {
    const ext = path.extname(fp);
    const base = fp.slice(0, -ext.length);
    let n = 2; while (fs.existsSync(`${base}_v${n}${ext}`)) n++;
    fp = `${base}_v${n}${ext}`;
  }
  await page.screenshot({ path: fp, fullPage: true });
  sc++;
  console.log(`  [✓] ${path.relative(OUT_DIR, fp).replace(/\\/g, '/')}  (${label})`);
}

async function loginAdmin(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(800);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.evaluate(() => {
    const e = document.querySelector('input[type="email"]');
    const p = document.querySelector('input[type="password"]');
    e.value = 'admin@aiia.gov.in'; e.dispatchEvent(new Event('input', { bubbles: true }));
    p.value = 'Password123!'; p.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(300);
  await page.click('button[type="submit"]');
  try { await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }); } catch(e) {}
  await sleep(2000);
}

async function navTo(page, route) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(1500);
}

async function main() {
  console.log('\n✅ AIIA CTMS — Fifth Pass: Study workspace + remaining sections\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: VIEWPORT,
    args: ['--no-sandbox', '--window-size=1440,900'],
  });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  page.on('console', () => {});
  page.on('pageerror', () => {});

  try {
    await loginAdmin(page);

    // ================================================================
    // STUDY WORKSPACE — Scroll through all sections
    // ================================================================
    console.log('\n📸 03 Study workspace — all scrolling sections');

    const token = await page.evaluate(() => localStorage.getItem('ctms_jwt_token'));
    const studiesData = await page.evaluate(async (t) => {
      try {
        const r = await fetch('http://localhost:8000/api/v1/studies', {
          headers: { Authorization: `Bearer ${t}` }
        });
        return r.ok ? r.json() : [];
      } catch(e) { return []; }
    }, token);

    console.log(`  Studies: ${studiesData.length}`);

    // Capture 3 study workspaces (different risk levels)
    for (let i = 0; i < Math.min(studiesData.length, 3); i++) {
      const study = studiesData[i];
      console.log(`  Study ${study.id}: ${study.protocol_number} — ${study.short_title}`);

      await navTo(page, `/studies/${study.id}`);
      const padded = String(i + 1).padStart(2, '0');

      // Section 1: Study header
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(600);
      await shot(page, path.join(OUT_DIR, `03_study_detail/${padded}_s${study.id}_01_header.png`),
        `Study ${study.id} workspace - header with risk score, status, PI`);

      // Section 2: Risk breakdown + Evidence chips
      await page.evaluate(() => window.scrollTo(0, 350));
      await sleep(600);
      await shot(page, path.join(OUT_DIR, `03_study_detail/${padded}_s${study.id}_02_risk_evidence.png`),
        `Study ${study.id} - risk breakdown dimensions + evidence chips`);

      // Section 3: Recommended actions panel
      await page.evaluate(() => window.scrollTo(0, 600));
      await sleep(600);
      await shot(page, path.join(OUT_DIR, `03_study_detail/${padded}_s${study.id}_03_recommended_actions.png`),
        `Study ${study.id} - recommended actions + module workspace links`);

      // Section 4: Enrollment funnel + site performance
      await page.evaluate(() => window.scrollTo(0, 950));
      await sleep(600);
      await shot(page, path.join(OUT_DIR, `03_study_detail/${padded}_s${study.id}_04_enrollment_funnel.png`),
        `Study ${study.id} - participant flow funnel + site performance`);

      // Section 5: Milestone timeline
      await page.evaluate(() => window.scrollTo(0, 1300));
      await sleep(600);
      await shot(page, path.join(OUT_DIR, `03_study_detail/${padded}_s${study.id}_05_milestones.png`),
        `Study ${study.id} - regulatory milestone timeline (overdue/pending/completed)`);

      // Section 6: Safety + Compliance summary
      await page.evaluate(() => window.scrollTo(0, 1700));
      await sleep(600);
      await shot(page, path.join(OUT_DIR, `03_study_detail/${padded}_s${study.id}_06_safety_compliance.png`),
        `Study ${study.id} - pharmacovigilance snapshot + compliance pre-flight`);

      // Full-page bottom
      await page.evaluate(() => window.scrollTo(0, 2100));
      await sleep(600);
      await shot(page, path.join(OUT_DIR, `03_study_detail/${padded}_s${study.id}_07_bottom.png`),
        `Study ${study.id} - bottom section`);

      await page.evaluate(() => window.scrollTo(0, 0));
    }

    // ================================================================
    // MILESTONES — Filter by study protocol
    // ================================================================
    console.log('\n📸 06 Milestones — filter by study + status views');
    await navTo(page, '/milestones');

    // Get select options (by study)
    const msOpts = await page.evaluate(() => {
      const sel = document.querySelector('select.ctms-select');
      if (!sel) return [];
      return Array.from(sel.options).map(o => ({ value: o.value, text: o.text }));
    });
    console.log(`  Milestone filter options: ${msOpts.length}`);

    if (msOpts.length > 0) {
      // Try filtering by each study to find one with milestones
      for (const opt of msOpts.filter(o => o.value !== '')) {
        await page.select('select.ctms-select', opt.value);
        await sleep(800);
        const rowCount = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
        console.log(`  ${opt.text}: ${rowCount} rows`);
        if (rowCount > 0) {
          const safe = opt.text.split(':')[0].replace(/[^a-z0-9]/gi, '_').toLowerCase();
          await shot(page, path.join(OUT_DIR, `06_milestones/03_milestones_filtered_${safe}.png`),
            `Milestones filtered: ${opt.text}`);
          
          await page.evaluate(() => window.scrollTo(0, 400));
          await sleep(500);
          await shot(page, path.join(OUT_DIR, `06_milestones/04_milestones_filtered_scrolled.png`),
            `Milestones filtered scrolled - milestone detail rows`);
          
          await page.evaluate(() => window.scrollTo(0, 0));
          break;
        }
      }
      // Reset to all
      await page.select('select.ctms-select', '');
      await sleep(800);
    }

    // Full unfiltered milestones view with all studies
    await shot(page, path.join(OUT_DIR, '06_milestones/05_milestones_all_studies.png'),
      'Milestones - all studies, showing overdue/pending/completed timeline');

    await page.evaluate(() => window.scrollTo(0, 400));
    await sleep(500);
    await shot(page, path.join(OUT_DIR, '06_milestones/06_milestones_lower.png'),
      'Milestones lower - completed milestones section');

    // ================================================================
    // SITES — Study-filtered site performance
    // ================================================================
    console.log('\n📸 04 Sites — study filtered view');
    await navTo(page, '/sites');

    // Get the study filter select options
    const siteFilterOpts = await page.evaluate(() => {
      const sel = document.querySelector('select.ctms-select, select[class*="ctms-select"]');
      if (!sel) return [];
      return Array.from(sel.options).map(o => ({ value: o.value, text: o.text }));
    });
    console.log(`  Site filter options: ${siteFilterOpts.length}`);

    // Check structure
    const sitePageInfo = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      return selects.map(s => ({ options: Array.from(s.options).map(o => o.text) }));
    });
    console.log('  Site page selects:', JSON.stringify(sitePageInfo).slice(0, 300));

    // Try filtering by first study with data
    const siteSelects = await page.$$('select');
    if (siteSelects.length > 0) {
      const optVals = await page.evaluate(() => {
        const sel = document.querySelector('select');
        if (!sel) return [];
        return Array.from(sel.options).map(o => ({ v: o.value, t: o.text }));
      });
      console.log(`  Site filter: ${JSON.stringify(optVals).slice(0, 200)}`);

      for (const opt of optVals.filter(o => o.v !== '')) {
        await page.select('select', opt.v);
        await sleep(1000);
        const rows = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
        if (rows > 0) {
          await shot(page, path.join(OUT_DIR, '04_sites/03_sites_filtered_by_study.png'),
            `Sites filtered by study: ${opt.t} — showing site performance`);
          break;
        }
      }
      await page.select('select', '');
      await sleep(800);
    }

    // Capture Add Site modal
    const addSiteBtn = await page.$('button.ctms-btn-primary');
    if (addSiteBtn) {
      const text = await page.evaluate(el => el.textContent?.trim(), addSiteBtn);
      if (text && (text.includes('Add') || text.includes('Site') || text.includes('Register'))) {
        await addSiteBtn.click();
        await sleep(1200);
        const modal = await page.$('.ctms-modal-overlay');
        if (modal) {
          await shot(page, path.join(OUT_DIR, '04_sites/03_add_site_modal.png'),
            'Add Trial Site modal - register new participating center');
          await page.keyboard.press('Escape');
          await sleep(500);
        }
      }
    }

    // ================================================================
    // DASHBOARD — Detailed recharts and sections
    // ================================================================
    console.log('\n📸 01 Dashboard — chart interaction');
    await navTo(page, '/dashboard');

    // Find the recharts SVG area
    const chartInfo = await page.evaluate(() => {
      // Try multiple recharts selectors
      const selectors = [
        '.recharts-wrapper', '.recharts-surface',
        'svg.recharts-surface', '[class*="recharts"]',
        '.recharts-responsive-container'
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          const r = el.getBoundingClientRect();
          return { found: sel, x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width/2, cy: r.top + r.height/2 };
        }
      }
      // Try to find any SVG
      const svgs = Array.from(document.querySelectorAll('svg'));
      for (const svg of svgs) {
        const r = svg.getBoundingClientRect();
        if (r.width > 100 && r.height > 100) {
          return { found: 'svg', x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width/2, cy: r.top + r.height/2 };
        }
      }
      return null;
    });
    console.log(`  Chart found: ${JSON.stringify(chartInfo)}`);

    if (chartInfo) {
      await page.mouse.move(chartInfo.cx, chartInfo.cy);
      await sleep(1000);
      await shot(page, path.join(OUT_DIR, '01_dashboard/06_chart_hover_center.png'),
        'Dashboard chart hover - center of chart');

      await page.mouse.move(chartInfo.cx - 80, chartInfo.cy);
      await sleep(600);
      await shot(page, path.join(OUT_DIR, '01_dashboard/07_chart_hover_left.png'),
        'Dashboard chart hover - left segment');

      await page.mouse.move(chartInfo.cx + 80, chartInfo.cy - 30);
      await sleep(600);
      await shot(page, path.join(OUT_DIR, '01_dashboard/08_chart_hover_right.png'),
        'Dashboard chart hover - right segment');
    }

    // ================================================================
    // ALERTS — Inspect AlertsView structure more carefully
    // ================================================================
    console.log('\n📸 09 Alerts — detailed item inspection');
    await navTo(page, '/alerts');

    // Inspect full page DOM to find alert items
    const alertsViewInfo = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[class*="border-b"], [class*="rounded-md"] > div, li'));
      return items.slice(0, 10).map(el => ({
        tag: el.tagName,
        classes: el.className.slice(0, 80),
        text: (el.textContent || '').trim().slice(0, 120),
        clickable: typeof el.onclick === 'function' || el.tagName === 'BUTTON' || el.tagName === 'A',
        childCount: el.children.length
      }));
    });
    console.log('  Alert items:', JSON.stringify(alertsViewInfo).slice(0, 1000));

    // Try viewing the AlertsView source to understand structure
    // Try all buttons in the alerts page
    const alertPageBtns = await page.$$('button:not([aria-label="Dashboard"]):not([aria-label="Studies"]):not([aria-label="Sites"]):not([aria-label="Participants"]):not([aria-label="Milestones"]):not([aria-label="Safety"]):not([aria-label="Compliance"]):not([aria-label="Alerts"]):not([aria-label="Audit"]):not([aria-label="Users"])');
    console.log(`  Non-nav buttons: ${alertPageBtns.length}`);
    for (const btn of alertPageBtns.slice(0, 10)) {
      const text = await page.evaluate(el => el.textContent?.trim() || '', btn);
      const label = await page.evaluate(el => el.getAttribute('aria-label') || '', btn);
      console.log(`  Alert btn: text="${text.slice(0,40)}" label="${label.slice(0,40)}"`);
      if (text.includes('Unack') || text.includes('View') || text.includes('Detail') || text.includes('Mark')) {
        await btn.click();
        await sleep(1000);
        const modal = await page.$('.ctms-modal-overlay');
        if (modal) {
          await shot(page, path.join(OUT_DIR, '09_alerts/03_alert_detail_modal.png'),
            'Alert detail modal');
          await page.keyboard.press('Escape');
          await sleep(500);
          break;
        }
        await shot(page, path.join(OUT_DIR, '09_alerts/07_alert_after_action.png'),
          `Alerts after clicking "${text.slice(0,20)}"`);
        break;
      }
    }

    // ================================================================
    // STUDY INLINE DETAIL — From /studies, click row, get detail panel
    // ================================================================
    console.log('\n📸 02 Studies — study inline detail panel sections');
    await navTo(page, '/studies');

    const studyRows = await page.$$('tbody tr.cursor-pointer');
    if (studyRows.length > 0) {
      await studyRows[0].click();
      await sleep(2500);

      // Top of panel
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(500);
      await shot(page, path.join(OUT_DIR, '02_studies/10_study_panel_header.png'),
        'Study inline detail panel - header with risk score and protocol info');

      await page.evaluate(() => window.scrollTo(0, 350));
      await sleep(500);
      await shot(page, path.join(OUT_DIR, '02_studies/11_study_panel_risk.png'),
        'Study inline detail - risk dimensions and evidence');

      await page.evaluate(() => window.scrollTo(0, 700));
      await sleep(500);
      await shot(page, path.join(OUT_DIR, '02_studies/12_study_panel_enrollment.png'),
        'Study inline detail - enrollment funnel and site performance');

      await page.evaluate(() => window.scrollTo(0, 1100));
      await sleep(500);
      await shot(page, path.join(OUT_DIR, '02_studies/13_study_panel_milestones.png'),
        'Study inline detail - milestone timeline');

      await page.evaluate(() => window.scrollTo(0, 0));

      // Workspace button
      const workspaceBtns = await page.$$('button[aria-label*="Open study workspace"]');
      if (workspaceBtns.length > 0) {
        await workspaceBtns[0].scrollIntoView();
        await sleep(400);
        await shot(page, path.join(OUT_DIR, '02_studies/14_study_panel_with_workspace_btn.png'),
          'Study inline detail - with Workspace button visible');
      }
    }

  } catch(err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
  }

  await browser.close();

  const totalPngs = [];
  function countPngs(dir) {
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) countPngs(full);
      else if (f.endsWith('.png')) totalPngs.push(full);
    }
  }
  countPngs(OUT_DIR);

  console.log('\n');
  console.log('═'.repeat(60));
  console.log(`  Fifth pass complete! New screenshots: ${sc}`);
  console.log(`  Total PNGs: ${totalPngs.length}`);
  console.log('═'.repeat(60));
}

main().catch(console.error);
