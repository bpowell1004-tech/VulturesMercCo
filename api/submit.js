// Simple in-memory counters (reset on redeploy)
// If you want permanent counters, I can switch this to Vercel KV.
let contractCounter = 1;
let recruitCounter = 1;

const basePrices = {
  escort: 500,
  recon: 700,
  raid: 1200,
  extraction: 1500,
  bounty: 1000,
  settlement: 1000,
  training: 600,
  custom: 1000
};

const valueMultipliers = { low: 1, medium: 1.5, high: 2, ultra: 2.5 };
const operatorsMultipliers = { 1: 1, 2: 1.5, 3: 2, 4: 2.5 };

// Map form name -> pricing key used in your inputs (value_*, duration_*, operators_*)
const FORM_KEY_MAP = {
  "Convoy Escort": "escort",
  "Recon & Surveillance": "recon",
  "Raid & Sabotage": "raid",
  "Extraction & Rescue": "extraction",
  "Bounty Hunting": "bounty",
  "Settlement Defense": "settlement",
  "Training & Tactical Support": "training",
  "Custom Operations": "custom"
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const body = await parseFormData(req);
    const formName = (body.form || "Submission").trim();

    const isRecruitment = formName.toLowerCase().includes("recruitment");
    const isContract = !isRecruitment && FORM_KEY_MAP[formName];

    // Pick webhook based on form type
    const contractsHook = process.env.DISCORD_WEBHOOK_CONTRACTS || process.env.DISCORD_WEBHOOK_URL;
    const recruitsHook  = process.env.DISCORD_WEBHOOK_RECRUITS  || process.env.DISCORD_WEBHOOK_URL;
    const webhook = isRecruitment ? recruitsHook : contractsHook;

    if (!webhook) {
      res.status(500).json({ error: "Missing Discord webhook env var(s)" });
      return;
    }

    // Build the message
    const header = isRecruitment
      ? `[#R-${pad(recruitCounter)}] **${formName}**`
      : `[#C-${pad(contractCounter)}] **${formName}**`;

    const lines = [header];

    // Common identity fields
    // (Your forms use either client_psn/discord_name OR applicant_psn/applicant_discord)
    const psn = body.client_psn || body.applicant_psn;
    const disc = body.discord_name || body.applicant_discord;
    if (psn)  lines.push(`**PSN:** ${psn}`);
    if (disc) lines.push(`**Discord:** ${disc}`);

    // If it's a contract, compute cost on the server (trust the server, not the browser)
    if (isContract) {
      const key = FORM_KEY_MAP[formName];
      const base = basePrices[key];

      const valueRaw = body[`value_${key}`];            // e.g. "low" | "medium" | ...
      const durationRaw = body[`duration_${key}`];      // "1" | "2" | "3"
      const opsRaw = body[`operators_${key}`];          // "1" | "2" | "3" | "4"

      const valueFactor = valueMultipliers[(valueRaw || "low").toLowerCase()] || 1;
      const duration = safeInt(durationRaw, 1);
      const opsFactor = operatorsMultipliers[safeInt(opsRaw, 1)] || 1;

      const total = Math.round(base * valueFactor * duration * opsFactor);
      const deposit = Math.round(total / 2);

      lines.push(`**Total (caps):** ${total}`);
      lines.push(`**Deposit (caps):** ${deposit}`);

      // Also echo visible choices like Value/Duration/Operators
      if (valueRaw)   lines.push(`**Value ${titleKey(key)}:** ${valueRaw}`);
      if (durationRaw)lines.push(`**Duration ${titleKey(key)} (days):** ${duration}`);
      if (opsRaw)     lines.push(`**Operators ${titleKey(key)}:** ${opsRaw}`);
    }

    // Dump all other fields for context (skip ones we already surfaced)
    const skipKeys = new Set([
      "form",
      "client_psn", "discord_name",
      "applicant_psn", "applicant_discord",
      "submitted", // just in case
    ]);
    if (isContract) {
      const key = FORM_KEY_MAP[formName];
      ["value_", "duration_", "operators_"].forEach(prefix => skipKeys.add(`${prefix}${key}`));
    }

    Object.entries(body).forEach(([k, v]) => {
      if (!v || skipKeys.has(k)) return;
      lines.push(`**${labelize(k)}:** ${v}`);
    });

    // Send to Discord
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: lines.join("\n") })
    });

    // Increment counters AFTER success
    if (isRecruitment) recruitCounter++;
    else if (isContract) contractCounter++;

    // Redirect to success page
    res.status(303).setHeader("Location", "/submitted.html").end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit" });
  }
}

function pad(n) {
  return String(n).padStart(3, "0");
}

function labelize(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function titleKey(key) {
  // escort -> Escort, recon -> Recon, etc.
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function safeInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

// Parse application/x-www-form-urlencoded or JSON body
async function parseFormData(req) {
  return await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => (data += chunk));
    req.on("end", () => {
      try {
        const contentType = req.headers["content-type"] || "";
        if (contentType.includes("application/json")) {
          resolve(JSON.parse(data || "{}"));
          return;
        }
        const params = new URLSearchParams(data);
        const obj = {};
        for (const [k, v] of params.entries()) obj[k] = v;
        resolve(obj);
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}
