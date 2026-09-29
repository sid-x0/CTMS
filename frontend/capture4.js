/**
 * AIIA CTMS — Fourth Pass: Final remaining captures
 * Remaining gaps:
 *   - 01_dashboard: KPI cards, recharts hover, attention section
 *   - 06_milestones: overdue filter applied
 *   - 09_alerts: alert detail
 *   - 10_audit: SHA-256 verification result, Eye modal + before/after + hash values
 *   - 11_users: Provision User modal, role matrix section
 *   - 04_sites: site detail
 *   - 12_regulator: audit record detail + hash verify
 *   - 03_study_detail: tab exploration
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

async function loginAs(page, email, password) {
  console.log(`  Logging in as ${email}...`);
  // Navigate first so localStorage is accessible (avoids SecurityError on about:blank)
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(500);
  await page.evaluate(() => {
    localStorage.removeItem('ctms_jwt_token');
    localStorage.removeItem('ctms_user_session');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1000);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.evaluate((e, p) => {
    const ei = document.querySelector('input[type="email"]');
    const pi = document.querySelector('input[type="password"]');
    if (ei) { ei.value = e; ei.dispatchEvent(new Event('input', { bubbles: true })); }
    if (pi) { pi.value = p; pi.dispatchEvent(new Event('input', { bubbles: true })); }
  }, email, password);
  await sleep(400);
  await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
  await page.click('button[type="submit"]');
  try { await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }); } catch(e) {}
  await sleep(2000);
  console.log(`  Landed: ${page.url()}`);
}

async function navTo(page, route) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(1500);
}

async function closeModal(page) {
  // Try close button first, then ESC
  try {
    const closeBtn = await page.$('[aria-label="Close"]');
    if (closeBtn) { await closeBtn.click(); await sleep(400); return; }
  } catch(e) {}
  await page.keyboard.press('Escape');
  await sleep(500);
}

async function main() {
  console.log('\n🎯 AIIA CTMS — Fourth Pass: Final captures\n');

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

    // ================================================================
    // LOGIN AS ADMIN
    // ================================================================
    await loginAs(page, 'admin@aiia.gov.in', 'Password123!');

    // ================================================================
    // 1. DASHBOARD — KPI, recharts, attention
    // ================================================================
    console.log('\n📸 01 Dashboard — detailed sections');
    await navTo(page, '/dashboard');

    // Capture top with KPI cards
    await shot(page, path.join(OUT_DIR, '01_dashboard/04_kpi_cards.png'),
      'Dashboard - KPI summary cards at top');

    // Scroll to charts area
    await page.evaluate(() => window.scrollTo(0, 350));
    await sleep(700);
    await shot(page, path.join(OUT_DIR, '01_dashboard/05_charts_section.png'),
      'Dashboard - charts and risk visualization section');

    // Hover over recharts using page coords
    const rechartsInfo = await page.evaluate(() => {
      const el = document.querySelector('.recharts-wrapper, .recharts-responsive-container, [class*="recharts"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { cx: Math.round(r.left + r.width * 0.35), cy: Math.round(r.top + r.height * 0.5) };
    });
    if (rechartsInfo) {
      await page.mouse.move(rechartsInfo.cx, rechartsInfo.cy);
      await sleep(1000);
      await shot(page, path.join(OUT_DIR, '01_dashboard/06_recharts_hover.png'),
        'Dashboard recharts chart hover - tooltip visible');
      await page.mouse.move(rechartsInfo.cx + 60, rechartsInfo.cy);
      await sleep(600);
      await shot(page, path.join(OUT_DIR, '01_dashboard/07_recharts_hover2.png'),
        'Dashboard recharts chart second hover point');
    }

    // Attention items section
    await page.evaluate(() => window.scrollTo(0, 700));
    await sleep(600);
    await shot(page, path.join(OUT_DIR, '01_dashboard/08_attention_items.png'),
      'Dashboard attention section - high-risk studies requiring action');

    await page.evaluate(() => window.scrollTo(0, 1100));
    await sleep(600);
    await shot(page, path.join(OUT_DIR, '01_dashboard/09_dashboard_full_bottom.png'),
      'Dashboard bottom - study list and additional metrics');

    await page.evaluate(() => window.scrollTo(0, 0));

    // ================================================================
    // 2. MILESTONES — filter + update modal
    // ================================================================
    console.log('\n📸 06 Milestones — filter and overdue');
    await navTo(page, '/milestones');

    // Get all select options
    const msOpts = await page.evaluate(() => {
      const sel = document.querySelector('select.ctms-select');
      if (!sel) return [];
      return Array.from(sel.options).map(o => ({ value: o.value, text: o.text }));
    });
    console.log(`  Filter options: ${JSON.stringify(msOpts)}`);

    if (msOpts.length > 0) {
      // Try each status option
      for (const opt of msOpts.filter(o => o.value !== '')) {
        await page.select('select.ctms-select', opt.value);
        await sleep(800);
        const rows = await page.$$('tbody tr');
        console.log(`  ${opt.text}: ${rows.length} rows`);
        if (rows.length > 0 && rows.length < 20) {
          await shot(page, path.join(OUT_DIR, `06_milestones/05_milestones_filter_${opt.value.toLowerCase().replace(/\s+/g, '_')}.png`),
            `Milestones filtered: ${opt.text}`);
          break;
        }
      }
      // Reset
      await page.select('select.ctms-select', '');
      await sleep(500);
    }

    // Find any "Update" / detail button in milestone rows
    const msBtns = await page.$$('tbody tr button');
    console.log(`  Milestone row buttons: ${msBtns.length}`);
    for (const btn of msBtns.slice(0, 5)) {
      const text = await page.evaluate(el => el.textContent?.trim() || '', btn);
      const label = await page.evaluate(el => el.getAttribute('aria-label') || '', btn);
      console.log(`  MS button: text="${text}" label="${label}"`);
      if (text || label) {
        await btn.click();
        await sleep(1200);
        const modal = await page.$('.ctms-modal-overlay');
        if (modal) {
          await shot(page, path.join(OUT_DIR, '06_milestones/03_milestone_detail_modal.png'),
            'Milestone detail/update modal');
          await closeModal(page);
        }
        break;
      }
    }

    // ================================================================
    // 3. ALERTS — trying to open alert details
    // ================================================================
    console.log('\n📸 09 Alerts — detail');
    await navTo(page, '/alerts');

    // Log all first-level children of the main content area
    const alertInfo = await page.evaluate(() => {
      const main = document.querySelector('main, [class*="content"], [class*="page"]');
      if (!main) return 'no main';
      const children = Array.from(main.children);
      return children.map(c => ({
        tag: c.tagName,
        class: c.className.slice(0, 60),
        text: c.textContent?.trim().slice(0, 100)
      }));
    });
    console.log('  Alert page structure:', JSON.stringify(alertInfo).slice(0, 500));

    // Try clicking any clickable item
    const allClickable = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, a, [role="button"], [class*="cursor-pointer"]'))
        .filter(el => {
          const r = el.getBoundingClientRect();
          return r.width > 50 && r.height > 20 && r.top > 50;
        })
        .slice(0, 20)
        .map(el => ({
          tag: el.tagName,
          text: (el.textContent || '').trim().slice(0, 60),
          class: el.className.slice(0, 60),
          ariaLabel: el.getAttribute('aria-label') || ''
        }));
    });
    console.log('  Clickable elements:', JSON.stringify(allClickable).slice(0, 800));

    // Try clicking based on what we find
    for (const item of allClickable) {
      if (item.text.length > 10 && !item.text.includes('Dashboard') && !item.text.includes('Studies')) {
        try {
          const el = await page.$(`button, a, [role="button"]`);
          if (el) {
            const elText = await page.evaluate(el => el.textContent?.trim(), el);
            if (elText === item.text) {
              await el.click();
              await sleep(1000);
              const modal = await page.$('.ctms-modal-overlay');
              if (modal) {
                await shot(page, path.join(OUT_DIR, '09_alerts/03_alert_detail_modal.png'),
                  'Alert detail modal');
                await closeModal(page);
                break;
              }
            }
          }
        } catch(e) {}
      }
    }

    // Just take final state shots
    await shot(page, path.join(OUT_DIR, '09_alerts/05_alerts_page_detail.png'),
      'Alerts page - detailed view of alert items');

    await page.evaluate(() => window.scrollTo(0, 300));
    await sleep(500);
    await shot(page, path.join(OUT_DIR, '09_alerts/06_alerts_scrolled_detail.png'),
      'Alerts page scrolled - more alert types visible');

    // ================================================================
    // 4. AUDIT — SHA-256 verification + Eye modal
    // ================================================================
    console.log('\n📸 10 Audit — hash verification + record detail');
    await navTo(page, '/audit');

    // Take a fresh full shot
    await shot(page, path.join(OUT_DIR, '10_audit/01_audit_full.png'),
      'Audit trail - complete page view');

    // Click Verify SHA-256 Chain button
    await page.waitForSelector('button[aria-label="Verify audit chain integrity"]', { timeout: 8000 });
    const verifyBtn = await page.$('button[aria-label="Verify audit chain integrity"]');
    await verifyBtn.click();
    await sleep(4000); // wait for API response

    // Take screenshot of the result
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(300);
    await shot(page, path.join(OUT_DIR, '10_audit/06_hash_chain_verification.png'),
      'SHA-256 Hash Chain Verification - result banner at top (PASS/FAIL)');

    await page.evaluate(() => window.scrollTo(0, 250));
    await sleep(400);
    await shot(page, path.join(OUT_DIR, '10_audit/06b_hash_verification_detail.png'),
      'Hash chain verification detail panel - records checked, PASS status');

    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(300);

    // Now click Eye button for record detail
    const eyeBtns = await page.$$('button[aria-label="View full record"]');
    console.log(`  Eye buttons: ${eyeBtns.length}`);
    if (eyeBtns.length > 0) {
      await eyeBtns[0].click();
      await sleep(1500);
      const modal = await page.$('.ctms-modal-overlay');
      if (modal) {
        // Top of modal - Who/What/When
        await shot(page, path.join(OUT_DIR, '10_audit/04_audit_record_detail.png'),
          'Audit record detail modal - Who/What/When metadata');

        // Scroll to Before/After
        await page.evaluate(() => {
          const m = document.querySelector('.ctms-modal');
          if (m) m.scrollTop = 200;
        });
        await sleep(600);
        await shot(page, path.join(OUT_DIR, '10_audit/05_audit_before_after.png'),
          'Audit Before (red background) / After (green background) data comparison');

        // Scroll to hash values
        await page.evaluate(() => {
          const m = document.querySelector('.ctms-modal');
          if (m) m.scrollTop = 500;
        });
        await sleep(500);
        await shot(page, path.join(OUT_DIR, '10_audit/08_audit_hash_values.png'),
          'Audit record hash chain values - record_hash and previous_hash');

        await closeModal(page);
        await sleep(600);
      }
    }

    // Filter select - SafetyEvent
    const entityFilter = await page.$('select[aria-label="Filter audit entity type"]');
    if (entityFilter) {
      await page.select('select[aria-label="Filter audit entity type"]', 'SafetyEvent');
      await sleep(1200);
      await shot(page, path.join(OUT_DIR, '10_audit/09_audit_safety_event_filter.png'),
        'Audit filtered: SafetyEvent entries only');
      await page.select('select[aria-label="Filter audit entity type"]', '');
      await sleep(500);

      // Also try Participant filter
      await page.select('select[aria-label="Filter audit entity type"]', 'Participant');
      await sleep(1000);
      await shot(page, path.join(OUT_DIR, '10_audit/10_audit_participant_filter.png'),
        'Audit filtered: Participant entries only');
      await page.select('select[aria-label="Filter audit entity type"]', '');
      await sleep(500);
    }

    // ================================================================
    // 5. USERS — Provision modal + role access matrix
    // ================================================================
    console.log('\n📸 11 Users — provision modal and role matrix');
    await navTo(page, '/users');

    // Role Access Matrix is always visible - scroll to it
    await shot(page, path.join(OUT_DIR, '11_users/06_role_access_matrix_top.png'),
      'Users page - Role Access Matrix visible');

    await page.evaluate(() => window.scrollTo(0, 300));
    await sleep(500);
    await shot(page, path.join(OUT_DIR, '11_users/07_role_matrix_full.png'),
      'Role Access Matrix - all 7 roles with descriptions');

    await page.evaluate(() => window.scrollTo(0, 600));
    await sleep(500);
    await shot(page, path.join(OUT_DIR, '11_users/08_active_users_list.png'),
      'Active users list with role badges and organization');

    await page.evaluate(() => window.scrollTo(0, 0));

    // Click Provision User button
    const provBtn = await page.$('button.ctms-btn-primary');
    const provBtnText = provBtn ? await page.evaluate(el => el.textContent?.trim(), provBtn) : '';
    console.log(`  Primary button text: "${provBtnText}"`);

    if (provBtn && provBtnText.includes('Provision')) {
      await provBtn.click();
      await sleep(1200);
      const modal = await page.$('.ctms-modal-overlay');
      if (modal) {
        await shot(page, path.join(OUT_DIR, '11_users/03_provision_user_modal.png'),
          'Provision User modal - create new user with role assignment');

        // Role select in modal
        const roleSelect = await page.$('.ctms-modal select');
        if (roleSelect) {
          // Expand the select by making it a listbox temporarily
          await page.evaluate(() => {
            const sel = document.querySelector('.ctms-modal select');
            if (sel) {
              sel.size = 8;
              sel.style.height = 'auto';
            }
          });
          await sleep(400);
          await shot(page, path.join(OUT_DIR, '11_users/04_role_select_all_options.png'),
            'Role select expanded - all 7 RBAC roles visible for assignment');

          await page.evaluate(() => {
            const sel = document.querySelector('.ctms-modal select');
            if (sel) { sel.size = 1; sel.style.height = ''; }
          });
        }

        await closeModal(page);
        await sleep(500);
      }
    }

    // ================================================================
    // 6. SITES — Detail view
    // ================================================================
    console.log('\n📸 04 Sites — detail');
    await navTo(page, '/sites');

    // Log what's in the sites table
    const siteTableInfo = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.slice(0, 3).map(row => {
        const btns = Array.from(row.querySelectorAll('button')).map(b => b.textContent?.trim());
        return { text: row.textContent?.trim().slice(0, 100), buttons: btns };
      });
    });
    console.log('  Site table:', JSON.stringify(siteTableInfo));

    // Try all buttons in rows
    let siteDetailCaptured = false;
    const siteRowBtns = await page.$$('tbody tr button');
    for (const btn of siteRowBtns) {
      if (siteDetailCaptured) break;
      try {
        const text = await page.evaluate(el => el.textContent?.trim() || '', btn);
        console.log(`  Site button: "${text}"`);
        await btn.click();
        await sleep(1500);
        const currentUrl = page.url();
        if (currentUrl !== `${BASE_URL}/sites`) {
          await shot(page, path.join(OUT_DIR, '04_sites/03_site_detail_page.png'),
            `Site detail page: ${currentUrl.replace(BASE_URL, '')}`);
          siteDetailCaptured = true;
          await navTo(page, '/sites');
        } else {
          const modal = await page.$('.ctms-modal-overlay');
          if (modal) {
            await shot(page, path.join(OUT_DIR, '04_sites/03_site_detail_modal.png'),
              'Site detail modal');
            await closeModal(page);
            siteDetailCaptured = true;
          }
        }
      } catch(e) { console.log(`  Button error: ${e.message}`); }
    }

    // Try clicking rows directly
    if (!siteDetailCaptured) {
      const siteRows = await page.$$('tbody tr');
      for (const row of siteRows) {
        try {
          await row.click();
          await sleep(1200);
          const modal = await page.$('.ctms-modal-overlay');
          if (modal) {
            await shot(page, path.join(OUT_DIR, '04_sites/03_site_detail_modal.png'),
              'Site detail modal');
            await closeModal(page);
            siteDetailCaptured = true;
            break;
          }
        } catch(e) {}
      }
    }

    // ================================================================
    // 7. STUDY WORKSPACE TABS — for multiple studies
    // ================================================================
    console.log('\n📸 03 Study workspace tabs');
    const token = await page.evaluate(() => localStorage.getItem('ctms_jwt_token'));
    if (token) {
      const studiesData = await page.evaluate(async (t) => {
        try {
          const r = await fetch('http://localhost:8000/api/v1/studies', {
            headers: { Authorization: `Bearer ${t}` }
          });
          if (!r.ok) return [];
          return await r.json();
        } catch(e) { return []; }
      }, token);

      console.log(`  Studies from API: ${studiesData.length}`);
      if (studiesData.length > 0) {
        const study = studiesData[0];
        console.log(`  First study: ID=${study.id}, "${study.short_title}"`);

        await navTo(page, `/studies/${study.id}`);

        // Get all tab labels first
        const tabLabels = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('[role="tab"]'))
            .map(el => el.textContent?.trim() || '');
        });
        console.log(`  Tab labels: ${JSON.stringify(tabLabels)}`);

        for (let i = 0; i < Math.min(tabLabels.length, 8); i++) {
          try {
            const tabs = await page.$$('[role="tab"]');
            if (i >= tabs.length) break;
            await tabs[i].click();
            await sleep(1500);
            const safe = tabLabels[i].toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 22);
            await shot(page, path.join(OUT_DIR, `03_study_detail/s${study.id}_tab_${String(i+1).padStart(2,'0')}_${safe}.png`),
              `Study ${study.id} tab: ${tabLabels[i]}`);
          } catch(e) { console.log(`  Tab ${i} err: ${e.message}`); }
        }
      }
    }

    // ================================================================
    // 8. COMPLIANCE — extra sections
    // ================================================================
    console.log('\n📸 08 Compliance — additional sections');
    await navTo(page, '/compliance');

    await page.evaluate(() => window.scrollTo(0, 1000));
    await sleep(600);
    await shot(page, path.join(OUT_DIR, '08_compliance/11_compliance_detailed_checks.png'),
      'Compliance page - detailed checklist items section');

    await page.evaluate(() => window.scrollTo(0, 1600));
    await sleep(600);
    await shot(page, path.join(OUT_DIR, '08_compliance/12_compliance_lower_section.png'),
      'Compliance page lower - additional content');

    await page.evaluate(() => window.scrollTo(0, 0));

    // ================================================================
    // 9. REGULATOR — Audit detail and hash verification
    // ================================================================
    console.log('\n📸 12 Regulator — audit record detail and hash verify');
    await loginAs(page, 'regulator@ayush.gov.in', 'Password123!');

    await navTo(page, '/audit');

    // Verify SHA-256 chain as regulator
    const regVerify = await page.$('button[aria-label="Verify audit chain integrity"]');
    if (regVerify) {
      await regVerify.click();
      await sleep(4000);
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(300);
      await shot(page, path.join(OUT_DIR, '12_regulator/09_hash_chain_verified.png'),
        'Regulator: SHA-256 Hash Chain verified - PASS banner');

      await page.evaluate(() => window.scrollTo(0, 200));
      await sleep(300);
      await shot(page, path.join(OUT_DIR, '12_regulator/09b_hash_verification_detail.png'),
        'Regulator: hash chain detail - records checked, PASS');
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(300);

    // Click Eye button as regulator
    const regEyeBtns = await page.$$('button[aria-label="View full record"]');
    if (regEyeBtns.length > 0) {
      await regEyeBtns[0].click();
      await sleep(1500);
      const modal = await page.$('.ctms-modal-overlay');
      if (modal) {
        await shot(page, path.join(OUT_DIR, '12_regulator/08_audit_record_detail.png'),
          'Audit record detail as Regulator - read-only forensic view');

        await page.evaluate(() => {
          const m = document.querySelector('.ctms-modal');
          if (m) m.scrollTop = 250;
        });
        await sleep(500);
        await shot(page, path.join(OUT_DIR, '12_regulator/08b_audit_before_after.png'),
          'Audit before/after comparison as Regulator');

        await closeModal(page);
        await sleep(600);
      }
    }

    // Regulator compliance - CDISC access
    await navTo(page, '/compliance');
    const cdiscBtns = await page.$$('button');
    for (const btn of cdiscBtns) {
      const text = await page.evaluate(el => el.textContent?.trim() || '', btn);
      if (text.toUpperCase().includes('CDISC')) {
        await btn.click();
        await sleep(2000);
        await shot(page, path.join(OUT_DIR, '12_regulator/11_regulator_cdisc_access.png'),
          'CDISC datasets as Regulator - submission format access');
        break;
      }
    }

    // ================================================================
    // 10. FINAL — Study inline panel tabs exploration
    // ================================================================
    console.log('\n📸 Final - study inline panel tabs');
    await loginAs(page, 'admin@aiia.gov.in', 'Password123!');
    await navTo(page, '/studies');

    // Click first study row to open inline detail
    const studyRows = await page.$$('tbody tr.cursor-pointer');
    if (studyRows.length > 0) {
      await studyRows[0].click();
      await sleep(2000);

      // Get all tabs
      const tabTexts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[role="tab"]'))
          .map(el => el.textContent?.trim() || '');
      });
      console.log(`  Inline panel tabs: ${JSON.stringify(tabTexts)}`);

      if (tabTexts.length > 0) {
        await shot(page, path.join(OUT_DIR, '02_studies/08_study_panel_tabs_visible.png'),
          'Study inline detail - tab navigation visible');

        for (let i = 0; i < Math.min(tabTexts.length, 6); i++) {
          try {
            const tabs = await page.$$('[role="tab"]');
            if (i >= tabs.length) break;
            await tabs[i].click();
            await sleep(1200);
            const safe = tabTexts[i].toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20);
            await shot(page, path.join(OUT_DIR, `02_studies/09_study_panel_tab_${String(i+1).padStart(2,'0')}_${safe}.png`),
              `Study inline panel - tab: ${tabTexts[i]}`);
          } catch(e) { console.log(`  Tab ${i} err: ${e.message}`); }
        }
      }
    }

  } catch(err) {
    console.error('\n❌ Fatal error:', err.message);
    console.error(err.stack);
  }

  await browser.close();

  const totalPngs = fs.readdirSync(OUT_DIR, { recursive: true })
    .filter(f => typeof f === 'string' && f.endsWith('.png')).length;

  console.log('\n');
  console.log('═'.repeat(60));
  console.log(`  Fourth pass complete!`);
  console.log(`  New screenshots: ${sc}`);
  console.log(`  Total PNGs in output: ~${totalPngs}`);
  console.log('═'.repeat(60));
}

main().catch(console.error);
