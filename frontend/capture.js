/**
 * AIIA CTMS - Comprehensive UI Screenshot Capture Script
 * Targets localhost:3000 (Next.js) + localhost:8000 (FastAPI backend)
 * All credentials from seed.py — password: Password123!
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:8000';
const OUT_DIR = path.resolve(__dirname, '..', 'demo_ui_inventory');
const VIEWPORT = { width: 1440, height: 900 };

const USERS = {
  admin:       { email: 'admin@aiia.gov.in',         password: 'Password123!', role: 'Administrator' },
  pi:          { email: 'pi@aiia.gov.in',             password: 'Password123!', role: 'Principal Investigator' },
  coordinator: { email: 'coordinator@aiia.gov.in',    password: 'Password123!', role: 'Study Coordinator' },
  pv:          { email: 'pv@aiia.gov.in',             password: 'Password123!', role: 'Pharmacovigilance User' },
  ethics:      { email: 'ethics@aiia.gov.in',         password: 'Password123!', role: 'Ethics Committee Member' },
  regulator:   { email: 'regulator@ayush.gov.in',     password: 'Password123!', role: 'Regulator / Read-only User' },
  monitor:     { email: 'monitor@cro.org',            password: 'Password123!', role: 'Clinical Trial Monitor' },
};

// Track inventory
const inventoryEntries = [];
let screenshotCount = 0;
let interactiveStates = 0;
const discoveredRoutes = new Set();

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function shot(page, filepath, meta) {
  ensureDir(path.dirname(filepath));
  // Don't overwrite
  let finalPath = filepath;
  let counter = 1;
  while (fs.existsSync(finalPath)) {
    const ext = path.extname(filepath);
    const base = filepath.slice(0, -ext.length);
    finalPath = `${base}_${counter}${ext}`;
    counter++;
  }
  await page.screenshot({ path: finalPath, fullPage: true });
  screenshotCount++;
  const rel = path.relative(OUT_DIR, finalPath).replace(/\\/g, '/');
  inventoryEntries.push({ filename: rel, ...meta });
  console.log(`  [✓] ${rel}`);
  return finalPath;
}

async function scrollShot(page, filepath, meta, scrollY) {
  await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await sleep(700);
  return shot(page, filepath, meta);
}

// Inject JWT token directly into localStorage to avoid form automation issues
async function injectAuth(page, user) {
  // First get a token from the API
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/login/json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password }),
    });
    if (!response.ok) throw new Error(`Login failed: ${response.status}`);
    return await response.json();
  } catch(e) {
    console.log(`  [!] API fetch failed for ${user.email}:`, e.message);
    return null;
  }
}

async function loginViaUI(page, user) {
  console.log(`  Logging in as ${user.role} (${user.email})...`);
  
  // Clear existing session
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(500);
  
  await page.evaluate(() => {
    localStorage.removeItem('ctms_jwt_token');
    localStorage.removeItem('ctms_user_session');
  });
  
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(800);
  
  // Fill email
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.evaluate((email) => {
    const input = document.querySelector('input[type="email"]');
    if (input) {
      input.value = email;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, user.email);
  
  // Fill password
  await page.evaluate((pwd) => {
    const input = document.querySelector('input[type="password"]');
    if (input) {
      input.value = pwd;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, user.password);
  
  await sleep(300);
  
  // Submit
  await page.click('button[type="submit"]');
  
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
  } catch(e) {}
  
  await sleep(2000);
  const url = page.url();
  console.log(`  Landed on: ${url}`);
  return url;
}

async function logoutViaUI(page) {
  // Use localStorage clear approach (matches AuthContext.logout)
  await page.evaluate(() => {
    localStorage.removeItem('ctms_jwt_token');
    localStorage.removeItem('ctms_user_session');
  });
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(500);
}

async function navTo(page, route) {
  const url = `${BASE_URL}${route}`;
  discoveredRoutes.add(route);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(1500);
  return page.url();
}

async function tryOpenModal(page, selectors) {
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        const visible = await page.evaluate(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }, el);
        if (visible) {
          await el.click();
          await sleep(1200);
          const modal = await page.$('[role="dialog"], [class*="modal"], [class*="Modal"], [class*="overlay"]');
          if (modal) return true;
        }
      }
    } catch(e) {}
  }
  return false;
}

async function closeModal(page) {
  // Try ESC first
  await page.keyboard.press('Escape');
  await sleep(600);
  // Try close button
  const closeBtn = await page.$('[aria-label="Close"], button[class*="close"], .modal-close, button:has(svg[class*="X"])');
  if (closeBtn) {
    await closeBtn.click();
    await sleep(500);
  }
}

async function clickRowAndCheckModal(page, rowSelector) {
  const rows = await page.$$(rowSelector);
  if (rows.length === 0) return false;
  await rows[0].click();
  await sleep(1200);
  const modal = await page.$('[role="dialog"]');
  return !!modal;
}

async function main() {
  console.log('\n🚀 AIIA CTMS - UI Screenshot Capture\n');
  console.log(`Output: ${OUT_DIR}\n`);

  ensureDir(OUT_DIR);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: VIEWPORT,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1440,900',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // Suppress console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      // suppress
    }
  });

  const dir = (name) => path.join(OUT_DIR, name);

  try {
    // ===================================================================
    // 00 - LOGIN
    // ===================================================================
    console.log('\n📸 00 — LOGIN PAGE');

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(1500);
    discoveredRoutes.add('/login');

    await shot(page, dir('00_login/01_login_page.png'), {
      page: '/login',
      state: 'Login page - default state (PI preset selected)',
      howReached: 'Navigate to http://localhost:3000/login',
      elements: ['AIIA CTMS logo/branding', 'Email field (pre-filled with pi@aiia.gov.in)', 'Password field', 'Sign In button', 'Demo Credentials Quick-Fill grid (7 role presets)', 'RBAC disclaimer', 'NPvCC / Ministry of Ayush badge'],
      demoValue: 'Show the secure login gate with role-based demo accounts',
      interactions: ['Click role preset to auto-fill email', 'Enter password', 'Click Sign In'],
      role: 'All roles',
      notes: 'Login shows 7 demo role presets; password is same for all'
    });

    // Click "Admin" preset button
    const presetBtns = await page.$$('button[type="button"]');
    if (presetBtns.length > 0) {
      // Find and click admin preset
      for (const btn of presetBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes('Admin')) {
          await btn.click();
          await sleep(400);
          break;
        }
      }
      await shot(page, dir('00_login/02_login_admin_preset_selected.png'), {
        page: '/login',
        state: 'Admin preset selected — email auto-filled',
        howReached: 'Click "Admin" quick-fill button',
        elements: ['Email field filled with admin@aiia.gov.in', 'Admin preset button highlighted with checkmark', 'Password still filled'],
        demoValue: 'Show role-based demo credential quick-fill feature',
        interactions: ['Click Sign In to authenticate as Admin'],
        role: 'All roles (login page)',
        notes: 'All 7 roles visible as preset buttons in 2-column grid'
      });
      interactiveStates++;
    }

    // Click "Regulator" preset button to show it
    for (const btn of presetBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Regulator') || text.includes('Read-Only'))) {
        await btn.click();
        await sleep(400);
        break;
      }
    }
    await shot(page, dir('00_login/03_login_regulator_preset.png'), {
      page: '/login',
      state: 'Regulator preset selected',
      howReached: 'Click "Regulator (Read-Only)" quick-fill button',
      elements: ['Regulator email auto-filled', 'Regulator preset highlighted', 'Amber/gold styling indicating read-only role'],
      demoValue: 'Show regulatory oversight login access',
      interactions: ['Sign in to access read-only regulatory view'],
      role: 'All roles (login page)',
      notes: 'Regulator role has amber styling to distinguish read-only access'
    });

    // Show error state by typing wrong password
    await page.evaluate(() => {
      const pwd = document.querySelector('input[type="password"]');
      if (pwd) { pwd.value = 'wrong'; pwd.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.click('button[type="submit"]');
    await sleep(2000);
    await shot(page, dir('00_login/04_login_auth_error.png'), {
      page: '/login',
      state: 'Authentication error state',
      howReached: 'Enter wrong password and click Sign In',
      elements: ['Red error banner', 'Authentication Error message', 'Error description'],
      demoValue: 'Show secure authentication with clear error feedback',
      interactions: ['Correct credentials and retry'],
      role: 'All roles',
      notes: 'Shows proper error handling for invalid credentials'
    });
    interactiveStates++;

    // ===================================================================
    // LOGIN as Admin
    // ===================================================================
    await loginViaUI(page, USERS.admin);

    // ===================================================================
    // 01 - DASHBOARD
    // ===================================================================
    console.log('\n📸 01 — DASHBOARD');

    await navTo(page, '/dashboard');

    await shot(page, dir('01_dashboard/01_full.png'), {
      page: '/dashboard',
      state: 'Dashboard full view — Admin role',
      howReached: 'Login as admin → redirect to /dashboard',
      elements: ['Navigation sidebar (all pages)', 'AIIA CTMS header', 'Study risk summary cards', 'Enrollment progress bars', 'Alert/notification count', 'Study portfolio overview'],
      demoValue: 'Main command center — real-time overview of entire trial portfolio',
      interactions: ['Click study card to drill down', 'Click alerts to view', 'Click nav items'],
      role: 'Administrator',
      notes: 'First page after login; shows aggregate risk view'
    });

    await page.evaluate(() => window.scrollTo(0, 500));
    await sleep(700);
    await shot(page, dir('01_dashboard/02_dashboard_risk_distribution.png'), {
      page: '/dashboard',
      state: 'Dashboard scrolled — risk distribution / charts',
      howReached: 'Scroll down on dashboard',
      elements: ['Risk distribution chart (Recharts)', 'Enrollment analytics', 'Study phase breakdown', 'High/Medium/Low risk categorization'],
      demoValue: 'Visual risk intelligence — portfolio health at a glance',
      interactions: ['Hover chart segments for tooltips', 'Click chart to drill down'],
      role: 'Administrator',
      notes: ''
    });

    await page.evaluate(() => window.scrollTo(0, 1100));
    await sleep(700);
    await shot(page, dir('01_dashboard/03_dashboard_bottom.png'), {
      page: '/dashboard',
      state: 'Dashboard bottom — attention items / recent activity',
      howReached: 'Scroll to bottom of dashboard',
      elements: ['High-attention studies section', 'Recent alerts list', 'Quick action buttons', 'Upcoming milestones'],
      demoValue: 'Show action-required items and upcoming deadlines at bottom of command center',
      interactions: ['Click attention items to navigate', 'View alerts'],
      role: 'Administrator',
      notes: ''
    });

    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);

    // Hover over chart or risk elements
    const chartEl = await page.$('[class*="recharts"], [class*="chart"], canvas');
    if (chartEl) {
      await chartEl.hover();
      await sleep(800);
      await shot(page, dir('01_dashboard/04_dashboard_chart_tooltip.png'), {
        page: '/dashboard',
        state: 'Dashboard chart — hover tooltip visible',
        howReached: 'Hover over risk distribution chart',
        elements: ['Chart tooltip with data values', 'Highlighted chart segment'],
        demoValue: 'Interactive risk chart with drill-down data on hover',
        interactions: ['Move mouse over different segments'],
        role: 'Administrator',
        notes: ''
      });
      interactiveStates++;
    }

    // Try clicking on a study card / attention item
    const studyCards = await page.$$('a[href*="/studies/"], [class*="study-card"], [class*="StudyCard"]');
    if (studyCards.length > 0) {
      const firstCard = studyCards[0];
      await firstCard.hover();
      await sleep(500);
      await shot(page, dir('01_dashboard/05_dashboard_study_card_hover.png'), {
        page: '/dashboard',
        state: 'Study card hover state',
        howReached: 'Hover over first study card on dashboard',
        elements: ['Study title', 'Risk score badge', 'Hover highlight', 'Arrow indicator'],
        demoValue: 'Interactive study card — click to drill into study command center',
        interactions: ['Click to open study detail'],
        role: 'Administrator',
        notes: ''
      });
      interactiveStates++;
    }

    // ===================================================================
    // 02 - STUDIES
    // ===================================================================
    console.log('\n📸 02 — STUDIES');

    await navTo(page, '/studies');

    await shot(page, dir('02_studies/01_studies_list.png'), {
      page: '/studies',
      state: 'Studies list — all studies',
      howReached: 'Click Studies in sidebar navigation',
      elements: ['Study cards/rows for all 5 seeded studies', 'Protocol numbers (AYU-CT-2025-XXX)', 'Status badges (Recruiting, Active, Completed, etc.)', 'Risk scores', 'PI names', 'Enrollment progress (current/target)', 'Phase labels'],
      demoValue: 'Portfolio view of all clinical trials with real-time status',
      interactions: ['Click study to view detail', 'Search/filter studies', 'Sort by column'],
      role: 'Administrator',
      notes: 'Shows all seeded studies: Ashwagandha, Curcumin, AYUSH-64, Triphala, Brahmi'
    });

    await page.evaluate(() => window.scrollTo(0, 500));
    await sleep(700);
    await shot(page, dir('02_studies/02_studies_lower.png'), {
      page: '/studies',
      state: 'Studies list — lower studies (scrolled)',
      howReached: 'Scroll down on studies page',
      elements: ['Additional study cards', 'Varying phases and statuses', 'Different risk levels'],
      demoValue: 'Full portfolio breadth — multiple Ayurvedic trials',
      interactions: [],
      role: 'Administrator',
      notes: ''
    });

    await page.evaluate(() => window.scrollTo(0, 0));

    // Try search
    const searchInput = await page.$('input[placeholder*="earch"], input[type="search"]');
    if (searchInput) {
      await searchInput.click();
      await searchInput.type('Ashwagandha', { delay: 80 });
      await sleep(1200);
      await shot(page, dir('02_studies/03_studies_search_ashwagandha.png'), {
        page: '/studies',
        state: 'Studies search — filtered for "Ashwagandha"',
        howReached: 'Type "Ashwagandha" in search box',
        elements: ['Filtered study result', 'Search term active', 'Ashwagandha Chronic Fatigue Trial visible'],
        demoValue: 'Live search/filter across study portfolio',
        interactions: ['Clear search to restore all', 'Click study to view detail'],
        role: 'Administrator',
        notes: ''
      });
      interactiveStates++;
      // Clear
      await searchInput.click({ clickCount: 3 });
      await page.keyboard.press('Delete');
      await sleep(800);
    }

    // Get study IDs from DOM
    const studyLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/studies/"]'));
      return [...new Set(anchors.map(a => {
        const m = a.href.match(/\/studies\/(\d+)/);
        return m ? m[1] : null;
      }).filter(Boolean))];
    });
    console.log(`  Study IDs found: [${studyLinks.join(', ')}]`);

    // ===================================================================
    // 03 - STUDY DETAIL
    // ===================================================================
    console.log('\n📸 03 — STUDY DETAIL');

    // Capture all available studies
    for (let i = 0; i < Math.min(studyLinks.length, 5); i++) {
      const sid = studyLinks[i];
      const padded = String(i + 1).padStart(2, '0');
      console.log(`  Study ID ${sid}...`);

      await navTo(page, `/studies/${sid}`);

      await shot(page, dir(`03_study_detail/${padded}_s${sid}_overview.png`), {
        page: `/studies/${sid}`,
        state: `Study ${sid} — overview/top`,
        howReached: `Click study ${sid} from list or navigate directly`,
        elements: ['Protocol number', 'Full title', 'Short title', 'Phase badge', 'Status badge', 'Sponsor', 'PI name', 'Enrollment current/target with progress bar', 'Overall risk score', 'Site count'],
        demoValue: 'Study command center — single study at a glance',
        interactions: ['Click tabs to see details', 'View risk breakdown'],
        role: 'Administrator',
        notes: ''
      });

      await page.evaluate(() => window.scrollTo(0, 500));
      await sleep(700);
      await shot(page, dir(`03_study_detail/${padded}_s${sid}_risk_section.png`), {
        page: `/studies/${sid}`,
        state: `Study ${sid} — risk section (scrolled)`,
        howReached: 'Scroll down on study detail',
        elements: ['Risk score breakdown', 'Risk factors listed', 'Protocol deviations count', 'Open queries count', 'Risk composition chart'],
        demoValue: 'Risk intelligence: drill into what drives study risk score',
        interactions: ['Expand risk factors', 'View recommendations'],
        role: 'Administrator',
        notes: ''
      });

      await page.evaluate(() => window.scrollTo(0, 1100));
      await sleep(700);
      await shot(page, dir(`03_study_detail/${padded}_s${sid}_bottom.png`), {
        page: `/studies/${sid}`,
        state: `Study ${sid} — bottom section`,
        howReached: 'Scroll to bottom of study detail',
        elements: ['Participants section', 'Safety events table', 'Sites list', 'Milestones', 'Audit shortcut link'],
        demoValue: 'Complete study detail — participants, safety, sites and audit in one place',
        interactions: ['Click participant rows', 'Click safety events', 'Click Audit link'],
        role: 'Administrator',
        notes: ''
      });

      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(500);

      // Discover tabs
      const tabEls = await page.$$('[role="tab"], button[class*="Tab"], nav[class*="tab"] button');
      if (tabEls.length > 0) {
        console.log(`    ${tabEls.length} tabs found`);
        for (let t = 0; t < Math.min(tabEls.length, 8); t++) {
          try {
            const tabs = await page.$$('[role="tab"], button[class*="Tab"], nav[class*="tab"] button');
            if (t >= tabs.length) break;
            const tabLabel = await page.evaluate(el => (el.textContent || el.innerText || '').trim(), tabs[t]);
            if (!tabLabel) continue;

            await tabs[t].click();
            await sleep(1200);

            const safeLabel = tabLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 18);
            await shot(page, dir(`03_study_detail/${padded}_s${sid}_tab_${safeLabel}.png`), {
              page: `/studies/${sid}`,
              state: `Study ${sid} — Tab: ${tabLabel}`,
              howReached: `Click "${tabLabel}" tab on study detail page`,
              elements: [`${tabLabel} content area`],
              demoValue: `Study ${tabLabel} section`,
              interactions: ['Interact with section content'],
              role: 'Administrator',
              notes: ''
            });
            interactiveStates++;
          } catch(e) {
            console.log(`    Tab ${t} error: ${e.message}`);
          }
        }
      }

      // For first 2 studies: try expanding sections
      if (i < 2) {
        await page.evaluate(() => window.scrollTo(0, 0));

        // Try to find expandable accordion items
        const expandBtns = await page.$$('[aria-expanded="false"], details:not([open]) summary, button[class*="accordion"], button[class*="expand"]');
        for (const btn of expandBtns.slice(0, 2)) {
          try {
            await btn.click();
            await sleep(700);
            await shot(page, dir(`03_study_detail/${padded}_s${sid}_expanded.png`), {
              page: `/studies/${sid}`,
              state: `Study ${sid} — expanded section`,
              howReached: 'Click expand/accordion button',
              elements: ['Expanded content', 'Risk factor details', 'Sub-metrics'],
              demoValue: 'Drill-down into risk factor explanations',
              interactions: ['Collapse section'],
              role: 'Administrator',
              notes: ''
            });
            interactiveStates++;
            break;
          } catch(e) {}
        }
      }
    }

    // ===================================================================
    // 04 - SITES
    // ===================================================================
    console.log('\n📸 04 — SITES');

    await navTo(page, '/sites');

    await shot(page, dir('04_sites/01_sites_full.png'), {
      page: '/sites',
      state: 'Sites list — all clinical trial sites',
      howReached: 'Click Sites in sidebar',
      elements: ['Site cards/table', 'Site names (AIIA Delhi, ITRA Jamnagar, etc.)', 'Location/city', 'PI assigned', 'Active participant count', 'Study assignments', 'Status'],
      demoValue: 'Multi-site geographic distribution of Ayurvedic clinical trials',
      interactions: ['Click site for detail', 'Filter by city/status'],
      role: 'Administrator',
      notes: ''
    });

    await page.evaluate(() => window.scrollTo(0, 500));
    await sleep(700);
    await shot(page, dir('04_sites/02_sites_scrolled.png'), {
      page: '/sites',
      state: 'Sites page scrolled',
      howReached: 'Scroll down',
      elements: ['Additional sites', 'Site capacity indicators'],
      demoValue: 'Show full site network',
      interactions: [],
      role: 'Administrator',
      notes: ''
    });

    await page.evaluate(() => window.scrollTo(0, 0));

    // Try clicking on first site
    const siteLinks2 = await page.$$('a[href*="/sites/"], tr[class*="cursor"], [class*="site-card"], [class*="SiteCard"]');
    if (siteLinks2.length > 0) {
      await siteLinks2[0].click();
      await sleep(1500);
      const siteUrl = page.url();
      if (siteUrl !== `${BASE_URL}/sites`) {
        discoveredRoutes.add(siteUrl.replace(BASE_URL, ''));
        await shot(page, dir('04_sites/03_site_detail.png'), {
          page: siteUrl.replace(BASE_URL, ''),
          state: 'Site detail page',
          howReached: 'Click first site from list',
          elements: ['Site name', 'PI', 'Location', 'Assigned studies', 'Participant count at site', 'Contact info'],
          demoValue: 'Individual site management view',
          interactions: ['View participants', 'Navigate back'],
          role: 'Administrator',
          notes: ''
        });
      } else {
        // Maybe a modal opened
        const modal = await page.$('[role="dialog"]');
        if (modal) {
          await shot(page, dir('04_sites/03_site_detail_modal.png'), {
            page: '/sites',
            state: 'Site detail modal',
            howReached: 'Click site row',
            elements: ['Site details in modal'],
            demoValue: 'Quick site detail view',
            interactions: ['Close modal'],
            role: 'Administrator',
            notes: ''
          });
          interactiveStates++;
          await closeModal(page);
        }
      }
    }

    // ===================================================================
    // 05 - PARTICIPANTS
    // ===================================================================
    console.log('\n📸 05 — PARTICIPANTS');

    await navTo(page, '/participants');

    await shot(page, dir('05_participants/01_registry.png'), {
      page: '/participants',
      state: 'Participant registry — full list',
      howReached: 'Click Participants in sidebar',
      elements: ['Participant table with ID', 'Name (anonymized)', 'Study assignment', 'Site', 'Status (Enrolled, Screening, Withdrawn, etc.)', 'Consent status', 'Enrollment date', 'Actions'],
      demoValue: 'Central participant registry across all trials',
      interactions: ['Click participant for detail', 'Filter by study/status', 'Search by ID'],
      role: 'Administrator, Study Coordinator',
      notes: ''
    });

    await page.evaluate(() => window.scrollTo(0, 500));
    await sleep(700);
    await shot(page, dir('05_participants/02_participants_scrolled.png'), {
      page: '/participants',
      state: 'Participants list scrolled — more entries',
      howReached: 'Scroll down',
      elements: ['Additional participants', 'Various statuses visible', 'Different consent states'],
      demoValue: 'Show scale and variety of participant registry',
      interactions: [],
      role: 'Administrator',
      notes: ''
    });

    await page.evaluate(() => window.scrollTo(0, 0));

    // Filter dropdowns
    const selects = await page.$$('select, [role="combobox"]');
    if (selects.length > 0) {
      await selects[0].click();
      await sleep(600);
      await shot(page, dir('05_participants/03_filter_dropdown_open.png'), {
        page: '/participants',
        state: 'Participants filter dropdown open',
        howReached: 'Click first filter dropdown',
        elements: ['Filter options visible', 'Status options', 'Study options'],
        demoValue: 'Filter participants by study/status',
        interactions: ['Select filter option'],
        role: 'Administrator',
        notes: ''
      });
      interactiveStates++;
      await page.keyboard.press('Escape');
      await sleep(400);
    }

    // Try clicking a row
    const rows = await page.$$('tbody tr, [class*="participant"], tr[class*="cursor-pointer"]');
    if (rows.length > 0) {
      // Find a row that might have blocked/screening status
      let clickedRow = false;

      for (const row of rows.slice(0, 10)) {
        const text = await page.evaluate(el => el.textContent, row);
        if (text && (text.includes('Screening') || text.includes('Pending') || text.includes('Block'))) {
          await row.click();
          await sleep(1200);
          clickedRow = true;
          break;
        }
      }

      if (!clickedRow) {
        await rows[0].click();
        await sleep(1200);
        clickedRow = true;
      }

      const modal = await page.$('[role="dialog"]');
      if (modal) {
        await shot(page, dir('05_participants/04_participant_detail_modal.png'), {
          page: '/participants',
          state: 'Participant detail modal open',
          howReached: 'Click participant row',
          elements: ['Participant ID', 'Full name', 'Study & site', 'Status badge', 'Consent status', 'Enrollment date', 'Demographics', 'Action buttons'],
          demoValue: 'Individual participant detail — consent and enrollment workflow entry',
          interactions: ['Record consent', 'Change status', 'View history', 'Close'],
          role: 'Administrator, Study Coordinator',
          notes: ''
        });
        interactiveStates++;

        // Look for enrollment blocked indicator
        const modalText = await page.evaluate(() => document.querySelector('[role="dialog"]')?.textContent || '');
        if (modalText.toLowerCase().includes('consent') && (modalText.toLowerCase().includes('required') || modalText.toLowerCase().includes('missing') || modalText.toLowerCase().includes('pending'))) {
          await shot(page, dir('05_participants/05_enrollment_blocked_state.png'), {
            page: '/participants',
            state: 'Participant detail — enrollment blocked (consent required)',
            howReached: 'Open participant without complete consent',
            elements: ['Consent required indicator', 'Blocked enrollment status', 'Required action message'],
            demoValue: 'CRITICAL DEMO: Enrollment gate — consent must be recorded before enrollment',
            interactions: ['Record consent to unblock'],
            role: 'Administrator, Study Coordinator',
            notes: 'Key demo moment showing safety gate'
          });
        }

        // Try to find consent button
        const consentBtn = await modal.$('button');
        const allBtns = await modal.$$('button');
        for (const btn of allBtns) {
          const btnText = await page.evaluate(el => el.textContent, btn);
          if (btnText && (btnText.includes('Consent') || btnText.includes('Record') || btnText.includes('Enroll'))) {
            await btn.click();
            await sleep(1000);
            const nestedModal = await page.$('[role="dialog"] [role="dialog"], [class*="consent"]');
            if (nestedModal || await page.$('[class*="modal"][class*="consent"]')) {
              await shot(page, dir('05_participants/06_consent_workflow_modal.png'), {
                page: '/participants',
                state: 'Consent recording modal',
                howReached: 'Click Record Consent in participant detail',
                elements: ['Consent date picker', 'Witness field', 'Consent type', 'Submit button', 'Cancel button'],
                demoValue: 'KEY DEMO: Recording informed consent — prerequisite to enrollment',
                interactions: ['Fill consent date', 'Add witness', 'Submit (do not submit in live demo)'],
                role: 'Study Coordinator, Administrator',
                notes: 'Do NOT submit during recording to avoid creating real records'
              });
              interactiveStates++;
              await closeModal(page);
            }
            break;
          }
        }

        await closeModal(page);
        await sleep(500);
      }
    }

    // Try to find enroll button anywhere on page
    const allPageBtns = await page.$$('button');
    for (const btn of allPageBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Enroll') && !text.includes('ment')) {
        await btn.click();
        await sleep(1000);
        const modal = await page.$('[role="dialog"]');
        if (modal) {
          await shot(page, dir('05_participants/07_enroll_dialog.png'), {
            page: '/participants',
            state: 'Enrollment action dialog',
            howReached: 'Click Enroll button',
            elements: ['Enrollment form', 'Study selector', 'Site selector', 'Eligibility check', 'Submit'],
            demoValue: 'Enrollment workflow — assign participant to study after consent',
            interactions: ['Select study', 'Confirm eligibility', 'Submit'],
            role: 'Study Coordinator, Administrator',
            notes: ''
          });
          interactiveStates++;
          await closeModal(page);
        }
        break;
      }
    }

    // ===================================================================
    // 06 - MILESTONES
    // ===================================================================
    console.log('\n📸 06 — MILESTONES');

    await navTo(page, '/milestones');

    await shot(page, dir('06_milestones/01_milestones_full.png'), {
      page: '/milestones',
      state: 'Milestones list — all milestones',
      howReached: 'Click Milestones in sidebar',
      elements: ['Milestone table', 'Milestone name', 'Study association', 'Due date', 'Status (On Track, At Risk, Overdue, Completed)', 'Priority', 'Site'],
      demoValue: 'Compliance timeline — milestones gate regulatory submission',
      interactions: ['Filter by status/study', 'Click milestone for detail', 'View overdue'],
      role: 'Administrator, Study Coordinator',
      notes: ''
    });

    await page.evaluate(() => window.scrollTo(0, 500));
    await sleep(700);
    await shot(page, dir('06_milestones/02_milestones_scrolled.png'), {
      page: '/milestones',
      state: 'Milestones scrolled — more entries',
      howReached: 'Scroll down milestones list',
      elements: ['Additional milestones', 'Overdue items (red)', 'Completed items (green)'],
      demoValue: 'Show full milestone timeline with varied statuses',
      interactions: [],
      role: 'Administrator',
      notes: ''
    });

    await page.evaluate(() => window.scrollTo(0, 0));

    // Try row click
    const milestoneRows = await page.$$('tbody tr, [class*="milestone"]');
    if (milestoneRows.length > 0) {
      // Find overdue one first
      let clicked = false;
      for (const row of milestoneRows) {
        const text = await page.evaluate(el => el.textContent, row);
        if (text && (text.includes('Overdue') || text.includes('At Risk'))) {
          await row.click();
          await sleep(1200);
          clicked = true;
          break;
        }
      }
      if (!clicked) {
        await milestoneRows[0].click();
        await sleep(1200);
      }

      const modal = await page.$('[role="dialog"]');
      if (modal) {
        await shot(page, dir('06_milestones/03_milestone_detail.png'), {
          page: '/milestones',
          state: 'Milestone detail modal',
          howReached: 'Click milestone row',
          elements: ['Milestone name', 'Study', 'Due date', 'Status', 'Description', 'Completion date if done', 'Action buttons'],
          demoValue: 'Milestone management — compliance gate with action tracking',
          interactions: ['Update status', 'Add comment', 'Mark complete', 'Close'],
          role: 'Administrator, Study Coordinator',
          notes: ''
        });
        interactiveStates++;
        await closeModal(page);
      }
    }

    // Filter for overdue
    const filterBtns = await page.$$('button, select, [role="combobox"]');
    for (const btn of filterBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Overdue') || text.includes('Filter') || text.includes('Status'))) {
        await btn.click();
        await sleep(700);
        const dd = await page.$('[role="listbox"], [role="menu"], [class*="dropdown"]');
        if (dd) {
          await shot(page, dir('06_milestones/04_milestones_filter_open.png'), {
            page: '/milestones',
            state: 'Milestones filter dropdown open',
            howReached: 'Click filter button on milestones',
            elements: ['Status options', 'Overdue option', 'At Risk option', 'Completed option'],
            demoValue: 'Filter milestones by status to find compliance issues',
            interactions: ['Select Overdue to show only at-risk items'],
            role: 'Administrator',
            notes: ''
          });
          interactiveStates++;
          await page.keyboard.press('Escape');
        }
        break;
      }
    }

    // ===================================================================
    // 07 - SAFETY
    // ===================================================================
    console.log('\n📸 07 — SAFETY');

    await navTo(page, '/safety');

    await shot(page, dir('07_safety/01_safety_full.png'), {
      page: '/safety',
      state: 'Safety events registry — full list',
      howReached: 'Click Safety in sidebar',
      elements: ['Safety event table', 'Event ID', 'Participant', 'Event type/description', 'Severity badge (Mild/Moderate/Severe/Life-threatening)', 'SAE indicator', 'Date reported', 'Status (New, Under Review, Resolved)', 'Study'],
      demoValue: 'Pharmacovigilance hub — all adverse events across all trials',
      interactions: ['Click event for detail', 'Filter by severity/status', 'Review events'],
      role: 'Pharmacovigilance User, Administrator',
      notes: ''
    });

    await page.evaluate(() => window.scrollTo(0, 500));
    await sleep(700);
    await shot(page, dir('07_safety/02_safety_scrolled.png'), {
      page: '/safety',
      state: 'Safety events scrolled — more events',
      howReached: 'Scroll safety list',
      elements: ['Additional events', 'Varying severities', 'Different statuses'],
      demoValue: 'Show breadth of pharmacovigilance event tracking',
      interactions: [],
      role: 'Pharmacovigilance User',
      notes: ''
    });

    await page.evaluate(() => window.scrollTo(0, 0));

    // Try filter dropdown for severity
    const safetyFilters = await page.$$('select, [role="combobox"], button[class*="filter"]');
    if (safetyFilters.length > 0) {
      await safetyFilters[0].click();
      await sleep(600);
      await shot(page, dir('07_safety/03_safety_filter_open.png'), {
        page: '/safety',
        state: 'Safety filter dropdown open',
        howReached: 'Click filter dropdown on safety page',
        elements: ['Filter options: severity levels, status types, study filter'],
        demoValue: 'Filter adverse events by severity for triage',
        interactions: ['Select Severe to focus on critical events'],
        role: 'Pharmacovigilance User',
        notes: ''
      });
      interactiveStates++;
      await page.keyboard.press('Escape');
      await sleep(400);
    }

    // Click SAE row for detail
    const safetyRows = await page.$$('tbody tr, [class*="event-row"], [class*="SafetyRow"]');
    if (safetyRows.length > 0) {
      // Try to find a SAE or Severe event
      let saeRow = null;
      for (const row of safetyRows) {
        const text = await page.evaluate(el => el.textContent, row);
        if (text && (text.includes('SAE') || text.includes('Severe') || text.includes('serious') || text.includes('New'))) {
          saeRow = row;
          break;
        }
      }
      if (!saeRow) saeRow = safetyRows[0];

      await saeRow.click();
      await sleep(1200);

      const modal = await page.$('[role="dialog"]');
      if (modal) {
        await shot(page, dir('07_safety/04_sae_detail_modal.png'), {
          page: '/safety',
          state: 'Safety event detail modal',
          howReached: 'Click safety event row',
          elements: ['Event ID', 'Participant info', 'Event description', 'Severity badge', 'SAE indicator', 'Date reported', 'Status', 'Review history', 'Action buttons (Review, Report)'],
          demoValue: 'CRITICAL DEMO: SAE detail view for pharmacovigilance assessment',
          interactions: ['Click Review to open review modal', 'Add report', 'Change status'],
          role: 'Pharmacovigilance User, Administrator',
          notes: 'Do not submit review in live demo'
        });
        interactiveStates++;

        // Scroll modal
        await page.evaluate(() => {
          const m = document.querySelector('[role="dialog"]');
          if (m) m.scrollTop = 300;
        });
        await sleep(600);
        await shot(page, dir('07_safety/05_sae_detail_scrolled.png'), {
          page: '/safety',
          state: 'SAE detail modal scrolled — lower sections',
          howReached: 'Scroll SAE detail modal',
          elements: ['Event timeline', 'Medical coding', 'Causality assessment', 'Reporter info'],
          demoValue: 'Complete adverse event details for regulatory reporting',
          interactions: ['Review causality', 'Add follow-up'],
          role: 'Pharmacovigilance User',
          notes: ''
        });

        // Find Review button
        await page.evaluate(() => {
          const m = document.querySelector('[role="dialog"]');
          if (m) m.scrollTop = 0;
        });
        await sleep(300);

        const modalBtns = await page.$$('[role="dialog"] button');
        for (const btn of modalBtns) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text && (text.includes('Review') || text.includes('Assess'))) {
            await btn.click();
            await sleep(1000);
            const reviewModal = await page.$('[role="dialog"]:last-child, [class*="review-modal"]');
            if (await page.$$eval('[role="dialog"]', els => els.length) > 1 || reviewModal) {
              await shot(page, dir('07_safety/06_sae_review_modal.png'), {
                page: '/safety',
                state: 'SAE review modal — causality assessment',
                howReached: 'Click Review button in SAE detail',
                elements: ['Causality assessment dropdown', 'Outcome selector', 'Action taken', 'Reporter name', 'Review notes', 'Submit Review button'],
                demoValue: 'KEY DEMO: Pharmacovigilance review workflow — assessing SAE causality',
                interactions: ['Fill causality', 'Select outcome', 'Submit (DO NOT submit in demo)'],
                role: 'Pharmacovigilance User',
                notes: 'Do not submit — will create real audit record'
              });
              interactiveStates++;
              await closeModal(page);
              await sleep(500);
            }
            break;
          }
        }

        await closeModal(page);
        await sleep(500);
      }
    }

    // ===================================================================
    // 08 - COMPLIANCE
    // ===================================================================
    console.log('\n📸 08 — COMPLIANCE');

    await navTo(page, '/compliance');

    await shot(page, dir('08_compliance/01_overview.png'), {
      page: '/compliance',
      state: 'Compliance page — readiness overview',
      howReached: 'Click Compliance in sidebar',
      elements: ['Compliance readiness score', 'FHIR R4 button/tab', 'CDISC button/tab', 'Checklist items', 'Standards compliance indicators', 'Blocked/ready status'],
      demoValue: 'Regulatory compliance command center — submission readiness at a glance',
      interactions: ['Click FHIR R4 to view bundle', 'Click CDISC to view datasets', 'View checklist'],
      role: 'Administrator, Regulator, Ethics Committee Member',
      notes: ''
    });

    await page.evaluate(() => window.scrollTo(0, 500));
    await sleep(700);
    await shot(page, dir('08_compliance/02_compliance_checklist.png'), {
      page: '/compliance',
      state: 'Compliance checklist scrolled',
      howReached: 'Scroll compliance page',
      elements: ['Checklist items with pass/fail status', 'Blocking issues highlighted', 'Completed items with checkmarks'],
      demoValue: 'Detailed compliance requirements — what is needed for regulatory submission',
      interactions: ['Click item for details'],
      role: 'Administrator',
      notes: ''
    });

    await page.evaluate(() => window.scrollTo(0, 0));

    // FHIR R4 button
    const allCompBtns = await page.$$('button, a[class*="tab"], [role="tab"]');
    let fhirClicked = false;
    let cdiscClicked = false;

    for (const btn of allCompBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (!fhirClicked && text && text.toUpperCase().includes('FHIR')) {
        await btn.click();
        await sleep(2000);
        fhirClicked = true;

        await shot(page, dir('08_compliance/03_fhir_preview.png'), {
          page: '/compliance',
          state: 'FHIR R4 Standards Preview',
          howReached: 'Click FHIR R4 button/tab',
          elements: ['FHIR R4 Bundle structure', 'Resource types (Patient, ResearchStudy, Condition)', 'Coding systems (SNOMED, LOINC)', 'JSON preview', 'Export/download button'],
          demoValue: 'CRITICAL DEMO: FHIR R4 interoperability — internationally recognized health data standard',
          interactions: ['Expand JSON sections', 'Download bundle', 'View mapping'],
          role: 'Administrator, Regulator',
          notes: 'FHIR R4 is key regulatory deliverable'
        });

        await page.evaluate(() => window.scrollTo(0, 500));
        await sleep(700);
        await shot(page, dir('08_compliance/04_fhir_source_json.png'), {
          page: '/compliance',
          state: 'FHIR R4 — source JSON structure visible',
          howReached: 'Scroll FHIR R4 preview',
          elements: ['JSON tree structure', 'FHIR resource definitions', 'Coding system OIDs', 'Patient references', 'Study resource fields'],
          demoValue: 'Technical compliance: raw FHIR R4 output — what gets submitted to regulators',
          interactions: ['Expand/collapse JSON nodes', 'Copy JSON', 'Download'],
          role: 'Administrator, Regulator',
          notes: ''
        });

        // Try to expand JSON sections
        const jsonToggles = await page.$$('[class*="expand"], details summary, [class*="toggle"], [class*="json-key"]');
        for (const toggle of jsonToggles.slice(0, 3)) {
          try {
            await toggle.click();
            await sleep(600);
            await shot(page, dir('08_compliance/05_fhir_json_expanded.png'), {
              page: '/compliance',
              state: 'FHIR R4 — JSON section expanded',
              howReached: 'Click expand in FHIR JSON tree',
              elements: ['Expanded JSON node', 'Nested FHIR attributes', 'Resource values'],
              demoValue: 'FHIR R4 drill-down — nested structure of regulatory data',
              interactions: ['Expand other nodes'],
              role: 'Administrator',
              notes: ''
            });
            interactiveStates++;
            break;
          } catch(e) {}
        }

        await page.evaluate(() => window.scrollTo(0, 0));
        break;
      }
    }

    // Re-query all buttons for CDISC
    const compBtns2 = await page.$$('button, a[class*="tab"], [role="tab"]');
    for (const btn of compBtns2) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (!cdiscClicked && text && text.toUpperCase().includes('CDISC')) {
        await btn.click();
        await sleep(2000);
        cdiscClicked = true;

        await shot(page, dir('08_compliance/06_cdisc_preview.png'), {
          page: '/compliance',
          state: 'CDISC Standards Preview',
          howReached: 'Click CDISC button/tab',
          elements: ['CDISC dataset structure', 'SDTM/ADaM domains', 'Variable listing', 'Controlled terminology', 'Domain headers'],
          demoValue: 'CRITICAL DEMO: CDISC submission format — FDA/ICH regulatory standard',
          interactions: ['View individual domains', 'View terminology', 'Download'],
          role: 'Administrator, Regulator',
          notes: ''
        });

        await page.evaluate(() => window.scrollTo(0, 500));
        await sleep(700);
        await shot(page, dir('08_compliance/07_cdisc_mapping_table.png'), {
          page: '/compliance',
          state: 'CDISC — variable mapping table',
          howReached: 'Scroll CDISC preview',
          elements: ['SDTM variable names', 'Data type', 'Controlled terminology codes', 'Study-to-CDISC mapping'],
          demoValue: 'CDISC variable mapping — how trial data maps to submission variables',
          interactions: ['View more domains'],
          role: 'Administrator, Regulator',
          notes: ''
        });

        await page.evaluate(() => window.scrollTo(0, 0));
        break;
      }
    }

    // Look for Source JSON / Structural checks tabs
    const compBtns3 = await page.$$('button, [role="tab"]');
    for (const btn of compBtns3) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Source') || text.includes('Structural') || text.includes('Check'))) {
        await btn.click();
        await sleep(1500);
        await shot(page, dir('08_compliance/08_structural_checks.png'), {
          page: '/compliance',
          state: 'Structural compliance checks / Source JSON',
          howReached: 'Click Source/Structural tab',
          elements: ['Validation check results', 'Pass/Fail indicators', 'Check descriptions', 'Source JSON view'],
          demoValue: 'Automated compliance validation — what passes and what needs fixing',
          interactions: ['View check details'],
          role: 'Administrator',
          notes: ''
        });
        interactiveStates++;
        break;
      }
    }

    // Download options
    const downloadBtns = await page.$$('button[class*="download"], a[download], button:has([class*="download"])');
    if (downloadBtns.length > 0) {
      await downloadBtns[0].hover();
      await sleep(400);
      await shot(page, dir('08_compliance/09_download_options.png'), {
        page: '/compliance',
        state: 'Compliance download options',
        howReached: 'Hover over download button',
        elements: ['Download button', 'Format options', 'Export controls'],
        demoValue: 'Generate downloadable compliance reports for regulatory submission',
        interactions: ['Click to download FHIR bundle', 'Download CDISC package'],
        role: 'Administrator, Regulator',
        notes: ''
      });
    }

    // Blocked state
    await page.evaluate(() => window.scrollTo(0, 0));
    const blockedEls = await page.$$('[class*="blocked"], [class*="error"], [class*="fail"], [class*="red"]');
    if (blockedEls.length > 0) {
      await blockedEls[0].scrollIntoView();
      await sleep(500);
      await shot(page, dir('08_compliance/10_compliance_blocked.png'), {
        page: '/compliance',
        state: 'Compliance readiness — blocked state visible',
        howReached: 'Scroll to blocked items',
        elements: ['Red blocked indicator', 'Blocking requirements', 'What must be resolved', 'Action items'],
        demoValue: 'Show compliance gate: what prevents regulatory submission today',
        interactions: ['Click issue to resolve', 'Navigate to blocking milestone'],
        role: 'Administrator',
        notes: ''
      });
    }

    // ===================================================================
    // 09 - ALERTS
    // ===================================================================
    console.log('\n📸 09 — ALERTS');

    await navTo(page, '/alerts');

    await shot(page, dir('09_alerts/01_alerts_full.png'), {
      page: '/alerts',
      state: 'Alerts page — all notifications',
      howReached: 'Click Alerts in sidebar',
      elements: ['Alert list', 'Unread badges', 'Alert types (Safety, Compliance, Enrollment, Milestone)', 'Timestamps', 'Priority indicators', 'Study references'],
      demoValue: 'System notification center — all alerts requiring attention',
      interactions: ['Click alert for detail', 'Mark as read', 'Filter by type'],
      role: 'Administrator',
      notes: ''
    });

    await page.evaluate(() => window.scrollTo(0, 500));
    await sleep(700);
    await shot(page, dir('09_alerts/02_alerts_scrolled.png'), {
      page: '/alerts',
      state: 'Alerts scrolled — more notifications',
      howReached: 'Scroll alerts page',
      elements: ['Additional alerts', 'Read vs unread states', 'Various alert types'],
      demoValue: 'Full alert history',
      interactions: [],
      role: 'Administrator',
      notes: ''
    });

    await page.evaluate(() => window.scrollTo(0, 0));

    // Click on first alert
    const alertRows2 = await page.$$('[class*="alert"], [class*="notification"], li, tr');
    for (const row of alertRows2) {
      const tag = await page.evaluate(el => el.tagName, row);
      const text = await page.evaluate(el => el.textContent?.trim(), row);
      if (text && text.length > 20) {
        await row.click();
        await sleep(1200);
        const modal = await page.$('[role="dialog"]');
        if (modal) {
          await shot(page, dir('09_alerts/03_alert_detail_modal.png'), {
            page: '/alerts',
            state: 'Alert detail modal',
            howReached: 'Click alert item',
            elements: ['Alert title', 'Full message', 'Study reference', 'Timestamp', 'Navigate to issue button', 'Mark as read', 'Dismiss'],
            demoValue: 'Alert detail with actionable navigation to the underlying issue',
            interactions: ['Click "View Study" to navigate', 'Mark as read', 'Dismiss'],
            role: 'Administrator',
            notes: ''
          });
          interactiveStates++;
          await closeModal(page);
          break;
        }
        break;
      }
    }

    // Filter buttons
    const alertFilterBtns = await page.$$('button, [role="tab"]');
    for (const btn of alertFilterBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Unread') || text.includes('Safety') || text.includes('All'))) {
        await btn.click();
        await sleep(800);
        await shot(page, dir('09_alerts/04_alerts_filtered.png'), {
          page: '/alerts',
          state: `Alerts filtered — ${text.trim()}`,
          howReached: `Click "${text.trim()}" filter button`,
          elements: ['Filtered alert list', 'Active filter indicator'],
          demoValue: 'Filter alerts by type to focus on critical items',
          interactions: ['Select different filter', 'Click alert for action'],
          role: 'Administrator',
          notes: ''
        });
        interactiveStates++;
        break;
      }
    }

    // ===================================================================
    // 10 - AUDIT
    // ===================================================================
    console.log('\n📸 10 — AUDIT');

    await navTo(page, '/audit');

    await shot(page, dir('10_audit/01_audit_table.png'), {
      page: '/audit',
      state: 'Audit trail — full log table',
      howReached: 'Click Audit in sidebar',
      elements: ['Audit log table', 'Sequence number', 'Timestamp', 'User', 'Action type (CREATE, UPDATE, DELETE)', 'Entity type (Study, Participant, SafetyEvent)', 'Entity ID', 'SHA-256 hash', 'Chain indicator'],
      demoValue: 'Tamper-evident audit trail — every action logged with cryptographic hash chain',
      interactions: ['Click record for detail + diff', 'Filter by entity type', 'Search', 'Verify hash chain'],
      role: 'Administrator, Regulator',
      notes: ''
    });

    await page.evaluate(() => window.scrollTo(0, 500));
    await sleep(700);
    await shot(page, dir('10_audit/02_audit_scrolled.png'), {
      page: '/audit',
      state: 'Audit trail scrolled — more records',
      howReached: 'Scroll audit table',
      elements: ['Additional records', 'Different action types', 'Hash values visible'],
      demoValue: 'Complete immutable audit history showing all system activity',
      interactions: [],
      role: 'Administrator',
      notes: ''
    });

    await page.evaluate(() => window.scrollTo(0, 0));

    // Filter
    const auditFilters = await page.$$('select, [role="combobox"], button[class*="filter"], input[type="search"]');
    if (auditFilters.length > 0) {
      await auditFilters[0].click();
      await sleep(700);
      const dd = await page.$('[role="listbox"], [role="menu"], [role="option"]');
      if (dd) {
        await shot(page, dir('10_audit/03_audit_filter_open.png'), {
          page: '/audit',
          state: 'Audit filter dropdown open',
          howReached: 'Click audit filter',
          elements: ['Entity type options', 'Action type options', 'User filter'],
          demoValue: 'Filter audit trail by entity type (e.g., only safety events)',
          interactions: ['Select SafetyEvent to filter'],
          role: 'Administrator',
          notes: ''
        });
        interactiveStates++;
        await page.keyboard.press('Escape');
      }
    }

    // Click audit row for detail
    const auditRows = await page.$$('tbody tr, [class*="audit-row"], [class*="AuditRow"]');
    if (auditRows.length > 0) {
      await auditRows[0].click();
      await sleep(1200);

      const modal = await page.$('[role="dialog"]');
      if (modal) {
        await shot(page, dir('10_audit/04_audit_record_detail.png'), {
          page: '/audit',
          state: 'Audit record detail modal',
          howReached: 'Click audit record row',
          elements: ['Record ID', 'Action type', 'Entity type', 'User who performed action', 'Timestamp', 'SHA-256 hash', 'Before/after data'],
          demoValue: 'CRITICAL DEMO: Tamper-proof audit record with cryptographic proof',
          interactions: ['View before/after diff', 'Verify hash', 'Close'],
          role: 'Administrator, Regulator',
          notes: ''
        });
        interactiveStates++;

        // Scroll modal to see diff
        await page.evaluate(() => {
          const m = document.querySelector('[role="dialog"]');
          if (m) m.scrollTop = 300;
        });
        await sleep(600);
        await shot(page, dir('10_audit/05_audit_before_after_diff.png'), {
          page: '/audit',
          state: 'Audit record — before/after data diff',
          howReached: 'Scroll audit record detail modal',
          elements: ['Before state (red/removed values)', 'After state (green/added values)', 'Changed fields highlighted', 'JSON diff view'],
          demoValue: 'CRITICAL DEMO: Precise before/after comparison — exactly what changed, when, and by whom',
          interactions: [],
          role: 'Administrator, Regulator',
          notes: 'Core regulatory integrity feature'
        });

        // Find hash verify button
        await page.evaluate(() => {
          const m = document.querySelector('[role="dialog"]');
          if (m) m.scrollTop = 0;
        });
        await sleep(300);

        const modalBtns2 = await page.$$('[role="dialog"] button');
        for (const btn of modalBtns2) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text && (text.includes('Verify') || text.includes('Hash') || text.includes('Check'))) {
            await btn.click();
            await sleep(1500);
            await shot(page, dir('10_audit/06_hash_chain_verification.png'), {
              page: '/audit',
              state: 'Hash chain verification result',
              howReached: 'Click Verify Hash button in audit record',
              elements: ['SHA-256 hash value', 'Verification result (Valid/Invalid)', 'Chain integrity status', 'Green checkmark or red warning'],
              demoValue: 'CRITICAL DEMO: Cryptographic hash verification proves audit trail has NOT been tampered with',
              interactions: [],
              role: 'Administrator, Regulator',
              notes: 'This is the definitive proof of audit trail integrity for regulators'
            });
            interactiveStates++;
            break;
          }
        }

        await closeModal(page);
        await sleep(500);
      }
    }

    // Search for safety events in audit
    const auditSearchInput = await page.$('input[type="search"], input[placeholder*="earch"]');
    if (auditSearchInput) {
      await auditSearchInput.click();
      await auditSearchInput.type('safety', { delay: 80 });
      await sleep(1200);
      await shot(page, dir('10_audit/07_audit_safety_filtered.png'), {
        page: '/audit',
        state: 'Audit trail filtered for safety events',
        howReached: 'Type "safety" in audit search',
        elements: ['Filtered audit records', 'Only safety event entries', 'SAE audit trail'],
        demoValue: 'Trace audit history specifically for safety events',
        interactions: ['Click record for detail'],
        role: 'Administrator',
        notes: ''
      });
      interactiveStates++;
      await auditSearchInput.click({ clickCount: 3 });
      await page.keyboard.press('Delete');
      await sleep(500);
    }

    // ===================================================================
    // 11 - USERS
    // ===================================================================
    console.log('\n📸 11 — USERS');

    await navTo(page, '/users');

    await shot(page, dir('11_users/01_users_list.png'), {
      page: '/users',
      state: 'Users management page',
      howReached: 'Click Users in sidebar',
      elements: ['User table', 'Name', 'Role badge', 'Email', 'Organization', 'Status (Active)', 'Last login', 'Create User button'],
      demoValue: 'User administration — role-based access provisioning',
      interactions: ['Click Create User', 'Click user for detail/edit', 'Change role'],
      role: 'Administrator',
      notes: 'Only Administrator can access this page'
    });

    await page.evaluate(() => window.scrollTo(0, 400));
    await sleep(600);
    await shot(page, dir('11_users/02_users_scrolled.png'), {
      page: '/users',
      state: 'Users list scrolled',
      howReached: 'Scroll users list',
      elements: ['All 7 demo users visible', 'Various roles listed'],
      demoValue: 'Full user roster with diverse roles',
      interactions: [],
      role: 'Administrator',
      notes: ''
    });

    await page.evaluate(() => window.scrollTo(0, 0));

    // Create User button
    const createBtns = await page.$$('button');
    let createUserOpened = false;
    for (const btn of createBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Create') || text.includes('Add') || text.includes('New'))) {
        await btn.click();
        await sleep(1200);
        const modal = await page.$('[role="dialog"]');
        if (modal) {
          createUserOpened = true;
          await shot(page, dir('11_users/03_create_user_modal.png'), {
            page: '/users',
            state: 'Create user modal',
            howReached: 'Click Create User button',
            elements: ['Name field', 'Email field', 'Role selector', 'Organization field', 'Submit button', 'Cancel button'],
            demoValue: 'User provisioning — onboarding new trial team members with specific roles',
            interactions: ['Fill form', 'Select role', 'Submit'],
            role: 'Administrator',
            notes: ''
          });
          interactiveStates++;

          // Open role dropdown
          const roleDropdown = await modal.$('select, [role="combobox"]');
          if (roleDropdown) {
            await roleDropdown.click();
            await sleep(600);
            await shot(page, dir('11_users/04_user_role_dropdown.png'), {
              page: '/users',
              state: 'User role dropdown open in create modal',
              howReached: 'Click role selector in create user modal',
              elements: ['All 7 role options visible', 'Administrator', 'Principal Investigator', 'Study Coordinator', 'Clinical Trial Monitor', 'Ethics Committee Member', 'Pharmacovigilance User', 'Regulator / Read-only User'],
              demoValue: 'RBAC role assignment — complete role hierarchy visible',
              interactions: ['Select any role'],
              role: 'Administrator',
              notes: ''
            });
            interactiveStates++;
            await page.keyboard.press('Escape');
            await sleep(300);
          }

          await closeModal(page);
          break;
        }
        break;
      }
    }

    // Click on user row for detail
    const userRows2 = await page.$$('tbody tr, [class*="user-row"]');
    if (userRows2.length > 0) {
      await userRows2[0].click();
      await sleep(1200);
      const modal = await page.$('[role="dialog"]');
      if (modal) {
        await shot(page, dir('11_users/05_user_detail.png'), {
          page: '/users',
          state: 'User detail/edit modal',
          howReached: 'Click user row',
          elements: ['User name', 'Email', 'Role badge', 'Organization', 'Account status', 'Edit options'],
          demoValue: 'User profile management — view and modify user access',
          interactions: ['Edit role', 'Deactivate account', 'Close'],
          role: 'Administrator',
          notes: ''
        });
        interactiveStates++;
        await closeModal(page);
      }
    }

    // ===================================================================
    // 12 - REGULATOR ROLE
    // ===================================================================
    console.log('\n📸 12 — REGULATOR VIEW');

    await logoutViaUI(page);
    await loginViaUI(page, USERS.regulator);

    await shot(page, dir('12_regulator/01_regulator_landing.png'), {
      page: page.url().replace(BASE_URL, '') || '/dashboard',
      state: 'Regulator landing page after login',
      howReached: 'Login as regulator@ayush.gov.in',
      elements: ['Read-only navigation', 'Role indicator showing Regulator', 'Limited sidebar items', 'Dashboard view'],
      demoValue: 'RBAC: regulator role — restricted navigation for read-only regulatory oversight',
      interactions: ['View dashboard', 'Navigate to safety', 'Navigate to compliance', 'Navigate to audit'],
      role: 'Regulator / Read-only User',
      notes: 'Compare sidebar with Admin view'
    });

    await navTo(page, '/dashboard');
    await shot(page, dir('12_regulator/02_regulator_dashboard.png'), {
      page: '/dashboard',
      state: 'Dashboard — regulator view',
      howReached: 'Navigate to /dashboard as regulator',
      elements: ['Study status overview', 'Risk summary', 'Enrollment totals', 'Missing/limited mutation controls'],
      demoValue: 'Regulatory oversight: aggregate trial health without modification capability',
      interactions: ['View studies', 'Access compliance'],
      role: 'Regulator / Read-only User',
      notes: ''
    });

    await navTo(page, '/studies');
    await shot(page, dir('12_regulator/03_regulator_studies.png'), {
      page: '/studies',
      state: 'Studies list — regulator view (read-only)',
      howReached: 'Navigate to /studies as regulator',
      elements: ['Study list visible', 'Missing create/edit buttons', 'Read-only view'],
      demoValue: 'Regulator can see study portfolio but cannot create or modify',
      interactions: ['View study details', 'No edit/create actions'],
      role: 'Regulator / Read-only User',
      notes: 'No Create Study button should be visible'
    });

    await navTo(page, '/safety');
    await shot(page, dir('12_regulator/04_regulator_safety.png'), {
      page: '/safety',
      state: 'Safety events — regulator view (read-only)',
      howReached: 'Navigate to /safety as regulator',
      elements: ['Safety events table', 'No review buttons', 'Read-only status indicators'],
      demoValue: 'Regulator sees all adverse events but cannot review or modify — enforcement separation',
      interactions: ['View event details'],
      role: 'Regulator / Read-only User',
      notes: 'Review buttons should be absent/disabled'
    });

    await navTo(page, '/compliance');
    await shot(page, dir('12_regulator/05_regulator_compliance.png'), {
      page: '/compliance',
      state: 'Compliance — regulator view',
      howReached: 'Navigate to /compliance as regulator',
      elements: ['Compliance readiness score', 'FHIR R4 access', 'CDISC access', 'No edit/approve buttons'],
      demoValue: 'Regulator accesses FHIR and CDISC exports for regulatory review',
      interactions: ['View FHIR bundle', 'View CDISC datasets', 'Review compliance status'],
      role: 'Regulator / Read-only User',
      notes: ''
    });

    // FHIR as regulator
    const regFhirBtns = await page.$$('button');
    for (const btn of regFhirBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.toUpperCase().includes('FHIR')) {
        await btn.click();
        await sleep(2000);
        await shot(page, dir('12_regulator/06_regulator_fhir_access.png'), {
          page: '/compliance',
          state: 'FHIR R4 — regulator access',
          howReached: 'Click FHIR R4 as regulator',
          elements: ['FHIR R4 bundle', 'Full data access', 'Download available'],
          demoValue: 'Regulator can access FHIR R4 exports for regulatory data exchange',
          interactions: ['Download FHIR bundle'],
          role: 'Regulator / Read-only User',
          notes: ''
        });
        break;
      }
    }

    await navTo(page, '/audit');
    await shot(page, dir('12_regulator/07_regulator_audit.png'), {
      page: '/audit',
      state: 'Audit trail — regulator view',
      howReached: 'Navigate to /audit as regulator',
      elements: ['Full audit log visible', 'All records accessible', 'Hash values displayed', 'No deletion controls'],
      demoValue: 'KEY REGULATORY DEMO: Regulator can inspect complete tamper-proof audit trail',
      interactions: ['Click record for detail', 'Verify hash chain', 'Filter by entity'],
      role: 'Regulator / Read-only User',
      notes: 'Critical regulatory feature: immutable audit access for oversight'
    });

    // Click audit row as regulator
    const regAuditRows = await page.$$('tbody tr');
    if (regAuditRows.length > 0) {
      await regAuditRows[0].click();
      await sleep(1200);
      const modal = await page.$('[role="dialog"]');
      if (modal) {
        await shot(page, dir('12_regulator/08_regulator_audit_detail.png'), {
          page: '/audit',
          state: 'Audit detail — regulator reading record',
          howReached: 'Click audit record as regulator',
          elements: ['Record detail', 'Before/after data', 'Hash value', 'No modification controls'],
          demoValue: 'Regulator inspects audit records for compliance verification',
          interactions: ['Verify hash'],
          role: 'Regulator / Read-only User',
          notes: ''
        });
        interactiveStates++;

        // Hash verify as regulator
        const regModalBtns = await page.$$('[role="dialog"] button');
        for (const btn of regModalBtns) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text && (text.includes('Verify') || text.includes('Hash'))) {
            await btn.click();
            await sleep(1500);
            await shot(page, dir('12_regulator/09_regulator_hash_verification.png'), {
              page: '/audit',
              state: 'Hash verification — regulator confirming audit integrity',
              howReached: 'Click Verify Hash in audit record as regulator',
              elements: ['Hash verification result', 'Chain integrity badge', 'Verification timestamp'],
              demoValue: 'CRITICAL DEMO: Regulator independently verifies audit chain has not been tampered with',
              interactions: [],
              role: 'Regulator / Read-only User',
              notes: 'This is the "proof of integrity" moment for regulatory demos'
            });
            interactiveStates++;
            break;
          }
        }
        await closeModal(page);
      }
    }

    // Try accessing users as regulator (should be restricted)
    try {
      await navTo(page, '/users');
      await shot(page, dir('12_regulator/10_regulator_users_restricted.png'), {
        page: '/users',
        state: 'Users page — regulator access (restricted/denied)',
        howReached: 'Navigate to /users as regulator',
        elements: ['Access denied message or empty page', 'No user management controls'],
        demoValue: 'RBAC enforcement: regulators cannot access user management',
        interactions: [],
        role: 'Regulator / Read-only User',
        notes: 'May show access denied or just empty'
      });
    } catch(e) {
      console.log('  Users page error as regulator:', e.message);
    }

    // ===================================================================
    // 13 - OTHER ROLES & MISC
    // ===================================================================
    console.log('\n📸 13 — OTHER ROLES');

    // Study Coordinator
    await logoutViaUI(page);
    await loginViaUI(page, USERS.coordinator);

    await navTo(page, '/dashboard');
    await shot(page, dir('13_other/01_coordinator_dashboard.png'), {
      page: '/dashboard',
      state: 'Dashboard — Study Coordinator view',
      howReached: 'Login as coordinator@aiia.gov.in',
      elements: ['Coordinator-focused widgets', 'Participant enrollment section', 'Upcoming milestones', 'Role badge'],
      demoValue: 'Study Coordinator perspective — enrollment and milestone focus',
      interactions: ['View participants', 'Check milestones'],
      role: 'Study Coordinator',
      notes: ''
    });

    await navTo(page, '/participants');
    await shot(page, dir('13_other/02_coordinator_participants.png'), {
      page: '/participants',
      state: 'Participants — Study Coordinator view',
      howReached: 'Navigate to /participants as coordinator',
      elements: ['Full participant list', 'Enrollment action buttons', 'Record consent buttons', 'All edit controls active'],
      demoValue: 'Coordinator has full participant management capability',
      interactions: ['Record consent', 'Enroll participant', 'Update status'],
      role: 'Study Coordinator',
      notes: ''
    });

    // Pharmacovigilance User
    await logoutViaUI(page);
    await loginViaUI(page, USERS.pv);

    await navTo(page, '/safety');
    await shot(page, dir('13_other/03_pv_safety.png'), {
      page: '/safety',
      state: 'Safety events — Pharmacovigilance User view',
      howReached: 'Login as pv@aiia.gov.in → /safety',
      elements: ['Full safety event list', 'Review buttons ACTIVE', 'Report generation buttons', 'PV-specific actions'],
      demoValue: 'PV User has full adverse event management — contrast with regulator read-only',
      interactions: ['Review SAE', 'Generate report', 'Update causality'],
      role: 'Pharmacovigilance User',
      notes: 'Key contrast: PV user can review; regulator cannot'
    });

    await navTo(page, '/dashboard');
    await shot(page, dir('13_other/04_pv_dashboard.png'), {
      page: '/dashboard',
      state: 'Dashboard — Pharmacovigilance User view',
      howReached: 'Navigate to /dashboard as PV user',
      elements: ['Safety-focused metrics', 'Open SAE count', 'Safety alerts highlighted'],
      demoValue: 'PV User dashboard focuses on safety event KPIs',
      interactions: [],
      role: 'Pharmacovigilance User',
      notes: ''
    });

    // Ethics Committee Member
    await logoutViaUI(page);
    await loginViaUI(page, USERS.ethics);

    await navTo(page, '/dashboard');
    await shot(page, dir('13_other/05_ethics_dashboard.png'), {
      page: '/dashboard',
      state: 'Dashboard — Ethics Committee Member view',
      howReached: 'Login as ethics@aiia.gov.in',
      elements: ['Ethics-relevant information', 'Protocol compliance focus', 'Safety summary'],
      demoValue: 'IEC member view — compliance and safety oversight',
      interactions: [],
      role: 'Ethics Committee Member',
      notes: ''
    });

    await navTo(page, '/compliance');
    await shot(page, dir('13_other/06_ethics_compliance.png'), {
      page: '/compliance',
      state: 'Compliance — Ethics Committee Member view',
      howReached: 'Navigate to /compliance as ethics member',
      elements: ['Compliance status', 'Protocol adherence indicators', 'Ethics-relevant checks'],
      demoValue: 'IEC member reviews trial compliance status for ethics oversight',
      interactions: [],
      role: 'Ethics Committee Member',
      notes: ''
    });

    // Principal Investigator
    await logoutViaUI(page);
    await loginViaUI(page, USERS.pi);

    await navTo(page, '/dashboard');
    await shot(page, dir('13_other/07_pi_dashboard.png'), {
      page: '/dashboard',
      state: 'Dashboard — Principal Investigator view',
      howReached: 'Login as pi@aiia.gov.in',
      elements: ['My studies section', 'PI-owned study highlights', 'Risk alerts for PI studies'],
      demoValue: 'PI perspective — study lead oversight and management',
      interactions: ['View my studies', 'Check risk alerts'],
      role: 'Principal Investigator',
      notes: ''
    });

    await navTo(page, '/studies');
    await shot(page, dir('13_other/08_pi_studies.png'), {
      page: '/studies',
      state: 'Studies — Principal Investigator view',
      howReached: 'Navigate to /studies as PI',
      elements: ['PI-assigned studies visible', 'Study management options'],
      demoValue: 'PI can manage their assigned studies',
      interactions: ['View study detail', 'Check risk'],
      role: 'Principal Investigator',
      notes: ''
    });

    // Clinical Trial Monitor
    await logoutViaUI(page);
    await loginViaUI(page, USERS.monitor);

    await navTo(page, '/dashboard');
    await shot(page, dir('13_other/09_monitor_dashboard.png'), {
      page: '/dashboard',
      state: 'Dashboard — Clinical Trial Monitor view',
      howReached: 'Login as monitor@cro.org',
      elements: ['Monitor-focused metrics', 'Query count', 'Protocol deviations'],
      demoValue: 'CRO Monitor view for trial oversight',
      interactions: [],
      role: 'Clinical Trial Monitor',
      notes: ''
    });

    // ===================================================================
    // BACK TO ADMIN — Navigation discovery
    // ===================================================================
    console.log('\n📸 Navigation & sidebar captures...');

    await logoutViaUI(page);
    await loginViaUI(page, USERS.admin);

    await navTo(page, '/dashboard');

    // Capture sidebar expanded
    await shot(page, dir('13_other/10_sidebar_full.png'), {
      page: '/dashboard',
      state: 'Sidebar navigation — all items visible',
      howReached: 'Login as admin, view dashboard',
      elements: ['All navigation items', 'Dashboard', 'Studies', 'Sites', 'Participants', 'Milestones', 'Safety', 'Compliance', 'Alerts', 'Audit', 'Users', 'Role badge/indicator', 'User info'],
      demoValue: 'Complete navigation structure of the CTMS platform',
      interactions: ['Click any nav item'],
      role: 'Administrator',
      notes: ''
    });

    // Discover notification bell
    const bellEls = await page.$$('[class*="bell"], [class*="notif"], [aria-label*="notification"], [aria-label*="alert"]');
    if (bellEls.length > 0) {
      await bellEls[0].click();
      await sleep(800);
      const dd = await page.$('[class*="dropdown"], [class*="popover"], [role="menu"]');
      if (dd) {
        await shot(page, dir('13_other/11_notification_dropdown.png'), {
          page: '/dashboard',
          state: 'Notification bell dropdown open',
          howReached: 'Click notification bell icon',
          elements: ['Recent notifications list', 'Unread count badge', 'Notification items with timestamps'],
          demoValue: 'Quick notification access from any page',
          interactions: ['Click notification to navigate to issue'],
          role: 'Administrator',
          notes: ''
        });
        interactiveStates++;
        await page.keyboard.press('Escape');
        await sleep(400);
      }
    }

    // User profile dropdown
    const avatarEls = await page.$$('[class*="avatar"], [class*="user-menu"], [class*="profile"], button[class*="user"]');
    if (avatarEls.length > 0) {
      await avatarEls[0].click();
      await sleep(800);
      await shot(page, dir('13_other/12_user_menu_dropdown.png'), {
        page: '/dashboard',
        state: 'User profile/account dropdown',
        howReached: 'Click user avatar/profile button',
        elements: ['User name', 'Role badge', 'Organization', 'Profile option', 'Logout button'],
        demoValue: 'User account menu with role context',
        interactions: ['Click logout', 'View profile'],
        role: 'Administrator',
        notes: ''
      });
      interactiveStates++;
      await page.keyboard.press('Escape');
    }

    // ===================================================================
    // FINAL CAPTURES — misc states
    // ===================================================================

    // Root page redirect
    await navTo(page, '/');
    await shot(page, dir('13_other/13_root_redirect.png'), {
      page: '/',
      state: 'Root page — redirect behavior',
      howReached: 'Navigate to / when authenticated',
      elements: ['Dashboard loaded or redirect in progress'],
      demoValue: 'Entry point for authenticated users',
      interactions: [],
      role: 'All roles',
      notes: 'Root redirects to /dashboard when authenticated'
    });

    // 404 / unknown route (optional)
    try {
      await navTo(page, '/unknown-route-test');
      await shot(page, dir('13_other/14_404_page.png'), {
        page: '/unknown-route-test',
        state: '404 / not found page',
        howReached: 'Navigate to unknown route',
        elements: ['404 message or redirect'],
        demoValue: 'Error handling for unknown routes',
        interactions: ['Navigate back'],
        role: 'All roles',
        notes: ''
      });
    } catch(e) {}

  } catch (err) {
    console.error('\n❌ Script error:', err.message);
    console.error(err.stack);
  }

  await browser.close();

  // ===================================================================
  // GENERATE UI_INVENTORY.md
  // ===================================================================
  console.log('\n📄 Writing UI_INVENTORY.md...');
  const inventoryMd = buildInventory(inventoryEntries);
  fs.writeFileSync(path.join(OUT_DIR, 'UI_INVENTORY.md'), inventoryMd, 'utf8');

  // ===================================================================
  // GENERATE DEMO_FLOW_CANDIDATES.md
  // ===================================================================
  console.log('📄 Writing DEMO_FLOW_CANDIDATES.md...');
  const flowsMd = buildFlows(inventoryEntries);
  fs.writeFileSync(path.join(OUT_DIR, 'DEMO_FLOW_CANDIDATES.md'), flowsMd, 'utf8');

  // ===================================================================
  // FINAL REPORT
  // ===================================================================
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('  FINAL REPORT');
  console.log('═'.repeat(60));
  console.log(`  Pages discovered:           ${discoveredRoutes.size}`);
  console.log(`  Screenshots captured:       ${screenshotCount}`);
  console.log(`  Interactive states found:   ${interactiveStates}`);
  console.log(`\n  Routes:`);
  for (const r of [...discoveredRoutes].sort()) {
    console.log(`    ${r}`);
  }
  console.log(`\n  Output folder:  ${OUT_DIR}`);
  console.log(`  UI_INVENTORY:   ${path.join(OUT_DIR, 'UI_INVENTORY.md')}`);
  console.log(`  DEMO_FLOWS:     ${path.join(OUT_DIR, 'DEMO_FLOW_CANDIDATES.md')}`);
  console.log('═'.repeat(60));
}

function buildInventory(entries) {
  const ts = new Date().toISOString();
  let md = `# AIIA CTMS — UI Visual Inventory\n\n`;
  md += `**Generated:** ${ts}  \n`;
  md += `**Total screenshots:** ${entries.length}  \n\n`;
  md += `---\n\n`;

  for (const e of entries) {
    md += `### Screenshot\nfilename: \`${e.filename}\`\n\n`;
    md += `### Page\n\`${e.page}\`\n\n`;
    md += `### State\n${e.state}\n\n`;
    md += `### How reached\n${e.howReached}\n\n`;
    md += `### Important visible elements\n`;
    md += (e.elements || []).map(x => `- ${x}`).join('\n') || '- (none listed)';
    md += `\n\n`;
    md += `### Demo value\n${e.demoValue}\n\n`;
    md += `### Interactions discovered\n`;
    md += (e.interactions || []).map(x => `- ${x}`).join('\n') || '- (none listed)';
    md += `\n\n`;
    md += `### Role\n${e.role}\n\n`;
    md += `### Notes\n${e.notes || '(none)'}\n\n`;
    md += `---\n\n`;
  }
  return md;
}

function buildFlows(entries) {
  return `# AIIA CTMS — Demo Flow Candidates

**Generated:** ${new Date().toISOString()}

> **NOTE:** These are CANDIDATE flows only. No ranking or selection has been made.
> Use these as building blocks for the final demo script.

---

## Flow A: Risk Intelligence Command Center

**Purpose:** Show how the platform surfaces and explains study risk in real time.

| Step | Screenshot | Interaction |
|------|-----------|-------------|
| 1 | \`01_dashboard/01_full.png\` | Login as Admin → view dashboard |
| 2 | \`01_dashboard/02_dashboard_risk_distribution.png\` | Scroll to risk distribution chart |
| 3 | \`01_dashboard/04_dashboard_chart_tooltip.png\` | Hover chart segment for tooltip |
| 4 | \`02_studies/01_studies_list.png\` | Click Studies nav |
| 5 | \`03_study_detail/01_s1_overview.png\` | Click highest-risk study |
| 6 | \`03_study_detail/01_s1_risk_section.png\` | Scroll to risk breakdown |
| 7 | \`07_safety/04_sae_detail_modal.png\` | Navigate to Safety → click SAE |
| 8 | \`10_audit/01_audit_table.png\` | Navigate to Audit |

**Interactions required:** ~8 clicks + scrolls  
**Safe/Reproducible:** Yes  
**Could fail:** Risk tooltip depends on chart library hover state; study IDs from DB

---

## Flow B: Participant Consent & Enrollment Gate

**Purpose:** Show the consent-before-enrollment patient safety gate.

| Step | Screenshot | Interaction |
|------|-----------|-------------|
| 1 | \`05_participants/01_registry.png\` | Navigate to Participants |
| 2 | \`05_participants/03_filter_dropdown_open.png\` | Open filter dropdown |
| 3 | \`05_participants/04_participant_detail_modal.png\` | Click participant row |
| 4 | \`05_participants/05_enrollment_blocked_state.png\` | Show consent-required state |
| 5 | \`05_participants/06_consent_workflow_modal.png\` | Click Record Consent button |
| 6 | \`05_participants/01_registry.png\` | Close without submitting |

**Interactions required:** ~5 clicks  
**Safe/Reproducible:** Yes (show modal without submitting)  
**Could fail:** Blocked state requires seeded participant with pending consent

---

## Flow C: Pharmacovigilance SAE Review

**Purpose:** Show end-to-end adverse event lifecycle management.

| Step | Screenshot | Interaction |
|------|-----------|-------------|
| 1 | \`07_safety/01_safety_full.png\` | Navigate to Safety |
| 2 | \`07_safety/03_safety_filter_open.png\` | Open severity filter |
| 3 | \`07_safety/04_sae_detail_modal.png\` | Click SAE row |
| 4 | \`07_safety/05_sae_detail_scrolled.png\` | Scroll detail |
| 5 | \`07_safety/06_sae_review_modal.png\` | Click Review button |
| 6 | \`10_audit/04_audit_record_detail.png\` | Check audit record afterward |

**Interactions required:** ~6 clicks  
**Safe/Reproducible:** Yes (show review modal without submitting)  
**Could fail:** Review modal submit → creates real record; ensure don't submit

---

## Flow D: Regulatory Standards (FHIR R4 + CDISC)

**Purpose:** Show internationally recognized data standards compliance.

| Step | Screenshot | Interaction |
|------|-----------|-------------|
| 1 | \`08_compliance/01_overview.png\` | Navigate to Compliance |
| 2 | \`08_compliance/02_compliance_checklist.png\` | Scroll checklist |
| 3 | \`08_compliance/10_compliance_blocked.png\` | Show blocked/incomplete items |
| 4 | \`08_compliance/03_fhir_preview.png\` | Click FHIR R4 button |
| 5 | \`08_compliance/04_fhir_source_json.png\` | Scroll FHIR JSON |
| 6 | \`08_compliance/05_fhir_json_expanded.png\` | Expand JSON node |
| 7 | \`08_compliance/06_cdisc_preview.png\` | Click CDISC button |
| 8 | \`08_compliance/07_cdisc_mapping_table.png\` | Scroll CDISC mapping |

**Interactions required:** ~8 clicks  
**Safe/Reproducible:** Yes (all read-only views)  
**Could fail:** FHIR/CDISC buttons must exist and load data successfully

---

## Flow E: Regulatory Oversight (Regulator Read-Only View)

**Purpose:** Demonstrate RBAC — regulators get read-only oversight without modification access.

| Step | Screenshot | Interaction |
|------|-----------|-------------|
| 1 | \`00_login/03_login_regulator_preset.png\` | Select Regulator preset |
| 2 | \`12_regulator/01_regulator_landing.png\` | After login — limited nav |
| 3 | \`12_regulator/03_regulator_studies.png\` | Navigate to Studies (no Create button) |
| 4 | \`12_regulator/04_regulator_safety.png\` | Navigate to Safety (no Review button) |
| 5 | \`12_regulator/05_regulator_compliance.png\` | Navigate to Compliance |
| 6 | \`12_regulator/06_regulator_fhir_access.png\` | Access FHIR R4 |
| 7 | \`12_regulator/07_regulator_audit.png\` | Navigate to Audit |
| 8 | \`12_regulator/09_regulator_hash_verification.png\` | Verify hash chain |

**Interactions required:** ~9 clicks (requires role switch/login)  
**Safe/Reproducible:** Yes  
**Could fail:** Role-based UI differences may be subtle; need side-by-side comparison

---

## Flow F: Audit Trail Integrity Verification

**Purpose:** Show tamper-proof cryptographic audit chain.

| Step | Screenshot | Interaction |
|------|-----------|-------------|
| 1 | \`10_audit/01_audit_table.png\` | Navigate to Audit |
| 2 | \`10_audit/03_audit_filter_open.png\` | Open filter dropdown |
| 3 | \`10_audit/07_audit_safety_filtered.png\` | Filter for safety events |
| 4 | \`10_audit/04_audit_record_detail.png\` | Click record for detail |
| 5 | \`10_audit/05_audit_before_after_diff.png\` | Scroll to see before/after diff |
| 6 | \`10_audit/06_hash_chain_verification.png\` | Click Verify Hash |

**Interactions required:** ~6 clicks  
**Safe/Reproducible:** Yes (all read-only)  
**Could fail:** Hash verify button must exist; verification result must be positive

---

## Flow G: Multi-Study Portfolio Tour

**Purpose:** Show breadth of AIIA's clinical trial portfolio.

| Step | Screenshot | Interaction |
|------|-----------|-------------|
| 1 | \`02_studies/01_studies_list.png\` | View all studies |
| 2 | \`02_studies/03_studies_search_ashwagandha.png\` | Search Ashwagandha |
| 3 | \`03_study_detail/01_s1_overview.png\` | Open Ashwagandha study |
| 4 | \`03_study_detail/02_s2_overview.png\` | Open Curcumin study |
| 5 | \`04_sites/01_sites_full.png\` | Navigate to Sites |
| 6 | \`06_milestones/01_milestones_full.png\` | Navigate to Milestones |

**Interactions required:** ~6 clicks  
**Safe/Reproducible:** Yes  
**Could fail:** Study order from DB may vary

---

## Flow H: Admin Role Tour & User Management

**Purpose:** Show administrative capabilities and RBAC provisioning.

| Step | Screenshot | Interaction |
|------|-----------|-------------|
| 1 | \`01_dashboard/01_full.png\` | Admin dashboard |
| 2 | \`11_users/01_users_list.png\` | Navigate to Users |
| 3 | \`11_users/03_create_user_modal.png\` | Click Create User |
| 4 | \`11_users/04_user_role_dropdown.png\` | Open role selector |
| 5 | \`11_users/05_user_detail.png\` | Click existing user |
| 6 | \`09_alerts/01_alerts_full.png\` | Navigate to Alerts |
| 7 | \`09_alerts/03_alert_detail_modal.png\` | Open alert detail |

**Interactions required:** ~7 clicks  
**Safe/Reproducible:** Yes (don't submit create user form)  
**Could fail:** Create user might auto-submit on Enter key

---
`;
}

main().catch(console.error);
