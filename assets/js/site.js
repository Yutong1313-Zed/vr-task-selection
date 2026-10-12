/* ==========================================================================
   Showcase site behaviour — no dependencies.
   Charts are emitted as inline SVG so they scale, print, and stay accessible.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Debug/print helper: ?noreveal=1 renders everything immediately (used by tooling).
  var noReveal = /(?:^|[?&])noreveal=1(?:&|$)/.test(window.location.search);
  if (noReveal) reduceMotion = true;
  var NS = 'http://www.w3.org/2000/svg';

  /* ------------------------------------------------------------------ *
   * small SVG helpers
   * ------------------------------------------------------------------ */

  function el(name, attrs, text) {
    var n = document.createElementNS(NS, name);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (v == null) continue;
        // CSS custom properties are not valid presentation attributes; they must go through style.
        if (k === 'fill' && typeof v === 'string' && v.indexOf('var(') === 0) {
          n.style.fill = v;
        } else {
          n.setAttribute(k, v);
        }
      }
    }
    if (text != null) n.textContent = text;
    return n;
  }

  function svgRoot(w, h) {
    return el('svg', {
      viewBox: '0 0 ' + w + ' ' + h,
      width: w,
      height: h,
      role: 'presentation',
      focusable: 'false',
      preserveAspectRatio: 'xMidYMid meet'
    });
  }

  function mount(id, svg, legend) {
    var host = document.getElementById(id);
    if (!host) return;
    host.textContent = '';
    if (legend) {
      var box = document.createElement('div');
      box.className = 'chart-legend';
      legend.forEach(function (item) {
        var s = document.createElement('span');
        var i = document.createElement('i');
        i.style.background = item.color;
        s.appendChild(i);
        s.appendChild(document.createTextNode(item.label));
        box.appendChild(s);
      });
      host.appendChild(box);
    }
    host.appendChild(svg);
  }

  /* ------------------------------------------------------------------ *
   * grouped vertical bar chart
   * opts: { groups: [{label, values:[..]}], series:[{name,color}],
   *         max, yTicks, unit, valueLabels }
   * ------------------------------------------------------------------ */

  function groupedBars(opts) {
    var W = 520;
    var H = opts.height || 300;
    var pad = { t: 26, r: 12, b: opts.padBottom || 62, l: 40 };
    var plotW = W - pad.l - pad.r;
    var plotH = H - pad.t - pad.b;
    var svg = svgRoot(W, H);

    var max = opts.max;
    var ticks = opts.yTicks || 4;
    var unit = opts.unit || '';

    // horizontal grid + y tick labels
    for (var t = 0; t <= ticks; t++) {
      var v = (max / ticks) * t;
      var y = pad.t + plotH - (v / max) * plotH;
      svg.appendChild(el('line', {
        x1: pad.l, x2: W - pad.r, y1: y, y2: y,
        class: t === 0 ? 'axis-line' : 'grid-line'
      }));
      svg.appendChild(el('text', {
        x: pad.l - 7, y: y + 3.5, 'text-anchor': 'end', class: 'tick-label'
      }, opts.yFormat ? opts.yFormat(v) : String(Math.round(v * 100) / 100)));
    }

    var groupW = plotW / opts.groups.length;
    var seriesN = opts.series.length;
    var inner = groupW * 0.72;
    var barW = inner / seriesN;
    var gap = (groupW - inner) / 2;

    opts.groups.forEach(function (g, gi) {
      var gx = pad.l + gi * groupW + gap;
      g.values.forEach(function (val, si) {
        var h = (val / max) * plotH;
        var x = gx + si * barW + barW * 0.06;
        var w = barW * 0.88;
        var y = pad.t + plotH - h;

        var rect = el('rect', {
          x: x, y: y, width: w, height: Math.max(h, 0.8), rx: 3,
          class: 'bar', fill: opts.series[si].color
        });
        rect.appendChild(el('title', null,
          g.label + ' — ' + opts.series[si].name + ': ' + val + unit));
        svg.appendChild(rect);

        if (opts.valueLabels !== false) {
          svg.appendChild(el('text', {
            x: x + w / 2, y: y - 5, 'text-anchor': 'middle', class: 'bar-label'
          }, String(val)));
        }
      });

      // x tick label (may be an array of lines)
      var lines = Array.isArray(g.label) ? g.label : [g.label];
      var lx = pad.l + gi * groupW + groupW / 2;
      lines.forEach(function (line, li) {
        svg.appendChild(el('text', {
          x: lx, y: pad.t + plotH + 16 + li * 12,
          'text-anchor': 'middle', class: 'tick-label'
        }, line));
      });
    });

    // y axis title
    if (opts.yTitle) {
      svg.appendChild(el('text', {
        x: pad.l - 7, y: pad.t - 10, 'text-anchor': 'start', class: 'axis-title'
      }, opts.yTitle));
    }
    return svg;
  }

  /* ------------------------------------------------------------------ *
   * horizontal bar chart (ablation)
   * ------------------------------------------------------------------ */

  function horizontalBars(rows, opts) {
    opts = opts || {};
    var W = 520;
    var rowH = 38;
    var pad = { t: 16, r: 56, b: 26, l: 168 };
    var H = pad.t + rows.length * rowH + pad.b;
    var plotW = W - pad.l - pad.r;
    var svg = svgRoot(W, H);
    var max = opts.max || 100;

    // vertical grid
    [0, 25, 50, 75, 100].forEach(function (v) {
      var x = pad.l + (v / max) * plotW;
      svg.appendChild(el('line', {
        x1: x, x2: x, y1: pad.t - 4, y2: pad.t + rows.length * rowH,
        class: v === 0 ? 'axis-line' : 'grid-line'
      }));
      svg.appendChild(el('text', {
        x: x, y: pad.t + rows.length * rowH + 16, 'text-anchor': 'middle', class: 'tick-label'
      }, v + '%'));
    });

    rows.forEach(function (row, i) {
      var cy = pad.t + i * rowH + rowH / 2;
      var w = (row.value / max) * plotW;
      var best = i === 0;

      svg.appendChild(el('text', {
        x: pad.l - 10, y: cy + 4, 'text-anchor': 'end',
        class: 'tick-label',
        fill: best ? 'var(--text)' : null,
        'font-weight': best ? 650 : null
      }, row.label));

      var rect = el('rect', {
        x: pad.l, y: cy - 9, width: Math.max(w, 1), height: 18, rx: 4,
        class: 'bar',
        fill: best ? 'url(#gradBest)' : 'url(#gradDim)'
      });
      rect.appendChild(el('title', null, row.label + ': ' + row.value + '%'));
      svg.appendChild(rect);

      svg.appendChild(el('text', {
        x: pad.l + w + 9, y: cy + 4.5, 'text-anchor': 'start',
        class: 'bar-label', fill: best ? 'var(--accent)' : null
      }, row.value + '%'));
    });

    var defs = el('defs');
    [['gradBest', '#14b4be', '#5ad1c4'], ['gradDim', '#2b3a52', '#3d5170']].forEach(function (g) {
      var lg = el('linearGradient', { id: g[0], x1: '0', y1: '0', x2: '1', y2: '0' });
      lg.appendChild(el('stop', { offset: '0%', 'stop-color': g[1] }));
      lg.appendChild(el('stop', { offset: '100%', 'stop-color': g[2] }));
      defs.appendChild(lg);
    });
    svg.insertBefore(defs, svg.firstChild);

    return svg;
  }

  /* ------------------------------------------------------------------ *
   * charts used on this page
   * ------------------------------------------------------------------ */

  var RAY = '#3d5170';
  var PROP = '#2ec4c8';

  function drawCharts() {
    var legend = [{ label: 'Ray', color: RAY }, { label: 'Proposed', color: PROP }];

    // Accuracy: object-level vs strict task success
    var accHost = document.getElementById('chart-acc');
    if (accHost) {
      mount('chart-acc', groupedBars({
        groups: [
          { label: ['Object-level', 'accuracy'], values: [64.1, 77.3] },
          { label: ['Strict task', 'success'], values: [75, 70.7] }
        ],
        series: [{ name: 'Ray', color: RAY }, { name: 'Proposed', color: PROP }],
        max: 100, yTicks: 4, unit: '%', height: 300, padBottom: 48, yTitle: 'Percent'
      }), legend);
    }

    // NASA-TLX subscales
    var tlxHost = document.getElementById('chart-tlx');
    if (tlxHost) {
      mount('chart-tlx', groupedBars({
        groups: ['Mental', 'Physical', 'Temporal', 'Performance', 'Effort', 'Frustration'].map(function (n, i) {
          return {
            label: n,
            values: [[11.90, 7.95], [15.30, 5.70], [8.20, 5.80],
                     [12.00, 10.35], [12.10, 7.60], [6.55, 4.85]][i]
          };
        }),
        series: [{ name: 'Ray', color: RAY }, { name: 'Proposed', color: PROP }],
        max: 20, yTicks: 4, unit: '', height: 300, padBottom: 56,
        yTitle: 'NASA-TLX subscale'
      }), legend);
    }

    // Ablation
    if (document.getElementById('chart-ablation')) {
      mount('chart-ablation', horizontalBars([
        { label: 'Full Method', value: 77.3 },
        { label: 'w/o Conflict Handling', value: 71.5 },
        { label: 'Speech + Vision', value: 56.1 },
        { label: 'Gaze + Vision', value: 30.0 },
        { label: 'Gaze-only', value: 28.2 },
        { label: 'Speech-only', value: 16.7 }
      ], { max: 100 }), null);
    }
  }

  /* ------------------------------------------------------------------ *
   * sticky header, scroll progress, active nav link
   * ------------------------------------------------------------------ */

  function scrollUx() {
    var bar = document.getElementById('readbar');
    var inner = bar ? bar.appendChild(document.createElement('i')) : null;
    var topbar = document.getElementById('topbar');
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]:not(.nav__cta)'));
    var sections = links
      .map(function (a) { return document.querySelector(a.getAttribute('href')); })
      .filter(Boolean);

    function onScroll() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (inner) inner.style.width = (pct * 100).toFixed(2) + '%';
      if (topbar) topbar.classList.toggle('is-stuck', window.scrollY > 8);

      var active = null;
      var probe = window.scrollY + window.innerHeight * 0.32;
      sections.forEach(function (s) { if (s.offsetTop <= probe) active = s; });
      links.forEach(function (a) {
        a.classList.toggle('is-active', active && a.getAttribute('href') === '#' + active.id);
      });
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { onScroll(); ticking = false; });
    }, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  function mobileNav() {
    var btn = document.getElementById('navtoggle');
    var nav = document.getElementById('primary-nav');
    if (!btn || !nav) return;

    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * reveal on scroll + animated counters/bars
   * ------------------------------------------------------------------ */

  function reveal() {
    var targets = document.querySelectorAll(
      '.section__head, .card, .figure, .step, .mission, .author, .table-wrap, .stat, .protocol__item, .callout'
    );

    if (reduceMotion || !('IntersectionObserver' in window)) {
      document.getElementById('weights') && document.getElementById('weights').classList.add('is-shown');
      document.getElementById('ablation-list') && document.getElementById('ablation-list').classList.add('is-shown');
      animateCounters(document.getElementById('kpis'));
      return;
    }

    targets.forEach(function (t) { t.classList.add('reveal'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    targets.forEach(function (t) { io.observe(t); });

    // bars
    [['weights', 'is-shown'], ['ablation-list', 'is-shown']].forEach(function (pair) {
      var node = document.getElementById(pair[0]);
      if (!node) return;
      var ob = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { node.classList.add(pair[1]); ob.disconnect(); }
        });
      }, { threshold: 0.25 });
      ob.observe(node);
    });

    // KPI counters
    var kpis = document.getElementById('kpis');
    if (kpis) {
      var ko = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { animateCounters(kpis); ko.disconnect(); }
        });
      }, { threshold: 0.35 });
      ko.observe(kpis);
    }
  }

  function animateCounters(root) {
    if (!root || root.dataset.counted === '1') return;
    root.dataset.counted = '1';

    root.querySelectorAll('[data-count]').forEach(function (node) {
      var target = parseFloat(node.dataset.count);
      var decimals = parseInt(node.dataset.decimals || '1', 10);
      var prefix = node.dataset.prefix || '';
      var suffix = node.dataset.suffix || '';
      if (isNaN(target)) return;

      // The markup already holds the real value, so a slow observer never shows
      // a placeholder. Only animate when we can finish the tween cleanly.
      var settle = function () {
        node.textContent = node.dataset.final || (prefix + target.toFixed(decimals) + suffix);
      };

      if (reduceMotion) { settle(); return; }

      var dur = 1100;
      var t0 = performance.now();
      // Never let a half-finished tween be the last thing painted.
      var guard = window.setTimeout(settle, dur + 400);

      function frame(now) {
        var p = Math.min(1, (now - t0) / dur);
        if (p >= 1) {
          window.clearTimeout(guard);
          settle();
          return;
        }
        var eased = 1 - Math.pow(1 - p, 3);
        node.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
        window.requestAnimationFrame(frame);
      }
      window.requestAnimationFrame(frame);
    });
  }

  /* ------------------------------------------------------------------ *
   * copy-to-clipboard
   * ------------------------------------------------------------------ */

  function copyButtons() {
    document.querySelectorAll('.copybtn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var src = document.getElementById(btn.dataset.copy);
        if (!src) return;
        var text = src.textContent;

        var done = function () {
          var old = btn.textContent;
          btn.textContent = 'Copied';
          btn.classList.add('is-done');
          window.setTimeout(function () {
            btn.textContent = old;
            btn.classList.remove('is-done');
          }, 1600);
        };

        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(done, function () { fallback(text, done); });
        } else {
          fallback(text, done);
        }
      });
    });
  }

  function fallback(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  /* ------------------------------------------------------------------ *
   * boot
   * ------------------------------------------------------------------ */

  function boot() {
    drawCharts();
    scrollUx();
    mobileNav();
    reveal();
    copyButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
