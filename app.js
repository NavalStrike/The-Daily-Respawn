/* The Daily Respawn — PWA. Vanilla JS, no build step. */
(function () {
  'use strict';
  var TOPICS = ['games', 'movies', 'tech', 'ai', 'comics', 'manga', 'manhwa'];
  var UI = {
    en: { language: 'Language', edition: 'Edition', daily: 'Daily edition', tz: 'Angola time', cover: 'COVER STORY', inIssue: 'In this issue', browse: 'Browse by topic', all: 'All', saved: 'Saved', archive: 'Archive', install: 'Install', offline: 'Offline', note: "Editor's note", inside: 'Inside this issue', prev: 'Prev', next: 'Next', swipe: 'Swipe to turn the page', end: "That's all for this edition", back: 'Back to cover', video: 'VIDEO', watch: 'Watch the video', facts: 'Fast facts', also: 'Also reported by:', creators: 'Creators', co: 'Co-creators', close: 'Close', save: 'Save', unsave: 'Remove from saved', nosaved: 'Nothing saved yet. Tap the star on a story to keep it here.', loading: 'Loading…', fail: 'Could not load the magazine. Check your connection and try again.', retry: 'Try again', topics: { all: 'All', saved: 'Saved', games: 'Games', movies: 'Movies', tech: 'Tech', ai: 'A.I.', comics: 'Comics', manga: 'Manga', manhwa: 'Manhwa' } },
    pt: { language: 'Idioma', edition: 'Edição', daily: 'Edição diária', tz: 'hora de Angola', cover: 'HISTÓRIA DE CAPA', inIssue: 'Nesta edição', browse: 'Navegar por tema', all: 'Tudo', saved: 'Guardados', archive: 'Arquivo', install: 'Instalar', offline: 'Sem ligação', note: 'Nota do editor', inside: 'Nesta edição', prev: 'Ant.', next: 'Seg.', swipe: 'Deslize para virar a página', end: 'É tudo por esta edição', back: 'Voltar à capa', video: 'VÍDEO', watch: 'Ver o vídeo', facts: 'Em resumo', also: 'Também noticiado por:', creators: 'Criadores', co: 'Cocriadores', close: 'Fechar', save: 'Guardar', unsave: 'Remover dos guardados', nosaved: 'Ainda não guardou nada. Toque na estrela de uma notícia para a guardar aqui.', loading: 'A carregar…', fail: 'Não foi possível carregar a revista. Verifique a ligação e tente novamente.', retry: 'Tentar novamente', topics: { all: 'Tudo', saved: 'Guardados', games: 'Jogos', movies: 'Filmes', tech: 'Tech', ai: 'I.A.', comics: 'Comics', manga: 'Manga', manhwa: 'Manhwa' } }
  };

  var state = { lang: 'en', topic: 'all', idx: 0, ed: null, index: null, pages: [], track: null, saved: {} };
  var app = document.getElementById('app');
  var t = function (k) { return UI[state.lang][k]; };
  var L = function (o) { return o ? (o[state.lang] || o.en || '') : ''; };

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function link(href, text, cls) { var a = el('a', cls, text); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }

  /* ---------- dates ---------- */
  function fmtDate(iso, long) {
    var d = new Date(iso), loc = state.lang === 'pt' ? 'pt-PT' : 'en-GB';
    try {
      return new Intl.DateTimeFormat(loc, long ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Luanda' } : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Luanda' }).format(d).replace(/,/g, '');
    } catch (e) { return d.toDateString(); }
  }
  function fmtTime(iso) {
    try { return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Luanda' }).format(new Date(iso)); } catch (e) { return ''; }
  }
  function pad3(n) { return ('00' + n).slice(-3); }

  /* ---------- render (vertical markup, then paged) ---------- */
  function icon(name) {
    var ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 100 100'); s.setAttribute('width', '46%'); s.setAttribute('height', '46%'); s.setAttribute('aria-hidden', 'true'); s.style.display = 'block';
    var u = document.createElementNS(ns, 'use'); u.setAttribute('href', '#i-' + name); s.appendChild(u); return s;
  }
  function shot(m, big) {
    var a = link(m.url, '', 'shot');
    var i = el('img'); i.src = 'img/' + m.img; i.alt = L(m.alt); i.loading = 'lazy'; a.appendChild(i);
    var pb = el('span', 'pb'); pb.setAttribute('aria-hidden', 'true'); a.appendChild(pb);
    if (m.duration) a.appendChild(el('span', 'tm', m.duration));
    a.appendChild(el('span', 'sr', t('watch')));
    return a;
  }
  function artEl(m) {
    var d = el('div', 'art ' + (m.tone || '')); d.setAttribute('role', 'img'); d.setAttribute('aria-label', L(m.alt));
    d.style.display = 'grid'; d.style.placeItems = 'center'; d.appendChild(icon(m.icon)); return d;
  }
  function favBtn(id) {
    var b = el('button', 'fav'); b.type = 'button'; b.dataset.id = id;
    var on = !!state.saved[id]; b.textContent = on ? '★' : '☆'; b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? t('unsave') : t('save'));
    return b;
  }
  function article(a) {
    var feat = a.kind === 'feature', root = el('article', (feat ? 'feature ' : 'card ') + a.topic); root.id = a.id;
    var m = a.media || {};
    if (feat) {
      var left = el('div');
      if (m.type === 'video') { left.appendChild(shot(m)); if (m.caption) { var cap = el('p', 'cap'); cap.appendChild(el('b', null, t('video'))); cap.appendChild(document.createTextNode(L(m.caption))); left.appendChild(cap); } }
      else if (m.type === 'icon') left.appendChild(artEl(m));
      var body = el('div', 'body');
      body.appendChild(el('p', 'kick', L(a.kicker)));
      body.appendChild(el('h3', null, L(a.headline)));
      if (a.deck) body.appendChild(el('p', 'deck', L(a.deck)));
      var cols = el('div', 'cols');
      (a.body || []).forEach(function (p, i) { cols.appendChild(el('p', i === 0 ? 'dropcap' : null, L(p))); });
      body.appendChild(cols);
      if (a.facts && a.facts.length) {
        body.appendChild(el('p', 'facts-head', t('facts')));
        var dl = el('dl', 'facts');
        a.facts.forEach(function (f) { var d = el('div'); d.appendChild(el('dt', null, L(f.k))); d.appendChild(el('dd', null, L(f.v))); dl.appendChild(d); });
        body.appendChild(dl);
      }
      if (a.link) body.appendChild(link(a.link.url, L(a.link.label), 'more'));
      if (a.also && a.also.length) {
        var s = el('p', 'srcs', t('also') + ' ');
        a.also.forEach(function (x, i) { if (i) s.appendChild(document.createTextNode(' · ')); s.appendChild(link(x.url, x.name)); });
        body.appendChild(s);
      }
      root.appendChild(left); root.appendChild(body);
    } else {
      if (m.type === 'video') root.appendChild(shot(m)); else if (m.type === 'icon') root.appendChild(artEl(m));
      var txt = el('div', 'txt');
      txt.appendChild(el('p', 'tagline', L(a.kicker)));
      txt.appendChild(el('h4', null, L(a.headline)));
      (a.body || []).forEach(function (p) { txt.appendChild(el('p', null, L(p))); });
      if (a.chip) txt.appendChild(el('span', 'chip', L(a.chip)));
      if (a.link) txt.appendChild(link(a.link.url, L(a.link.label), 'more'));
      root.appendChild(txt);
    }
    root.appendChild(favBtn(a.id));
    return root;
  }
  function briefEl(sec) {
    var as = el('aside', 'brief ' + sec.topic); as.id = sec.id + '-brief';
    as.appendChild(el('h4', null, L(sec.title) + ' · ' + (state.lang === 'pt' ? 'Destaques rápidos' : 'Quick hits')));
    var ul = el('ul');
    sec.brief.forEach(function (b) { var li = el('li'); li.appendChild(link(b.url, b.src)); li.appendChild(document.createTextNode(' ' + L(b.text))); ul.appendChild(li); });
    as.appendChild(ul); return as;
  }
  function secTopic(sec) { return sec.topic === 'cover-section' ? '' : sec.topic; }

  function buildPages() {
    var ed = state.ed, pages = [];
    function page(cls, topic, id) { var p = el('section', 'pg ' + cls); if (topic) p.dataset.t = topic; if (id) p.dataset.id = id; var i = el('div', 'pgi'); p.appendChild(i); p._i = i; pages.push(p); return p; }
    function tab(title, sub) { var d = el('div', 'tab'); d.appendChild(el('h2', null, title)); if (sub) d.appendChild(el('span', null, sub)); return d; }

    /* cover */
    var p = page('pg-cover'), cov = el('header', 'cover');
    var mast = el('div', 'mast'); mast.appendChild(el('h1', 'sr', 'The Daily Respawn'));
    var logo = el('img', 'logo-banner'); logo.src = 'img/respawn-logo.jpg'; logo.alt = 'The Daily Respawn logo'; mast.appendChild(logo);
    var iss = el('div', 'issue');
    iss.appendChild(el('span', null, t('edition') + ' ' + pad3(ed.number) + ' · ' + t('daily')));
    iss.appendChild(el('span', null, fmtDate(ed.publishedAt, true) + ' · ' + fmtTime(ed.publishedAt) + ' ' + t('tz')));
    iss.appendChild(el('span', null, TOPICS.map(function (k) { return t('topics')[k]; }).join(' · ')));
    mast.appendChild(iss); cov.appendChild(mast);
    var grid = el('div', 'cover-grid');
    var ca = el('a', 'cover-art'); ca.href = '#' + ed.cover.target; ca.style.textDecoration = 'none';
    var st = el('div', 'stamp'); st.setAttribute('aria-label', t('edition')); st.appendChild(el('b', null, t('edition'))); st.appendChild(el('strong', null, pad3(ed.number))); st.appendChild(el('span', null, fmtDate(ed.publishedAt))); st.appendChild(el('span', null, fmtTime(ed.publishedAt) + ' ' + t('tz'))); ca.appendChild(st);
    var cs = el('div', 'shot cover-shot'), ci = el('img'); ci.src = 'img/' + ed.cover.img; ci.alt = L(ed.cover.alt); cs.appendChild(ci); ca.appendChild(cs);
    var ov = el('div', 'overlay'); ov.appendChild(el('span', 'k', t('cover'))); ov.appendChild(el('h2', null, L(ed.cover.headline))); ca.appendChild(ov); grid.appendChild(ca);
    var lines = el('nav', 'lines'); lines.setAttribute('aria-label', t('inIssue')); lines.appendChild(el('h3', null, t('inIssue')));
    ed.sections.forEach(function (sec) {
      if (sec.topic === 'cover-section' || !sec.items.length) return;
      var f = sec.items[0], a = el('a', f.topic); a.href = '#' + f.id; a.appendChild(el('small', null, L(sec.title))); a.appendChild(el('strong', null, L(f.headline))); lines.appendChild(a);
    });
    grid.appendChild(lines);
    var tb = el('div', 'topicbar'); tb.setAttribute('role', 'group'); tb.setAttribute('aria-label', t('browse')); tb.appendChild(el('b', null, t('browse')));
    ['all'].concat(TOPICS).concat(['saved']).forEach(function (k) { var b = el('button', null, t('topics')[k]); b.type = 'button'; b.dataset.t = k; b.setAttribute('aria-pressed', String(state.topic === k)); tb.appendChild(b); });
    grid.appendChild(tb); cov.appendChild(grid);
    var cr = el('p', 'credits'); var s1 = el('span'); s1.appendChild(el('b', null, t('creators'))); s1.appendChild(document.createTextNode(' Pedro Nanjamba & Anderson Naval'));
    var s2 = el('span'); s2.appendChild(el('b', null, t('co'))); s2.appendChild(document.createTextNode(state.lang === 'pt' ? ' Paulo Anjos e Sandro Ndala' : ' Paulo Anjos and Sandro Ndala')); cr.appendChild(s1); cr.appendChild(s2); cov.appendChild(cr);
    p._i.appendChild(cov);

    /* inside */
    p = page('pg-inside'); p.id = 'inside'; p._i.appendChild(tab(t('inside')));
    var note = el('div', 'note'); note.appendChild(el('b', null, t('note'))); ed.note.forEach(function (n) { note.appendChild(el('p', null, L(n))); }); p._i.appendChild(note);
    var toc = el('nav', 'toc'); toc.setAttribute('aria-label', 'Sections');
    ed.sections.forEach(function (sec) { var a = el('a', null, L(sec.title)); a.href = '#' + sec.id; toc.appendChild(a); });
    p._i.appendChild(toc);

    /* stories */
    ed.sections.forEach(function (sec) {
      var first = true;
      function add(node, topic, id) {
        var pg = page('spread ' + (sec.topic === 'cover-section' ? 'cover-sec' : sec.topic), topic, id);
        if (first) { pg.id = sec.id; first = false; }
        pg._i.appendChild(tab(L(sec.title), L(sec.subtitle)));
        var body = el('div', 'spread-body'); body.appendChild(node); pg._i.appendChild(body);
      }
      sec.items.forEach(function (a) { add(article(a), a.topic, a.id); });
      if (sec.brief && sec.brief.length) add(briefEl(sec), secTopic(sec), null);
    });

    /* end */
    p = page('pg-end'); p._i.appendChild(tab(t('end')));
    var foot = el('footer'); foot.appendChild(el('span', null, 'The Daily Respawn · ' + t('edition') + ' ' + pad3(ed.number) + ' · ' + fmtDate(ed.publishedAt) + ', ' + fmtTime(ed.publishedAt) + ' ' + t('tz'))); foot.appendChild(el('span', null, L(ed.footer))); p._i.appendChild(foot);
    var back = el('button', 'toBack', t('back')); back.type = 'button'; back.dataset.act = 'cover'; p._i.appendChild(back);
    return pages;
  }

  /* ---------- pager ---------- */
  var nav = null;
  function vis() { return state.pages.filter(function (x) { return !x.classList.contains('is-hidden'); }); }
  function applyFilter() {
    var T = state.topic;
    state.pages.forEach(function (pg) {
      var hide = false;
      if (pg.dataset.t || pg.classList.contains('spread')) {
        if (T === 'saved') hide = !(pg.dataset.id && state.saved[pg.dataset.id]);
        else if (T !== 'all') hide = pg.dataset.t !== T;
      }
      pg.classList.toggle('is-hidden', hide);
    });
    document.querySelectorAll('.toc a').forEach(function (a) { var e = document.getElementById(a.getAttribute('href').slice(1)), pg = e && e.closest('.pg'); a.classList.toggle('is-hidden', !!(pg && pg.classList.contains('is-hidden'))); });
    document.querySelectorAll('.topicbar button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.t === T)); });
  }
  function upd() {
    var v = vis(), i = state.idx, n = nav, pg = v[i];
    n.ct.textContent = (v.length ? i + 1 : 0) + ' / ' + v.length;
    n.bar.style.width = (v.length ? (i + 1) / v.length * 100 : 0) + '%';
    var h = pg && pg.querySelector('.tab h2'); n.lb.textContent = h ? h.textContent : 'The Daily Respawn';
    if (i > 0) n.hint.classList.add('gone');
    n.pv.disabled = i <= 0; n.nx.disabled = i >= v.length - 1;
    if (T_empty()) { /* nothing */ }
  }
  function T_empty() { return false; }
  function go(i, instant) {
    var v = vis(), w = app.clientWidth, tr = state.track;
    i = Math.max(0, Math.min(v.length - 1, i)); state.idx = i;
    tr.style.transition = instant ? 'none' : '';
    tr.style.transform = 'translate3d(' + (-i * w) + 'px,0,0)';
    if (instant) { void tr.offsetWidth; tr.style.transition = ''; }
    upd();
  }
  function mount() {
    var pages = buildPages(); state.pages = pages;
    app.textContent = '';
    var tr = el('div', 'track'); state.track = tr; app.appendChild(tr);
    pages.forEach(function (pg) { tr.appendChild(pg); });
    document.documentElement.classList.add('hz-on');
    var sel = '.tab,.logo-banner,.issue,.stamp,.cover-art,.lines a,.credits,.topicbar,.note,.toc a,.shot,.art,.tagline,.kick,h3,h4,.deck,.cols p,.body p,.facts,.facts-head,.chip,.more,.srcs,li,.disc,.dropcap,footer span,.toBack';
    pages.forEach(function (pg) { var n = 0; pg.querySelectorAll(sel).forEach(function (e) { if (e.closest('.rv')) return; e.classList.add('rv'); e.style.setProperty('--i', Math.min(n++, 14)); }); });
    if (nav) nav.root.remove();
    var root = el('div', 'pgnav');
    root.innerHTML = '<button type="button" class="pv" aria-label="Previous page">‹ <span></span></button><div class="mid"><div class="lbl"><b></b><span class="ct"></span></div><div class="bar"><i></i></div></div><button type="button" class="nx" aria-label="Next page"><span></span> ›</button><div class="hint"></div>';
    app.after(root);
    nav = { root: root, lb: root.querySelector('.lbl b'), ct: root.querySelector('.ct'), bar: root.querySelector('.bar i'), hint: root.querySelector('.hint'), pv: root.querySelector('.pv'), nx: root.querySelector('.nx') };
    nav.pv.querySelector('span').textContent = t('prev'); nav.nx.querySelector('span').textContent = t('next'); nav.hint.textContent = t('swipe');
    nav.pv.addEventListener('click', function () { go(state.idx - 1); });
    nav.nx.addEventListener('click', function () { go(state.idx + 1); });
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.intersectionRatio >= .55) en.target.classList.add('on'); else if (en.intersectionRatio === 0) en.target.classList.remove('on'); }); }, { root: app, threshold: [0, .55] });
    pages.forEach(function (pg) { io.observe(pg); });
    applyFilter(); go(Math.min(state.idx, Math.max(0, vis().length - 1)), true);
  }

  /* touch: finger-following drag, exactly one page per swipe */
  var x0 = 0, y0 = 0, dx = 0, axis = null, t0 = 0;
  app.addEventListener('touchstart', function (e) { if (e.touches.length > 1) { axis = 'n'; return; } var q = e.touches[0]; x0 = q.clientX; y0 = q.clientY; dx = 0; axis = null; t0 = Date.now(); }, { passive: true });
  app.addEventListener('touchmove', function (e) {
    if (axis === 'n' || !state.track) return;
    var q = e.touches[0], ddx = q.clientX - x0, ddy = q.clientY - y0;
    if (!axis) { if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return; axis = Math.abs(ddx) > Math.abs(ddy) * 1.2 ? 'x' : 'y'; if (axis === 'x') state.track.style.transition = 'none'; }
    if (axis !== 'x') return; e.preventDefault(); dx = ddx;
    var n = vis().length, edge = (state.idx === 0 && dx > 0) || (state.idx === n - 1 && dx < 0);
    state.track.style.transform = 'translate3d(' + (-state.idx * app.clientWidth + (edge ? dx * .3 : dx)) + 'px,0,0)';
  }, { passive: false });
  function endTouch() {
    if (axis === 'x') { var W = app.clientWidth, v = Math.abs(dx) / Math.max(1, Date.now() - t0); if (Math.abs(dx) > W * .2 || (v > .35 && Math.abs(dx) > 30)) go(state.idx + (dx < 0 ? 1 : -1)); else go(state.idx); }
    axis = null;
  }
  app.addEventListener('touchend', endTouch, { passive: true }); app.addEventListener('touchcancel', endTouch, { passive: true });
  window.addEventListener('resize', function () { if (state.track) go(state.idx, true); });
  document.addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('input,textarea,select')) return;
    if (document.getElementById('drawer').classList.contains('open')) { if (e.key === 'Escape') closeDrawer(); return; }
    if (e.key === 'ArrowRight') { go(state.idx + 1); e.preventDefault(); } else if (e.key === 'ArrowLeft') { go(state.idx - 1); e.preventDefault(); }
    else if (e.key === 'Home') go(0); else if (e.key === 'End') go(vis().length - 1);
  });

  /* clicks: topic filter, favourites, internal links, back */
  document.addEventListener('click', function (e) {
    var tg = e.target, b;
    if ((b = tg.closest('.topicbar button'))) { state.topic = b.dataset.t; applyFilter(); var v = vis(); var k = v.findIndex(function (x) { return x.dataset.t || x.dataset.id; }); go(b.dataset.t === 'all' ? 0 : (k < 0 ? 0 : k), true); if (b.dataset.t === 'saved' && !v.length) {} return; }
    if ((b = tg.closest('.fav'))) {
      var id = b.dataset.id; if (state.saved[id]) delete state.saved[id]; else state.saved[id] = 1;
      store('tdr-saved', JSON.stringify(state.saved));
      document.querySelectorAll('.fav[data-id="' + id + '"]').forEach(function (x) { var on = !!state.saved[id]; x.textContent = on ? '★' : '☆'; x.setAttribute('aria-pressed', String(on)); x.setAttribute('aria-label', on ? t('unsave') : t('save')); });
      e.preventDefault(); return;
    }
    if ((b = tg.closest('[data-act="cover"]'))) { go(0); return; }
    var a = tg.closest('a[href^="#"]');
    if (a) { var target = document.getElementById(a.getAttribute('href').slice(1)); var pg = target && target.closest('.pg'); if (!pg) return; e.preventDefault(); if (pg.classList.contains('is-hidden')) { state.topic = 'all'; applyFilter(); } go(vis().indexOf(pg)); }
  });

  /* ---------- language ---------- */
  function setLang(l, keep) {
    state.lang = l; store('tdr-lang', l);
    document.documentElement.lang = l === 'pt' ? 'pt-PT' : 'en';
    document.querySelectorAll('.langbar [data-l]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.l === l)); });
    document.getElementById('lbl-lang').textContent = t('language');
    document.getElementById('offdot').textContent = t('offline');
    document.getElementById('btn-archive').textContent = t('archive');
    document.getElementById('btn-install').textContent = t('install');
    document.querySelector('#drawer .x').setAttribute('aria-label', t('close'));
    document.getElementById('dr-title').textContent = t('archive');
    if (state.ed) { mount(); fillArchive(); }
  }
  document.querySelectorAll('.langbar [data-l]').forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.l); }); });

  /* ---------- archive drawer ---------- */
  var drawer = document.getElementById('drawer');
  function openDrawer() { fillArchive(); drawer.classList.add('open'); drawer.querySelector('.x').focus(); }
  function closeDrawer() { drawer.classList.remove('open'); }
  document.getElementById('btn-archive').addEventListener('click', openDrawer);
  drawer.querySelector('.scrim').addEventListener('click', closeDrawer);
  drawer.querySelector('.x').addEventListener('click', closeDrawer);
  function fillArchive() {
    var box = document.getElementById('dr-list'); box.textContent = '';
    if (!state.index) return;
    state.index.editions.slice().sort(function (a, b) { return b.number - a.number; }).forEach(function (e) {
      var b = el('button', 'ed'); b.type = 'button'; if (state.ed && state.ed.id === e.id) b.setAttribute('aria-current', 'true');
      b.appendChild(el('small', null, t('edition') + ' ' + pad3(e.number) + ' · ' + fmtDate(e.publishedAt) + ' · ' + fmtTime(e.publishedAt)));
      b.appendChild(el('strong', null, L(e.headline)));
      b.addEventListener('click', function () { closeDrawer(); loadEdition(e.id); });
      box.appendChild(b);
    });
  }

  /* ---------- data ---------- */
  function getJSON(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function showError() {
    app.textContent = ''; var d = el('div', 'loading'); d.appendChild(el('div', null, t('fail')));
    var b = el('button', 'toBack', t('retry')); b.type = 'button'; b.addEventListener('click', start); d.appendChild(b); app.appendChild(d);
  }
  function loadEdition(id) {
    return getJSON('data/editions/' + id + '.json').then(function (ed) {
      state.ed = ed; state.idx = 0; state.topic = 'all';
      try { history.replaceState(null, '', location.pathname + (id === state.index.latest ? '' : '?e=' + id)); } catch (e) {}
      mount(); fillArchive();
    });
  }
  function start() {
    app.textContent = ''; app.appendChild(el('div', 'loading', t('loading')));
    getJSON('data/editions.json').then(function (idx) {
      state.index = idx;
      var q = /[?&]e=([\w-]+)/.exec(location.search), id = q && idx.editions.some(function (e) { return e.id === q[1]; }) ? q[1] : idx.latest;
      return loadEdition(id);
    }).catch(showError);
  }

  /* ---------- online/offline, install, service worker ---------- */
  function net() { document.documentElement.classList.toggle('offline', !navigator.onLine); }
  window.addEventListener('online', net); window.addEventListener('offline', net); net();
  var deferred = null, ib = document.getElementById('btn-install');
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; ib.classList.add('show'); });
  ib.addEventListener('click', function () { if (!deferred) return; deferred.prompt(); deferred.userChoice.finally(function () { deferred = null; ib.classList.remove('show'); }); });
  window.addEventListener('appinstalled', function () { ib.classList.remove('show'); });
  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });

  /* ---------- boot ---------- */
  try { state.saved = JSON.parse(store('tdr-saved') || '{}') || {}; } catch (e) { state.saved = {}; }
  var l0 = store('tdr-lang'); if (!l0) l0 = ((navigator.language || '').toLowerCase().indexOf('pt') === 0) ? 'pt' : 'en';
  setLang(l0); start();
})();
