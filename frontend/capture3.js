/**
 * AIIA CTMS — Third Pass: Precise missing states
 * 
 * Capturing with exact selectors from source code:
 * 1. Safety attention section, Review Event button, Log Adverse Event modal, cross-trial signals
 * 2. Users: Provision User button → modal, role dropdown, role access matrix
 * 3. Audit: hash chain verification banner result
 * 4. Sites: modal or inline detail
 * 5. Milestones: detail button
 * 6. Alerts: item click
 * 7. Dashboard: attention section scrolled, recharts hover
 * 8. Study workspace: tab exploration for study 1
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const OUT_DIR = path.resolve(__dirname, '..', 'demo_ui_inventory');
const VIEWPORT = { width: 1440, height: 900 };
const ADMIN = { email: 'admin@aiia.gov.in', password: 'Password123!' };
const PV = { email: 'pv@aiia.gov.in', password: 'Password123!' };

let screenshotCount = 0;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

async function shot(page, filepath, label) {
  ensureDir(path.dirname(filepath));
  let fp = filepath;
  if (fs.existsSync(fp)) {
    const ext = path.extname(filepath);
    const base = filepath.slice(0, -ext.length);
    let n = 2; while (fs.existsSync(`${base}_v${n}${ext}`)) n++;
    fp = `${base}_v${n}${ext}`;
  }
  await page.screenshot({ path: fp, fullPage: true });
  screenshotCount++;
  console.log(`  [✓] ${path.relative(OUT_DIR, fp).replace(/\\/g, '/')}  (${label})`);
  return fp;
}

function sleep2(ms) { return new Promise(r => setTimeout(r, ms)); }

async function loginAs(page, user) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(600);
  await page.evaluate((email, pwd) => {
    const e = document.querySelector('input[type="email"]');
    const p = document.querySelector('input[type="password"]');
    if (e) { e.value = email; e.dispatchEvent(new Event('input', { bubbles: true })); }
    if (p) { p.value = pwd; p.dispatchEvent(new Event('input', { bubbles: true })); }
  }, user.email, user.password);
  await sleep(300);
  await page.click('button[type="submit"]');
  try { await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }); } catch(e) {}
  await sleep(2000);
}

async function navTo(page, route) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(1500);
}

async function closeModal(page) {
  await page.keyboard.press('Escape');
  await sleep(500);
}

async function main() {
  console.log('\n🔧 AIIA CTMS — Third Pass: Precise Captures\n');

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
    // 1. SAFETY — Correct selectors
    // ================================================================
    console.log('\n📸 Safety — Attention section, Review button, Log modal, Cross-trial signals');

    // Login as PV user first (has canReport=true)
    await loginAs(page, PV);
    await navTo(page, '/safety');

    // Full page
    await shot(page, path.join(OUT_DIR, '07_safety/01_safety_full_pv.png'),
      'Safety page - Pharmacovigilance User view (full access)');

    // Safety Attention Required section (top)
    const attentionSection = await page.$('.border-red-200.bg-red-50');
    if (attentionSection) {
      await attentionSection.scrollIntoView();
      await sleep(500);
      await shot(page, path.join(OUT_DIR, '07_safety/04_safety_attention_section.png'),
        'Safety Attention Required section - events needing PV review');

      // Find "Review Event" button (Eye icon with text "Review Event")
      const reviewBtns = await page.$$('button.ctms-btn-secondary');
      for (const btn of reviewBtns) {
        const text = await page.evaluate(el => el.textContent?.trim(), btn);
        if (text && text.includes('Review Event')) {
          await btn.scrollIntoView();
          await sleep(400);
          await shot(page, path.join(OUT_DIR, '07_safety/05_review_event_button_visible.png'),
            'Review Event button visible - hovering before click');
          // DON'T click - it does a PATCH API call and changes state
          // Instead just capture it visible
          break;
        }
      }
    }

    // Cross-trial safety signals section
    await page.evaluate(() => window.scrollTo(0, 600));
    await sleep(600);
    await shot(page, path.join(OUT_DIR, '07_safety/06_cross_trial_signals.png'),
      'Potential Cross-Trial Safety Signals section');

    // AE/SAE Registry table section
    await page.evaluate(() => window.scrollTo(0, 1100));
    await sleep(600);
    await shot(page, path.join(OUT_DIR, '07_safety/07_ae_sae_registry_table.png'),
      'AE/SAE Registry table with Report button for Under Review events');

    // Find "Report ▸" button in table (for Under Review events)
    const reportBtns = await page.$$('button.ctms-btn-secondary');
    for (const btn of reportBtns) {
      const text = await page.evaluate(el => el.textContent?.trim(), btn);
      if (text && text.includes('Report')) {
        await btn.scrollIntoView();
        await sleep(400);
        await shot(page, path.join(OUT_DIR, '07_safety/08_report_button_highlighted.png'),
          'Report ▸ button visible for Under Review SAE in registry table');
        break;
      }
    }

    await page.evaluate(() => window.scrollTo(0, 0));

    // Study filter on safety page
    const studyFilter = await page.$('select[aria-label="Filter by study"]');
    if (studyFilter) {
      await studyFilter.focus();
      await sleep(400);
      await shot(page, path.join(OUT_DIR, '07_safety/09_safety_study_filter.png'),
        'Safety AE registry - study filter select');
    }

    // Log Adverse Event modal (+ button)
    const logBtns = await page.$$('button.ctms-btn-danger');
    for (const btn of logBtns) {
      const text = await page.evaluate(el => el.textContent?.trim(), btn);
      if (text && text.includes('Log Adverse Event')) {
        await btn.click();
        await sleep(1200);
        const modal = await page.$('.ctms-modal-overlay');
        if (modal) {
          await shot(page, path.join(OUT_DIR, '07_safety/10_log_adverse_event_modal.png'),
            'Log Adverse Event modal - SAE reporting form');

          await page.evaluate(() => {
            const m = document.querySelector('.ctms-modal');
            if (m) m.scrollTop = 300;
          });
          await sleep(400);
          await shot(page, path.join(OUT_DIR, '07_safety/11_log_event_modal_scrolled.png'),
            'Log Adverse Event modal scrolled - more fields');

          await closeModal(page);
          await sleep(500);
        }
        break;
      }
    }

    // Now switch to Admin for rest
    await loginAs(page, ADMIN);

    // ================================================================
    // 2. USERS — Provision User modal and Role Access Matrix
    // ================================================================
    console.log('\n📸 Users — Provision User modal and role matrix');
    await navTo(page, '/users');

    // Role Access Matrix (always visible on page)
    await page.evaluate(() => window.scrollTo(0, 200));
    await sleep(500);
    await shot(page, path.join(OUT_DIR, '11_users/06_role_access_matrix.png'),
      'Role Access Matrix - all 7 roles with descriptions');

    await page.evaluate(() => window.scrollTo(0, 0));

    // Provision User button → modal
    const provisionBtn = await page.$('button.ctms-btn-primary');
    if (provisionBtn) {
      const text = await page.evaluate(el => el.textContent?.trim(), provisionBtn);
      console.log(`  Provision button text: "${text}"`);
      if (text && text.includes('Provision')) {
        await provisionBtn.click();
        await sleep(1200);
        const modal = await page.$('.ctms-modal-overlay');
        if (modal) {
          await shot(page, path.join(OUT_DIR, '11_users/03_provision_user_modal.png'),
            'Provision User modal - create new user form');

          // Capture role dropdown (it's a <select> element)
          const roleSelect = await modal.$('select');
          if (roleSelect) {
            // Change to show dropdown options are varied
            await roleSelect.focus();
            await sleep(400);
            await shot(page, path.join(OUT_DIR, '11_users/04_provision_role_select.png'),
              'Role selector in Provision User modal');

            // Try to open native select to show options
            await page.evaluate(() => {
              const sel = document.querySelector('.ctms-modal select');
              if (sel) { sel.size = 7; } // expand it
            });
            await sleep(400);
            await shot(page, path.join(OUT_DIR, '11_users/04_provision_role_all_options.png'),
              'Role select expanded - all 7 RBAC roles visible');
            await page.evaluate(() => {
              const sel = document.querySelector('.ctms-modal select');
              if (sel) { sel.size = 1; }
            });
          }

          await closeModal(page);
          await sleep(500);
        }
      }
    }

    // User rows in the Active Users section
    await page.evaluate(() => window.scrollTo(0, 700));
    await sleep(500);
    await shot(page, path.join(OUT_DIR, '11_users/07_users_active_list.png'),
      'Active users list with role badges');

    // ================================================================
    // 3. AUDIT — SHA-256 Verification + Eye button modal
    // ================================================================
    console.log('\n📸 Audit — hash chain verification and record detail');
    await navTo(page, '/audit');

    // Click "Verify SHA-256 Chain" button
    const verifyBtn = await page.$('button[aria-label="Verify audit chain integrity"]');
    if (verifyBtn) {
      await verifyBtn.click();
      await sleep(3000);
      await shot(page, path.join(OUT_DIR, '10_audit/06_hash_chain_verification_result.png'),
        'SHA-256 Hash Chain Verification - PASS result banner');

      // Scroll to see the result detail
      await page.evaluate(() => window.scrollTo(0, 200));
      await sleep(500);
      await shot(page, path.join(OUT_DIR, '10_audit/06b_hash_chain_result_detail.png'),
        'Hash chain verification detail - total records, records checked, PASS status');
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(300);

    // Entity filter: select SafetyEvent
    const entitySel = await page.$('select[aria-label="Filter audit entity type"]');
    if (entitySel) {
      await page.select('select[aria-label="Filter audit entity type"]', 'SafetyEvent');
      await sleep(1000);
      await shot(page, path.join(OUT_DIR, '10_audit/09_audit_safety_events_filter.png'),
        'Audit table filtered to SafetyEvent entities only');
      await page.select('select[aria-label="Filter audit entity type"]', '');
      await sleep(500);
    }

    // Click Eye button to open record detail
    const eyeBtns = await page.$$('button[aria-label="View full record"]');
    console.log(`  Eye buttons found: ${eyeBtns.length}`);
    if (eyeBtns.length > 0) {
      await eyeBtns[0].click();
      await sleep(1200);

      const modal = await page.$('.ctms-modal-overlay');
      if (modal) {
        await shot(page, path.join(OUT_DIR, '10_audit/04_audit_record_detail_modal.png'),
          'Audit record detail modal - Who/What/When + description');

        // Scroll to Before / After
        await page.evaluate(() => {
          const m = document.querySelector('.ctms-modal');
          if (m) m.scrollTop = 250;
        });
        await sleep(500);
        await shot(page, path.join(OUT_DIR, '10_audit/05_audit_before_after_diff.png'),
          'Audit Before (red) / After (green) comparison panel');

        // Scroll to hash chain values
        await page.evaluate(() => {
          const m = document.querySelector('.ctms-modal');
          if (m) m.scrollTop = 600;
        });
        await sleep(400);
        await shot(page, path.join(OUT_DIR, '10_audit/08_audit_hash_chain_values.png'),
          'Audit hash chain: record_hash + previous_hash values');

        // Close modal
        const closeBtns = await page.$$('.ctms-modal button[aria-label="Close"]');
        if (closeBtns.length > 0) {
          await closeBtns[0].click();
        } else {
          await closeModal(page);
        }
        await sleep(500);
      }
    }

    // ================================================================
    // 4. MILESTONES — View/detail button
    // ================================================================
    console.log('\n📸 Milestones — status filter and overdue');
    await navTo(page, '/milestones');

    // Status filter select
    const msSelects = await page.$$('select.ctms-select');
    if (msSelects.length > 0) {
      await msSelects[0].focus();
      await sleep(300);
      await shot(page, path.join(OUT_DIR, '06_milestones/04_milestones_filter_focused.png'),
        'Milestones status filter select focused');

      // Set to overdue if option exists
      try {
        await page.select(msSelects[0], 'Overdue');
        await sleep(1000);
        await shot(page, path.join(OUT_DIR, '06_milestones/05_milestones_overdue_only.png'),
          'Milestones filtered - Overdue only');
        await page.select(msSelects[0], '');
        await sleep(500);
      } catch(e) {
        // Try other option values
        const opts = await page.evaluate(() => {
          const sel = document.querySelector('select.ctms-select');
          return sel ? Array.from(sel.options).map(o => o.value) : [];
        });
        console.log(`  Milestone filter options: ${opts.join(', ')}`);
      }
    }

    // Find any action button in milestone rows
    const msRowBtns = await page.$$('tbody tr button');
    if (msRowBtns.length > 0) {
      await msRowBtns[0].click();
      await sleep(1200);
      const modal = await page.$('.ctms-modal-overlay');
      if (modal) {
        await shot(page, path.join(OUT_DIR, '06_milestones/03_milestone_action_modal.png'),
          'Milestone action/detail modal');
        await closeModal(page);
      }
    }

    // ================================================================
    // 5. ALERTS — Clicking alert items
    // ================================================================
    console.log('\n📸 Alerts — clicking items for detail');
    await navTo(page, '/alerts');

    // Get all alert content containers
    const alertContainers = await page.$$('[class*="border-b"], [class*="rounded-md"] [class*="px-4"]');
    let alertClicked = false;
    for (const container of alertContainers.slice(0, 20)) {
      const text = await page.evaluate(el => el.textContent?.trim() || '', container);
      const isClickable = await page.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return rect.height > 30 && rect.height < 200 && text.length > 30;
      }, container);

      if (text.length > 30 && text.length < 500) {
        await container.click();
        await sleep(1000);

        const modal = await page.$('.ctms-modal-overlay');
        if (modal) {
          await shot(page, path.join(OUT_DIR, '09_alerts/03_alert_detail_modal.png'),
            'Alert detail modal');
          await closeModal(page);
          alertClicked = true;
          break;
        }
      }
    }

    // Try a different approach: look for any buttons/links within alerts
    const alertBtns = await page.$$('button, a[class*="alert"]');
    if (!alertClicked && alertBtns.length > 0) {
      for (const btn of alertBtns.slice(0, 10)) {
        const text = await page.evaluate(el => el.textContent?.trim() || '', btn);
        if (text && text.length > 5 && text.length < 100) {
          try {
            await btn.click();
            await sleep(1000);
            const modal = await page.$('.ctms-modal-overlay');
            if (modal) {
              await shot(page, path.join(OUT_DIR, '09_alerts/03_alert_detail.png'),
                'Alert detail opened');
              await closeModal(page);
              alertClicked = true;
              break;
            }
          } catch(e) {}
        }
      }
    }

    // Just take a fresh look at alerts page with scrolled content
    await shot(page, path.join(OUT_DIR, '09_alerts/05_alerts_current_state.png'),
      'Alerts page current state after interaction');

    // ================================================================
    // 6. DASHBOARD — Detailed attention items and KPI
    // ================================================================
    console.log('\n📸 Dashboard — KPI cards and attention section');
    await navTo(page, '/dashboard');

    // Top section KPI cards
    await shot(page, path.join(OUT_DIR, '01_dashboard/04_dashboard_kpi_section.png'),
      'Dashboard KPI cards - top section');

    await page.evaluate(() => window.scrollTo(0, 350));
    await sleep(600);
    await shot(page, path.join(OUT_DIR, '01_dashboard/05_dashboard_mid_charts.png'),
      'Dashboard middle - charts and analytics section');

    await page.evaluate(() => window.scrollTo(0, 700));
    await sleep(600);
    await shot(page, path.join(OUT_DIR, '01_dashboard/06_dashboard_attention_items.png'),
      'Dashboard attention/high-risk items section');

    await page.evaluate(() => window.scrollTo(0, 1000));
    await sleep(600);
    await shot(page, path.join(OUT_DIR, '01_dashboard/07_dashboard_study_list.png'),
      'Dashboard study listing section at bottom');

    await page.evaluate(() => window.scrollTo(0, 0));

    // Hover recharts safely using page.evaluate to find it
    const rechartsBox = await page.evaluate(() => {
      const el = document.querySelector('.recharts-wrapper');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, width: r.width, height: r.height };
    });
    if (rechartsBox) {
      await page.mouse.move(rechartsBox.x, rechartsBox.y);
      await sleep(800);
      await shot(page, path.join(OUT_DIR, '01_dashboard/08_dashboard_chart_hover.png'),
        'Dashboard recharts chart hover - tooltip visible');

      // Move to different segment
      await page.mouse.move(rechartsBox.x - 30, rechartsBox.y);
      await sleep(500);
      await shot(page, path.join(OUT_DIR, '01_dashboard/09_dashboard_chart_segment2.png'),
        'Dashboard chart second segment hover');
    }

    // ================================================================
    // 7. SITES — Click to get detail
    // ================================================================
    console.log('\n📸 Sites — detail view');
    await navTo(page, '/sites');

    // Look for any clickable row or button
    const siteTableRows = await page.$$('tbody tr');
    if (siteTableRows.length > 0) {
      // Get all buttons in first row
      for (const row of siteTableRows.slice(0, 3)) {
        const rowBtns = await row.$$('button');
        for (const btn of rowBtns) {
          const text = await page.evaluate(el => el.textContent?.trim() || '', btn);
          console.log(`  Site row button: "${text}"`);
          if (text) {
            await btn.click();
            await sleep(1200);
            const modal = await page.$('.ctms-modal-overlay');
            if (modal) {
              await shot(page, path.join(OUT_DIR, '04_sites/03_site_detail_modal.png'),
                'Site detail modal');
              await closeModal(page);
            } else {
              const currentUrl = page.url();
              if (currentUrl !== `${BASE_URL}/sites`) {
                await shot(page, path.join(OUT_DIR, '04_sites/03_site_detail_page.png'),
                  `Site detail page: ${currentUrl}`);
                await navTo(page, '/sites');
              }
            }
            break;
          }
        }
      }
    }

    // ================================================================
    // 8. STUDY WORKSPACE — Tab exploration for first study
    // ================================================================
    console.log('\n📸 Study workspace tabs');

    // Get study IDs from API
    const token = await page.evaluate(() => localStorage.getItem('ctms_jwt_token'));
    if (token) {
      const studiesData = await page.evaluate(async (t) => {
        try {
          const r = await fetch('http://localhost:8000/api/v1/studies', {
            headers: { Authorization: `Bearer ${t}` }
          });
          if (!r.ok) return [];
          return r.json();
        } catch(e) { return []; }
      }, token);

      console.log(`  Studies from API: ${studiesData.length}`);

      if (studiesData.length > 0) {
        // Navigate to first study workspace
        const study = studiesData[0];
        await navTo(page, `/studies/${study.id}`);
        await shot(page, path.join(OUT_DIR, `03_study_detail/01_s${study.id}_workspace_tabs_area.png`),
          `Study ${study.id} workspace - tab navigation area`);

        // Capture all tabs
        const stabs = await page.$$('[role="tab"]');
        console.log(`  Tabs found: ${stabs.length}`);
        for (let t = 0; t < Math.min(stabs.length, 8); t++) {
          try {
            const freshTabs = await page.$$('[role="tab"]');
            if (t >= freshTabs.length) break;
            const label = await page.evaluate(el => (el.textContent || '').trim(), freshTabs[t]);
            if (!label) continue;
            await freshTabs[t].click();
            await sleep(1200);
            const safe = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20);
            await shot(page, path.join(OUT_DIR, `03_study_detail/01_s${study.id}_tab_${safe}.png`),
              `Study ${study.id} - Tab: ${label}`);
          } catch(e) { console.log(`  Tab ${t}: ${e.message}`); }
        }

        // Second study
        if (studiesData.length > 1) {
          const study2 = studiesData[1];
          await navTo(page, `/studies/${study2.id}`);
          await shot(page, path.join(OUT_DIR, `03_study_detail/02_s${study2.id}_workspace_overview.png`),
            `Study ${study2.id} - ${study2.short_title}`);

          await page.evaluate(() => window.scrollTo(0, 500));
          await sleep(500);
          await shot(page, path.join(OUT_DIR, `03_study_detail/02_s${study2.id}_risk_breakdown.png`),
            `Study ${study2.id} - risk breakdown scrolled`);
        }
      }
    }

    // ================================================================
    // 9. COMPLIANCE — structural checks and terminology
    // ================================================================
    console.log('\n📸 Compliance — extra sections');
    await navTo(page, '/compliance');

    // Scroll to find all content sections
    for (let scrollPos = 0; scrollPos <= 2000; scrollPos += 400) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollPos);
      await sleep(500);
      if (scrollPos === 1200) {
        await shot(page, path.join(OUT_DIR, '08_compliance/11_compliance_deep_scroll.png'),
          'Compliance page - deeper content');
      }
    }

    await page.evaluate(() => window.scrollTo(0, 0));

    // Click FHIR and capture mapping tables
    const compBtns = await page.$$('button');
    for (const btn of compBtns) {
      const text = await page.evaluate(el => el.textContent?.trim() || '', btn);
      if (text.toUpperCase().includes('FHIR')) {
        await btn.click();
        await sleep(2000);
        await page.evaluate(() => window.scrollTo(0, 0));
        await sleep(300);
        await shot(page, path.join(OUT_DIR, '08_compliance/03_fhir_r4_top.png'),
          'FHIR R4 preview - top of bundle viewer');

        await page.evaluate(() => window.scrollTo(0, 600));
        await sleep(400);
        await shot(page, path.join(OUT_DIR, '08_compliance/04_fhir_json_body.png'),
          'FHIR R4 JSON body - resource definitions');

        await page.evaluate(() => window.scrollTo(0, 1200));
        await sleep(400);
        await shot(page, path.join(OUT_DIR, '08_compliance/05_fhir_json_lower.png'),
          'FHIR R4 JSON lower - patient references and coding');
        break;
      }
    }

    // ================================================================
    // 10. REGULATOR — Additional captures with audit detail
    // ================================================================
    console.log('\n📸 Regulator — audit detail and hash verify');

    await page.evaluate(() => {
      localStorage.removeItem('ctms_jwt_token');
      localStorage.removeItem('ctms_user_session');
    });
    await loginAs(page, { email: 'regulator@ayush.gov.in', password: 'Password123!' });

    await navTo(page, '/audit');
    await shot(page, path.join(OUT_DIR, '12_regulator/07_regulator_audit_full.png'),
      'Audit trail as Regulator - complete view');

    // Verify hash as regulator
    const regVerifyBtn = await page.$('button[aria-label="Verify audit chain integrity"]');
    if (regVerifyBtn) {
      await regVerifyBtn.click();
      await sleep(3000);
      await shot(page, path.join(OUT_DIR, '12_regulator/09_regulator_hash_verification.png'),
        'Hash chain verification result as Regulator - proving audit integrity');
    }

    // Click eye button to see record detail as regulator
    const regEyeBtns = await page.$$('button[aria-label="View full record"]');
    if (regEyeBtns.length > 0) {
      await regEyeBtns[0].click();
      await sleep(1200);
      const modal = await page.$('.ctms-modal-overlay');
      if (modal) {
        await shot(page, path.join(OUT_DIR, '12_regulator/08_regulator_audit_record_detail.png'),
          'Audit record detail as Regulator - read-only view of who/what/when');

        await page.evaluate(() => {
          const m = document.querySelector('.ctms-modal');
          if (m) m.scrollTop = 300;
        });
        await sleep(400);
        await shot(page, path.join(OUT_DIR, '12_regulator/08b_regulator_audit_before_after.png'),
          'Audit before/after data as Regulator');

        await closeModal(page);
      }
    }

  } catch(err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
  }

  await browser.close();

  console.log('\n');
  console.log('═'.repeat(60));
  console.log(`  Third pass complete!`);
  console.log(`  Additional screenshots: ${screenshotCount}`);
  console.log('═'.repeat(60));
}

main().catch(console.error);
