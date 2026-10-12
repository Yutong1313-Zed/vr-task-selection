/* ==========================================================================
   System-demo behaviour.

   The page renders from assets/data/demo.json so that every number, object ID
   and instruction string has exactly one source. Charts are emitted as inline
   SVG (no dependencies, scales and prints cleanly).
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (/(?:^|[?&])noreveal=1(?:&|$)/.test(window.location.search)) reduceMotion = true;

  var NS = 'http://www.w3.org/2000/svg';

  /* ─────────────────────────── helpers ─────────────────────────── */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function node(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function el(name, attrs, text) {
    var n = document.createElementNS(NS, name);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k) || attrs[k] == null) continue;
        var v = attrs[k];
        if (k === 'fill' && typeof v === 'string' && v.indexOf('var(') === 0) n.style.fill = v;
        else n.setAttribute(k, v);
      }
    }
    if (text != null) n.textContent = text;
    return n;
  }

  function svgRoot(w, h) {
    return el('svg', {
      viewBox: '0 0 ' + w + ' ' + h, width: w, height: h,
      role: 'presentation', focusable: 'false', preserveAspectRatio: 'xMidYMid meet'
    });
  }

  function mount(id, svg, legend) {
    var host = document.getElementById(id);
    if (!host) return;
    host.textContent = '';
    if (legend) {
      var box = node('div', 'chart-legend');
      legend.forEach(function (item) {
        var s = node('span');
        var i = node('i');
        i.style.background = item.color;
        s.appendChild(i);
        s.appendChild(document.createTextNode(item.label));
        box.appendChild(s);
      });
      host.appendChild(box);
    }
    host.appendChild(svg);
  }

  var COLOR = { ray: '#46597a', proposed: '#2ed3c6' };

  /* ─────────────────────────── charts ─────────────────────────── */

  function groupedBars(spec) {
    var W = 520, H = spec.height || 300;
    var pad = { t: 26, r: 12, b: spec.padBottom || 56, l: 42 };
    var plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
    var svg = svgRoot(W, H);
    var max = spec.max, ticks = spec.yTicks || 4;

    for (var t = 0; t <= ticks; t++) {
      var v = (max / ticks) * t;
      var y = pad.t + plotH - (v / max) * plotH;
      svg.appendChild(el('line', { x1: pad.l, x2: W - pad.r, y1: y, y2: y, class: t === 0 ? 'axis-line' : 'grid-line' }));
      svg.appendChild(el('text', { x: pad.l - 7, y: y + 3.5, 'text-anchor': 'end', class: 'tick-label' },
        spec.yFormat ? spec.yFormat(v) : String(Math.round(v * 100) / 100)));
    }

    var groupW = plotW / spec.groups.length;
    var seriesN = spec.series.length;
    var inner = groupW * 0.7, barW = inner / seriesN, gap = (groupW - inner) / 2;

    spec.groups.forEach(function (g, gi) {
      var gx = pad.l + gi * groupW + gap;
      g.values.forEach(function (val, si) {
        var h = (val / max) * plotH;
        var x = gx + si * barW + barW * 0.07, w = barW * 0.86;
        var y = pad.t + plotH - h;
        var label = Array.isArray(g.label) ? g.label.join(' ') : g.label;
        var rect = el('rect', { x: x, y: y, width: w, height: Math.max(h, 0.8), rx: 3, class: 'bar', fill: spec.series[si].color });
        rect.appendChild(el('title', null, label + ' — ' + spec.series[si].name + ': ' + val + (spec.unit || '')));
        svg.appendChild(rect);
        svg.appendChild(el('text', { x: x + w / 2, y: y - 5, 'text-anchor': 'middle', class: 'bar-label' }, String(val)));
      });
      var lines = Array.isArray(g.label) ? g.label : [g.label];
      lines.forEach(function (line, li) {
        svg.appendChild(el('text', {
          x: pad.l + gi * groupW + groupW / 2, y: pad.t + plotH + 15 + li * 12,
          'text-anchor': 'middle', class: 'tick-label'
        }, line));
      });
    });

    if (spec.yTitle) svg.appendChild(el('text', { x: pad.l - 7, y: pad.t - 10, class: 'axis-title' }, spec.yTitle));
    return svg;
  }

  function horizontalBars(rows, max) {
    var W = 520, rowH = 38;
    var pad = { t: 16, r: 58, b: 26, l: 170 };
    var H = pad.t + rows.length * rowH + pad.b;
    var plotW = W - pad.l - pad.r;
    var svg = svgRoot(W, H);
    max = max || 100;

    [0, 25, 50, 75, 100].forEach(function (v) {
      var x = pad.l + (v / max) * plotW;
      svg.appendChild(el('line', { x1: x, x2: x, y1: pad.t - 4, y2: pad.t + rows.length * rowH, class: v === 0 ? 'axis-line' : 'grid-line' }));
      svg.appendChild(el('text', { x: x, y: pad.t + rows.length * rowH + 16, 'text-anchor': 'middle', class: 'tick-label' }, v + '%'));
    });

    rows.forEach(function (row, i) {
      var cy = pad.t + i * rowH + rowH / 2;
      var w = (row.value / max) * plotW;
      var best = i === 0;
      svg.appendChild(el('text', {
        x: pad.l - 10, y: cy + 4, 'text-anchor': 'end', class: 'tick-label',
        fill: best ? 'var(--text)' : null, 'font-weight': best ? 650 : null
      }, row.label));
      var rect = el('rect', { x: pad.l, y: cy - 9, width: Math.max(w, 1), height: 18, rx: 4, class: 'bar',
        fill: best ? 'url(#gradBest)' : 'url(#gradDim)' });
      rect.appendChild(el('title', null, row.label + ': ' + row.value + '%'));
      svg.appendChild(rect);
      svg.appendChild(el('text', { x: pad.l + w + 9, y: cy + 4.5, 'text-anchor': 'start', class: 'bar-label',
        fill: best ? 'var(--accent)' : null }, row.value + '%'));
    });

    var defs = el('defs');
    [['gradBest', '#14a89e', '#64e3d0'], ['gradDim', '#2b3a52', '#46597a']].forEach(function (g) {
      var lg = el('linearGradient', { id: g[0], x1: '0', y1: '0', x2: '1', y2: '0' });
      lg.appendChild(el('stop', { offset: '0%', 'stop-color': g[1] }));
      lg.appendChild(el('stop', { offset: '100%', 'stop-color': g[2] }));
      defs.appendChild(lg);
    });
    svg.insertBefore(defs, svg.firstChild);
    return svg;
  }

  /* ─────────────────────────── renderers ─────────────────────────── */

  function renderTrial(d) {
    var t = d.trial;
    var set = function (id, v) { var n = document.getElementById(id); if (n) n.textContent = v; };
    set('trial-source', t.source);
    set('console-title', 'session · ' + t.participant + ' · ' + t.mission);
    set('pill-trial', t.participant + ' · ' + t.mission + ' · ' + t.condition);
    set('instruction-zh', t.instruction_zh);
    set('instruction-en', '"' + t.instruction_en + '"');
    set('target-region', t.target_region);

    var chips = document.getElementById('target-chips');
    if (chips) {
      chips.textContent = '';
      t.targets.forEach(function (id) { chips.appendChild(node('span', 'objchip', id)); });
    }

    // stage timeline
    var tl = document.getElementById('timeline');
    if (tl) {
      tl.textContent = '';
      d.stages.forEach(function (s, i) {
        var li = node('li');
        var b = node('button');
        b.type = 'button';
        b.setAttribute('data-stage', String(i));
        b.setAttribute('aria-current', i === 0 ? 'true' : 'false');
        b.appendChild(node('span', 't', 't=' + s.t.toFixed(1) + 's'));
        b.appendChild(node('span', 'n', s.title));
        b.addEventListener('click', function () { showStage(d, i, true); });
        li.appendChild(b);
        tl.appendChild(li);
      });
    }

    // episode stats from the recording
    var stats = document.getElementById('trial-stats');
    if (stats) {
      stats.textContent = '';
      [
        ['speech span', t.speech_span_s.toFixed(2) + ' s'],
        ['completion', (t.completion_time_ms / 1000).toFixed(2) + ' s'],
        ['gaze samples', t.gaze_sample_count + ' @ ' + t.gaze_rate_hz + ' Hz'],
        ['frames', t.frame_count + ' @ ' + t.frame_rate_fps + ' fps'],
        ['frame size', t.frame_size],
        ['audio', (t.audio_sample_rate / 1000) + ' kHz mono']
      ].forEach(function (row) {
        var w = node('div');
        w.appendChild(node('dt', null, row[0]));
        w.appendChild(node('dd', null, row[1]));
        stats.appendChild(w);
      });
    }
  }

  var currentStage = -1;

  function showStage(d, i, manual) {
    var s = d.stages[i];
    if (!s) return;
    currentStage = i;

    var img = document.getElementById('stage-img');
    if (img) {
      // Swap in place: the browser keeps the previous frame painted until the new
      // one is decodable, so there is no need to fade and no risk of a blank panel.
      if (img.getAttribute('src') !== s.img) img.src = s.img;
      img.style.opacity = '1';
    }
    var set = function (id, v) { var n = document.getElementById(id); if (n) n.textContent = v; };
    set('stage-time', 't = ' + s.t.toFixed(1) + ' s');
    set('stage-title', s.title);
    set('stage-zh', s.zh);
    set('hud-timer', Math.max(0, Math.round(60 - s.t)) + 's');
    set('console-clock', 't = ' + s.t.toFixed(2) + ' s');
    set('stage-detail', s.detail);

    $$('#timeline button').forEach(function (b) {
      b.setAttribute('aria-current', b.getAttribute('data-stage') === String(i) ? 'true' : 'false');
    });

    document.dispatchEvent(new CustomEvent('stagechange', { detail: { index: i, manual: !!manual } }));
  }

  function renderPipeline(d) {
    var list = document.getElementById('stage-list');
    if (!list) return;
    list.textContent = '';
    var total = 0;
    d.sample_pipeline.forEach(function (p, i) {
      total += p.ms;
      var card = node('div', 'stage');
      card.setAttribute('data-i', String(i));
      var head = node('div', 'stage__head');
      head.appendChild(node('span', 'stage__label', p.label));
      head.appendChild(node('span', 'stage__ms', p.ms + ' ms'));
      card.appendChild(head);
      card.appendChild(node('div', 'stage__detail', p.detail));
      var bar = node('div', 'stage__bar');
      bar.appendChild(node('i'));
      card.appendChild(bar);
      list.appendChild(card);
    });
    var tot = document.getElementById('pipeline-total');
    if (tot) tot.textContent = 'measured total ' + total + ' ms';
  }

  function renderSystem(d) {
    var mods = document.getElementById('module-list');
    if (mods) {
      mods.textContent = '';
      d.module_versions.forEach(function (m) {
        var w = node('div');
        w.appendChild(node('dt', null, m.name));
        var dd = node('dd');
        dd.appendChild(node('strong', null, m.value));
        dd.appendChild(document.createTextNode(' — ' + m.note));
        w.appendChild(dd);
        mods.appendChild(w);
      });
    }

    var pk = document.getElementById('packet');
    if (pk) pk.textContent = JSON.stringify(d.response_packet, null, 2).replace(/,/g, ',').replace(/:/g, ':');

    var g = document.getElementById('modality-grid');
    if (g) {
      g.textContent = '';
      d.modalities.forEach(function (m) {
        var c = node('div', 'modality');
        var head = node('div', 'modality__name');
        head.appendChild(node('b', null, m.name));
        head.appendChild(node('span', 'modality__count', m.count));
        c.appendChild(head);
        c.appendChild(node('p', 'modality__spec', m.spec));
        c.appendChild(node('p', 'modality__note', m.note));
        g.appendChild(c);
      });
    }
  }

  function renderMissions(d) {
    var host = document.getElementById('mission-list');
    if (!host) return;
    host.textContent = '';
    d.missions.forEach(function (m) {
      var row = node('div', 'mission-row');
      row.appendChild(node('span', 'mission-row__id', m.id));
      var mid = node('div');
      mid.appendChild(node('p', 'mission-row__zh', m.zh));
      mid.appendChild(node('p', 'mission-row__en', m.en));
      row.appendChild(mid);
      var tg = node('div', 'mission-row__targets');
      m.targets.forEach(function (t) { tg.appendChild(node('span', 'objchip', t)); });
      row.appendChild(tg);
      host.appendChild(row);
    });
  }

  function renderValidation(d) {
    var r = d.results;

    // results table
    var tb = $('#results-table tbody');
    if (tb) {
      tb.textContent = '';
      r.rows.forEach(function (row) {
        var tr = node('tr');
        if (row.highlight) tr.className = 'is-highlight';
        var th = node('th');
        th.setAttribute('scope', 'row');
        th.textContent = row.metric;
        tr.appendChild(th);
        tr.appendChild(node('td', null, row.ray));
        var tp = node('td');
        if (row.highlight) tp.appendChild(node('strong', null, row.proposed));
        else tp.textContent = row.proposed;
        tr.appendChild(tp);
        var td = node('td', 'delta delta--' + row.tone);
        td.appendChild(document.createTextNode(row.delta));
        if (row.test) td.appendChild(node('small', 'test', row.test));
        tr.appendChild(td);
        tb.appendChild(tr);
      });
    }

    // charts
    var legend = [{ label: 'Ray casting', color: COLOR.ray }, { label: 'Proposed', color: COLOR.proposed }];
    if (document.getElementById('chart-acc')) {
      mount('chart-acc', groupedBars({
        groups: r.accuracy_chart.groups.map(function (g) { return { label: g.label, values: [g.ray, g.proposed] }; }),
        series: [{ name: 'Ray', color: COLOR.ray }, { name: 'Proposed', color: COLOR.proposed }],
        max: 100, yTicks: 4, unit: '%', height: 290, yTitle: 'Percent'
      }), legend);
    }
    if (document.getElementById('chart-tlx')) {
      mount('chart-tlx', groupedBars({
        groups: r.tlx_chart.groups.map(function (g) { return { label: g.label, values: [g.ray, g.proposed] }; }),
        series: [{ name: 'Ray', color: COLOR.ray }, { name: 'Proposed', color: COLOR.proposed }],
        max: r.tlx_chart.max, yTicks: 4, height: 290, padBottom: 62, yTitle: 'NASA-TLX subscale'
      }), legend);
    }
    if (document.getElementById('chart-ablation')) {
      mount('chart-ablation', horizontalBars(r.ablation, 100), null);
    }

    // bar list mirror of the ablation
    var bl = document.getElementById('ablation-list');
    if (bl) {
      bl.textContent = '';
      r.ablation.forEach(function (a, i) {
        var li = node('li');
        if (i === 0) li.setAttribute('data-best', 'true');
        li.appendChild(node('span', 'bar-list__label', a.label));
        var bar = node('span', 'bar-list__bar');
        var fill = node('i');
        fill.style.setProperty('--v', String(a.value / 100));
        bar.appendChild(fill);
        li.appendChild(bar);
        li.appendChild(node('span', 'bar-list__value', a.value + '%'));
        bl.appendChild(li);
      });
    }

    // weight sensitivity
    var wt = document.getElementById('weight-table');
    if (wt) {
      wt.textContent = '';
      r.weights.forEach(function (w) {
        var tr = node('tr');
        if (w.active) tr.className = 'is-highlight';
        var th = node('th');
        th.setAttribute('scope', 'row');
        th.textContent = w.config;
        tr.appendChild(th);
        [w.wg, w.ws, w.wt, w.wc].forEach(function (v) { tr.appendChild(node('td', null, v.toFixed(2))); });
        var td = node('td');
        if (w.active) td.appendChild(node('strong', null, w.acc + '%'));
        else td.textContent = w.acc + '%';
        tr.appendChild(td);
        wt.appendChild(tr);
      });
    }

    // density
    var dt = document.getElementById('density-table');
    if (dt) {
      dt.textContent = '';
      r.density.forEach(function (row) {
        var tr = node('tr');
        var th = node('th');
        th.setAttribute('scope', 'row');
        th.textContent = row.density;
        tr.appendChild(th);
        var a = node('td');
        if (row.density === 'High') a.appendChild(node('strong', null, row.acc + '%'));
        else a.textContent = row.acc + '%';
        tr.appendChild(a);
        tr.appendChild(node('td', null, row.gaze_hit + '%'));
        tr.appendChild(node('td', null, String(row.slots)));
        dt.appendChild(tr);
      });
    }

    // fusion weights sidebar
    var wts = document.getElementById('weights');
    if (wts) {
      wts.textContent = '';
      var fw = r.fusion_weights;
      [['Gaze attention', 'ω_g', fw.gaze], ['Semantic matching', 'ω_s', fw.semantic],
       ['Template binding', 'ω_t', fw.template], ['Visual confidence', 'ω_c', fw.confidence]].forEach(function (row) {
        var w = node('div', 'weight');
        var top = node('div', 'weight__top');
        var s = node('span');
        s.appendChild(document.createTextNode(row[0] + ' '));
        s.appendChild(node('span', 'math', row[1]));
        top.appendChild(s);
        top.appendChild(node('b', null, row[2].toFixed(2)));
        w.appendChild(top);
        var bar = node('div', 'weight__bar');
        var fill = node('i');
        fill.style.setProperty('--v', String(row[2]));
        bar.appendChild(fill);
        w.appendChild(bar);
        wts.appendChild(w);
      });
    }
  }

  function renderAuthors() {
    var host = document.getElementById('author-list');
    if (!host) return;
    [
      ['Yuntong Zhang', 'Tianjin University of Technology (TJUT)', false],
      ['Yue Yin', 'Defense Innovation Institute, AMS', true],
      ['Yu Zhao', 'Tianjin Artificial Intelligence Innovation Center', false],
      ['Jiaxin Yu', 'Defense Innovation Institute, AMS', false],
      ['Liang Xie', 'National Innovation Institute of Defense Technology, AMS', false]
    ].forEach(function (a) {
      var li = node('li');
      var left = node('b', null, a[0]);
      if (a[2]) left.appendChild(node('em', null, 'corresponding'));
      li.appendChild(left);
      li.appendChild(node('span', null, a[1]));
      host.appendChild(li);
    });
  }

  /* ─────────────────────────── run interactions ─────────────────────────── */

  var stageTimer = null;

  function runTrial(d) {
    var btn = document.getElementById('run-demo');
    var label = document.getElementById('run-label');
    if (stageTimer) { window.clearInterval(stageTimer); stageTimer = null; }

    // With reduced motion there is nothing to animate: land on the end state.
    if (reduceMotion) {
      showStage(d, d.stages.length - 1, false);
      if (label) label.textContent = 'Show first frame';
      if (btn) btn.disabled = false;
      return;
    }

    if (label) label.textContent = 'Replaying…';
    if (btn) btn.disabled = true;
    showStage(d, 0, false);

    var i = 0;
    stageTimer = window.setInterval(function () {
      i += 1;
      if (i >= d.stages.length) {
        window.clearInterval(stageTimer);
        stageTimer = null;
        if (label) label.textContent = 'Replay again';
        if (btn) btn.disabled = false;
        return;
      }
      showStage(d, i, false);
    }, 1900);
  }

  function runPipeline(d) {
    var btn = document.getElementById('run-pipeline');
    var label = document.getElementById('pipeline-label');
    var term = document.getElementById('terminal-body');
    var total = document.getElementById('pipeline-total');
    if (!term) return;

    var steps = d.sample_pipeline;
    var sum = steps.reduce(function (a, b) { return a + b.ms; }, 0);

    $$('.stage').forEach(function (c) { c.classList.remove('is-running', 'is-done'); });
    term.textContent = '$ selection.run(target="' + d.trial.mission + '", condition="' + d.trial.condition + '")\n';
    if (btn) btn.disabled = true;
    if (label) label.textContent = 'Running…';

    var i = -1;
    var acc = 0;

    function tick() {
      if (i >= 0) {
        var prev = $('.stage[data-i="' + i + '"]');
        if (prev) {
          prev.classList.remove('is-running');
          prev.classList.add('is-done');
          var bar = $('.stage__bar i', prev);
          if (bar) bar.style.cssText = 'width:100%;transition:width .35s ease';
        }
      }
      i += 1;
      if (i >= steps.length) {
        term.textContent +=
          '\n  ' + pad('total', 17) + sum + ' ms\n' +
          '  ' + pad('selected_object_ids', 17) + JSON.stringify(d.response_packet.selected_object_ids) + '\n' +
          '  ' + pad('scores', 17) + JSON.stringify(d.response_packet.scores) + '\n' +
          '  ' + pad('status', 17) + d.response_packet.status + '\n' +
          '✓ episode complete\n';
        term.scrollTop = 0;
        if (total) total.textContent = 'total ' + sum + ' ms';
        if (btn) btn.disabled = false;
        if (label) label.textContent = 'Execute again';
        return;
      }

      var step = steps[i];
      var card = $('.stage[data-i="' + i + '"]');
      if (card) card.classList.add('is-running');

      acc += step.ms;
      term.textContent +=
        '  ' + pad(step.label, 17) + pad(step.ms + ' ms', 8) + 'Σ ' + pad(acc + ' ms', 8) +
        step.detail + '\n';
      term.scrollTop = 0;

      window.setTimeout(tick, Math.max(320, Math.min(900, step.ms * 2.4)));
    }

    window.setTimeout(tick, 220);
  }

  function pad(s, n) {
    s = String(s);
    return s.length >= n ? s + ' ' : s + new Array(n - s.length + 1).join(' ');
  }

  /* ─────────────────────────── scroll UX ─────────────────────────── */

  function scrollUx() {
    var bar = document.getElementById('readbar');
    var inner = bar ? bar.appendChild(document.createElement('i')) : null;
    var topbar = document.getElementById('topbar');
    var links = $$('.nav a[href^="#"]:not(.nav__cta)');
    var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);

    function onScroll() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (inner) inner.style.width = (pct * 100).toFixed(2) + '%';
      if (topbar) topbar.classList.toggle('is-stuck', window.scrollY > 8);

      var active = null;
      var probe = window.scrollY + window.innerHeight * 0.3;
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

  function reveal() {
    var targets = $$('.section__head, .card, .figure, .stage, .modality, .mission-row, .table-wrap, .console, .terminal, .callout');
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    targets.forEach(function (t) { t.classList.add('reveal'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    targets.forEach(function (t) { io.observe(t); });
  }

  function counters() {
    var kpis = document.getElementById('kpis');
    if (!kpis) return;
    var run = function () {
      $$('[data-count]', kpis).forEach(function (node) {
        var target = parseFloat(node.dataset.count);
        var decimals = parseInt(node.dataset.decimals || '1', 10);
        var settle = function () { node.textContent = node.dataset.final || target.toFixed(decimals); };
        if (isNaN(target) || reduceMotion) { settle(); return; }
        var dur = 1000, t0 = performance.now();
        var guard = window.setTimeout(settle, dur + 400);
        (function frame(now) {
          var p = Math.min(1, (now - t0) / dur);
          if (p >= 1) { window.clearTimeout(guard); settle(); return; }
          node.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(decimals);
          window.requestAnimationFrame(frame);
        })(performance.now());
      });
    };
    if (reduceMotion || !('IntersectionObserver' in window)) { run(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { run(); io.disconnect(); } });
    }, { threshold: 0.3 });
    io.observe(kpis);
  }

  function copyButtons() {
    $$('.copybtn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var src = document.getElementById(btn.dataset.copy);
        if (!src) return;
        var text = src.textContent;
        var done = function () {
          var old = btn.textContent;
          btn.textContent = 'Copied';
          btn.classList.add('is-done');
          window.setTimeout(function () { btn.textContent = old; btn.classList.remove('is-done'); }, 1500);
        };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(done, function () { fallback(text, done); });
        } else { fallback(text, done); }
      });
    });
  }

  function fallback(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  /* ─────────────────────────── boot ─────────────────────────── */

  function boot() {
    fetch('assets/data/demo.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) {
        window.__DEMO__ = d;
        renderTrial(d);
        renderPipeline(d);
        renderSystem(d);
        renderMissions(d);
        renderValidation(d);
        renderAuthors();
        showStage(d, 0, false);

        var runBtn = document.getElementById('run-demo');
        if (runBtn) runBtn.addEventListener('click', function () { runTrial(d); });
        var pipeBtn = document.getElementById('run-pipeline');
        if (pipeBtn) pipeBtn.addEventListener('click', function () { runPipeline(d); });
      })
      .catch(function (err) {
        var note = document.getElementById('stage-detail');
        if (note) note.textContent = 'Could not load assets/data/demo.json (' + err.message + '). Earlier published pages have a self-contained fallback.';
      });

    scrollUx();
    mobileNav();
    reveal();
    counters();
    copyButtons();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
