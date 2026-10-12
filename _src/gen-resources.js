// Generates resources/index.html (lead magnet hub) and resources/hook-matrix.html
const fs = require("fs");
const path = require("path");
const { sections, openers } = require("./hooks-data.js");

const OUT = path.join(process.env.HOME, "anthony-sprackling-website", "resources");
fs.mkdirSync(OUT, { recursive: true });

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pad = (n) => String(n).padStart(2, "0");

const head = (desc, ogTitle) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Anthony Sprackling</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(ogTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<link rel="icon" type="image/png" href="../assets/images/favicon.png">
<link rel="stylesheet" href="../assets/css/styles.css?v=12">
</head>
<body>
`;

const navLinks = (cls) => `      <a href="../index.html#approach">Approach</a>
      <a href="../index.html#process">Process</a>
      <a href="../case-studies/index.html">Case studies</a>
      <a href="../about.html">About</a>
      <a href="index.html">Resources</a>
      <a href="https://anthonysprackling.substack.com/" target="_blank" rel="noopener noreferrer">Newsletter &#8599;</a>
      <a class="btn btn--primary${cls}" href="../index.html#book">Book a call <span class="arrow">&rarr;</span></a>`;

const header = `<header class="header">
  <div class="shell header__inner">
    <a class="brand" href="../index.html">Anthony<span>.</span>Sprackling</a>
    <nav class="nav">
${navLinks(" btn--sm")}
    </nav>
    <button class="menu-toggle" aria-label="Toggle menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </div>
  <div class="mobile-menu">
    <div class="shell">
      <nav>
${navLinks("").replace(/^      /gm, "        ")}
      </nav>
    </div>
  </div>
</header>
`;

const footer = `<footer class="footer">
  <div class="shell footer__inner">
    <div class="footer__top">
      <div>
        <a class="brand" href="../index.html">Anthony<span>.</span>Sprackling</a>
        <p class="footer__tagline">
          Creative strategy for growth-stage health &amp; wellness brands scaling on
          Meta with persona-led ads and testing systems.
        </p>
      </div>
      <div class="footer__links">
        <a href="mailto:anthonysprackling@hotmail.com">anthonysprackling@hotmail.com</a>
        <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer">LinkedIn &#8599;</a>
        <a href="https://anthonysprackling.substack.com/" target="_blank" rel="noopener noreferrer">Newsletter &#8599;</a>
        <a class="btn btn--primary btn--sm" href="../index.html#book">Book a call <span class="arrow">&rarr;</span></a>
      </div>
    </div>
    <div class="footer__bottom">
      <p>&copy; <span data-year>2026</span> Anthony Sprackling. All rights reserved.</p>
      <p>Persona-led creative strategy &middot; Meta ads</p>
    </div>
  </div>
</footer>

<script src="../assets/js/main.js?v=12"></script>
<script src="../assets/js/resources.js?v=8"></script>
</body>
</html>
`;

const searchIcon = `<svg class="search__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

const HOOK_PREVIEW = [
  ["Moment &middot; Unaware", "&ldquo;It's 10am and you're already counting down to bedtime.&rdquo;"],
  ["Proof &middot; Product aware", "&ldquo;Day 1 vs day 30 of swapping my afternoon coffee.&rdquo;"],
  ["Objection &middot; Most aware", "&ldquo;Isn't it just expensive vitamins?&rdquo;"],
];
const CALC_PREVIEW = [
  ["Break-even", "&pound;27.91 CPA &middot; 2.15 ROAS"],
  ["Your target at 15% profit", "&pound;22.15 CPA &middot; 2.71 ROAS"],
  ["Fees + creative", "+26.5% on every &pound;1 of ad spend"],
];
const ACM_PREVIEW = [
  ["Copy &middot; Problem aware", "PAS: Problem, Agitate, Solution"],
  ["Video &middot; Product aware", "Honest Review: lead with the flaw"],
  ["Static &middot; Solution aware", "Us vs Them: win the comparison on your terms"],
];
const totalHooks = sections.reduce((n, s) => n + s.hooks.length, 0);
const totalOpeners = openers.reduce((n, g) => n + g.lines.length, 0);

/* ============================== HOOK MATRIX ============================== */
let n = 0;
const sectionHtml = sections
  .map((s, si) => {
    const rows = s.hooks
      .map(([type, tpl, hw, af]) => {
        n++;
        return `          <tr data-hook>
            <td class="hm-type" data-label="Hook"><span class="hm-num">${pad(n)}</span>${esc(type)}</td>
            <td data-label="Template"><p class="hm-template">${esc(tpl)}</p><button class="hm-copy" type="button" data-copy="${esc(tpl)}">Copy</button></td>
            <td data-label="Health &amp; wellness">${esc(hw)}</td>
            <td data-label="Alcohol-free">${esc(af)}</td>
          </tr>`;
      })
      .join("\n");
    const c = s.callout;
    return `
    <section class="hm-section" id="${s.id}" data-stage="${s.stage}">
      <div class="hm-section__tags">
        <span class="hm-badge hm-badge--${s.stage}">${s.stageLabel}</span>
        <span class="hm-badge hm-badge--plain">${esc(s.emotion)}</span>
      </div>
      <h2>Section ${si + 1}: ${esc(s.title)}</h2>
      <p class="hm-sub">${esc(s.sub)}</p>
      <div class="hm-prose">
${s.intro.map((p) => `        <p>${esc(p)}</p>`).join("\n")}
      </div>
      <div class="hm-table-wrap">
        <table class="hm-table hm-table--cards">
          <thead>
            <tr><th>Hook</th><th>Fill-in template</th><th>Health &amp; wellness</th><th>Alcohol-free</th></tr>
          </thead>
          <tbody>
${rows}
          </tbody>
        </table>
      </div>
      <div class="hm-callout hm-callout--${c.kind}">
        <span class="hm-callout__icon" aria-hidden="true">${c.icon}</span>
        <p>${c.text}</p>
      </div>
    </section>`;
  })
  .join("\n");

const openersHtml = openers
  .map(
    (g) => `        <div class="hm-openers__group" data-hook-group>
          <h3><span aria-hidden="true">${g.icon}</span> ${esc(g.title)}</h3>
          <ul>
${g.lines
  .map(
    (l) =>
      `            <li data-hook><button class="hm-opener" type="button" data-copy="${esc(l)}"><span>${esc(l)}</span><span class="hm-opener__hint">Copy</span></button></li>`
  )
  .join("\n")}
          </ul>
        </div>`
  )
  .join("\n");

const toc = [
  ["how-to-use", "How to use it"],
  ...sections.map((s) => [s.id, s.title]),
  ["openers", "Quick-fire openers"],
  ["testing", "How to test hooks"],
  ["checklist", "Pre-brief checklist"],
];

const matrix =
  head(
    `${totalHooks} hook formulas plus ${totalOpeners} quick-fire openers for Meta ads, organised by emotion and level of awareness, with worked examples for health & wellness and alcohol-free brands.`,
    "The Hook Matrix: 60 hook formulas for scroll-stopping Meta ads"
  ) +
  header +
  `
<main>

<header class="shell page-head hm-head">
  <a class="cs-back" href="index.html">&larr; All resources</a>
  <div class="hm-head__meta">
    <span class="res-icon" aria-hidden="true">&#x1F3AF;</span>
    <span>Hook bank &middot; 12 min read</span>
  </div>
  <h1 class="display res-title">The Hook Matrix: ${totalHooks} hook formulas for scroll-stopping Meta ads</h1>
  <p class="section-lead" style="max-width:44rem">
    Every formula comes with a fill-in template and two worked examples, sorted by the
    emotion it uses and the level of awareness it's built for. Plus ${totalOpeners} quick-fire openers,
    a testing protocol and a checklist to run before you brief.
  </p>
</header>

<div class="shell hm-layout">
  <aside class="hm-toc" aria-label="On this page">
    <p class="eyebrow">On this page</p>
    <nav>
${toc.map(([id, label]) => `      <a href="#${id}">${esc(label)}</a>`).join("\n")}
    </nav>
  </aside>

  <article class="hm-article">

    <section class="hm-section hm-section--first" id="how-to-use">
      <h2>How to use this matrix</h2>
      <p class="hm-sub">Three axes. One rule.</p>
      <div class="hm-axes">
        <div class="hm-axis">
          <span class="hm-axis__num">01</span>
          <h3>Emotion</h3>
          <p>Pain, frustration, curiosity, proof, identity or urgency. Pick the one your persona is feeling right now, at this point in their journey.</p>
        </div>
        <div class="hm-axis">
          <span class="hm-axis__num">02</span>
          <h3>Awareness level</h3>
          <p>Unaware, problem aware, solution aware, product aware or most aware. This decides how much the viewer already knows, and so what your hook has to do.</p>
        </div>
        <div class="hm-axis">
          <span class="hm-axis__num">03</span>
          <h3>Persona moment</h3>
          <p>A great hook names a specific moment, not a general state. Moments qualify the right viewer. States qualify nobody.</p>
        </div>
      </div>
      <h3 class="hm-h3">The five levels of awareness</h3>
      <p class="hm-small">From Eugene Schwartz's <em>Breakthrough Advertising</em>. Every section below is built for one of them.</p>
      <ol class="hm-ladder">
        <li><span class="hm-badge hm-badge--unaware">Unaware</span><p><strong>They think:</strong> &ldquo;This is just how things are.&rdquo;</p><p><strong>Your hook's job:</strong> name a moment they recognise, so they realise it's a problem.</p></li>
        <li><span class="hm-badge hm-badge--problem">Problem aware</span><p><strong>They think:</strong> &ldquo;I need to fix this, but nothing works.&rdquo;</p><p><strong>Your hook's job:</strong> show you understand the problem, and what they've already tried.</p></li>
        <li><span class="hm-badge hm-badge--solution">Solution aware</span><p><strong>They think:</strong> &ldquo;I know what's out there. Why would this be different?&rdquo;</p><p><strong>Your hook's job:</strong> reframe the category so your approach stands apart.</p></li>
        <li><span class="hm-badge hm-badge--product">Product aware</span><p><strong>They think:</strong> &ldquo;I've seen you. Does it actually work for people like me?&rdquo;</p><p><strong>Your hook's job:</strong> prove it, and help them see themselves using it.</p></li>
        <li><span class="hm-badge hm-badge--most">Most aware</span><p><strong>They think:</strong> &ldquo;I want it. I just haven't bought yet.&rdquo;</p><p><strong>Your hook's job:</strong> remove the last objection and give them a reason to act now.</p></li>
      </ol>
      <div class="hm-callout hm-callout--tip">
        <span class="hm-callout__icon" aria-hidden="true">&#x1F4A1;</span>
        <p><strong>Awareness isn't the same as targeting.</strong> A broad audience contains people at every level, so let the hook do the qualifying. Retargeting audiences sit mostly at product aware and most aware.</p>
      </div>
      <div class="hm-callout hm-callout--navy">
        <span class="hm-callout__icon" aria-hidden="true">&#x26A1;</span>
        <p><strong>The one rule: one hook type per ad.</strong> Vary the hook type, not just the wording. Three ads with the same argument and different footage are one ad, and you'll never learn what actually worked.</p>
      </div>
      <div class="hm-callout hm-callout--tip">
        <span class="hm-callout__icon" aria-hidden="true">&#x23F1;&#xFE0F;</span>
        <p><strong>Use it in under two minutes:</strong> pick your persona's awareness level, find the emotion your persona is feeling, copy the template, fill the brackets with words lifted from real reviews, then brief it.</p>
      </div>
    </section>

    <div class="hm-filters" role="search">
      <div class="hm-chips" role="group" aria-label="Filter by awareness level">
        <button class="chip is-active" type="button" data-filter="all">All</button>
        <button class="chip" type="button" data-filter="unaware">Unaware</button>
        <button class="chip" type="button" data-filter="problem">Problem aware</button>
        <button class="chip" type="button" data-filter="solution">Solution aware</button>
        <button class="chip" type="button" data-filter="product">Product aware</button>
        <button class="chip" type="button" data-filter="most">Most aware</button>
      </div>
      <label class="search hm-search">
        ${searchIcon}
        <span class="sr-only">Search hooks</span>
        <input type="search" placeholder="Search hooks..." data-hook-search autocomplete="off">
      </label>
      <p class="hm-count" data-hook-count aria-live="polite"></p>
    </div>
${sectionHtml}

    <section class="hm-section" id="openers" data-stage="all">
      <div class="hm-section__tags">
        <span class="hm-badge hm-badge--plain">Any level</span>
      </div>
      <h2>Section 7: Quick-fire openers</h2>
      <p class="hm-sub">${totalOpeners} first lines that work in almost any niche</p>
      <div class="hm-prose">
        <p>Short, punchy openers to drop straight into a script. They're not tied to one persona, so pair each one with a specific moment or failed solution from the sections above. Tap any line to copy it.</p>
      </div>
      <div class="hm-openers">
${openersHtml}
      </div>
    </section>

    <p class="hm-empty" data-hook-empty hidden>No hooks match that search. Try a broader word like &ldquo;sleep&rdquo;, &ldquo;proof&rdquo; or &ldquo;Sunday&rdquo;.</p>

    <section class="hm-section" id="testing">
      <h2>Section 8: How to test hooks</h2>
      <p class="hm-sub">A hook bank is a starting point. Testing turns it into an advantage.</p>
      <ol class="cs-steps hm-steps">
        <li class="cs-step">
          <span class="cs-step__num">01</span>
          <div>
            <h3>Start with the persona, not the hook</h3>
            <p>Pick one persona and one angle first. Then pull three to five hooks of different types that all argue for that same angle.</p>
          </div>
        </li>
        <li class="cs-step">
          <span class="cs-step__num">02</span>
          <div>
            <h3>Change one thing only</h3>
            <p>Same body, same edit, same offer. Only the first three seconds change. Otherwise you can't tell whether the hook won or something else did.</p>
          </div>
        </li>
        <li class="cs-step">
          <span class="cs-step__num">03</span>
          <div>
            <h3>Judge hooks on hook metrics</h3>
            <p>Read the 3-second hook rate first, then the 15-second hold rate. CPA and ROAS matter, but they're shaped by the whole ad, not just the opening line.</p>
          </div>
        </li>
        <li class="cs-step">
          <span class="cs-step__num">04</span>
          <div>
            <h3>Give it enough spend to speak</h3>
            <p>Don't kill a hook after a day. Let every variation spend evenly until the numbers settle into a pattern, then make the call.</p>
          </div>
        </li>
        <li class="cs-step">
          <span class="cs-step__num">05</span>
          <div>
            <h3>Iterate on the winner before moving on</h3>
            <p>Give the winning hook type new visuals, a new persona and new wording before you test a different type. Squeeze every learning out of what already works.</p>
          </div>
        </li>
        <li class="cs-step">
          <span class="cs-step__num">06</span>
          <div>
            <h3>Log every result</h3>
            <p>Losers teach as much as winners. Every test should feed the next brief, so over time you build a hook playbook nobody else has: one based on how your audience actually behaves.</p>
          </div>
        </li>
      </ol>

      <h3 class="hm-h3">Hook testing log</h3>
      <p class="hm-small">Copy this into your own tracker. One row per hook.</p>
      <div class="hm-table-wrap hm-table-wrap--scroll">
        <table class="hm-table hm-table--log">
          <thead>
            <tr><th>Hook #</th><th>Hook type</th><th>Persona</th><th>Awareness</th><th>3s hook rate</th><th>15s hold rate</th><th>CTR</th><th>CPA</th><th>Verdict</th></tr>
          </thead>
          <tbody>
            <tr><td>01</td><td>The daily moment</td><td>Afternoon crasher</td><td>Unaware</td><td>&middot;</td><td>&middot;</td><td>&middot;</td><td>&middot;</td><td>&middot;</td></tr>
            <tr><td>35</td><td>The converted sceptic</td><td>Wellness sceptic</td><td>Product aware</td><td>&middot;</td><td>&middot;</td><td>&middot;</td><td>&middot;</td><td>&middot;</td></tr>
            <tr><td>51</td><td>The objection, out loud</td><td>Price-conscious</td><td>Most aware</td><td>&middot;</td><td>&middot;</td><td>&middot;</td><td>&middot;</td><td>&middot;</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="hm-section" id="checklist">
      <h2>Section 9: Pre-brief checklist</h2>
      <p class="hm-sub">Six questions to ask before any hook goes to a creator</p>
      <ul class="hm-checklist">
        <li><label><input type="checkbox"><span><strong>Does it name a moment, not a state?</strong> &ldquo;On your third coffee by 3pm&rdquo;, not &ldquo;always tired&rdquo;.</span></label></li>
        <li><label><input type="checkbox"><span><strong>Would your persona say these words out loud?</strong> If not, go back to the reviews and borrow their language.</span></label></li>
        <li><label><input type="checkbox"><span><strong>Does the first frame match the first line?</strong> A pain hook over a pack shot breaks the spell before the first second ends.</span></label></li>
        <li><label><input type="checkbox"><span><strong>Is it one hook type, not two stitched together?</strong> Combine formulas and you lose the signal.</span></label></li>
        <li><label><input type="checkbox"><span><strong>Does it work with the sound off?</strong> Most people scroll muted, so put the hook on screen as text too.</span></label></li>
        <li><label><input type="checkbox"><span><strong>Is every number and claim true and provable?</strong> If you can't back it up, don't say it.</span></label></li>
      </ul>
    </section>

    <div class="cta-band hm-cta">
      <div>
        <h2>Want hooks built from your customers' own words?</h2>
        <p>I mine your reviews, build the personas and write hooks that speak to why people actually buy. Grab a 30-minute call.</p>
      </div>
      <a class="btn btn--light" href="../index.html#book">Book a call <span class="arrow">&rarr;</span></a>
    </div>

  </article>
</div>

</main>

` +
  footer;

// Full matrix is private: served only by the Worker at /resources/hook-matrix
// to people with a valid access link. Root-absolute paths so it works from any URL.
fs.mkdirSync(path.join(OUT, "_gated"), { recursive: true });
const gated = matrix
  .replace(/(href|src)="\.\.\//g, '$1="/')
  .replace(/href="index\.html"/g, 'href="/resources/"')
  .replace("<head>", '<head>\n<meta name="robots" content="noindex">');
fs.writeFileSync(path.join(OUT, "_gated", "hook-matrix.html"), gated);

/* ============================== OPT-IN PAGES ============================== */
// Every email-gated resource gets the same sign-up page; only the copy changes.
function optinPage(c) {
  return head(c.description, c.ogTitle) +
  header +
  `
<main>

<div class="shell page-head optin">
  <div class="optin__copy">
    <a class="cs-back" href="index.html">&larr; All resources</a>
    <div class="hm-head__meta">
      <span class="res-icon" aria-hidden="true">${c.icon}</span>
      <span>${c.label}</span>
    </div>
    <h1 class="display res-title">${c.title}</h1>
    <p class="optin__kicker">${c.kicker}</p>
    <p class="section-lead">${c.lead}</p>
    <ul class="optin__list">
${c.bullets.map((b) => `      <li>${b}</li>`).join("\n")}
    </ul>
    <div class="optin__preview" aria-hidden="true">
      <div class="res-stack">
${c.preview.map((p) => `        <div class="res-stack__card"><span>${p[0]}</span>${p[1]}</div>`).join("\n")}
      </div>
    </div>
  </div>

  <div class="optin__card" id="get-access">
    <form class="optin__form" data-lead-form data-resource="${c.slug}" novalidate>
      <h2>Get instant access</h2>
      <p class="optin__sub">Pop your details in and I'll email you your personal link. Fields marked <span class="req">*</span> are required.</p>
      <p class="optin__alert" data-lead-invalid hidden>That access link didn't work. Fill this in and I'll send you a fresh one.</p>

      <label class="field">
        <span>Name <abbr class="req" title="required">*</abbr></span>
        <input type="text" name="name" autocomplete="name" required maxlength="80" placeholder="Your name">
      </label>
      <label class="field">
        <span>Profession <abbr class="req" title="required">*</abbr></span>
        <select name="profession" required>
          <option value="" selected disabled>Select your role</option>
          <option>Founder / CEO</option>
          <option>Head of marketing / CMO</option>
          <option>Growth or performance marketer</option>
          <option>Creative strategist</option>
          <option>Media buyer</option>
          <option>Agency owner</option>
          <option>Freelancer</option>
          <option>UGC creator</option>
          <option value="Other">Other</option>
        </select>
      </label>
      <label class="field" data-other-field hidden>
        <span>Your profession <abbr class="req" title="required">*</abbr></span>
        <input type="text" name="profession_other" maxlength="80" placeholder="e.g. Brand manager">
      </label>
      <label class="field">
        <span>Email <abbr class="req" title="required">*</abbr></span>
        <input type="email" name="email" autocomplete="email" required maxlength="254" placeholder="you@company.com">
      </label>
      <div class="field field--hp" aria-hidden="true">
        <label for="hp-check">Leave this field empty</label>
        <input type="text" id="hp-check" name="hp_check" tabindex="-1" autocomplete="off" data-lpignore="true" data-1p-ignore>
      </div>
      <label class="optin__consent">
        <input type="checkbox" name="consent">
        <span>Also send me occasional creative strategy insights. Unsubscribe any time.</span>
      </label>

      <button class="btn btn--primary optin__submit" type="submit" disabled>${c.button} <span class="arrow">&rarr;</span></button>
      <p class="optin__error" data-lead-error role="alert" hidden></p>
      <p class="optin__note">I'll use your details to send you ${c.name} and keep a record of your request. No spam.</p>
    </form>

    <div class="optin__done" data-lead-done hidden>
      <span class="optin__done-icon" aria-hidden="true">&#x1F4EC;</span>
      <h2>Check your inbox</h2>
      <p>Your personal link to ${c.name} is on its way to <strong data-lead-email></strong>. It can take a minute or two to arrive.</p>
      <div class="optin__spam">
        <span class="optin__spam-icon" aria-hidden="true">&#x26A0;&#xFE0F;</span>
        <p><strong>Can't see it? Check your spam or junk folder.</strong> If it's there, move it to your inbox and mark it as &ldquo;not spam&rdquo; so the link works properly and future emails from me reach you.</p>
      </div>
    </div>
  </div>
</div>

</main>

` +
  footer;
}

const acm = require("./gen-acm.js")({ head, header, footer, esc, OUT, fs, path });

fs.writeFileSync(
  path.join(OUT, "ad-copy-matrix.html"),
  optinPage({
    slug: "ad-copy-matrix",
    name: "the Ad Copy Matrix",
    description: `Get the free Ad Copy Matrix: ${acm.total} copy and script frameworks for DTC ads on Meta, tagged by format and level of awareness.`,
    ogTitle: `The Ad Copy Matrix: ${acm.total} copy & script frameworks for DTC ads on Meta`,
    icon: "&#x1F9E9;",
    label: "Free framework library",
    title: "The Ad Copy Matrix",
    kicker: `${acm.total} copy &amp; script frameworks for DTC ads on Meta`,
    lead: "Script structures that will help you turn attention into sales. Every framework broken into beats, tagged by format and level of awareness, with worked examples you can brief from today.",
    bullets: [
      `<strong>${acm.copy} copy formulas</strong> that work as video scripts, static copy and primary text`,
      `<strong>${acm.video} video script structures</strong> with timed beats and why each one works`,
      `<strong>${acm.statics} static formats</strong> with the layout and the copy for every slot`,
      `<strong>A matrix of what to use when</strong>, plus ${acm.primary} primary text patterns`,
    ],
    preview: ACM_PREVIEW,
    button: "Send me the matrix",
  })
);

fs.writeFileSync(
  path.join(OUT, "hook-matrix.html"),
  optinPage({
    slug: "hook-matrix",
    name: "the Hook Matrix",
    description: `Get the free Hook Matrix: ${totalHooks} hook formulas and ${totalOpeners} quick-fire openers for Meta ads, sorted by level of awareness.`,
    ogTitle: "The Hook Matrix: 60 hook formulas for scroll-stopping Meta ads",
    icon: "&#x1F3AF;",
    label: "Free hook bank",
    title: "The Hook Matrix",
    kicker: `${totalHooks} hook formulas for scroll-stopping Meta ads`,
    lead: "The hook bank I use to brief creators: every formula sorted by emotion and level of awareness, with a fill-in template and worked examples you can steal today.",
    bullets: [
      `<strong>${totalHooks} hook formulas</strong> across all five levels of awareness, from unaware to most aware`,
      "<strong>Fill-in templates</strong> with worked examples for health &amp; wellness and alcohol-free brands",
      `<strong>${totalOpeners} quick-fire openers</strong> that work in almost any niche`,
      "<strong>A hook testing protocol</strong>, testing log and pre-brief checklist",
    ],
    preview: HOOK_PREVIEW,
    button: "Send me the matrix",
  })
);

fs.writeFileSync(
  path.join(OUT, "profitability-calculator.html"),
  optinPage({
    slug: "profitability-calculator",
    name: "the calculator",
    description: "Get the free Meta Profitability Calculator: find the exact CPA and ROAS you need to make money on Meta, after every cost, including creative.",
    ogTitle: "The Meta Profitability Calculator",
    icon: "&#x1F4B7;",
    label: "Free calculator",
    title: "The Meta Profitability Calculator",
    kicker: "Find the CPA and ROAS you need to make money on Meta",
    lead: "Ten quick questions, then the exact numbers you need to hit on Meta after every cost: VAT, product, payment fees, returns, agency fees and creative.",
    bullets: [
      "<strong>Your break-even CPA and ROAS</strong>, so you know the line you can't cross",
      "<strong>Your target CPA and ROAS</strong> for the profit you actually want",
      "<strong>Where every &pound;1 of order value goes</strong>, from VAT to profit",
      "<strong>A what-if slider</strong> showing what better creative is worth to you each month",
    ],
    preview: CALC_PREVIEW,
    button: "Get the calculator",
  })
);

/* ================================== HUB ================================== */
const hub =
  head(
    "Free creative strategy resources for Meta ads: hook banks, frameworks and playbooks used with growth-stage health & wellness brands.",
    "The Creative Strategy Vault | Anthony Sprackling"
  ) +
  header +
  `
<main>

<header class="shell page-head res-head">
  <span class="res-icon" aria-hidden="true">&#x2728;</span>
  <p class="eyebrow cs-eyebrow">Free resources</p>
  <h1 class="display res-title">The Creative Strategy Vault</h1>
  <p class="section-lead" style="max-width:42rem">
    The frameworks, hook banks and playbooks I use with growth-stage brands to make
    Meta ads that actually convert. Free to use, steal and brief from.
  </p>
  <label class="search res-search">
    ${searchIcon}
    <span class="sr-only">Search resources</span>
    <input type="search" placeholder="Search resources..." data-res-search autocomplete="off">
  </label>
</header>

<div class="shell res-body">

  <section class="res-group" data-res-group>
    <h2 class="res-group__title"><span aria-hidden="true">&#x2B50;</span> New resources</h2>

    <a class="res-feature reveal" href="ad-copy-matrix.html" data-res-item data-keywords="copy copywriting scripts script frameworks aida pas bab fab pastor video static primary text ugc awareness">
      <div class="res-feature__copy">
        <p class="eyebrow res-feature__eyebrow">New &middot; Framework library</p>
        <h3>The Ad Copy Matrix: ${acm.total} copy &amp; script frameworks for DTC ads on Meta</h3>
        <p>Script structures that will help you turn attention into sales. Copy formulas, video scripts and static formats, tagged by awareness level with worked examples.</p>
        <span class="btn btn--light">Get the free matrix <span class="arrow">&rarr;</span></span>
      </div>
      <div class="res-stack" aria-hidden="true">
${ACM_PREVIEW.map((p) => `        <div class="res-stack__card"><span>${p[0]}</span>${p[1]}</div>`).join("\n")}
      </div>
    </a>

    <a class="res-feature reveal" style="margin-top:1rem" href="profitability-calculator.html" data-res-item data-keywords="calculator profit profitability cpa roas break-even margin aov budget numbers">
      <div class="res-feature__copy">
        <p class="eyebrow res-feature__eyebrow">New &middot; Calculator</p>
        <h3>The Meta Profitability Calculator</h3>
        <p>Find the exact CPA and ROAS you need to make money on Meta, after every cost, including creative. Ten quick questions, then your break-even and target numbers.</p>
        <span class="btn btn--light">Get the free calculator <span class="arrow">&rarr;</span></span>
      </div>
      <div class="res-stack" aria-hidden="true">
${CALC_PREVIEW.map((p) => `        <div class="res-stack__card"><span>${p[0]}</span>${p[1]}</div>`).join("\n")}
      </div>
    </a>

    <a class="res-feature reveal" style="margin-top:1rem" href="hook-matrix.html" data-res-item data-keywords="hooks hook bank matrix formulas templates copywriting scripts ugc awareness unaware problem solution product most aware">
      <div class="res-feature__copy">
        <p class="eyebrow res-feature__eyebrow">New &middot; Hook bank</p>
        <h3>The Hook Matrix: ${totalHooks} hook formulas for scroll-stopping Meta ads</h3>
        <p>Fill-in templates sorted by emotion and level of awareness, with worked examples for health &amp; wellness and alcohol-free brands. Plus ${totalOpeners} quick-fire openers and a testing protocol.</p>
        <span class="btn btn--light">Get the free matrix <span class="arrow">&rarr;</span></span>
      </div>
      <div class="res-stack" aria-hidden="true">
        <div class="res-stack__card"><span>Moment &middot; Unaware</span>&ldquo;It's 10am and you're already counting down to bedtime.&rdquo;</div>
        <div class="res-stack__card"><span>Proof &middot; Product aware</span>&ldquo;Day 1 vs day 30 of swapping my afternoon coffee.&rdquo;</div>
        <div class="res-stack__card"><span>Objection &middot; Most aware</span>&ldquo;Isn't it just expensive vitamins?&rdquo;</div>
      </div>
    </a>
  </section>

  <section class="res-group" data-res-group>
    <h2 class="res-group__title"><span aria-hidden="true">&#x1F4DA;</span> All resources</h2>
    <div class="res-grid">
      <!--
        To add a new lead magnet, copy this block, change the href, emoji, title,
        meta line and keywords, and paste it at the top of the grid.
      -->
      <a class="res-tile" href="ad-copy-matrix.html" data-res-item data-keywords="copy copywriting scripts script frameworks aida pas bab fab pastor video static primary text ugc awareness">
        <span class="res-tile__icon" aria-hidden="true">&#x1F9E9;</span>
        <span>
          <span class="res-tile__title">The Ad Copy Matrix: ${acm.total} frameworks</span>
          <span class="res-tile__meta">Framework library &middot; Free</span>
        </span>
        <span class="res-tile__arrow" aria-hidden="true">&rarr;</span>
      </a>

      <a class="res-tile" href="profitability-calculator.html" data-res-item data-keywords="calculator profit profitability cpa roas break-even margin aov budget numbers">
        <span class="res-tile__icon" aria-hidden="true">&#x1F4B7;</span>
        <span>
          <span class="res-tile__title">The Meta Profitability Calculator</span>
          <span class="res-tile__meta">Calculator &middot; Free</span>
        </span>
        <span class="res-tile__arrow" aria-hidden="true">&rarr;</span>
      </a>

      <a class="res-tile" href="hook-matrix.html" data-res-item data-keywords="hooks hook bank matrix formulas templates copywriting scripts ugc awareness unaware problem solution product most aware">
        <span class="res-tile__icon" aria-hidden="true">&#x1F3AF;</span>
        <span>
          <span class="res-tile__title">The Hook Matrix: ${totalHooks} hook formulas</span>
          <span class="res-tile__meta">Hook bank &middot; Free</span>
        </span>
        <span class="res-tile__arrow" aria-hidden="true">&rarr;</span>
      </a>

      <a class="res-tile res-tile--soon" href="https://anthonysprackling.substack.com/" target="_blank" rel="noopener noreferrer">
        <span class="res-tile__icon" aria-hidden="true">&#x1F4EC;</span>
        <span>
          <span class="res-tile__title">More dropping soon</span>
          <span class="res-tile__meta">Get new resources first via the newsletter</span>
        </span>
        <span class="res-tile__arrow" aria-hidden="true">&#8599;</span>
      </a>
    </div>
    <p class="res-empty" data-res-empty hidden>Nothing matches that yet. New resources land here regularly.</p>
  </section>

</div>

<div class="shell" style="padding-bottom:6rem;padding-top:3rem">
  <div class="cta-band">
    <div>
      <h2>Want these applied to your brand?</h2>
      <p>Grab a 30-minute call and we'll work out where persona-led creative strategy could take your ads.</p>
    </div>
    <a class="btn btn--light" href="../index.html#book">Book a call <span class="arrow">&rarr;</span></a>
  </div>
</div>

</main>

` +
  footer;

fs.writeFileSync(path.join(OUT, "index.html"), hub);
console.log("hooks:", totalHooks, "openers:", totalOpeners);
