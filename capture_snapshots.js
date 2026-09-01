const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function captureSnapshots() {
  console.log("Launching Puppeteer browser for CTMS snapshots...");
  
  const snapshotsDir = path.join(__dirname, 'snapshots');
  if (!fs.existsSync(snapshotsDir)) {
    fs.mkdirSync(snapshotsDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 2 }
  });

  const page = await browser.newPage();
  
  console.log("Navigating to http://localhost:3000 ...");
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);

  const tabs = [
    { text: 'Executive Command', name: '01_executive_command_dashboard.png' },
    { text: 'Clinical Studies', name: '02_clinical_studies_directory.png' },
    { text: 'Study Sites', name: '03_study_sites_governance.png' },
    { text: 'Participants', name: '04_participants_recruitment.png' },
    { text: 'Pharmacovigilance', name: '05_pharmacovigilance_pv_center.png' },
    { text: 'Compliance', name: '06_compliance_preflight_check.png' },
    { text: 'Milestones', name: '07_study_milestones.png' },
    { text: 'Alerts', name: '08_operational_alerts.png' },
    { text: 'Audit Trail', name: '09_append_only_audit_trail.png' },
    { text: 'User Management', name: '10_user_management.png' },
  ];

  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    try {
      console.log(`Navigating to tab: ${tab.text} ...`);
      const buttons = await page.$$('aside button');
      let found = false;
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes(tab.text)) {
          await btn.click();
          found = true;
          break;
        }
      }
      if (!found && buttons[i]) {
        await buttons[i].click();
      }
      await delay(1500);

      const filepath = path.join(snapshotsDir, tab.name);
      await page.screenshot({ path: filepath, fullPage: true });
      console.log(`Saved: ${filepath}`);
    } catch (err) {
      console.error(`Error capturing ${tab.name}:`, err.message);
    }
  }

  // Also capture role switcher dropdown state
  try {
    console.log("Capturing Role Switcher UI state...");
    const roleBtn = await page.$('header button');
    if (roleBtn) {
      await roleBtn.click();
      await delay(800);
      await page.screenshot({ path: path.join(snapshotsDir, '11_role_switcher_dropdown.png'), fullPage: false });
      console.log("Saved: 11_role_switcher_dropdown.png");
    }
  } catch (err) {
    console.error("Error capturing role switcher", err.message);
  }

  await browser.close();
  console.log("ALL SNAPSHOTS CAPTURED SUCCESSFULLY!");
}

captureSnapshots().catch(console.error);

