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

  /* ---------- Lead magnet opt-in form ---------- */
  function initLeadForm() {
    var form = document.querySelector("[data-lead-form]");
    if (!form) return;
    var error = form.querySelector("[data-lead-error]");
    var button = form.querySelector('button[type="submit"]');
    var done = document.querySelector("[data-lead-done]");
    var buttonHtml = button.innerHTML;

    if (/[?&]invalid=1/.test(window.location.search)) {
      form.querySelector("[data-lead-invalid]").hidden = false;
    }

    var otherField = form.querySelector("[data-other-field]");
    var otherInput = form.elements.profession_other;
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var sending = false;

    function showError(message) {
      error.textContent = message;
      error.hidden = false;
    }

    function profession() {
      var choice = form.elements.profession.value;
      return choice === "Other" ? otherInput.value.trim() : choice;
    }

    function isComplete() {
      return (
        form.elements.name.value.trim() !== "" &&
        profession() !== "" &&
        emailPattern.test(form.elements.email.value.trim())
      );
    }

    // The button stays locked until every required field is filled in.
    function update() {
      var isOther = form.elements.profession.value === "Other";
      otherField.hidden = !isOther;
      otherInput.required = isOther;
      if (!sending) button.disabled = !isComplete();
    }

    form.addEventListener("input", update);
    form.addEventListener("change", function (e) {
      update();
      if (e.target === form.elements.profession && e.target.value === "Other") otherInput.focus();
    });
    update();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      error.hidden = true;
      if (!isComplete()) return showError("Please fill in your name, profession and a valid email.");

      var email = form.elements.email.value.trim();
      sending = true;
      button.disabled = true;
      button.textContent = "Sending...";

      fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: form.getAttribute("data-resource"),
          name: form.elements.name.value.trim(),
          profession: profession(),
          email: email,
          consent: form.elements.consent.checked,
          hp_check: form.elements.hp_check.value,
        }),
      })
        .then(function (res) {
          return res.json().catch(function () {
            return { ok: false };
          });
        })
        .then(function (data) {
          if (!data.ok) throw new Error(data.error || "Something went wrong. Please try again.");
          done.querySelector("[data-lead-email]").textContent = email;
          form.hidden = true;
          done.hidden = false;
        })
        .catch(function (err) {
          showError(err.message || "Something went wrong. Please try again.");
          sending = false;
          button.disabled = false;
          button.innerHTML = buttonHtml;
        });
    });
  }

  /* ---------- Ad Copy Matrix: cards, filters, search ---------- */
  function initAcm() {
    var cards = document.querySelectorAll("[data-acm-card]");
    if (!cards.length) return;
    var formatChips = document.querySelectorAll("[data-acm-format]");
    var awareChips = document.querySelectorAll("[data-acm-aware]");
    var search = document.querySelector("[data-acm-search]");
    var count = document.querySelector("[data-acm-count]");
    var empty = document.querySelector("[data-acm-empty]");
    var expandBtn = document.querySelector("[data-acm-expand]");
    var format = "all";
    var aware = "all";

    function setOpen(card, open) {
      var head = card.querySelector(".acm-card__head");
      head.setAttribute("aria-expanded", open ? "true" : "false");
      card.querySelector(".acm-card__body").hidden = !open;
      card.classList.toggle("is-open", open);
    }

    cards.forEach(function (card) {
      card.querySelector(".acm-card__head").addEventListener("click", function () {
        setOpen(card, !card.classList.contains("is-open"));
      });
    });

    function apply() {
      var q = normalise(search.value.trim());
      var shown = 0;
      cards.forEach(function (card) {
        var ok =
          (format === "all" || card.getAttribute("data-format") === format) &&
          (aware === "all" || card.getAttribute("data-aware").split(" ").indexOf(aware) !== -1) &&
          (!q || normalise(card.textContent).indexOf(q) !== -1);
        card.hidden = !ok;
        if (ok) shown++;
      });
      document.querySelectorAll("[data-acm-group]").forEach(function (g) {
        g.hidden = !g.querySelector("[data-acm-card]:not([hidden])");
      });
      document.querySelectorAll("[data-acm-section]").forEach(function (sec) {
        sec.hidden = !sec.querySelector("[data-acm-card]:not([hidden])");
      });
      if (count) count.textContent = "Showing " + shown + " of " + cards.length + " frameworks";
      if (empty) empty.hidden = shown > 0;
    }

    function chipGroup(chips, attr, setter) {
      chips.forEach(function (chip) {
        chip.addEventListener("click", function () {
          setter(chip.getAttribute(attr));
          chips.forEach(function (c) { c.classList.toggle("is-active", c === chip); });
          apply();
        });
      });
    }
    chipGroup(formatChips, "data-acm-format", function (v) { format = v; });
    chipGroup(awareChips, "data-acm-aware", function (v) { aware = v; });
    search.addEventListener("input", apply);

    if (expandBtn) {
      expandBtn.addEventListener("click", function () {
        var open = expandBtn.textContent === "Expand all";
        cards.forEach(function (c) { if (!c.hidden) setOpen(c, open); });
        expandBtn.textContent = open ? "Collapse all" : "Expand all";
      });
    }

    // Matrix links and #f-... URLs open the right card (clearing filters if they hide it).
    function openFromHash(hash) {
      var card = hash && document.getElementById(hash.replace("#", ""));
      if (!card || !card.hasAttribute("data-acm-card")) return;
      if (card.hidden) {
        format = "all"; aware = "all"; search.value = "";
        formatChips.forEach(function (c) { c.classList.toggle("is-active", c.getAttribute("data-acm-format") === "all"); });
        awareChips.forEach(function (c) { c.classList.toggle("is-active", c.getAttribute("data-acm-aware") === "all"); });
        apply();
      }
      setOpen(card, true);
      setTimeout(function () {
        var top = card.getBoundingClientRect().top + window.scrollY - 170;
        window.scrollTo({ top: top, behavior: "smooth" });
      }, 30);
    }
    document.querySelectorAll("[data-acm-open]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        history.replaceState(null, "", a.getAttribute("href"));
        openFromHash(a.getAttribute("href"));
      });
    });
    if (location.hash) openFromHash(location.hash);

    apply();
  }

  initHubSearch();
  initHookFilters();
  initCopy();
  initToc();
  initLeadForm();
  initAcm();
})();
