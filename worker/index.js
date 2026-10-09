/* ==========================================================================
   Lead magnet gate
   --------------------------------------------------------------------------
   - POST /api/lead              -> validates the opt-in form, signs a personal
                                    access link, emails it via Resend and saves
                                    the lead to the CRM sheet (Google Apps Script).
   - /resources/<magnet>         -> shows the opt-in page, or the resource
                                    itself if the visitor has a valid access
                                    link or cookie.
   - /resources/_gated/*         -> never served directly.

   Secrets (Cloudflare dashboard > Worker > Settings > Variables and Secrets):
   LEAD_SECRET      random string, also pasted into the Apps Script
   APPS_SCRIPT_URL  the Apps Script web app URL (saves leads to the sheet)
   RESEND_API_KEY   Resend API key (sends the access email)
   ========================================================================== */

// To gate a new lead magnet: add it here, put the opt-in page at
// resources/<slug>.html and the full resource at resources/_gated/<slug>.html.
const MAGNETS = {
  "hook-matrix": {
    title: "The Hook Matrix",
    subject: "Your Hook Matrix is here",
  },
};

const SITE = "https://anthonysprackling.com";
const EMAIL_FROM = "Anthony Sprackling <anthony@anthonysprackling.com>";
const EMAIL_REPLY_TO = "anthonysprackling@hotmail.com";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // one year
const NO_STORE = "private, no-store";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/lead") {
      if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
      return handleLead(request, env);
    }

    if (url.pathname.startsWith("/resources/_gated")) {
      return new Response("Not found", { status: 404 });
    }

    const slug = magnetFromPath(url.pathname);
    if (slug) return gate(request, env, url, slug);

    return env.ASSETS.fetch(request);
  },
};

/* ---------- Gate ---------- */
function magnetFromPath(pathname) {
  const m = pathname.match(/^\/resources\/([a-z0-9-]+?)(?:\.html|\/)?$/);
  return m && MAGNETS[m[1]] ? m[1] : null;
}

