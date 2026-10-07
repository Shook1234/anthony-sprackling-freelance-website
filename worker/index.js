/* ==========================================================================
   Lead magnet gate
   --------------------------------------------------------------------------
   - POST /api/lead              -> validates the opt-in form, signs a personal
                                    access link, then hands the lead to the
                                    Google Apps Script (adds to CRM sheet and
                                    emails the link).
   - /resources/<magnet>         -> shows the opt-in page, or the resource
                                    itself if the visitor has a valid access
                                    link or cookie.
   - /resources/_gated/*         -> never served directly.

   Secrets (Cloudflare dashboard > Worker > Settings > Variables and Secrets):
   LEAD_SECRET      random string, also pasted into the Apps Script
   APPS_SCRIPT_URL  the Apps Script web app URL
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
  if (!env.LEAD_SECRET || !env.APPS_SCRIPT_URL) {
    return json({ ok: false, error: "Sign-ups aren't switched on yet. Please try again later." }, 503);
  }

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  // Honeypot: real people never fill this hidden field.
  if (data.company_website) return json({ ok: true });

  const slug = String(data.resource || "");
  const magnet = MAGNETS[slug];
  const name = clean(data.name, 80);
  const profession = clean(data.profession, 80);
  const email = clean(data.email, 254).toLowerCase();

  if (!magnet) return json({ ok: false, error: "Unknown resource." }, 400);
  if (!name || !profession || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: "Please fill in your name, profession and a valid email." }, 400);
  }

  const token = await signToken(env.LEAD_SECRET, slug, email);
  const link = `${SITE}/resources/${slug}?access=${token}`;

  let result;
  try {
    const res = await fetch(env.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: env.LEAD_SECRET,
        name,
        profession,
        email,
        consent: data.consent === true,
        resource: magnet.title,
        subject: magnet.subject,
        link,
      }),
    });
    result = await res.json();
  } catch (e) {
    result = { ok: false };
  }

  if (!result || !result.ok) {
    return json({ ok: false, error: "Something went wrong sending your email. Please try again." }, 502);
  }
  return json({ ok: true });
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
