const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'snapshots');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const PAGES = [
  { name: '01_login_page', url: 'http://localhost:3000/login', wait: 2000 },
  { name: '02_dashboard_overview', url: 'http://localhost:3000/dashboard', wait: 3500 },
  { name: '03_clinical_studies', url: 'http://localhost:3000/studies', wait: 3500 },
  { name: '04_study_workspace_detail', url: 'http://localhost:3000/studies/6', wait: 4000 },
  { name: '05_study_sites', url: 'http://localhost:3000/sites', wait: 3500 },
  { name: '06_participant_operations', url: 'http://localhost:3000/participants', wait: 3500 },
  { name: '07_regulatory_milestones', url: 'http://localhost:3000/milestones', wait: 3500 },
  { name: '08_pharmacovigilance_safety', url: 'http://localhost:3000/safety', wait: 3500 },
  { name: '09_compliance_preflight', url: 'http://localhost:3000/compliance', wait: 3500 },
  { name: '10_audit_trail_verification', url: 'http://localhost:3000/audit', wait: 3500 },
  { name: '11_alerts_center', url: 'http://localhost:3000/alerts', wait: 3500 },
  { name: '12_user_management', url: 'http://localhost:3000/users', wait: 3500 },
];

async function capture() {
  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1050'],
    defaultViewport: { width: 1600, height: 1050 },
  });

  const page = await browser.newPage();

  // 1. Capture Login Page first before logging in
  console.log('Capturing: 01_login_page');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01_login_page.png'), fullPage: true });

  // 2. Perform Login as Administrator to have full visibility across all routes including /users
  console.log('Logging in as Administrator...');
  // Fill credentials and click submit
  await page.evaluate(async () => {
    // Authenticate with backend API directly to store token into localStorage
    const res = await fetch('http://localhost:8000/api/v1/auth/login/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@aiia.gov.in', password: 'Password123!' }),
    });
    const data = await res.json();
    localStorage.setItem('ctms_jwt_token', data.access_token);
    localStorage.setItem('ctms_user_session', JSON.stringify({
      user_id: data.user_id,
      user_name: data.user_name,
      user_email: data.user_email,
      user_role: data.user_role,
      organization: data.organization || 'All India Institute of Ayurveda',
      access_token: data.access_token,
    }));
  });

  // 3. Capture all authenticated pages
  for (let i = 1; i < PAGES.length; i++) {
    const p = PAGES[i];
    console.log(`Capturing: ${p.name} (${p.url})`);
    try {
      await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, p.wait));
      await page.screenshot({
        path: path.join(OUTPUT_DIR, `${p.name}.png`),
        fullPage: true,
      });
      console.log(`Saved ${p.name}.png`);
    } catch (err) {
      console.error(`Error capturing ${p.name}:`, err.message);
    }
  }

  await browser.close();
  console.log(`All snapshots saved to ${OUTPUT_DIR}`);
}

capture().catch(err => {
  console.error('Fatal snapshot capture error:', err);
  process.exit(1);
});