async function gate(request, env, url, slug) {
  const cookieName = "as_" + slug.replace(/-/g, "_");

  // Arriving from the email: verify, set the cookie, then drop the token from the URL.
  const token = url.searchParams.get("access");
  if (token) {
    if (env.LEAD_SECRET && (await verifyToken(env.LEAD_SECRET, slug, token))) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/resources/" + slug,
          "Set-Cookie": `${cookieName}=${token}; Path=/resources/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
          "Cache-Control": NO_STORE,
        },
      });
    }
    return redirect("/resources/" + slug + "?invalid=1");
  }

  const cookie = readCookie(request.headers.get("Cookie"), cookieName);
  const hasAccess = cookie && env.LEAD_SECRET && (await verifyToken(env.LEAD_SECRET, slug, cookie));

  const target = hasAccess ? `/resources/_gated/${slug}` : `/resources/${slug}`;
  const res = await env.ASSETS.fetch(new Request(new URL(target, url), request));
  const out = new Response(res.body, res);
  out.headers.set("Cache-Control", NO_STORE);
  out.headers.set("Vary", "Cookie");
  if (hasAccess) out.headers.set("X-Robots-Tag", "noindex");
  return out;
}

/* ---------- Opt-in form ---------- */
async function handleLead(request, env) {
  if (!env.LEAD_SECRET || !env.RESEND_API_KEY) {
    return json({ ok: false, error: "Sign-ups aren't switched on yet. Please try again later." }, 503);
  }

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  // Honeypot: real people never fill this hidden field.
  if (data.hp_check) return json({ ok: true });

  const slug = String(data.resource || "");
  if (slug === CALCULATOR.slug) return handleCalculatorLead(env, data);
  const magnet = MAGNETS[slug];
  const name = clean(data.name, 80);
  const profession = clean(data.profession, 80);
  const email = clean(data.email, 254).toLowerCase();

  if (!magnet) return json({ ok: false, error: "Unknown resource." }, 400);
  if (!name || !profession || profession === "Other" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: "Please fill in your name, profession and a valid email." }, 400);
  }

  const token = await signToken(env.LEAD_SECRET, slug, email);
  const link = `${SITE}/resources/${slug}?access=${token}`;

  const lead = { name, profession, email, consent: data.consent === true, resource: magnet.title, link };

  return deliver(env, lead, { subject: magnet.subject, html: emailHtml(lead), text: emailText(lead) });
}

// Send the email and save to the sheet at the same time. The email is what matters
// to the visitor; a sheet hiccup is logged but doesn't fail their request.
async function deliver(env, lead, message) {
  const [sent, saved] = await Promise.allSettled([
    sendEmail(env, lead.email, message),
    saveToSheet(env, lead),
  ]);

  if (saved.status === "rejected") console.error("Sheet save failed:", saved.reason);
  if (sent.status === "rejected") {
    console.error("Email failed:", sent.reason);
    return json({ ok: false, error: "Something went wrong sending your email. Please try again." }, 502);
  }
  return json({ ok: true });
}

async function sendEmail(env, to, { subject, html, text }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], reply_to: EMAIL_REPLY_TO, subject, html, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

async function saveToSheet(env, lead) {
  if (!env.APPS_SCRIPT_URL) return;
  const res = await fetch(env.APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: env.LEAD_SECRET, skipEmail: true, ...lead }),
  });
  const result = await res.json();
  if (!result.ok) throw new Error("Apps Script: " + (result.error || "unknown error"));
}

function firstName(name) {
  return name.replace(/^'/, "").split(" ")[0];
}

function emailText(lead) {
  return [
    `Hi ${firstName(lead.name)},`,
    "",
    `Thanks for grabbing ${lead.resource}. Here is your personal link:`,
    "",
    lead.link,
    "",
    "The link is unique to you, so bookmark it to come back any time.",
    "",
    "If you want a hand turning these hooks into ads for your brand, just reply to this email.",
    "",
    "Anthony",
  ].join("\n");
}

function emailHtml(lead) {
  const name = escapeHtml(firstName(lead.name));
  const resource = escapeHtml(lead.resource);
  return `<div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#16203f;line-height:1.6">
  <p style="font-size:16px;margin:0 0 16px">Hi ${name},</p>
  <p style="font-size:16px;margin:0 0 24px">Thanks for grabbing <strong>${resource}</strong>. Here is your personal link:</p>
  <p style="margin:0 0 28px"><a href="${lead.link}" style="display:inline-block;background:#0f1e46;color:#ece5d6;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:999px">Open ${resource} &rarr;</a></p>
  <p style="font-size:14px;color:#5b6274;margin:0 0 24px">The link is unique to you, so bookmark it to come back any time.</p>
  <p style="font-size:16px;margin:0 0 16px">If you want a hand turning these hooks into ads for your brand, just reply to this email.</p>
  <p style="font-size:16px;margin:0">Anthony</p>
  <p style="font-size:12px;color:#5b6274;margin:32px 0 0;border-top:1px solid #e3dbc8;padding-top:16px">You are receiving this because you requested ${resource} at anthonysprackling.com.</p>
</div>`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ---------- Meta Profitability Calculator ---------- */
const CALCULATOR = {
  slug: "profitability-calculator",
  title: "Meta Profitability Calculator",
  subject: "Your Meta profitability breakdown",
};

// Same formulas as resources/profitability-calculator.html. Keep the two in sync.
function calcProfit(i) {
  const exVat = i.aov / (1 + i.vat / 100);
  const netRevenue = exVat * (1 - i.returns / 100);
  const contribution = netRevenue - i.productCost - i.aov * (i.payment / 100);
  const overheadMultiplier = (i.spend + i.fees + i.creation) / i.spend;
  const breakEvenCPA = contribution / overheadMultiplier;
  const targetCPA = (contribution - netRevenue * (i.goal / 100)) / overheadMultiplier;
  const ok = contribution > 0;
  const targetOk = ok && targetCPA > 0;
  return {
    netRevenue,
    contribution,
    overheadMultiplier,
    breakEvenCPA,
    breakEvenROAS: ok ? i.aov / breakEvenCPA : null,
    targetCPA,
    targetROAS: targetOk ? i.aov / targetCPA : null,
    overheadPct: (overheadMultiplier - 1) * 100,
    creativeCostPerOrder: targetOk ? i.creation / (i.spend / targetCPA) : null,
    profitPerOrder: netRevenue * (i.goal / 100),
    ok,
    targetOk,
  };
}

function bounded(value, min, max) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

async function handleCalculatorLead(env, data) {
  const name = clean(data.name, 80);
  const profession = clean(data.profession, 80);
  const email = clean(data.email, 254).toLowerCase();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: "Please add your name and a valid email." }, 400);
  }

  // Recalculate from the raw inputs rather than trusting the browser's results.
  const raw = data.inputs || {};
  const inputs = {
    aov: bounded(raw.aov, 1, 5000),
    vat: bounded(raw.vat, 0, 50),
    productCost: bounded(raw.productCost, 0, 5000),
    payment: bounded(raw.payment, 0, 15),
    returns: bounded(raw.returns, 0, 60),
    spend: bounded(raw.spend, 100, 2000000),
    fees: bounded(raw.fees, 0, 500000),
    creation: bounded(raw.creation, 0, 500000),
    goal: bounded(raw.goal, 0, 50),
    currentRoas: raw.currentRoas == null ? null : bounded(raw.currentRoas, 0.01, 50),
  };
  if (Object.entries(inputs).some(([k, v]) => v === null && k !== "currentRoas")) {
    return json({ ok: false, error: "Some of your calculator numbers look off. Please recalculate and try again." }, 400);
  }

  const r = calcProfit(inputs);
  const lead = {
    name,
    profession: profession || "Not given",
    email,
    consent: data.consent === true,
    resource: CALCULATOR.title,
    link: `${SITE}/resources/${CALCULATOR.slug}`,
    details: calcSummary(inputs, r),
  };
  const fixes = fixFirst(inputs, r);
  return deliver(env, lead, {
    subject: CALCULATOR.subject,
    html: calcEmailHtml(lead, inputs, r, fixes),
    text: calcEmailText(lead, inputs, r, fixes),
  });
}

const money = (n, dp = 2) =>
  (n < 0 ? "-" : "") + "\u00a3" + Math.abs(n).toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp });
const ratio = (n) => (Math.round(n * 100) / 100).toFixed(2);

function calcSummary(i, r) {
  const parts = [
    `AOV ${money(i.aov)}`, `VAT ${i.vat}%`, `Product ${money(i.productCost)}`, `Payment ${i.payment}%`,
    `Returns ${i.returns}%`, `Spend ${money(i.spend, 0)}`, `Fees ${money(i.fees, 0)}`, `Creative ${money(i.creation, 0)}`,
    `Goal ${i.goal}%`,
  ];
  if (i.currentRoas) parts.push(`Current ROAS ${ratio(i.currentRoas)}`);
  if (!r.ok) parts.push("RESULT: unprofitable before ads");
  else {
    parts.push(`Break-even CPA ${money(r.breakEvenCPA)} / ROAS ${ratio(r.breakEvenROAS)}`);
    parts.push(r.targetOk ? `Target CPA ${money(r.targetCPA)} / ROAS ${ratio(r.targetROAS)}` : "Target: goal above margin");
  }
  return parts.join(" | ");
}

function monthlyProfitAt(i, r, cpa) {
  return (r.contribution - cpa * r.overheadMultiplier) * (i.spend / cpa);
}

// The one to three things worth fixing first, in order of impact.
function fixFirst(i, r) {
  if (!r.ok) {
    return [
      `Every order loses money before you spend anything on ads: after VAT, product cost, fees and returns you're left with ${money(r.contribution)}. No ad account can fix that.`,
      `Start with margin. Bundles or upsells to raise your ${money(i.aov)} AOV, or a cheaper product cost, will do more than any campaign change.`,
    ];
  }
  const fixes = [];
  const productShare = (i.productCost / i.aov) * 100;
  if (i.currentRoas && i.currentRoas < r.breakEvenROAS * 0.95) {
    const cpa = i.aov / i.currentRoas;
    fixes.push(`Your ads are losing money. At ${ratio(i.currentRoas)} ROAS you're paying about ${money(cpa)} per customer against a break-even of ${money(r.breakEvenCPA)}. Start with creative: new angles aimed at your best-converting customer type, not more budget.`);
  }
  if (productShare > 35) {
    fixes.push(`Product cost takes ${Math.round(productShare)}% of every order. Bundles or a higher AOV would raise the CPA you can afford without touching your ads.`);
  }
  if (r.overheadPct > 30) {
    fixes.push(`Fees and creative add ${r.overheadPct.toFixed(1)}% on top of your ad spend. As you scale, make sure those costs grow slower than spend, and that every pound of creative is properly tested.`);
  }
  if (i.returns >= 8) {
    fixes.push(`Returns at ${i.returns}% are a real leak. Every point you cut raises the CPA you can afford.`);
  }
  if (i.aov < 40) {
    fixes.push(`At ${money(i.aov)}, a small AOV lift (bundles, upsells, a free-shipping threshold) gives your ads a lot more room.`);
  }
  if (i.creation < i.spend * 0.05) {
    fixes.push(`You're putting less than 5% of your ad spend into new creative. Fresh angles are what keep CPAs down as you scale.`);
  }
  const base = i.currentRoas ? i.aov / i.currentRoas : r.targetOk ? r.targetCPA : r.breakEvenCPA;
  const uplift = monthlyProfitAt(i, r, base * 0.8) - monthlyProfitAt(i, r, base);
  fixes.push(`Creative is your cheapest lever. A 20% lower CPA would add about ${money(uplift, 0)} a month in profit at your current spend, with no extra fees.`);
  return fixes.slice(0, 3);
}

