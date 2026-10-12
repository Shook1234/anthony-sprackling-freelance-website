// Builds resources/_gated/ad-copy-matrix.html from acm-data.js.
// Called from gen-resources.js so it shares the site head/header/footer.
const D = require("./acm-data.js");

module.exports = function buildAcm({ head, header, footer, esc, OUT, fs, path }) {
  const LEVELS = D.LEVELS;
  const LEVEL_NAME = Object.fromEntries(LEVELS);
  const pad = (n) => String(n).padStart(2, "0");
  const nl = (s) => esc(s).replace(/\n/g, "<br>");

  // Which awareness group each video sits under on the page
  const VIDEO_GROUP = {
    "pattern-interrupt": "unaware", "founder-story": "unaware", "silent-demo": "unaware", "organic-pov": "unaware", "us-vs-the-world": "unaware",
    "hook-hold-payoff": "problem", "problem-solution": "problem", "myth-buster": "problem", "wrong-way-right-way": "problem", "three-reasons": "problem",
    "podcast-style": "solution", "false-objection": "solution", "expert-authority": "solution", "why-i-switched": "solution",
    "honest-review": "product", "before-and-after": "product", "reply-to-comment": "product", "testimonial-mashup": "product",
    "objection-demolisher": "most", "quick-math": "most", "offer-stack": "most",
  };

  const badges = (aware) => aware.map((a) => `<span class="hm-badge hm-badge--${a}">${LEVEL_NAME[a]}</span>`).join("");
  const nicheLabel = (k) => (k === "hw" ? "Health &amp; wellness" : "Alcohol-free");

  let n = 0;
  const fit = (f) => `
        <div class="acm-fit">
          <div><h4>Best for</h4><p>${esc(f.bestFor)}</p></div>
          <div><h4>Avoid when</h4><p>${esc(f.avoid)}</p></div>
        </div>`;

  function cardHead(f, format, extraMeta, flow) {
    return `
      <button class="acm-card__head" type="button" aria-expanded="false" aria-controls="f-${f.id}-body">
        <span class="acm-card__num">${pad(f.num)}</span>
        <span class="acm-card__main">
          <span class="acm-card__title"><span class="acm-card__name">${esc(f.name)}</span>${f.expand ? `<span class="acm-card__expand">${esc(f.expand)}</span>` : ""}</span>
          <span class="acm-card__one">${esc(f.one)}</span>
          ${flow ? `<span class="acm-flow">${flow.map((b) => `<span>${esc(b)}</span>`).join("")}</span>` : ""}
          <span class="acm-card__tags">${badges(f.aware)}${extraMeta ? `<span class="acm-card__meta">${extraMeta}</span>` : ""}</span>
        </span>
        <span class="acm-card__chev" aria-hidden="true"></span>
      </button>`;
  }

  const cardOpen = (f, format) =>
    `    <article class="acm-card" id="f-${f.id}" data-acm-card data-format="${format}" data-aware="${f.aware.join(" ")}">`;

  /* ---------- Copy formula cards ---------- */
  function copyCard(f) {
    const rows = f.beats
      .map(([beat, what, why]) => `
            <tr><td class="acm-beat" data-label="Beat">${esc(beat)}</td><td data-label="What to write">${esc(what)}</td><td class="acm-why" data-label="Why it works">${esc(why)}</td></tr>`)
      .join("");
    return `${cardOpen(f, "copy")}${cardHead(f, "copy", "Video, static &amp; primary text", f.beats.map((b) => b[0]))}
      <div class="acm-card__body" id="f-${f.id}-body" hidden>${fit(f)}
        <div class="hm-table-wrap"><table class="hm-table hm-table--cards acm-table">
          <thead><tr><th>Beat</th><th>What to write</th><th>Why it works</th></tr></thead>
          <tbody>${rows}
          </tbody>
        </table></div>
        <div class="acm-template">
          <p class="acm-label">Fill-in template</p>
          <p class="hm-template">${esc(f.template)}</p>
          <button class="hm-copy" type="button" data-copy="${esc(f.template)}">Copy</button>
        </div>
        <div class="acm-examples">
          <div class="acm-example"><p class="acm-label">Health &amp; wellness</p><p>${esc(f.hw)}</p></div>
          <div class="acm-example"><p class="acm-label">Alcohol-free</p><p>${esc(f.af)}</p></div>
        </div>
        <p class="acm-pairs"><span class="acm-label">Pairs well with</span> <a href="/resources/hook-matrix">Hook Matrix</a> ${esc(f.pairs)}</p>
      </div>
    </article>`;
  }

  /* ---------- Video cards ---------- */
  function videoCard(f) {
    const rows = f.beats
      .map(([time, beat, screen, say, why]) => `
            <tr><td class="acm-time" data-label="Time">${esc(time)}</td><td class="acm-beat" data-label="Beat">${esc(beat)}</td><td data-label="On screen">${esc(screen)}</td><td data-label="Say">${esc(say)}</td><td class="acm-why" data-label="Why it works">${esc(why)}</td></tr>`)
      .join("");
    const script = f.script
      .map(([t, line]) => `<li><span>${esc(t)}</span><p>${esc(line)}</p></li>`)
      .join("");
    const meta = `${esc(f.length)} &middot; ${esc(f.led)} &middot; ${esc(f.complexity)}`;
    return `${cardOpen(f, "video")}${cardHead(f, "video", meta, f.beats.map((b) => b[1]))}
      <div class="acm-card__body" id="f-${f.id}-body" hidden>${fit(f)}
        <div class="hm-table-wrap"><table class="hm-table hm-table--cards acm-table acm-table--video">
          <thead><tr><th>Time</th><th>Beat</th><th>On screen</th><th>Say</th><th>Why it works</th></tr></thead>
          <tbody>${rows}
          </tbody>
        </table></div>
        <div class="acm-script">
          <p class="acm-label">Worked example &middot; ${nicheLabel(f.ex)}</p>
          <ol>${script}</ol>
        </div>
        <div class="hm-callout hm-callout--tip"><span class="hm-callout__icon" aria-hidden="true">&#x1F4A1;</span><p><strong>Pro tip:</strong> ${esc(f.tip)}</p></div>
      </div>
    </article>`;
  }

  /* ---------- Static wireframes ---------- */
  const bar = (m) => `<span class="wf-bar wf-bar--${m}"></span>`;
  const WIRE = {
    hero: `${bar("lg")}${bar("md")}<span class="wf-img"></span><span class="wf-pill"></span>`,
    stat: `<span class="wf-num">160</span>${bar("md")}${bar("sm")}<span class="wf-pill"></span>`,
    native: `<span class="wf-notes-top"></span>${bar("md")}${bar("lg")}${bar("lg")}${bar("md")}${bar("lg")}${bar("sm")}`,
    negative: `<span class="wf-bar wf-bar--lg wf-strike"></span>${bar("md")}${bar("sm")}<span class="wf-img"></span>`,
    listicle: `${bar("lg")}<span class="wf-row wf-row--x"></span><span class="wf-row wf-row--x"></span><span class="wf-row wf-row--x"></span><span class="wf-row wf-row--tick"></span><span class="wf-img wf-img--sm"></span>`,
    vs: `${bar("md")}<span class="wf-vs"><span><i class="wf-dot wf-dot--yes"></i><i class="wf-dot wf-dot--yes"></i><i class="wf-dot wf-dot--yes"></i></span><span><i class="wf-dot wf-dot--no"></i><i class="wf-dot wf-dot--no"></i><i class="wf-dot wf-dot--no"></i></span></span>`,
    features: `<span class="wf-orbit"><i></i><i></i><i></i><i></i><b></b></span>`,
    proof: `<span class="wf-stars"></span>${bar("lg")}${bar("lg")}${bar("md")}<span class="wf-avatar"></span>`,
    beforeafter: `<span class="wf-split"><span></span><span></span><b></b></span>`,
    faq: `<span class="wf-bubble wf-bubble--q"></span><span class="wf-bubble wf-bubble--a"></span><span class="wf-pill"></span>`,
    offer: `${bar("md")}<span class="wf-row"></span><span class="wf-row"></span><span class="wf-row"></span><span class="wf-price"></span>`,
    carousel: `<span class="wf-frames"><span></span><span></span><span></span></span>`,
  };

  function staticCard(f) {
    const slots = f.slots.map(([s, g]) => `<tr><td class="acm-beat" data-label="Slot">${esc(s)}</td><td data-label="What goes here">${esc(g)}</td></tr>`).join("");
    const example = f.example.map(([s, t]) => `<div><dt>${esc(s)}</dt><dd>${esc(t)}</dd></div>`).join("");
    return `${cardOpen(f, "static")}${cardHead(f, "static", "Static", f.slots.map((s) => s[0]))}
      <div class="acm-card__body" id="f-${f.id}-body" hidden>${fit(f)}
        <div class="acm-static">
          <div class="wf wf--${f.wire}" aria-hidden="true">${WIRE[f.wire]}</div>
          <div class="hm-table-wrap"><table class="hm-table hm-table--cards acm-table">
            <thead><tr><th>Slot</th><th>What goes here</th></tr></thead>
            <tbody>${slots}</tbody>
          </table></div>
        </div>
        <div class="acm-example acm-example--static">
          <p class="acm-label">Worked example &middot; ${nicheLabel(f.ex)}</p>
          <dl>${example}</dl>
        </div>
        <div class="hm-callout hm-callout--tip"><span class="hm-callout__icon" aria-hidden="true">&#x1F4A1;</span><p><strong>Why it works:</strong> ${esc(f.why)}</p></div>
      </div>
    </article>`;
  }

  // Number everything 1..40 in page order
  D.copy.forEach((f) => (f.num = ++n));
  const videoOrder = LEVELS.flatMap(([lvl]) => D.video.filter((v) => VIDEO_GROUP[v.id] === lvl));
  if (videoOrder.length !== D.video.length) throw new Error("A video is missing a group");
  videoOrder.forEach((f) => (f.num = ++n));
  D.statics.forEach((f) => (f.num = ++n));
  const total = n;

  /* ---------- Matrix ---------- */
  const matrixRows = (list, label) =>
    `<tr class="acm-matrix__group"><th colspan="6">${label}</th></tr>` +
    list
      .map(
        (f) =>
          `<tr><th scope="row"><a href="#f-${f.id}" data-acm-open>${pad(f.num)} ${esc(f.name)}</a></th>${LEVELS.map(
            ([lvl, name]) => `<td>${f.aware.includes(lvl) ? `<span class="acm-dot acm-dot--${lvl}" role="img" aria-label="${name}"></span>` : ""}</td>`
          ).join("")}</tr>`
      )
      .join("");

  const matrix = `
      <div class="hm-table-wrap hm-table-wrap--scroll acm-matrix-wrap">
        <table class="acm-matrix">
          <thead><tr><th>Framework</th>${LEVELS.map(([lvl, name]) => `<th><span class="hm-badge hm-badge--${lvl}">${name}</span></th>`).join("")}</tr></thead>
          <tbody>
            ${matrixRows(D.copy, "Copy formulas")}
            ${matrixRows(videoOrder, "Video scripts")}
            ${matrixRows(D.statics, "Static formats")}
          </tbody>
        </table>
      </div>`;

  /* ---------- Sections ---------- */
  const videoGroups = LEVELS.map(([lvl, name]) => {
    const list = videoOrder.filter((v) => VIDEO_GROUP[v.id] === lvl);
    return `
      <div class="acm-group" data-acm-group>
        <h3 class="acm-group__title"><span class="hm-badge hm-badge--${lvl}">${name}</span> ${list.length} structures</h3>
${list.map(videoCard).join("\n")}
      </div>`;
  }).join("\n");

  const primary = D.primary
    .map(
      (p) => `
        <div class="acm-pt" data-acm-pt>
          <h3>${esc(p.name)}</h3>
          <p class="acm-pt__when">${esc(p.when)}</p>
          <p>${esc(p.how)}</p>
          <div class="acm-pt__ex"><p class="acm-label">Example</p><p>${nl(p.ex)}</p></div>
        </div>`
    )
    .join("");

  const toc = [
    ["why-copy", "Why copy matters now"],
    ["levels", "The five levels"],
    ["matrix", "The matrix"],
    ["copy-formulas", "Copy formulas"],
    ["video-scripts", "Video scripts"],
    ["static-formats", "Static formats"],
    ["primary-text", "Primary text"],
  ];

  const page =
    head(
      `${total} copy and script frameworks for DTC ads on Meta: copy formulas, video script structures and static formats, tagged by awareness level with worked examples.`,
      `The Ad Copy Matrix: ${total} copy & script frameworks for DTC ads on Meta`
    ) +
    header +
    `
<main>

<header class="shell page-head hm-head">
  <a class="cs-back" href="index.html">&larr; All resources</a>
  <div class="hm-head__meta">
    <span class="res-icon" aria-hidden="true">&#x1F9E9;</span>
    <span>Copy framework library &middot; 15 min read</span>
  </div>
  <h1 class="display res-title">The Ad Copy Matrix: ${total} copy &amp; script frameworks for DTC ads on Meta</h1>
  <p class="section-lead" style="max-width:46rem">
    Script structures that will help you turn attention into sales. Every framework is broken
    into beats, tagged by format and level of awareness, with why each beat works and worked
    examples you can brief from today.
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

    <section class="hm-section hm-section--first" id="why-copy">
      <h2>Why copy matters now</h2>
      <p class="hm-sub">The hook stops the scroll. The body does the selling.</p>
      <div class="hm-prose">
        <p>Copy used to be how you persuaded someone to buy. Now it's also how you tell Meta who the ad is for. With broad targeting, the algorithm reads your creative to decide who to show it to, so clear, specific messaging means better delivery and more stable performance.</p>
        <p>That's why the framework comes third, not first. Every strong ad is built in the same order:</p>
      </div>
      <ol class="acm-chain">
        <li><span>01</span><strong>Insight</strong><p>What your customer already thinks or feels.</p></li>
        <li><span>02</span><strong>Message</strong><p>The single idea this ad will land.</p></li>
        <li><span>03</span><strong>Structure</strong><p>The framework that carries it. This page.</p></li>
        <li><span>04</span><strong>Execution</strong><p>The words, the tone and the format.</p></li>
      </ol>
      <div class="hm-callout hm-callout--navy">
        <span class="hm-callout__icon" aria-hidden="true">&#x26A1;</span>
        <p><strong>The one rule: one framework per ad, matched to the problem, not the product.</strong> Pick the framework after the insight, never before. Forcing a framework onto a weak insight just gives you a well-structured ad that says nothing.</p>
      </div>
      <div class="hm-callout hm-callout--warn">
        <span class="hm-callout__icon" aria-hidden="true">&#x26A0;&#xFE0F;</span>
        <p><strong>The worked examples are illustrations.</strong> Swap in your own numbers, reviews and claims, and only say what you can prove. In health &amp; wellness especially, every claim needs to stand up to Meta's ad review and the ASA.</p>
      </div>
    </section>

    <section class="hm-section" id="levels">
      <h2>The five levels of awareness</h2>
      <p class="hm-sub">Every framework is tagged with the levels it works best for.</p>
      <ol class="hm-ladder">
        <li><span class="hm-badge hm-badge--unaware">Unaware</span><p><strong>They think:</strong> &ldquo;This is just how things are.&rdquo;</p><p><strong>Your copy's job:</strong> make them realise it's a problem worth solving.</p></li>
        <li><span class="hm-badge hm-badge--problem">Problem aware</span><p><strong>They think:</strong> &ldquo;I need to fix this, but nothing works.&rdquo;</p><p><strong>Your copy's job:</strong> show you understand, then introduce a better way.</p></li>
        <li><span class="hm-badge hm-badge--solution">Solution aware</span><p><strong>They think:</strong> &ldquo;I know what's out there. Why this one?&rdquo;</p><p><strong>Your copy's job:</strong> differentiate, and win the comparison.</p></li>
        <li><span class="hm-badge hm-badge--product">Product aware</span><p><strong>They think:</strong> &ldquo;Does it actually work for people like me?&rdquo;</p><p><strong>Your copy's job:</strong> prove it with proof that isn't yours.</p></li>
        <li><span class="hm-badge hm-badge--most">Most aware</span><p><strong>They think:</strong> &ldquo;I want it. I just haven't bought yet.&rdquo;</p><p><strong>Your copy's job:</strong> remove the last objection and give a reason to act now.</p></li>
      </ol>
      <p class="hm-small" style="margin-top:1rem">Want the opening line too? Each copy formula links to the hooks in <a href="/resources/hook-matrix" style="color:var(--blue);font-weight:600">The Hook Matrix</a> that pair well with it.</p>
    </section>

    <section class="hm-section" id="matrix">
      <h2>The matrix</h2>
      <p class="hm-sub">Every framework at a glance. Click a name to jump to its breakdown.</p>
${matrix}
    </section>

    <div class="hm-filters acm-filters" role="search">
      <div class="hm-chips" role="group" aria-label="Filter by format">
        <button class="chip is-active" type="button" data-acm-format="all">All formats</button>
        <button class="chip" type="button" data-acm-format="copy">Copy</button>
        <button class="chip" type="button" data-acm-format="video">Video</button>
        <button class="chip" type="button" data-acm-format="static">Static</button>
      </div>
      <div class="hm-chips" role="group" aria-label="Filter by awareness level">
        <button class="chip is-active" type="button" data-acm-aware="all">All levels</button>
${LEVELS.map(([lvl, name]) => `        <button class="chip" type="button" data-acm-aware="${lvl}">${name}</button>`).join("\n")}
      </div>
      <label class="search hm-search">
        <svg class="search__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <span class="sr-only">Search frameworks</span>
        <input type="search" placeholder="Search frameworks..." data-acm-search autocomplete="off">
      </label>
      <div class="acm-filters__end">
        <p class="hm-count" data-acm-count aria-live="polite"></p>
        <button class="acm-toggle-all" type="button" data-acm-expand>Expand all</button>
      </div>
    </div>

    <section class="hm-section" id="copy-formulas" data-acm-section>
      <div class="hm-section__tags"><span class="hm-badge hm-badge--plain">Video, static &amp; primary text</span></div>
      <h2>Section 1: Copy formulas</h2>
      <p class="hm-sub">${D.copy.length} formulas that structure any ad, in any format</p>
      <div class="hm-prose">
        <p>These are the building blocks. Each one works as a video script, as the copy on a static, or as primary text. Pick the one that matches your persona's awareness level and the problem you're solving, then fill in the beats.</p>
      </div>
      <div class="acm-group" data-acm-group>
${D.copy.map(copyCard).join("\n")}
      </div>
    </section>

    <section class="hm-section" id="video-scripts" data-acm-section>
      <div class="hm-section__tags"><span class="hm-badge hm-badge--plain">Video</span></div>
      <h2>Section 2: Video scripts</h2>
      <p class="hm-sub">${D.video.length} script structures, grouped by awareness level</p>
      <div class="hm-prose">
        <p>Each structure comes with timed beats, what's on screen, what to say and why each beat works. Timings are a guide for 15 to 45 second ads. Brief the beats, then let creators make the words their own.</p>
      </div>
${videoGroups}
    </section>

    <section class="hm-section" id="static-formats" data-acm-section>
      <div class="hm-section__tags"><span class="hm-badge hm-badge--plain">Static</span></div>
      <h2>Section 3: Static formats</h2>
      <p class="hm-sub">${D.statics.length} layouts, with the copy slots for each</p>
      <div class="hm-prose">
        <p>A static has about one second to land, so the layout does half the copywriting. Each format shows the layout, what goes in every slot, and a worked example.</p>
      </div>
      <div class="acm-group" data-acm-group>
${D.statics.map(staticCard).join("\n")}
      </div>
    </section>

    <p class="hm-empty" data-acm-empty hidden>No frameworks match those filters. Try &ldquo;All formats&rdquo; or a broader search like &ldquo;proof&rdquo; or &ldquo;price&rdquo;.</p>

    <section class="hm-section" id="primary-text">
      <div class="hm-section__tags"><span class="hm-badge hm-badge--plain">Primary text</span></div>
      <h2>Section 4: Primary text</h2>
      <p class="hm-sub">${D.primary.length} patterns for the caption above the ad</p>
      <div class="hm-prose">
        <p>Primary text is the copy above your creative. Only the first 125 characters or so show before &ldquo;See more&rdquo;, so the opening line matters most.</p>
      </div>
      <div class="hm-callout hm-callout--navy">
        <span class="hm-callout__icon" aria-hidden="true">&#x1F517;</span>
        <p><strong>The matching rule:</strong> the caption should continue the creative, not repeat it. Same angle, same persona, next beat. If the video names the problem, the caption can carry the proof.</p>
      </div>
      <div class="acm-pts">${primary}
      </div>
    </section>

    <div class="cta-band hm-cta">
      <div>
        <h2>Want these frameworks written for your brand?</h2>
        <p>I build personas from your reviews, then write scripts and statics that turn attention into sales. Grab a 30-minute call.</p>
      </div>
      <a class="btn btn--light" href="/index.html#book">Book a call <span class="arrow">&rarr;</span></a>
    </div>

  </article>
</div>

</main>

` +
    footer;

  // Private: served only by the Worker to people with an access link. Root-absolute paths.
  const gated = page
    .replace(/(href|src)="\.\.\//g, '$1="/')
    .replace(/href="index\.html"/g, 'href="/resources/"')
    .replace("<head>", '<head>\n<meta name="robots" content="noindex">');
  fs.writeFileSync(path.join(OUT, "_gated", "ad-copy-matrix.html"), gated);
  return { total, copy: D.copy.length, video: D.video.length, statics: D.statics.length, primary: D.primary.length };
};
