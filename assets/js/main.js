/* ==========================================================================
   Anthony Sprackling — site behaviour
   Plain vanilla JS. Every feature is guarded so pages that don't contain a
   given component simply skip it.
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------- Header: background on scroll ---------- */
  function initHeader() {
    var header = document.querySelector(".header");
    if (!header) return;
    function onScroll() {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  function initMenu() {
    var toggle = document.querySelector(".menu-toggle");
    var menu = document.querySelector(".mobile-menu");
    if (!toggle || !menu) return;

    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      toggle.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        menu.classList.remove("is-open");
        toggle.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Smooth scrolling (Lenis) + same-page anchors ---------- */
  var lenis = null;

  function initSmoothScroll() {
    if (reduceMotion || typeof window.Lenis !== "function") return;

    lenis = new window.Lenis({
      duration: 1.1,
      easing: function (t) {
        return Math.min(1, 1.001 - Math.pow(2, -10 * t));
      },
      smoothWheel: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  function initAnchors() {
    document.addEventListener("click", function (e) {
      var link = e.target.closest ? e.target.closest("a") : null;
      if (!link) return;
      var href = link.getAttribute("href");
      if (!href || href.indexOf("#") === -1) return;

      var url;
      try {
        url = new URL(href, window.location.href);
      } catch (err) {
        return;
      }
      if (!url.hash || url.hash === "#") return;
      // Only hijack links pointing at the current page
      if (url.pathname !== window.location.pathname) return;

      var target = document.querySelector(url.hash);
      if (!target) return;

      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { offset: -80, duration: 1.3 });
      } else {
        var top =
          target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({
          top: top,
          behavior: reduceMotion ? "auto" : "smooth",
        });
      }
    });
  }

  /* ---------- Scroll reveals ---------- */
  function initReveals() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var delay = parseFloat(el.getAttribute("data-delay") || "0");
          setTimeout(function () {
            el.classList.add("is-visible");
          }, delay * 1000);
          io.unobserve(el);
        });
      },
      { rootMargin: "-10% 0px -10% 0px" }
    );

    items.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ---------- Hero: word stagger + scroll drift ---------- */
  function initHero() {
    var hero = document.querySelector(".hero");
    if (!hero) return;

    // Stagger the headline words
    var words = hero.querySelectorAll(".word");
    words.forEach(function (w, i) {
      w.style.animationDelay = 0.15 + i * 0.07 + "s";
    });

    if (reduceMotion) return;

    var inner = hero.querySelector(".hero__inner");
    if (!inner) return;

    function onScroll() {
      var rect = hero.getBoundingClientRect();
      var height = hero.offsetHeight || 1;
      // progress 0 -> 1 as the hero scrolls out of view
      var progress = Math.min(1, Math.max(0, -rect.top / height));
      inner.style.transform = "translateY(" + progress * 140 + "px)";
      inner.style.opacity = String(Math.max(0, 1 - progress / 0.85));
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Problem: pinned stacking accordion ---------- */
  function initProblem() {
    var section = document.querySelector(".problem");
    if (!section) return;
    var rows = section.querySelectorAll(".problem-row");
    if (!rows.length) return;

    // No pinning on mobile or with reduced motion: rows stay stacked and open,
    // so the summary box below flows normally instead of overlapping.
    if (reduceMotion || window.innerWidth < 768) return;

    section.classList.add("is-enhanced");

    function update() {
      var rect = section.getBoundingClientRect();
      var scrollable = section.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;
      var progress = Math.min(1, Math.max(0, -rect.top / scrollable));
      var active = Math.min(
        rows.length - 1,
        Math.max(0, Math.floor(progress * rows.length))
      );

      rows.forEach(function (row, i) {
        row.classList.toggle("is-revealed", i <= active);
        row.classList.toggle("is-active", i === active);
      });
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  /* ---------- Process: ball travelling the dashed loop ---------- */
  function initLoop() {
    var loop = document.querySelector(".loop");
    var ball = document.querySelector(".loop__ball");
    if (!loop || !ball || reduceMotion) return;

    var RADIUS = 44;
    var LOOP_MS = 18000;

    function perimeter(w, h, r) {
      var sx = Math.max(0, w - 2 * r);
      var sy = Math.max(0, h - 2 * r);
      var arc = (Math.PI * r) / 2;
      return 2 * sx + 2 * sy + 4 * arc;
    }

    function pointAt(dist, w, h, r) {
      var sx = Math.max(0, w - 2 * r);
      var sy = Math.max(0, h - 2 * r);
      var arc = (Math.PI * r) / 2;
      var d = dist;
      var a;
      if (d < sx) return { x: r + d, y: 0 };
      d -= sx;
      if (d < arc) {
        a = -Math.PI / 2 + (d / arc) * (Math.PI / 2);
        return { x: w - r + r * Math.cos(a), y: r + r * Math.sin(a) };
      }
      d -= arc;
      if (d < sy) return { x: w, y: r + d };
      d -= sy;
      if (d < arc) {
        a = (d / arc) * (Math.PI / 2);
        return { x: w - r + r * Math.cos(a), y: h - r + r * Math.sin(a) };
      }
      d -= arc;
      if (d < sx) return { x: w - r - d, y: h };
      d -= sx;
      if (d < arc) {
        a = Math.PI / 2 + (d / arc) * (Math.PI / 2);
        return { x: r + r * Math.cos(a), y: h - r + r * Math.sin(a) };
      }
      d -= arc;
      if (d < sy) return { x: 0, y: h - r - d };
      d -= sy;
      a = Math.PI + (d / arc) * (Math.PI / 2);
      return { x: r + r * Math.cos(a), y: r + r * Math.sin(a) };
    }

    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var w = loop.clientWidth;
      var h = loop.clientHeight;
      if (w && h) {
        var p = ((ts - start) % LOOP_MS) / LOOP_MS;
        var pt = pointAt(p * perimeter(w, h, RADIUS), w, h, RADIUS);
        ball.style.transform =
          "translate(" + pt.x + "px, " + pt.y + "px) translate(-50%, -50%)";
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Testimonials carousel ---------- */
  function initCarousel() {
    var carousel = document.querySelector(".carousel");
    if (!carousel) return;

    var slides = carousel.querySelectorAll(".slide");
    var dots = carousel.querySelectorAll(".dots button");
    var prev = document.querySelector(".carousel-prev");
    var next = document.querySelector(".carousel-next");
    if (!slides.length) return;

    var index = 0;
    var timer = null;
    var AUTO_MS = 7000;

    function show(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) {
        s.classList.toggle("is-active", n === index);
      });
      dots.forEach(function (d, n) {
        d.classList.toggle("is-active", n === index);
        d.setAttribute("aria-selected", n === index ? "true" : "false");
      });
    }

    function startAuto() {
      if (reduceMotion || slides.length < 2) return;
      stopAuto();
      timer = setInterval(function () {
        show(index + 1);
      }, AUTO_MS);
    }

    function stopAuto() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    if (prev)
      prev.addEventListener("click", function () {
        show(index - 1);
        startAuto();
      });
    if (next)
      next.addEventListener("click", function () {
        show(index + 1);
        startAuto();
      });

    dots.forEach(function (d, n) {
      d.addEventListener("click", function () {
        show(n);
        startAuto();
      });
    });

    var section = carousel.closest("section");
    if (section) {
      section.addEventListener("mouseenter", stopAuto);
      section.addEventListener("mouseleave", startAuto);
    }

    show(0);
    startAuto();
  }

  /* ---------- FAQ accordion ---------- */
  function initFaq() {
    var items = document.querySelectorAll(".faq-item");
    if (!items.length) return;

    items.forEach(function (item) {
      var btn = item.querySelector(".faq-item__q");
      if (!btn) return;
      btn.addEventListener("click", function () {
        var open = item.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
  }

  /* ---------- Contact form (Formspree) ---------- */
  function initForm() {
    var form = document.querySelector(".form");
    if (!form) return;
    var status = form.querySelector(".form__status");
    var button = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var endpoint = form.getAttribute("action");
      if (status) status.textContent = "";
      if (button) {
        button.disabled = true;
        button.textContent = "Sending…";
      }

      fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            if (status)
              status.textContent =
                "Thanks, your message is on its way. I'll be in touch soon.";
          } else {
            throw new Error("bad response");
          }
        })
        .catch(function () {
          if (status)
            status.textContent =
              "Something went wrong. Please email anthonysprackling@hotmail.com directly.";
        })
        .then(function () {
          if (button) {
            button.disabled = false;
            button.innerHTML = 'Send message <span class="arrow">→</span>';
          }
        });
    });
  }

  /* ---------- Footer year ---------- */
  function initYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ---------- Boot ---------- */
  function init() {
    initHeader();
    initMenu();
    initSmoothScroll();
    initAnchors();
    initReveals();
    initHero();
    initProblem();
    initLoop();
    initCarousel();
    initFaq();
    initForm();
    initYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