function verdictLine(i, r) {
  if (!i.currentRoas || !r.ok) return null;
  const cur = i.currentRoas;
  if (cur >= r.breakEvenROAS * 1.05) {
    return ["Profitable", "#1f7a54", `Your ${ratio(cur)} ROAS is above your ${ratio(r.breakEvenROAS)} break-even${r.targetOk && cur >= r.targetROAS ? `, and beating your ${ratio(r.targetROAS)} target.` : "."}`];
  }
  if (cur >= r.breakEvenROAS * 0.95) {
    return ["Around break-even", "#a35f0c", `Your ${ratio(cur)} ROAS is right on your ${ratio(r.breakEvenROAS)} break-even line.`];
  }
  return ["Losing money on every order", "#b4321f", `You need ${ratio(r.breakEvenROAS)} ROAS to break even. You're at ${ratio(cur)}.`];
}

function calcEmailText(lead, i, r, fixes) {
  const lines = [`Hi ${firstName(lead.name)},`, "", "Here's your Meta profitability breakdown.", ""];
  if (!r.ok) {
    lines.push("Bottom line: you can't be profitable on Meta at these numbers.");
  } else {
    lines.push(`Break-even: ${money(r.breakEvenCPA)} CPA / ${ratio(r.breakEvenROAS)} ROAS`);
    lines.push(r.targetOk ? `Target at ${i.goal}% profit: ${money(r.targetCPA)} CPA / ${ratio(r.targetROAS)} ROAS` : `A ${i.goal}% profit goal is more than your margin allows.`);
    const v = verdictLine(i, r);
    if (v) lines.push(`${v[0]}: ${v[2]}`);
  }
  lines.push("", "What I'd fix first:");
  fixes.forEach((f, n) => lines.push(`${n + 1}. ${f}`));
  lines.push("", `Your numbers: ${lead.details}`, "", "Want a hand with it? Just reply to this email or book a call: " + SITE + "/#book", "", "Anthony");
  return lines.join("\n");
}

