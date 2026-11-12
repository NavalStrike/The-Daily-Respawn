/* The Daily Respawn: PWA. Vanilla JS, no build step. Editorial layout: header + topic nav, hero grid, topic sections, article reader, search, archive. */
(function () {
  'use strict';
  const TOPICS = ['games', 'movies', 'tech', 'ai', 'comics', 'manga', 'manhwa'];
  const UI = {
    en: { edition: 'Edition', daily: 'Daily edition', tz: 'Angola time', cover: 'Cover story', inIssue: 'In this issue', all: 'All', saved: 'Saved', archive: 'Archive', install: 'Install', offline: 'Offline', note: "Editor's note", video: 'VIDEO', watch: 'Watch on YouTube', facts: 'Fast facts', also: 'Also reported by:', creators: 'Creators', co: 'Co-creators', close: 'Close', save: 'Save', unsave: 'Remove from saved', nosaved: 'Nothing saved yet. Tap the star on a story to keep it here.', loading: 'Loading…', fail: 'Could not load the magazine. Check your connection and try again.', retry: 'Try again', search: 'Search', searchPh: 'Search this edition', noResults: 'No stories match your search.', searchHint: 'Type a name, a game, a film or a topic.', theme: 'Switch theme', back: 'Back', share: 'Share', copied: 'Link copied', minRead: 'min read', quick: 'Quick hits', stories: 'stories', update: 'Update', prev: 'Previous story', next: 'Next story', related: 'More in', nextEd: 'Next edition tomorrow at 09:00 Angola time', skip: 'Skip to content', topicsLbl: 'Topics', topics: { all: 'All', saved: 'Saved', games: 'Games', movies: 'Movies', tech: 'Tech', ai: 'A.I.', comics: 'Comics', manga: 'Manga', manhwa: 'Manhwa' } },
    pt: { edition: 'Edição', daily: 'Edição diária', tz: 'hora de Angola', cover: 'História de capa', inIssue: 'Nesta edição', all: 'Tudo', saved: 'Guardados', archive: 'Arquivo', install: 'Instalar', offline: 'Sem ligação', note: 'Nota do editor', video: 'VÍDEO', watch: 'Ver no YouTube', facts: 'Em resumo', also: 'Também noticiado por:', creators: 'Criadores', co: 'Cocriadores', close: 'Fechar', save: 'Guardar', unsave: 'Remover dos guardados', nosaved: 'Ainda não guardou nada. Toque na estrela de uma notícia para a guardar aqui.', loading: 'A carregar…', fail: 'Não foi possível carregar a revista. Verifique a ligação e tente novamente.', retry: 'Tentar novamente', search: 'Pesquisar', searchPh: 'Pesquisar nesta edição', noResults: 'Nenhuma notícia corresponde à pesquisa.', searchHint: 'Escreva um nome, um jogo, um filme ou um tema.', theme: 'Mudar de tema', back: 'Voltar', share: 'Partilhar', copied: 'Ligação copiada', minRead: 'min de leitura', quick: 'Destaques rápidos', stories: 'notícias', update: 'Atualização', prev: 'Notícia anterior', next: 'Notícia seguinte', related: 'Mais em', nextEd: 'Próxima edição amanhã às 09:00, hora de Angola', skip: 'Saltar para o conteúdo', topicsLbl: 'Temas', topics: { all: 'Tudo', saved: 'Guardados', games: 'Jogos', movies: 'Filmes', tech: 'Tech', ai: 'I.A.', comics: 'Comics', manga: 'Manga', manhwa: 'Manhwa' } }
  };
  const state = { lang: 'en', topic: 'all', ed: null, index: null, saved: {}, items: [], byId: {}, reading: null, pushed: false, lastFocus: null };
  const $ = (id) => document.getElementById(id);
  const main = $('main'), reader = $('reader'), searchBox = $('search'), drawer = $('drawer');
  const t = (k) => UI[state.lang][k];
  const L = (o) => (o ? (o[state.lang] || o.en || '') : '');
  const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } return null; }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function ext(href, text, cls) { const a = el('a', cls, text); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
  function pad3(n) { return ('00' + n).slice(-3); }
  function fmtDate(iso, long) {
    const loc = state.lang === 'pt' ? 'pt-PT' : 'en-GB';
    try { return new Intl.DateTimeFormat(loc, long ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Luanda' } : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Luanda' }).format(new Date(iso)); } catch (e) { return new Date(iso).toDateString(); }
  }
  function fmtTime(iso) { try { return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Luanda' }).format(new Date(iso)); } catch (e) { return ''; } }
  const topicName = (k) => UI[state.lang].topics[k] || k;

  /* ---------- data model ---------- */
  function indexEdition() {
    state.items = []; state.byId = {};
    (state.ed.sections || []).forEach((sec) => (sec.items || []).forEach((a) => { const it = { a: a, sec: sec, cover: sec.id === 'cover-section' }; state.items.push(it); state.byId[a.id] = it; }));
  }
  function coverItem() { const ed = state.ed; return (ed.cover && state.byId[ed.cover.target]) || state.items[0] || null; }
  function isUpdate(a) { return !!a.upd || /^(update|atualiza)/i.test(L(a.headline)); }
  function readMins(a) { const words = [L(a.deck)].concat((a.body || []).map(L)).join(' ').split(/\s+/).length; return Math.max(1, Math.round(words / 200)); }
  function sourceName(a) { return a.link && (a.link.name || (L(a.link.label).match(/(?:at|em) (.+?) →/) || [])[1]) || ''; }

  /* ---------- pieces ---------- */
  function icon(name) {
    const ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 100 100'); s.setAttribute('aria-hidden', 'true');
    const u = document.createElementNS(ns, 'use'); u.setAttribute('href', '#i-' + name); s.appendChild(u); return s;
  }
  function artEl(m) { const d = el('div', 'art ' + (m.tone || '')); d.setAttribute('role', 'img'); d.setAttribute('aria-label', L(m.alt)); d.appendChild(icon(m.icon)); return d; }
  function thumb(m, eager) {
    if (m && m.type === 'video') {
      const w = el('div', 'media'), i = el('img'); i.src = 'img/' + m.img; i.alt = L(m.alt); i.loading = eager ? 'eager' : 'lazy'; i.decoding = 'async'; w.appendChild(i);
      const pb = el('span', 'pb'); pb.setAttribute('aria-hidden', 'true'); w.appendChild(pb);
      if (m.duration) w.appendChild(el('span', 'tm', m.duration)); return w;
    }
    return m && m.type === 'icon' ? artEl(m) : el('div', 'art');
  }
  function favBtn(id) {
    const b = el('button', 'fav'); b.type = 'button'; b.dataset.id = id; paintFav(b); return b;
  }
  function paintFav(b) { const on = !!state.saved[b.dataset.id]; b.textContent = on ? '★' : '☆'; b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? t('unsave') : t('save')); }
  function card(it, lead) {
    const a = it.a, c = el('article', 'card' + (lead ? ' lead' : '')); c.dataset.t = a.topic; c.id = a.id;
    c.appendChild(thumb(a.media, lead));
    const meta = el('div', 'meta'), b = el('span', 'badge', topicName(a.topic)); meta.appendChild(b);
    if (isUpdate(a)) meta.appendChild(el('span', 'chip upd', t('update')));
    if (a.chip) meta.appendChild(el('span', 'chip', L(a.chip)));
    c.appendChild(meta);
    const h = el('h3'), link = el('a', null, L(a.headline)); link.href = '#story-' + a.id; h.appendChild(link); c.appendChild(h);
    const sn = (a.deck ? L(a.deck) : L((a.body || [])[0])); if (sn) c.appendChild(el('p', 'snip', sn));
    const foot = el('div', 'meta'); foot.appendChild(el('span', null, sourceName(a))); foot.appendChild(el('span', null, readMins(a) + ' ' + t('minRead'))); foot.appendChild(favBtn(a.id)); c.appendChild(foot);
    return c;
  }
  function briefEl(sec) {
    const as = el('aside', 'brief'); as.dataset.t = sec.topic; as.setAttribute('aria-label', L(sec.title) + ' · ' + t('quick'));
    as.appendChild(el('h3', null, L(sec.title) + ' · ' + t('quick')));
    const ul = el('ul');
    (sec.brief || []).forEach((b) => { const li = el('li'); li.appendChild(ext(b.url, b.src)); li.appendChild(document.createTextNode(' ' + L(b.text))); ul.appendChild(li); });
    as.appendChild(ul); return as;
  }
  function sectionEl(title, sub, topic, list, brief) {
    const s = el('section', 'sec'); s.dataset.t = topic; s.id = 'sec-' + topic;
    const hd = el('div', 'sec-head'), h = el('h2', null, title); hd.appendChild(h); hd.appendChild(el('span', null, sub)); s.appendChild(hd);
    const g = el('div', 'grid'); g.dataset.n = String(Math.max(0, list.length - 1));
    list.forEach((it, i) => g.appendChild(card(it, i === 0)));
    if (brief) g.appendChild(brief);
    s.appendChild(g); return s;
  }
  function sectionsView(topic) {
    const frag = document.createDocumentFragment(), ci = coverItem();
    (state.ed.sections || []).forEach((sec) => {
      if (sec.id === 'cover-section' || sec.topic === 'cover-section') return;
      if (topic !== 'all' && sec.topic !== topic) return;
      let list = (sec.items || []).map((a) => state.byId[a.id]);
      if (topic !== 'all' && ci && ci.a.topic === sec.topic) list.unshift(ci);
      const n = list.length;
      frag.appendChild(sectionEl(L(sec.title), n + ' ' + t('stories'), sec.topic, list, sec.brief && sec.brief.length ? briefEl(sec) : null));
    });
    return frag;
  }
  function savedView() {
    const wrap = el('div'), list = state.items.filter((it) => state.saved[it.a.id]);
    if (!list.length) { wrap.appendChild(el('p', 'empty', t('nosaved'))); return wrap; }
    const s = el('section', 'sec'); s.dataset.t = 'all';
    const hd = el('div', 'sec-head'); hd.appendChild(el('h2', null, t('saved'))); hd.appendChild(el('span', null, list.length + ' ' + t('stories'))); s.appendChild(hd);
    const g = el('div', 'grid'); list.forEach((it) => g.appendChild(card(it, false))); s.appendChild(g); wrap.appendChild(s); return wrap;
  }
  function heroEl() {
    const ed = state.ed, ci = coverItem(), hero = el('div', 'hero');
    if (ci) {
      const a = ci.a, c = el('a', 'cover'); c.href = '#story-' + a.id; c.dataset.t = a.topic;
      const img = el('img'); img.src = 'img/' + ed.cover.img; img.alt = L(ed.cover.alt); img.fetchPriority = 'high'; c.appendChild(img);
      const inn = el('div', 'in'), bd = el('div', 'badges'); bd.appendChild(el('span', 'badge plain', t('cover'))); bd.appendChild(el('span', 'badge', topicName(a.topic))); inn.appendChild(bd);
      inn.appendChild(el('h2', null, L(ed.cover.headline)));
      if (a.deck) inn.appendChild(el('p', null, L(a.deck)));
      c.appendChild(inn); hero.appendChild(c);
    }
    const iss = el('nav', 'issue'); iss.setAttribute('aria-label', t('inIssue')); iss.appendChild(el('h3', null, t('inIssue')));
    (ed.sections || []).forEach((sec) => {
      if (sec.id === 'cover-section' || !(sec.items || []).length) return;
      const f = sec.items[0], a = el('a'); a.href = '#story-' + f.id; a.dataset.t = f.topic;
      const th = el('div', 'th'); if (f.media && f.media.type === 'video') { const i = el('img'); i.src = 'img/' + f.media.img; i.alt = ''; i.loading = 'lazy'; th.appendChild(i); } else if (f.media) { const d = el('div', 'art ' + (f.media.tone || '')); d.setAttribute('aria-hidden', 'true'); d.appendChild(icon(f.media.icon)); th.appendChild(d); }
      const tx = el('div'); tx.appendChild(el('p', 'kick', L(sec.title))); tx.appendChild(el('strong', null, L(f.headline)));
      a.appendChild(th); a.appendChild(tx); iss.appendChild(a);
    });
    hero.appendChild(iss);
    if ((ed.note || []).length) { const n = el('div', 'note'); n.appendChild(el('b', null, t('note'))); ed.note.forEach((p) => n.appendChild(el('p', null, L(p)))); hero.appendChild(n); }
    return hero;
  }
  function footerEl() {
    const ed = state.ed, f = el('footer', 'foot'), fb = el('div', 'fb'), i = el('img'); i.src = 'img/respawn-logo.png'; i.alt = 'The Daily Respawn'; i.style.height = '48px'; i.style.width = 'auto'; fb.appendChild(i);
    fb.appendChild(el('strong', null, 'The Daily Respawn · ' + t('edition') + ' ' + pad3(ed.number) + ' · ' + fmtDate(ed.publishedAt) + ', ' + fmtTime(ed.publishedAt) + ' ' + t('tz'))); f.appendChild(fb);
    if (ed.footer) f.appendChild(el('p', null, L(ed.footer)));
    const cr = el('p'); cr.appendChild(el('strong', null, t('creators') + ': ')); cr.appendChild(document.createTextNode('Pedro Nanjamba & Anderson Naval · ')); cr.appendChild(el('strong', null, t('co') + ': ')); cr.appendChild(document.createTextNode(state.lang === 'pt' ? 'Paulo Anjos e Sandro Ndala' : 'Paulo Anjos and Sandro Ndala')); f.appendChild(cr);
    f.appendChild(el('p', null, t('nextEd'))); return f;
  }

  /* ---------- page ---------- */
  function renderNav() {
    const nav = $('catnav'); nav.textContent = ''; nav.setAttribute('aria-label', t('topicsLbl'));
    ['all'].concat(TOPICS).concat(['saved']).forEach((k) => {
      const b = el('button', null, topicName(k)); b.type = 'button'; b.dataset.k = k; if (TOPICS.indexOf(k) >= 0) b.dataset.t = k;
      b.setAttribute('aria-pressed', String(state.topic === k)); nav.appendChild(b);
    });
  }
  function renderMain() {
    const ed = state.ed; main.textContent = '';
    const line = el('p', 'edline'); line.appendChild(el('b', null, t('edition') + ' ' + pad3(ed.number) + ' · ' + t('daily'))); line.appendChild(el('span', null, fmtDate(ed.publishedAt, true) + ' · ' + fmtTime(ed.publishedAt) + ' ' + t('tz'))); main.appendChild(line);
    if (state.topic === 'all') {
      main.appendChild(heroEl());
      main.appendChild(sectionsView('all'));
    } else if (state.topic === 'saved') main.appendChild(savedView());
    else main.appendChild(sectionsView(state.topic));
    main.appendChild(footerEl());
  }
  function applyChrome() {
    document.documentElement.lang = state.lang === 'pt' ? 'pt-PT' : 'en';
    document.querySelectorAll('.seg [data-l]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.l === state.lang)));
    $('offdot').textContent = t('offline'); $('btn-archive').textContent = t('archive'); $('btn-install').textContent = t('install');
    $('btn-search').setAttribute('aria-label', t('search')); $('btn-theme').setAttribute('aria-label', t('theme'));
    $('q').placeholder = t('searchPh'); document.querySelector('.skip').textContent = t('skip');
    drawer.querySelector('.x').setAttribute('aria-label', t('close')); $('dr-title').textContent = t('archive');
    searchBox.querySelector('.tbtn').setAttribute('aria-label', t('close'));
  }
  function renderAll() { applyChrome(); renderNav(); if (state.ed) { renderMain(); fillArchive(); if (state.reading) renderReader(state.reading); runSearch(); } }

  /* ---------- reader ---------- */
  function renderReader(id) {
    const it = state.byId[id]; if (!it) { closeReader(true); return; }
    const a = it.a, m = a.media || {}; reader.textContent = ''; reader.dataset.t = a.topic;
    const bar = el('div', 'rbar'), back = el('button', 'rb', '‹ ' + t('back')); back.type = 'button'; back.dataset.act = 'close'; bar.appendChild(back); bar.appendChild(el('span', 'sp'));
    const sh = el('button', 'tbtn txt', t('share')); sh.type = 'button'; sh.dataset.act = 'share'; bar.appendChild(sh); bar.appendChild(favBtn(a.id));
    const pr = el('i', 'rprog'); pr.id = 'rprog'; bar.appendChild(pr); reader.appendChild(bar);
    const pg = el('article', 'art-page'), bd = el('div', 'badges'); bd.appendChild(el('span', 'badge', topicName(a.topic)));
    if (it.cover) bd.appendChild(el('span', 'badge plain', t('cover'))); if (isUpdate(a)) bd.appendChild(el('span', 'badge plain', t('update'))); pg.appendChild(bd);
    pg.appendChild(el('p', 'kick', L(a.kicker)));
    const h1 = el('h1', null, L(a.headline)); h1.id = 'rd-title'; h1.tabIndex = -1; pg.appendChild(h1);
    if (a.deck) pg.appendChild(el('p', 'deck', L(a.deck)));
    const meta = el('div', 'meta'); meta.appendChild(el('span', null, fmtDate(state.ed.publishedAt))); meta.appendChild(el('span', null, readMins(a) + ' ' + t('minRead'))); if (sourceName(a)) meta.appendChild(el('span', null, sourceName(a))); pg.appendChild(meta);
    if (m.type === 'video') {
      const l = ext(m.url, '', 'media'); const i = el('img'); i.src = 'img/' + m.img; i.alt = L(m.alt); l.appendChild(i);
      const pb = el('span', 'pb'); pb.setAttribute('aria-hidden', 'true'); l.appendChild(pb); if (m.duration) l.appendChild(el('span', 'tm', m.duration)); l.appendChild(el('span', 'sr', t('watch'))); pg.appendChild(l);
      if (m.caption) { const cp = el('p', 'cap'); cp.appendChild(el('b', null, t('video'))); cp.appendChild(document.createTextNode(L(m.caption))); pg.appendChild(cp); }
    } else if (m.type === 'icon') { pg.appendChild(artEl(m)); pg.appendChild(el('p', 'cap')); }
    if (a.upd) pg.appendChild(el('p', 'upd-box', L(a.upd)));
    const pr2 = el('div', 'prose'); (a.body || []).forEach((p) => pr2.appendChild(el('p', null, L(p)))); pg.appendChild(pr2);
    if (a.facts && a.facts.length) {
      const fx = el('section', 'facts'); fx.appendChild(el('h2', null, t('facts'))); const dl = el('dl');
      a.facts.forEach((f) => { const d = el('div'); d.appendChild(el('dt', null, L(f.k))); d.appendChild(el('dd', null, L(f.v))); dl.appendChild(d); }); fx.appendChild(dl); pg.appendChild(fx);
    }
    const acts = el('div', 'acts'); if (a.link) acts.appendChild(ext(a.link.url, L(a.link.label), 'btn')); if (m.type === 'video') acts.appendChild(ext(m.url, t('watch'), 'btn ghost')); pg.appendChild(acts);
    if (a.also && a.also.length) { const s = el('p', 'srcs', t('also') + ' '); a.also.forEach((x, i) => { if (i) s.appendChild(document.createTextNode(' · ')); s.appendChild(ext(x.url, x.name)); }); pg.appendChild(s); }
    const idx = state.items.indexOf(it), pv = state.items[idx - 1], nx = state.items[idx + 1], pn = el('nav', 'pn'); pn.setAttribute('aria-label', 'Stories');
    if (pv) { const x = el('a'); x.href = '#story-' + pv.a.id; x.appendChild(el('small', null, '‹ ' + t('prev'))); x.appendChild(el('strong', null, L(pv.a.headline))); pn.appendChild(x); }
    if (nx) { const x = el('a', 'nx'); x.href = '#story-' + nx.a.id; x.appendChild(el('small', null, t('next') + ' ›')); x.appendChild(el('strong', null, L(nx.a.headline))); pn.appendChild(x); }
    pg.appendChild(pn);
    const rel = state.items.filter((o) => o !== it && o.a.topic === a.topic).slice(0, 2);
    if (rel.length) { const r = el('section', 'rel'); r.appendChild(el('h2', null, t('related') + ' ' + topicName(a.topic))); const g = el('div', 'grid'); rel.forEach((o) => g.appendChild(card(o, false))); r.appendChild(g); pg.appendChild(r); }
    reader.appendChild(pg);
  }
  function openReader(id) {
    if (!state.byId[id]) return;
    const first = !state.reading; state.reading = id; renderReader(id);
    reader.hidden = false; document.body.classList.add('lock'); reader.scrollTop = 0;
    if (first) { state.lastFocus = document.activeElement; }
    const h = $('rd-title'); if (h) h.focus({ preventScroll: true });
  }
  function closeReader(silent) {
    if (!state.reading && reader.hidden) return;
    state.reading = null; reader.hidden = true; reader.textContent = ''; document.body.classList.remove('lock');
    if (!silent && state.lastFocus && state.lastFocus.focus) { try { state.lastFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  function routeFromHash() {
    const m = /^#story-([\w-]+)$/.exec(location.hash);
    if (m && state.ed) openReader(m[1]); else closeReader(false);
  }
  window.addEventListener('hashchange', routeFromHash);
  function leaveReader() {
    if (/^#story-/.test(location.hash)) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ } }
    closeReader(false);
  }
  reader.addEventListener('scroll', () => {
    const p = $('rprog'); if (!p) return; const max = reader.scrollHeight - reader.clientHeight;
    p.style.width = (max > 0 ? Math.min(100, reader.scrollTop / max * 100) : 0) + '%';
  }, { passive: true });

  /* ---------- search ---------- */
  function runSearch() {
    const q = norm($('q').value.trim()), box = $('sres'); box.textContent = '';
    if (!state.ed) return;
    if (q.length < 2) { box.appendChild(el('p', 'hint', t('searchHint'))); return; }
    const hits = [];
    state.items.forEach((it) => {
      const a = it.a, hay = norm([L(a.headline), L(a.kicker), L(a.deck), (a.body || []).map(L).join(' '), sourceName(a)].join(' '));
      if (hay.indexOf(q) >= 0) hits.push({ type: 'story', it: it, rank: norm(L(a.headline)).indexOf(q) >= 0 ? 0 : 1 });
    });
    (state.ed.sections || []).forEach((sec) => (sec.brief || []).forEach((b) => { if (norm(b.src + ' ' + L(b.text)).indexOf(q) >= 0) hits.push({ type: 'brief', b: b, sec: sec, rank: 2 }); }));
    hits.sort((x, y) => x.rank - y.rank);
    if (!hits.length) { box.appendChild(el('p', 'hint', t('noResults'))); return; }
    hits.slice(0, 14).forEach((h) => {
      if (h.type === 'story') { const a = el('a'); a.href = '#story-' + h.it.a.id; a.dataset.t = h.it.a.topic; a.dataset.close = '1'; a.appendChild(el('small', null, topicName(h.it.a.topic))); a.appendChild(el('strong', null, L(h.it.a.headline))); box.appendChild(a); }
      else { const a = ext(h.b.url, ''); a.dataset.t = h.sec.topic; a.appendChild(el('small', null, topicName(h.sec.topic) + ' · ' + t('quick') + ' · ' + h.b.src)); a.appendChild(el('strong', null, L(h.b.text))); box.appendChild(a); }
    });
  }
  function openSearch() { state.lastFocus = document.activeElement; searchBox.hidden = false; document.body.classList.add('lock'); runSearch(); $('q').focus(); }
  function closeSearch() { searchBox.hidden = true; if (!state.reading) document.body.classList.remove('lock'); if (state.lastFocus && state.lastFocus.focus) { try { state.lastFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ } } }
  $('btn-search').addEventListener('click', openSearch);
  $('q').addEventListener('input', runSearch);
  searchBox.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSearch(); });

  /* ---------- archive ---------- */
  function openDrawer() { state.lastFocus = document.activeElement; fillArchive(); drawer.classList.add('open'); drawer.querySelector('.x').focus(); }
  function closeDrawer() { drawer.classList.remove('open'); if (state.lastFocus && state.lastFocus.focus) { try { state.lastFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ } } }
  $('btn-archive').addEventListener('click', openDrawer);
  drawer.querySelector('.scrim').addEventListener('click', closeDrawer);
  drawer.querySelector('.x').addEventListener('click', closeDrawer);
  function fillArchive() {
    const box = $('dr-list'); box.textContent = ''; if (!state.index) return;
    state.index.editions.slice().sort((a, b) => b.number - a.number).forEach((e) => {
      const b = el('button', 'ed'); b.type = 'button'; if (state.ed && state.ed.id === e.id) b.setAttribute('aria-current', 'true');
      b.appendChild(el('small', null, t('edition') + ' ' + pad3(e.number) + ' · ' + fmtDate(e.publishedAt) + ' · ' + fmtTime(e.publishedAt)));
      b.appendChild(el('strong', null, L(e.headline)));
      b.addEventListener('click', () => { closeDrawer(); loadEdition(e.id); });
      box.appendChild(b);
    });
  }

  /* ---------- events ---------- */
  document.addEventListener('click', (e) => {
    let b;
    if ((b = e.target.closest('#catnav button'))) { state.topic = b.dataset.k; renderNav(); renderMain(); window.scrollTo(0, 0); return; }
    if ((b = e.target.closest('.fav'))) {
      const id = b.dataset.id; if (state.saved[id]) delete state.saved[id]; else state.saved[id] = 1; store('tdr-saved', JSON.stringify(state.saved));
      document.querySelectorAll('.fav[data-id="' + id + '"]').forEach(paintFav); if (state.topic === 'saved' && !state.reading) renderMain(); e.preventDefault(); return;
    }
    if ((b = e.target.closest('[data-act="close"]'))) { leaveReader(); return; }
    if ((b = e.target.closest('[data-act="share"]'))) {
      const url = location.href.split('#')[0] + '#story-' + state.reading, it = state.byId[state.reading], title = it ? L(it.a.headline) : 'The Daily Respawn';
      if (navigator.share) { navigator.share({ title: title, url: url }).catch(() => {}); }
      else if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(() => { b.textContent = t('copied'); setTimeout(() => { b.textContent = t('share'); }, 1600); }, () => {}); }
      return;
    }
    const a = e.target.closest('a[href^="#story-"]');
    if (a) {
      if (!searchBox.hidden) closeSearch();
      if (reader.hidden) { state.pushed = true; }
      return; /* default navigation changes the hash, hashchange opens the reader */
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (!searchBox.hidden) { closeSearch(); return; } if (drawer.classList.contains('open')) { closeDrawer(); return; } if (state.reading) { leaveReader(); return; } }
    if (e.key === 'Tab') trapFocus(e);
  });
  function trapFocus(e) {
    const host = !searchBox.hidden ? searchBox : drawer.classList.contains('open') ? drawer : !reader.hidden ? reader : null; if (!host) return;
    const f = [].slice.call(host.querySelectorAll('a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])')).filter((x) => x.offsetParent !== null);
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !host.contains(document.activeElement))) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  }
  document.querySelectorAll('.seg [data-l]').forEach((b) => b.addEventListener('click', () => { state.lang = b.dataset.l; store('tdr-lang', state.lang); renderAll(); }));
  function setTheme(v) { document.documentElement.setAttribute('data-theme', v); store('tdr-theme', v); }
  $('btn-theme').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(cur === 'dark' ? 'light' : 'dark');
  });

  /* ---------- data ---------- */
  function getJSON(url) { return fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function showError() {
    main.textContent = ''; const d = el('div', 'loading'); d.appendChild(el('div', null, t('fail')));
    const b = el('button', 'btn', t('retry')); b.type = 'button'; b.style.marginTop = '16px'; b.addEventListener('click', start); d.appendChild(b); main.appendChild(d);
  }
  function loadEdition(id) {
    return getJSON('data/editions/' + id + '.json').then((ed) => {
      state.ed = ed; state.topic = 'all'; indexEdition(); closeReader(true);
      try { history.replaceState(null, '', location.pathname + (id === state.index.latest ? '' : '?e=' + id)); } catch (e) { /* ignore */ }
      renderAll(); window.scrollTo(0, 0);
    });
  }
  function start() {
    main.textContent = ''; main.appendChild(el('div', 'loading', t('loading')));
    getJSON('data/editions.json').then((idx) => {
      state.index = idx; const q = /[?&]e=([\w-]+)/.exec(location.search), id = q && idx.editions.some((e) => e.id === q[1]) ? q[1] : idx.latest;
      const hash = location.hash;
      return loadEdition(id).then(() => { if (hash && /^#story-/.test(hash)) { location.hash = hash; routeFromHash(); } });
    }).catch((e) => { if (window.console) console.error(e); showError(); });
  }

  /* ---------- online/offline, install, service worker ---------- */
  function net() { document.documentElement.classList.toggle('offline', !navigator.onLine); }
  window.addEventListener('online', net); window.addEventListener('offline', net); net();
  let deferred = null; const ib = $('btn-install');
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; ib.classList.add('show'); });
  ib.addEventListener('click', () => { if (!deferred) return; deferred.prompt(); deferred.userChoice.finally(() => { deferred = null; ib.classList.remove('show'); }); });
  window.addEventListener('appinstalled', () => ib.classList.remove('show'));
  if ('serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });

  /* ---------- boot ---------- */
  try { state.saved = JSON.parse(store('tdr-saved') || '{}') || {}; } catch (e) { state.saved = {}; }
  let l0 = store('tdr-lang'); if (l0 !== 'en' && l0 !== 'pt') l0 = ((navigator.language || '').toLowerCase().indexOf('pt') === 0) ? 'pt' : 'en';
  state.lang = l0; applyChrome(); renderNav(); start();
})();
