# Resource page sources (not served on the website)

The resource pages in `/resources` are generated from these files. Edit the content
here, then regenerate:

    node _src/gen-resources.js

- `hooks-data.js` - Hook Matrix content
- `acm-data.js` - Ad Copy Matrix content (copy formulas, video scripts, statics, primary text)
- `gen-acm.js` - builds `resources/_gated/ad-copy-matrix.html`
- `gen-resources.js` - builds everything else in `/resources` (hub, opt-in pages, Hook Matrix)

The Profitability Calculator (`resources/_gated/profitability-calculator.html`) is hand-written.
Email-gated resources also need an entry in `MAGNETS` in `worker/index.js`.