function calcEmailHtml(lead, i, r, fixes) {
  const row = (label, value) =>
    `<tr><td style="padding:6px 0;color:#5b6274;font-size:14px">${label}</td><td style="padding:6px 0;text-align:right;font-weight:600;font-size:14px">${value}</td></tr>`;
  const stat = (label, cpa, roas, dark) =>
    `<td style="width:50%;padding:18px;border-radius:14px;background:${dark ? "#0f1e46" : "#f6f2e8"};color:${dark ? "#ece5d6" : "#0f1e46"};vertical-align:top">
      <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.75">${label}</div>
      <div style="font-family:Georgia,serif;font-size:26px;font-weight:700;margin-top:8px">${cpa} <span style="font-size:13px;font-weight:400;opacity:.75">CPA</span></div>
      <div style="font-family:Georgia,serif;font-size:26px;font-weight:700;margin-top:4px">${roas} <span style="font-size:13px;font-weight:400;opacity:.75">ROAS</span></div>
    </td>`;

  let results;
  if (!r.ok) {
    results = `<p style="padding:16px;border-radius:12px;background:#fbe9e6;color:#b4321f;font-weight:600;margin:0 0 24px">You can't be profitable on Meta at these numbers. Every order loses money before ads.</p>`;
  } else {
    const target = r.targetOk
      ? stat(`Target at ${i.goal}% profit`, money(r.targetCPA), ratio(r.targetROAS), true)
      : `<td style="width:50%;padding:18px;border-radius:14px;background:#0f1e46;color:#ece5d6;font-size:14px">A ${i.goal}% profit goal is more than your margin allows.</td>`;
    results = `<table role="presentation" width="100%" cellspacing="8" cellpadding="0" style="margin:0 -8px 16px"><tr>${stat("Break-even", money(r.breakEvenCPA), ratio(r.breakEvenROAS), false)}${target}</tr></table>`;
    const v = verdictLine(i, r);
    if (v) {
      results += `<p style="margin:0 0 24px;font-size:15px"><span style="display:inline-block;background:${v[1]};color:#fff;font-weight:700;font-size:12px;padding:4px 10px;border-radius:999px;margin-right:8px">${v[0]}</span>${escapeHtml(v[2])}</p>`;
    }
  }

  const fixList = fixes.map((f) => `<li style="margin:0 0 12px;font-size:15px;line-height:1.6">${escapeHtml(f)}</li>`).join("");
  const inputs = [
    row("Average order value", money(i.aov)),
    row("VAT", `${i.vat}%`),
    row("Product cost per order", money(i.productCost)),
    row("Payment processing", `${i.payment}%`),
    row("Returns &amp; refunds", `${i.returns}%`),
    row("Monthly Meta ad spend", money(i.spend, 0)),
    row("Agency &amp; freelancer fees", money(i.fees, 0)),
    row("Ad creation costs", money(i.creation, 0)),
    row("Profit goal", `${i.goal}%`),
    i.currentRoas ? row("Current ROAS", ratio(i.currentRoas)) : "",
  ].join("");

  return `<div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#16203f;line-height:1.6">
  <p style="font-size:16px;margin:0 0 8px">Hi ${escapeHtml(firstName(lead.name))},</p>
  <p style="font-size:16px;margin:0 0 24px">Here's your Meta profitability breakdown.</p>
  ${results}
  <h2 style="font-family:Georgia,serif;font-size:20px;color:#0f1e46;margin:8px 0 12px">What I'd fix first</h2>
  <ol style="padding-left:20px;margin:0 0 24px">${fixList}</ol>
  ${r.ok ? `<p style="font-size:14px;color:#5b6274;margin:0 0 24px">Your fees and creative add ${r.overheadPct.toFixed(1)}% on top of every \u00a31 of ad spend${r.creativeCostPerOrder !== null ? `, and creative costs you ${money(r.creativeCostPerOrder)} per order at your target CPA` : ""}.</p>` : ""}
  <h2 style="font-family:Georgia,serif;font-size:18px;color:#0f1e46;margin:0 0 8px">Your numbers</h2>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e3dbc8;margin:0 0 28px">${inputs}</table>
  <p style="margin:0 0 12px;font-size:16px">Want a hand fixing it? Reply to this email or grab a call.</p>
  <p style="margin:0 0 28px"><a href="${SITE}/#book" style="display:inline-block;background:#0f1e46;color:#ece5d6;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:999px">Book a call &rarr;</a></p>
  <p style="font-size:16px;margin:0">Anthony</p>
  <p style="font-size:12px;color:#5b6274;margin:32px 0 0;border-top:1px solid #e3dbc8;padding-top:16px">Meta's ROAS includes returning customers and is modelled. Check new-customer CPA in Shopify against these numbers. This is marketing break-even, not total business profit.<br><br>You are receiving this because you used the Meta Profitability Calculator at anthonysprackling.com. <a href="${lead.link}" style="color:#5b6274">Run it again</a>.</p>
</div>`;
}

/* ---------- Helpers ---------- */
function clean(value, max) {
  let s = String(value || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
  // Stop anything being read as a spreadsheet formula.
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": NO_STORE },
  });
}

function redirect(location) {
  return new Response(null, { status: 302, headers: { Location: location, "Cache-Control": NO_STORE } });
}

function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

function b64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(str) {
  const s = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function hmac(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

// Token = base64url(email) . base64url(HMAC(slug:email)), personal to each person and resource.
async function signToken(secret, slug, email) {
  const sig = await hmac(secret, slug + ":" + email);
  return b64url(new TextEncoder().encode(email)) + "." + b64url(sig);
}

async function verifyToken(secret, slug, token) {
  try {
    const [emailPart, sigPart] = token.split(".");
    if (!emailPart || !sigPart) return false;
    const email = new TextDecoder().decode(fromB64url(emailPart));
    const expected = await hmac(secret, slug + ":" + email);
    const given = fromB64url(sigPart);
    if (given.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < given.length; i++) diff |= given[i] ^ expected[i];
    return diff === 0;
  } catch (e) {
    return false;
  }
}
