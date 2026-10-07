/* ==========================================================================
   Resources hub + Hook Matrix: search, stage filters, copy buttons, TOC
   ========================================================================== */
(function () {
  "use strict";

  function normalise(text) {
    return text.toLowerCase().replace(/\s+/g, " ");
  }

  /* ---------- Hub search ---------- */
  function initHubSearch() {
    var input = document.querySelector("[data-res-search]");
    if (!input) return;
    var items = document.querySelectorAll("[data-res-item]");
    var empty = document.querySelector("[data-res-empty]");

    input.addEventListener("input", function () {
      var q = normalise(input.value.trim());
      var shown = 0;
      items.forEach(function (item) {
        var haystack = normalise(item.textContent + " " + (item.getAttribute("data-keywords") || ""));
        var match = !q || haystack.indexOf(q) !== -1;
        item.hidden = !match;
        if (match) shown++;
      });
      if (empty) empty.hidden = shown > 0;
    });
  }

  /* ---------- Hook filters + search ---------- */
  function initHookFilters() {
    var search = document.querySelector("[data-hook-search]");
    if (!search) return;
    var chips = document.querySelectorAll("[data-filter]");
    var sections = document.querySelectorAll(".hm-section[data-stage]");
    var count = document.querySelector("[data-hook-count]");
    var empty = document.querySelector("[data-hook-empty]");
    var total = document.querySelectorAll("[data-hook]").length;
    var stage = "all";

    function apply() {
      var q = normalise(search.value.trim());
      var shown = 0;

      sections.forEach(function (section) {
        var sectionStage = section.getAttribute("data-stage");
        var stageMatch = stage === "all" || sectionStage === stage || sectionStage === "all";
        var visibleInSection = 0;

        section.querySelectorAll("[data-hook]").forEach(function (row) {
          var match = stageMatch && (!q || normalise(row.textContent).indexOf(q) !== -1);
          row.hidden = !match;
          if (match) visibleInSection++;
        });

        section.querySelectorAll("[data-hook-group]").forEach(function (group) {
          group.hidden = !group.querySelector("[data-hook]:not([hidden])");
        });

        section.hidden = visibleInSection === 0;
        shown += visibleInSection;
      });

      if (count) count.textContent = "Showing " + shown + " of " + total + " hooks";
      if (empty) empty.hidden = shown > 0;
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        stage = chip.getAttribute("data-filter");
        chips.forEach(function (c) {
          c.classList.toggle("is-active", c === chip);
        });
        apply();
      });
    });

    search.addEventListener("input", apply);
    apply();
  }

  /* ---------- Copy to clipboard ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {
        return legacyCopy(text);
      });
    }
    return legacyCopy(text);
  }

  function legacyCopy(text) {
    return new Promise(function (resolve) {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy");
      } catch (e) {}
      document.body.removeChild(area);
      resolve();
    });
  }

  function initCopy() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-copy]");
      if (!btn) return;
      var label = btn.classList.contains("hm-opener") ? btn.querySelector(".hm-opener__hint") : btn;
      copyText(btn.getAttribute("data-copy")).then(function () {
        btn.classList.add("is-copied");
        label.textContent = "Copied";
        setTimeout(function () {
          btn.classList.remove("is-copied");
          label.textContent = "Copy";
        }, 1600);
      });
    });
  }

  /* ---------- Table of contents highlight ---------- */
  function initToc() {
    var links = document.querySelectorAll(".hm-toc a");
    if (!links.length || !("IntersectionObserver" in window)) return;
    var map = {};
    links.forEach(function (link) {
      map[link.getAttribute("href").slice(1)] = link;
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (l) {
            l.classList.remove("is-active");
          });
          var link = map[entry.target.id];
          if (link) link.classList.add("is-active");
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );

    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

  initHubSearch();
  initHookFilters();
  initCopy();
  initToc();
})();
