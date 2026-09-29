/**
 * AIIA CTMS — Second Pass: Fill Missing Screenshots
 * 
 * Targets:
 *   1. Study detail pages (/studies/[id] via Workspace button)
 *   2. Study inline detail panel (clicking row on /studies)
 *   3. Participant consent modal & enrollment blocked banner
 *   4. Participant status update modal
 *   5. Safety SAE detail modal + review modal
 *   6. Milestone detail modal
 *   7. Alert detail modal
 *   8. Audit row detail modal (Eye button) + before/after + hash verification
 *   9. Users create modal + role dropdown
 *   10. Sidebar/nav extra states
 *   11. Dashboard chart hover
 *   12. Site detail
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const OUT_DIR = path.resolve(__dirname, '..', 'demo_ui_inventory');
const VIEWPORT = { width: 1440, height: 900 };

const ADMIN = { email: 'admin@aiia.gov.in', password: 'Password123!' };

let screenshotCount = 0;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

async function shot(page, filepath, label) {
  ensureDir(path.dirname(filepath));
  // Don't overwrite — find next available name
  let fp = filepath;
  if (fs.existsSync(fp)) {
    const ext = path.extname(filepath);
    const base = filepath.slice(0, -ext.length);
    let n = 2;
    while (fs.existsSync(`${base}_v${n}${ext}`)) n++;
    fp = `${base}_v${n}${ext}`;
  }
  await page.screenshot({ path: fp, fullPage: true });
  screenshotCount++;
  const rel = path.relative(OUT_DIR, fp).replace(/\\/g, '/');
  console.log(`  [✓] ${rel}  (${label})`);
  return rel;
}

async function loginAdmin(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(500);
  await page.evaluate((email, pwd) => {
    const e = document.querySelector('input[type="email"]');
    const p = document.querySelector('input[type="password"]');
    if (e) { e.value = email; e.dispatchEvent(new Event('input', { bubbles: true })); }
    if (p) { p.value = pwd; p.dispatchEvent(new Event('input', { bubbles: true })); }
  }, ADMIN.email, ADMIN.password);
  await sleep(200);
  await page.click('button[type="submit"]');
  try { await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }); } catch(e) {}
  await sleep(2000);
  console.log(`  Logged in, on: ${page.url()}`);
}

async function navTo(page, route) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(1500);
}

async function closeModal(page) {
  await page.keyboard.press('Escape');
  await sleep(600);
  const closeBtn = await page.$('[aria-label="Close"], button[aria-label="Close"]');
  if (closeBtn) { await closeBtn.click(); await sleep(400); }
}

async function main() {
  console.log('\n🔄 AIIA CTMS — Second Pass Screenshots\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: VIEWPORT,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  page.on('console', () => {});

  try {
    await loginAdmin(page);

    // ================================================================
    // 1. STUDY INLINE DETAIL PANEL (click row on /studies)
    // ================================================================
    console.log('\n📸 Studies — inline detail panel');
    await navTo(page, '/studies');

    // Get study rows
    const studyRowBtns = await page.$$('tbody tr.cursor-pointer');
    console.log(`  Found ${studyRowBtns.length} study rows`);

    if (studyRowBtns.length > 0) {
      // Click first study row to open inline detail
      await studyRowBtns[0].click();
      await sleep(2000);

      await shot(page, path.join(OUT_DIR, '02_studies/04_study_inline_detail_panel.png'),
        'Study inline detail panel after clicking row');

      await page.evaluate(() => window.scrollTo(0, 400));
      await sleep(600);
      await shot(page, path.join(OUT_DIR, '02_studies/05_study_inline_risk_section.png'),
        'Study inline detail - risk section');

      await page.evaluate(() => window.scrollTo(0, 800));
      await sleep(600);
      await shot(page, path.join(OUT_DIR, '02_studies/06_study_inline_bottom.png'),
        'Study inline detail - bottom section participants/safety');

      await page.evaluate(() => window.scrollTo(0, 0));

      // Look for tab-like buttons
      const tabBtns = await page.$$('[role="tab"], button[class*="Tab"]');
      if (tabBtns.length > 0) {
        for (let i = 0; i < Math.min(tabBtns.length, 6); i++) {
          const tabs = await page.$$('[role="tab"], button[class*="Tab"]');
          if (i >= tabs.length) break;
          const label = await page.evaluate(el => (el.textContent || '').trim(), tabs[i]);
          if (!label) continue;
          await tabs[i].click();
          await sleep(1000);
          const safe = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 18);
          await shot(page, path.join(OUT_DIR, `02_studies/07_study_tab_${safe}.png`), `Study tab: ${label}`);
        }
      }

      // Back to studies list to get Workspace button
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(300);
      const backBtn = await page.$('button.ctms-btn-ghost');
      if (backBtn) {
        const text = await page.evaluate(el => el.textContent, backBtn);
        if (text && text.includes('Back')) {
          await backBtn.click();
          await sleep(1200);
        }
      }
    }

    // ================================================================
    // 2. STUDY WORKSPACE PAGES (/studies/[id])
    // ================================================================
    console.log('\n📸 Study workspace pages');
    await navTo(page, '/studies');
    await sleep(500);

    // Click "Workspace" buttons
    const workspaceBtns = await page.$$('button[aria-label*="Open study workspace"]');
    console.log(`  Found ${workspaceBtns.length} workspace buttons`);

    for (let i = 0; i < Math.min(workspaceBtns.length, 5); i++) {
      const btns = await page.$$('button[aria-label*="Open study workspace"]');
      if (i >= btns.length) break;

      const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), btns[i]);
      console.log(`  Opening: ${ariaLabel}`);

      await btns[i].click();
      await sleep(2500);
      const studyUrl = page.url();
      const studyId = studyUrl.match(/\/studies\/(\d+)/)?.[1] || i + 1;
      const padded = String(i + 1).padStart(2, '0');

      await shot(page, path.join(OUT_DIR, `03_study_detail/${padded}_s${studyId}_workspace_overview.png`),
        `Study ${studyId} workspace - overview`);

      await page.evaluate(() => window.scrollTo(0, 500));
      await sleep(600);
      await shot(page, path.join(OUT_DIR, `03_study_detail/${padded}_s${studyId}_workspace_risk.png`),
        `Study ${studyId} workspace - risk section`);

      await page.evaluate(() => window.scrollTo(0, 1100));
      await sleep(600);
      await shot(page, path.join(OUT_DIR, `03_study_detail/${padded}_s${studyId}_workspace_bottom.png`),
        `Study ${studyId} workspace - bottom`);

      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(400);

      // Capture any tabs in study workspace
      const stabs = await page.$$('[role="tab"]');
      for (let t = 0; t < Math.min(stabs.length, 7); t++) {
        try {
          const tabs2 = await page.$$('[role="tab"]');
          if (t >= tabs2.length) break;
          const label = await page.evaluate(el => (el.textContent || '').trim(), tabs2[t]);
          if (!label) continue;
          await tabs2[t].click();
          await sleep(1200);
          const safe = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 18);
          await shot(page, path.join(OUT_DIR, `03_study_detail/${padded}_s${studyId}_tab_${safe}.png`),
            `Study ${studyId} tab: ${label}`);
        } catch(e) { console.log(`    Tab ${t} error: ${e.message}`); }
      }

      // Go back to studies for next
      await navTo(page, '/studies');
      await sleep(500);
    }

    // ================================================================
    // 3. PARTICIPANTS — Modals, Consent, Enrollment Blocked
    // ================================================================
    console.log('\n📸 Participants — modals and consent flow');
    await navTo(page, '/participants');

    // Capture the enrollment-blocked banner if present
    const blockedBanner = await page.$('div[class*="border-l-red"]');
    if (blockedBanner) {
      await blockedBanner.scrollIntoView();
      await sleep(400);
      await shot(page, path.join(OUT_DIR, '05_participants/04_enrollment_blocked_banner.png'),
        'Enrollment blocked banner - consent pending');
    }

    // Scroll table into view
    await page.evaluate(() => window.scrollTo(0, 300));
    await sleep(500);

    // Find "Consent" button in table (ctms-btn-warning with FileCheck icon)
    const consentBtns = await page.$$('button[aria-label*="Record consent"]');
    console.log(`  Found ${consentBtns.length} consent buttons`);
    if (consentBtns.length > 0) {
      await consentBtns[0].scrollIntoView();
      await sleep(400);
      await shot(page, path.join(OUT_DIR, '05_participants/05_participant_row_with_consent_btn.png'),
        'Participant row with Consent button visible (consent not obtained)');

      await consentBtns[0].click();
      await sleep(1000);

      // Consent modal should now be open (ctms-modal-overlay)
      const consentModal = await page.$('.ctms-modal-overlay');
      if (consentModal) {
        await shot(page, path.join(OUT_DIR, '05_participants/06_consent_modal.png'),
          'Consent recording modal - ICF workflow');

        // Scroll modal
        await page.evaluate(() => {
          const m = document.querySelector('.ctms-modal');
          if (m) m.scrollTop = 200;
        });
        await sleep(500);
        await shot(page, path.join(OUT_DIR, '05_participants/07_consent_modal_form.png'),
          'Consent modal - form fields visible');

        await closeModal(page);
        await sleep(500);
      }
    }

    // Find "Update status" buttons (ctms-btn-secondary with aria-label "Update status")
    const statusBtns = await page.$$('button[aria-label*="Update status"]');
    console.log(`  Found ${statusBtns.length} status update buttons`);
    if (statusBtns.length > 0) {
      await statusBtns[0].scrollIntoView();
      await sleep(400);
      await statusBtns[0].click();
      await sleep(1000);

      const statusModal = await page.$('.ctms-modal-overlay');
      if (statusModal) {
        await shot(page, path.join(OUT_DIR, '05_participants/08_status_transition_modal.png'),
          'Participant status transition modal');

        // Check if blocked message shows
        const modalText = await page.evaluate(() =>
          document.querySelector('.ctms-modal')?.textContent || '');
        if (modalText.toLowerCase().includes('consent') || modalText.toLowerCase().includes('block')) {
          await shot(page, path.join(OUT_DIR, '05_participants/09_enrollment_blocked_modal.png'),
            'Enrollment blocked state inside status modal - consent required');
        }

        await closeModal(page);
        await sleep(500);
      }
    }

    // Find "Screen" button (Add participant)
    const addParticipantBtns = await page.$$('button');
    for (const btn of addParticipantBtns) {
      const text = await page.evaluate(el => el.textContent?.trim(), btn);
      if (text && (text.includes('Screen') || text.includes('Add') || text.includes('Register'))) {
        await btn.click();
        await sleep(1000);
        const modal = await page.$('.ctms-modal-overlay');
        if (modal) {
          await shot(page, path.join(OUT_DIR, '05_participants/10_add_participant_modal.png'),
            'Add/Screen participant modal');
          await closeModal(page);
        }
        break;
      }
    }

    // ================================================================
    // 4. SAFETY — SAE Detail Modal + Review Modal
    // ================================================================
    console.log('\n📸 Safety — SAE detail modal and review');
    await navTo(page, '/safety');

    // The Eye/View button opens detail — find it
    const eyeBtns = await page.$$('button[aria-label*="View"], button[aria-label*="Detail"], button[aria-label*="detail"]');
    // Also try: button with Eye icon — use class or direct lookup
    const viewBtns = await page.$$('tbody tr button');
    console.log(`  Found ${viewBtns.length} action buttons in safety table`);

    // Try clicking the first row's last button (usually the view button)
    const safetyRows = await page.$$('tbody tr');
    if (safetyRows.length > 0) {
      // Click first row to see if it opens something, or find button inside
      const firstRowBtns = await safetyRows[0].$$('button');
      console.log(`  First row has ${firstRowBtns.length} buttons`);

      if (firstRowBtns.length > 0) {
        await firstRowBtns[firstRowBtns.length - 1].click(); // last button usually is "view"
        await sleep(1200);
        const modal = await page.$('.ctms-modal-overlay, [class*="modal-overlay"]');
        if (modal) {
          await shot(page, path.join(OUT_DIR, '07_safety/04_sae_detail_modal.png'),
            'SAE detail modal open');

          // Scroll modal
          await page.evaluate(() => {
            const m = document.querySelector('.ctms-modal');
            if (m) m.scrollTop = 300;
          });
          await sleep(500);
          await shot(page, path.join(OUT_DIR, '07_safety/05_sae_detail_scrolled.png'),
            'SAE detail modal scrolled - lower content');

          await page.evaluate(() => {
            const m = document.querySelector('.ctms-modal');
            if (m) m.scrollTop = 0;
          });
          await sleep(300);

          // Find Review button
          const modalBtns = await page.$$('.ctms-modal button');
          for (const btn of modalBtns) {
            const text = await page.evaluate(el => el.textContent?.trim(), btn);
            if (text && (text.includes('Review') || text.includes('Assess'))) {
              await btn.click();
              await sleep(1200);
              // Check if a second modal appeared or content changed
              await shot(page, path.join(OUT_DIR, '07_safety/06_sae_review_modal.png'),
                'SAE review modal / causality assessment');
              await closeModal(page);
              await sleep(500);
              break;
            }
          }

          await closeModal(page);
          await sleep(500);
        } else {
          // Maybe clicking row itself opens something
          await safetyRows[0].click();
          await sleep(1200);
          const modal2 = await page.$('.ctms-modal-overlay');
          if (modal2) {
            await shot(page, path.join(OUT_DIR, '07_safety/04_sae_detail_modal.png'),
              'SAE detail modal (row click)');
            await closeModal(page);
          }
        }
      }
    }

    // Safety filter
    const safetySelect = await page.$('select[aria-label*="filter"], select.ctms-select');
    if (safetySelect) {
      await safetySelect.click();
      await sleep(500);
      await shot(page, path.join(OUT_DIR, '07_safety/03_safety_filter_open_select.png'),
        'Safety filter select dropdown open');
      await page.keyboard.press('Escape');
    }

    // ================================================================
    // 5. MILESTONES — Detail Modal
    // ================================================================
    console.log('\n📸 Milestones — row detail modal');
    await navTo(page, '/milestones');

    const msRows = await page.$$('tbody tr');
    for (const row of msRows) {
      const rowBtns = await row.$$('button');
      if (rowBtns.length > 0) {
        await rowBtns[rowBtns.length - 1].click();
        await sleep(1200);
        const modal = await page.$('.ctms-modal-overlay');
        if (modal) {
          await shot(page, path.join(OUT_DIR, '06_milestones/03_milestone_detail_modal.png'),
            'Milestone detail modal');
          await closeModal(page);
          break;
        }
      }
      // Try clicking row itself
      await row.click();
      await sleep(800);
      const modal2 = await page.$('.ctms-modal-overlay');
      if (modal2) {
        await shot(page, path.join(OUT_DIR, '06_milestones/03_milestone_detail_modal.png'),
          'Milestone detail modal (row click)');
        await closeModal(page);
        break;
      }
    }

    // Milestone filter
    const msSelect = await page.$('select.ctms-select, select[aria-label*="filter"]');
    if (msSelect) {
      await msSelect.click();
      await sleep(500);
      await shot(page, path.join(OUT_DIR, '06_milestones/04_milestones_filter_select.png'),
        'Milestones status filter dropdown open');
      // Select "Overdue" option
      await page.select('select.ctms-select', 'Overdue');
      await sleep(1000);
      await shot(page, path.join(OUT_DIR, '06_milestones/05_milestones_overdue_filtered.png'),
        'Milestones filtered to Overdue only');
      // Reset
      await page.select('select.ctms-select', '');
      await sleep(500);
    }

    // ================================================================
    // 6. ALERTS — Row detail modal
    // ================================================================
    console.log('\n📸 Alerts — row click / detail');
    await navTo(page, '/alerts');

    // Try clicking rows/items
    const alertItems = await page.$$('[class*="border-b"], [class*="alert"], li, div[class*="rounded"]');
    for (const item of alertItems) {
      const text = await page.evaluate(el => el.textContent?.trim(), item);
      if (text && text.length > 30) {
        await item.click();
        await sleep(1000);
        const modal = await page.$('.ctms-modal-overlay');
        if (modal) {
          await shot(page, path.join(OUT_DIR, '09_alerts/03_alert_detail_modal.png'),
            'Alert detail modal');
          await closeModal(page);
          break;
        }
        // Maybe it expanded inline
        await shot(page, path.join(OUT_DIR, '09_alerts/03_alert_clicked_state.png'),
          'Alert clicked/expanded state');
        break;
      }
    }

    // ================================================================
    // 7. AUDIT — Eye button detail modal + hash chain verification
    // ================================================================
    console.log('\n📸 Audit — record detail modal + hash verification');
    await navTo(page, '/audit');

    // First: Click "Verify SHA-256 Chain" button (top-level button)
    const verifyBtn = await page.$('button[aria-label="Verify audit chain integrity"]');
    if (verifyBtn) {
      await verifyBtn.click();
      await sleep(3000); // Wait for API call
      await shot(page, path.join(OUT_DIR, '10_audit/06_hash_chain_verification.png'),
        'Hash chain verification result - SHA-256 PASS banner');
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(300);
    }

    // Second: Click Eye icon to open record detail modal
    const eyeIconBtns = await page.$$('button[aria-label="View full record"]');
    console.log(`  Found ${eyeIconBtns.length} Eye buttons`);
    if (eyeIconBtns.length > 0) {
      await eyeIconBtns[0].click();
      await sleep(1200);
      const modal = await page.$('.ctms-modal-overlay');
      if (modal) {
        await shot(page, path.join(OUT_DIR, '10_audit/04_audit_record_detail_modal.png'),
          'Audit record detail modal - who/what/when + hash');

        // Scroll to see Before/After
        await page.evaluate(() => {
          const m = document.querySelector('.ctms-modal');
          if (m) m.scrollTop = 200;
        });
        await sleep(500);
        await shot(page, path.join(OUT_DIR, '10_audit/05_audit_before_after_diff.png'),
          'Audit record - Before (red) / After (green) comparison + hash chain');

        // Scroll more to see full hash
        await page.evaluate(() => {
          const m = document.querySelector('.ctms-modal');
          if (m) m.scrollTop = 500;
        });
        await sleep(400);
        await shot(page, path.join(OUT_DIR, '10_audit/08_audit_hash_chain_values.png'),
          'Audit record - hash chain values (record_hash + previous_hash)');

        await closeModal(page);
        await sleep(500);
      }
    }

    // Use entity type filter (select)
    const entitySelect = await page.$('select[aria-label="Filter audit entity type"]');
    if (entitySelect) {
      // Show select options
      await entitySelect.focus();
      await shot(page, path.join(OUT_DIR, '10_audit/03_audit_entity_filter.png'),
        'Audit entity type filter select');

      // Filter for Safety events
      await page.select('select[aria-label="Filter audit entity type"]', 'SafetyEvent');
      await sleep(1200);
      await shot(page, path.join(OUT_DIR, '10_audit/09_audit_safety_events_only.png'),
        'Audit filtered to SafetyEvent records only');

      // Reset
      await page.select('select[aria-label="Filter audit entity type"]', '');
      await sleep(500);
    }

    // ================================================================
    // 8. USERS — Create modal + role dropdown
    // ================================================================
    console.log('\n📸 Users — create modal and role dropdown');
    await navTo(page, '/users');

    // Find create button
    const userBtns = await page.$$('button');
    for (const btn of userBtns) {
      const text = await page.evaluate(el => el.textContent?.trim(), btn);
      if (text && (text.includes('Create') || text.includes('Invite') || text.includes('Add User') || text.includes('New'))) {
        await btn.click();
        await sleep(1200);
        const modal = await page.$('.ctms-modal-overlay');
        if (modal) {
          await shot(page, path.join(OUT_DIR, '11_users/03_create_user_modal.png'),
            'Create user modal - all fields');

          // Open role dropdown
          const roleSelect = await modal.$('select');
          if (roleSelect) {
            await roleSelect.click();
            await sleep(500);
            // Take screenshot with dropdown visually open (use size:1 to show options)
            await shot(page, path.join(OUT_DIR, '11_users/04_user_role_dropdown_open.png'),
              'Role dropdown in create user modal');

            // Select each option to show them
            const options = await roleSelect.$$('option');
            console.log(`  Role options: ${options.length}`);
          }

          await closeModal(page);
          break;
        }
        break;
      }
    }

    // Click user row for detail
    const userRows2 = await page.$$('tbody tr');
    if (userRows2.length > 0) {
      const rowBtns = await userRows2[0].$$('button');
      if (rowBtns.length > 0) {
        await rowBtns[0].click();
        await sleep(1000);
        const modal = await page.$('.ctms-modal-overlay');
        if (modal) {
          await shot(page, path.join(OUT_DIR, '11_users/05_user_detail_modal.png'),
            'User detail/edit modal');
          await closeModal(page);
        }
      }
    }

    // ================================================================
    // 9. DASHBOARD — Chart hover + attention cards
    // ================================================================
    console.log('\n📸 Dashboard — chart tooltips and attention cards');
    await navTo(page, '/dashboard');

    // Hover recharts
    const rechartsEl = await page.$('.recharts-wrapper, .recharts-surface, [class*="recharts"]');
    if (rechartsEl) {
      await rechartsEl.hover();
      await sleep(800);
      await shot(page, path.join(OUT_DIR, '01_dashboard/04_dashboard_chart_hover.png'),
        'Dashboard recharts chart - hover state');
    }

    // Scroll to find study cards / attention section
    await page.evaluate(() => window.scrollTo(0, 600));
    await sleep(600);
    await shot(page, path.join(OUT_DIR, '01_dashboard/05_dashboard_attention_section.png'),
      'Dashboard - attention/high-risk study section');

    // Hover over a study card
    const studyLinks2 = await page.$$('[class*="hover"], a[href*="/studies"], button[class*="study"]');
    for (const el of studyLinks2) {
      await el.hover();
      await sleep(500);
      await shot(page, path.join(OUT_DIR, '01_dashboard/06_dashboard_study_hover.png'),
        'Dashboard - study card/link hover state');
      break;
    }

    await page.evaluate(() => window.scrollTo(0, 0));

    // ================================================================
    // 10. SITES — Detail click
    // ================================================================
    console.log('\n📸 Sites — site detail');
    await navTo(page, '/sites');

    // Try clicking rows/cards
    const siteBtns = await page.$$('tbody tr button, [class*="site-card"] button, tr.cursor-pointer');
    if (siteBtns.length === 0) {
      // Try all table rows
      const siteRows = await page.$$('tbody tr');
      for (const row of siteRows) {
        const rowBtns = await row.$$('button');
        if (rowBtns.length > 0) {
          await rowBtns[rowBtns.length - 1].click();
          await sleep(1200);
          const modal = await page.$('.ctms-modal-overlay');
          if (modal) {
            await shot(page, path.join(OUT_DIR, '04_sites/03_site_detail_modal.png'),
              'Site detail modal');
            await closeModal(page);
            break;
          }
        }
        await row.click();
        await sleep(1000);
        const modal2 = await page.$('.ctms-modal-overlay');
        if (modal2) {
          await shot(page, path.join(OUT_DIR, '04_sites/03_site_detail_modal.png'),
            'Site detail modal (row click)');
          await closeModal(page);
          break;
        }
      }
    }

    // ================================================================
    // 11. COMPLIANCE — Additional tabs/sections
    // ================================================================
    console.log('\n📸 Compliance — additional states');
    await navTo(page, '/compliance');

    // Scroll down more to find readiness items
    await page.evaluate(() => window.scrollTo(0, 800));
    await sleep(600);
    await shot(page, path.join(OUT_DIR, '08_compliance/11_compliance_readiness_items.png'),
      'Compliance - readiness checklist items in detail');

    await page.evaluate(() => window.scrollTo(0, 1200));
    await sleep(600);
    await shot(page, path.join(OUT_DIR, '08_compliance/12_compliance_bottom_section.png'),
      'Compliance - bottom section, download/export area');

    // ================================================================
    // 12. STUDY DETAIL — study_id from API
    // ================================================================
    console.log('\n📸 Study workspace page (direct API ID)');

    // Get study IDs from API
    const token = await page.evaluate(() => localStorage.getItem('ctms_jwt_token'));
    console.log(`  Token available: ${!!token}`);

    if (token) {
      const studiesData = await page.evaluate(async (t) => {
        const r = await fetch('http://localhost:8000/api/v1/studies', {
          headers: { Authorization: `Bearer ${t}` }
        });
        if (!r.ok) return null;
        return r.json();
      }, token);

      console.log(`  Studies from API: ${studiesData ? studiesData.length : 'null'}`);

      if (studiesData && studiesData.length > 0) {
        for (let i = 0; i < Math.min(studiesData.length, 5); i++) {
          const study = studiesData[i];
          const padded = String(i + 1).padStart(2, '0');
          console.log(`  Study ${study.id}: ${study.short_title || study.title}`);

          await navTo(page, `/studies/${study.id}`);
          await shot(page, path.join(OUT_DIR, `03_study_detail/${padded}_s${study.id}_overview.png`),
            `Study ${study.id} - ${study.short_title}`);

          await page.evaluate(() => window.scrollTo(0, 500));
          await sleep(600);
          await shot(page, path.join(OUT_DIR, `03_study_detail/${padded}_s${study.id}_risk_section.png`),
            `Study ${study.id} - risk section`);

          await page.evaluate(() => window.scrollTo(0, 1100));
          await sleep(600);
          await shot(page, path.join(OUT_DIR, `03_study_detail/${padded}_s${study.id}_bottom.png`),
            `Study ${study.id} - bottom section`);

          await page.evaluate(() => window.scrollTo(0, 0));

          // Tabs
          const studyTabs = await page.$$('[role="tab"]');
          for (let t = 0; t < Math.min(studyTabs.length, 7); t++) {
            try {
              const stabs2 = await page.$$('[role="tab"]');
              if (t >= stabs2.length) break;
              const label = await page.evaluate(el => (el.textContent || '').trim(), stabs2[t]);
              if (!label) continue;
              await stabs2[t].click();
              await sleep(1200);
              const safe = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 18);
              await shot(page, path.join(OUT_DIR, `03_study_detail/${padded}_s${study.id}_tab_${safe}.png`),
                `Study ${study.id} tab: ${label}`);
            } catch(e) { console.log(`    Tab error: ${e.message}`); }
          }
        }
      }
    }

    // ================================================================
    // 13. FINAL — sidebar and nav states
    // ================================================================
    console.log('\n📸 Final nav captures');
    await navTo(page, '/dashboard');

    // Full page with sidebar highlighted
    await shot(page, path.join(OUT_DIR, '13_other/10_sidebar_navigation_admin.png'),
      'Dashboard with sidebar - all admin nav items visible');

    // Get dashboard stats section
    await page.evaluate(() => window.scrollTo(0, 200));
    await sleep(500);
    await shot(page, path.join(OUT_DIR, '01_dashboard/07_dashboard_kpi_cards.png'),
      'Dashboard KPI cards section');

    await page.evaluate(() => window.scrollTo(0, 0));

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
  }

  await browser.close();

  console.log('\n');
  console.log('═'.repeat(60));
  console.log(`  Second pass complete!`);
  console.log(`  Additional screenshots: ${screenshotCount}`);
  console.log(`  Output: ${OUT_DIR}`);
  console.log('═'.repeat(60));
}

main().catch(console.error);
