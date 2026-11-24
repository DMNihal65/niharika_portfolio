// Niharika, Issue 01. One script: smooth scroll, the print loader, the cover's page turn, and each page's motion.
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/schibsted-grotesk/index.css';
import './style.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText, Flip);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const wide = () => window.innerWidth >= 860;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;

// ---------------------------------------------------------------- smooth scroll (Lenis on GSAP's ticker)
const lenis = new Lenis({ lerp: 0.09, smoothWheel: !reduced });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(500, 33);
window.scrollTo(0, 0);

// ---------------------------------------------------------------- small shared pieces
let toastEl, toastTimer;
function toast(msg) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
  toastEl.textContent = msg; toastEl.classList.add('is-on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2400);
}

function initLinks(closeMenu) {
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    if (a.dataset.todo) { e.preventDefault(); toast('LinkedIn link coming soon.'); return; }
    const el = a.getAttribute('href').length > 1 && $(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault(); closeMenu();
    // the cover is a fixed overlay over the pinned contents, so "back to the cover" means scroll 0
    lenis.scrollTo(el.id === 'cover' ? 0 : el, { duration: 1.6, easing: (x) => 1 - Math.pow(1 - x, 4) });
  }));
  $$('[data-copy]').forEach((a) => a.addEventListener('click', async (e) => {
    if (!navigator.clipboard) return;
    e.preventDefault();
    try { await navigator.clipboard.writeText(a.dataset.copy); toast('Email copied. Talk soon!'); } catch { location.href = a.href; }
  }));
}

function initCursor() {
  if (!fine) return;
  const el = document.createElement('div');
  el.className = 'cursor is-hidden'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<span class="cursor__dot"></span><span class="cursor__label"></span>';
  document.body.appendChild(el); root.classList.add('has-cursor');
  const label = $('.cursor__label', el);
  const x = gsap.quickTo(el, 'x', { duration: reduced ? 0 : 0.2, ease: 'power3.out' });
  const y = gsap.quickTo(el, 'y', { duration: reduced ? 0 : 0.2, ease: 'power3.out' });
  window.addEventListener('pointermove', (e) => { x(e.clientX); y(e.clientY); el.classList.remove('is-hidden'); }, { passive: true });
  document.addEventListener('pointerleave', () => el.classList.add('is-hidden'));
  document.addEventListener('pointerover', (e) => {
    const lab = e.target.closest('[data-cursor]');
    el.classList.toggle('is-label', !!lab);
    el.classList.toggle('is-link', !lab && !!e.target.closest('a, button'));
    if (lab) label.textContent = lab.dataset.cursor;
  });
}

function initMagnetic() {
  if (!fine || reduced) return;
  $$('[data-magnetic]').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.3); y((e.clientY - r.top - r.height / 2) * 0.3); });
    el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)' }));
  });
}

// the contents menu drops down like a page pulled from the top
function initMenu() {
  const btn = $('.nav__contents'), menu = $('#menu'), label = $('.nav__label', btn);
  let open = false;
  const tl = gsap.timeline({ paused: true })
    .set(menu, { visibility: 'visible' })
    .fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: reduced ? 0.01 : 0.85, ease: 'power4.inOut' })
    .from($$('.menu__list a'), { yPercent: 110, duration: reduced ? 0.01 : 0.8, ease: 'expo.out', stagger: 0.05 }, '-=0.4');
  const set = (v) => {
    open = v; root.classList.toggle('is-menu-open', v);
    btn.setAttribute('aria-expanded', String(v)); menu.setAttribute('aria-hidden', String(!v));
    label.textContent = v ? 'Close' : 'Contents';
    if (v) { lenis.stop(); tl.timeScale(1).play(); } else { lenis.start(); tl.timeScale(1.7).reverse(); }
  };
  btn.addEventListener('click', () => set(!open));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) set(false); });
  return () => { if (open) set(false); };
}

// ---------------------------------------------------------------- folio: the running page number rolls like a counter
let featurePage = '06';
function initFolio() {
  const num = $('.folio__num');
  const pages = $$('main > section[data-page]').filter((s) => !s.classList.contains('cover'));
  let current = '01';
  const roll = (p) => {
    if (p === current) return;
    const up = +p > +current; current = p;
    if (reduced) { num.textContent = p; return; }
    gsap.timeline()
      .to(num, { yPercent: up ? -110 : 110, duration: 0.22, ease: 'power2.in' })
      .add(() => { num.textContent = p; })
      .fromTo(num, { yPercent: up ? 110 : -110 }, { yPercent: 0, duration: 0.5, ease: 'expo.out' });
  };
  const update = () => {
    let p = '01';
    if (window.scrollY > window.innerHeight * 0.6) {
      for (const s of pages) if (s.getBoundingClientRect().top < window.innerHeight * 0.5) p = s.dataset.page;
      if (p === '06') p = featurePage;
    }
    roll(p);
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

// ---------------------------------------------------------------- loader: four ink plates slide into register while the count climbs
function runLoader(tasks) {
  const loader = $('.loader'), sheet = $('.loader__sheet'), num = $('.loader__num');
  const plates = $$('.plate');
  const off = [[0, 0], [-7, 5], [6, -6], [9, 7]]; // vh offsets, misregistered at the start
  let settled = 0;
  const all = Promise.allSettled(tasks.map((t) => Promise.resolve(t).finally(() => { settled += 1; })));
  if (reduced) return all.then(() => { loader.remove(); });
  lenis.stop();
  const MIN = 2.3, t0 = performance.now(), s = { p: 0 };
  return new Promise((resolve) => {
    const tick = (_t, dms) => {
      const time = Math.min(1, (performance.now() - t0) / 1000 / MIN);
      const target = Math.min(settled / tasks.length, gsap.parseEase('power2.inOut')(time));
      s.p += (target - s.p) * (1 - Math.exp(-(dms / 1000) * 7));
      if (target === 1 && s.p > 0.997) s.p = 1;
      num.textContent = String(Math.round(s.p * 100));
      const k = 1 - gsap.parseEase('power3.out')(s.p);
      plates.forEach((pl, i) => gsap.set(pl, { x: `${off[i][0] * k}vh`, y: `${off[i][1] * k}vh`, rotate: (i - 1.5) * 6 * k }));
      if (s.p === 1) {
        gsap.ticker.remove(tick);
        all.then(() => {
          // in register: a little press, then the sheet is flicked away like a page
          gsap.timeline({ onComplete: () => { loader.remove(); lenis.start(); resolve(); } })
            .to(plates, { scale: 0.94, duration: 0.25, ease: 'power2.in' }, 0.1)
            .to(plates, { scale: 1, duration: 0.5, ease: 'back.out(3)' }, 0.35)
            .to(sheet, { yPercent: -112, rotate: -4, transformOrigin: '0% 100%', duration: 1.15, ease: 'power4.inOut' }, 0.7)
            .add(() => window.dispatchEvent(new Event('issue:open')), 1.05);
        });
      }
    };
    gsap.ticker.add(tick);
  });
}

// ---------------------------------------------------------------- cover
function prepareCover() {
  if (reduced) return;
  gsap.set('.mast__c', { yPercent: 108 });
  gsap.set('.cover__strip', { '--rule': 0 });
  gsap.set('.cover__strip > *, .coverline, .coverline__list li', { opacity: 0, y: 18 });
  gsap.set('.shape', { scale: 0 });
  gsap.set('.sticker', { scale: 0, rotate: -140 });
}

function enterCover() {
  if (reduced) return;
  gsap.timeline()
    .to('.cover__strip', { '--rule': 1, duration: 1.1, ease: 'expo.inOut' }, 0)
    .to('.cover__strip > *', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06 }, 0.3)
    .to('.mast__c', { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.055 }, 0.15)
    .to('.shape', { scale: 1, duration: 1.4, ease: 'elastic.out(1, 0.6)', stagger: 0.09 }, 0.5)
    .to('.coverline, .coverline__list li', { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07 }, 0.75)
    .to('.sticker', { scale: 1, rotate: 0, duration: 1.3, ease: 'elastic.out(1, 0.55)' }, 1);
  gsap.to('.sticker text:first-of-type', { rotate: 360, svgOrigin: '100 100', duration: 18, ease: 'none', repeat: -1 });
  initMastType();
  initShapeParallax();
}

// the masthead breathes toward the cursor: near it the letters go light, soft and a little wonky
function initMastType() {
  if (!fine) return;
  const chars = $$('.mast__c');
  const cur = chars.map(() => ({ w: 600, s: 0, k: 0 }));
  const ptr = { x: -9999, y: -9999 };
  window.addEventListener('pointermove', (e) => { ptr.x = e.clientX; ptr.y = e.clientY; }, { passive: true });
  document.addEventListener('pointerleave', () => { ptr.x = -9999; });
  gsap.ticker.add((_t, dms) => {
    if (window.scrollY > window.innerHeight * 1.2) return;
    const k = 1 - Math.exp(-(dms / 1000) * 6);
    const reach = window.innerWidth * 0.2;
    chars.forEach((c, i) => {
      const b = c.getBoundingClientRect();
      const d = Math.hypot(ptr.x - (b.left + b.width / 2), ptr.y - (b.top + b.height / 2));
      const t = Math.max(0, 1 - d / reach), e = t * t * (3 - 2 * t);
      const o = cur[i];
      o.w += (600 - 380 * e - o.w) * k; o.s += (100 * e - o.s) * k; o.k += (e - o.k) * k;
      c.style.fontVariationSettings = `"wght" ${o.w.toFixed(0)}, "opsz" 144, "SOFT" ${o.s.toFixed(0)}, "WONK" ${o.k > 0.5 ? 1 : 0}`;
    });
  });
}

function initShapeParallax() {
  if (!fine) return;
  const depth = [26, -18, 34, -40];
  const movers = $$('.shape').map((s, i) => ({ x: gsap.quickTo(s, 'x', { duration: 1.2, ease: 'power3.out' }), y: gsap.quickTo(s, 'y', { duration: 1.2, ease: 'power3.out' }), d: depth[i] }));
  window.addEventListener('pointermove', (e) => {
    const nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
    movers.forEach((m) => { m.x(nx * m.d); m.y(ny * m.d); });
  }, { passive: true });
}

// scrolling turns the cover like a page: it lifts from the bottom-left corner and swings away,
// while the contents underneath hold still and their title rises into place
function initPageTurn() {
  const contentsTitle = new SplitText('.contents__title', { type: 'lines', mask: 'lines' });
  if (reduced) return;
  root.classList.add('has-turn');
  const page = $('.cover__page');
  gsap.timeline({ scrollTrigger: { trigger: '.contents', start: 'top top', end: '+=100%', scrub: 0.8, pin: true, anticipatePin: 1 } })
    .to(page, { xPercent: -112, yPercent: 8, rotate: -9, transformOrigin: '0% 100%', boxShadow: '40px 0 80px -20px rgba(40,10,30,0.45)', duration: 1, ease: 'power2.in' }, 0)
    .fromTo('.cover__shadow', { opacity: 0.35 }, { opacity: 0, duration: 0.9, ease: 'power1.in' }, 0.1)
    .from(contentsTitle.lines, { yPercent: 110, duration: 0.45, ease: 'power3.out' }, 0.5)
    .from('.contents__dek', { opacity: 0, y: 20, duration: 0.35 }, 0.6)
    .from('.toc__row > *', { y: 30, opacity: 0, duration: 0.35, ease: 'power3.out', stagger: 0.012 }, 0.55)
    .set('.cover', { autoAlpha: 0 }, 1);
}

// ---------------------------------------------------------------- pages
// each page arrives as a sheet sliding up: its corners round off and it widens to full bleed
function initPageEntrances() {
  if (reduced) return;
  $$('.page').forEach((p) => {
    if (p.classList.contains('contents')) return;
    gsap.fromTo(p, { clipPath: 'inset(5% 3.5% 0% 3.5% round 2.6rem 2.6rem 0rem 0rem)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 0rem 0rem 0rem 0rem)', ease: 'none',
      scrollTrigger: { trigger: p, start: 'top bottom', end: 'top 15%', scrub: true },
    });
  });
  // big titles rise line by line
  ['.letter__title', '.features__title', '.skills__title', '.notes__title', '.off__title'].forEach((sel) => {
    const split = new SplitText(sel, { type: 'lines', mask: 'lines' });
    gsap.from(split.lines, { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: sel, start: 'top 85%', once: true } });
  });
  gsap.utils.toArray('.kicker').forEach((k) => gsap.from(k, { opacity: 0, x: -20, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: k, start: 'top 88%', once: true } }));
}

function initContents() {
  if (reduced || root.classList.contains('has-turn')) return; // the page turn brings the rows in
  $$('.toc__row').forEach((row) => {
    gsap.from(row.children, { y: 26, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: row, start: 'top 92%', once: true } });
  });
}

function initLetter() {
  if (reduced) return;
  // key phrases get a highlighter stroke as you read past them
  $$('.mark').forEach((m) => gsap.fromTo(m, { '--mark': '0%' }, { '--mark': '100%', ease: 'none', scrollTrigger: { trigger: m, start: 'top 82%', end: 'top 50%', scrub: true } }));
  gsap.from('.letter__p', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.letter__cols', start: 'top 80%', once: true } });
  const q = new SplitText('.letter__quote', { type: 'words' });
  gsap.fromTo(q.words, { opacity: 0.15 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.letter__quote', start: 'top 80%', end: 'bottom 55%', scrub: true } });
  // the signature writes itself left to right
  gsap.fromTo('.letter__sign', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'power2.inOut', scrollTrigger: { trigger: '.letter__sign', start: 'top 88%', once: true } });
}

// ---------------------------------------------------------------- features
function buildWave() {
  const wave = $('.wave');
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  wave.innerHTML = Array.from({ length: 46 }, (_, i) => {
    const env = Math.sin((i / 45) * Math.PI) * 0.7 + 0.3;
    return `<span style="--h:${Math.round((0.25 + rnd() * 0.75) * env * 100)}%"></span>`;
  }).join('');
}

function meetTimeline() {
  return gsap.timeline({ paused: true })
    .from('.wave span', { scaleY: 0.1, duration: 0.7, ease: 'back.out(2)', stagger: { each: 0.012, from: 'center' } }, 0)
    .add(() => {
      // the audio keeps "talking" while the feature is open
      gsap.to('.wave span', { scaleY: () => gsap.utils.random(0.35, 1.15), duration: 0.45, ease: 'sine.inOut', repeat: -1, yoyo: true, repeatRefresh: true, stagger: { each: 0.02, from: 'random' } });
    }, 0.7)
    .from('.meet__transcript i', { scaleX: 0, duration: 0.8, ease: 'power3.out', stagger: 0.15 }, 0.4)
    .from('.mcard', { y: 40, opacity: 0, rotate: (i) => (i - 1) * 4, duration: 0.9, ease: 'expo.out', stagger: 0.12 }, 0.9)
    .from('.mcard i', { scaleX: 0, duration: 0.6, ease: 'power3.out', stagger: 0.05 }, 1.2);
}

function leafTimeline() {
  return gsap.timeline({ paused: true })
    .from('.leaf__svg', { scale: 0.85, rotate: -8, opacity: 0, duration: 1, ease: 'expo.out' }, 0)
    .from('.leaf__box', { scale: 1.6, opacity: 0, transformOrigin: '50% 50%', duration: 0.6, ease: 'expo.out' }, 0.5)
    .from('.leaf__tag', { scale: 0, duration: 0.6, ease: 'back.out(3)' }, 0.8)
    .from('.advice', { x: -30, opacity: 0, duration: 0.7, ease: 'expo.out', stagger: 0.12 }, 1);
}

function initFeatures() {
  buildWave();
  if (reduced) return;
  gsap.to('.leaf__bug', { x: 3, y: -2, duration: 0.6, ease: 'sine.inOut', repeat: -1, yoyo: true });
  const meet = meetTimeline(), leaf = leafTimeline();
  ScrollTrigger.create({ trigger: '.spread--one', start: 'top 65%', once: true, onEnter: () => meet.play() });
  $$('.spread__text').forEach((t) => gsap.from(t.children, { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: t, start: 'top 75%', once: true } }));

  if (!wide()) {
    ScrollTrigger.create({ trigger: '.spread--two', start: 'top 65%', once: true, onEnter: () => leaf.play() });
    return;
  }
  // wide screens: feature two turns over feature one like a right-hand page
  const spreads = $('.spreads'), two = $('.spread--two');
  gsap.set(two, { position: 'absolute', inset: 0 });
  const edge = document.createElement('span'); edge.className = 'turn-edge'; spreads.appendChild(edge);
  let leafPlayed = false;
  gsap.timeline({
    scrollTrigger: {
      trigger: spreads, start: 'top top', end: '+=140%', scrub: 0.8, pin: true, anticipatePin: 1,
      onUpdate: (self) => {
        featurePage = self.progress > 0.5 ? '08' : '06';
        if (!leafPlayed && self.progress > 0.55) { leafPlayed = true; leaf.play(); }
      },
    },
  })
    .fromTo(two, { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power2.inOut' }, 0.15)
    .set(edge, { opacity: 1 }, 0.15)
    .fromTo(edge, { left: '100%' }, { left: '-9rem', duration: 1, ease: 'power2.inOut' }, 0.15)
    .set(edge, { opacity: 0 }, 1.15)
    .to('.spread--one .spread__text, .spread--one .spread__art', { xPercent: -8, opacity: 0.4, duration: 1, ease: 'power2.inOut' }, 0.15)
    .to({}, { duration: 0.25 });
}

// ---------------------------------------------------------------- skills: honest dots, and a filter that reflows the chips
function initSkills() {
  const dots = (l) => [1, 2, 3].map((n) => `<i class="${n <= l ? 'on' : ''}"></i>`).join('');
  $$('.filters .dots').forEach((d) => { d.innerHTML = dots(+d.dataset.l); });
  const labels = { 3: 'use often', 2: 'comfortable', 1: 'learning now' };
  $$('.chip').forEach((c) => {
    const l = +c.dataset.l;
    c.insertAdjacentHTML('beforeend', `<span class="dots" role="img" aria-label="${labels[l]}">${dots(l)}</span>`);
  });
  const chips = $$('.chip');
  $$('.filter').forEach((b) => b.addEventListener('click', () => {
    $$('.filter').forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    const f = b.dataset.filter;
    const state = Flip.getState(chips);
    chips.forEach((c) => c.classList.toggle('is-hidden', f !== 'all' && c.dataset.l !== f));
    Flip.from(state, {
      duration: reduced ? 0 : 0.7, ease: 'expo.out', absolute: true, stagger: 0.012,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2)', stagger: 0.02 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.7, duration: 0.35, ease: 'power2.in' }),
    });
    ScrollTrigger.refresh();
  }));
  if (reduced) return;
  gsap.from(chips, { y: 30, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.025, scrollTrigger: { trigger: '.chips', start: 'top 85%', once: true } });
  gsap.from('.filter', { y: 16, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.06, scrollTrigger: { trigger: '.filters', start: 'top 88%', once: true } });
}

// ---------------------------------------------------------------- notes timeline, off duty, back cover
function initNotes() {
  if (reduced) return;
  $$('.tl').forEach((tl) => {
    gsap.timeline({ scrollTrigger: { trigger: tl, start: 'top 82%', once: true } })
      .fromTo(tl, { '--rule': 0 }, { '--rule': 1, duration: 1.1, ease: 'expo.inOut' }, 0)
      .from($('.tl__year', tl), { yPercent: 50, opacity: 0, duration: 1, ease: 'expo.out' }, 0.2)
      .from($('.tl__body', tl).children, { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08 }, 0.3);
  });
}

function initOffDuty() {
  if (reduced) return;
  gsap.from('.off', { y: 120, rotate: (i) => [-5, 3, -2][i], opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.off__grid', start: 'top 85%', once: true } });
}

function initContact() {
  const bc = $('.barcode');
  let x = 0, seed = 3, html = '';
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  while (x < 118) { const w = 1 + Math.floor(rnd() * 3); html += `<rect x="${x}" y="0" width="${w}" height="${30 + (w === 3 ? 4 : 0)}"/>`; x += w + 1 + Math.floor(rnd() * 2); }
  bc.innerHTML = html + '<text x="0" y="40" font-size="6" font-family="sans-serif" letter-spacing="1.2">ISSUE 01 · 2026</text>';
  if (reduced) return;
  const split = new SplitText('.contact__title', { type: 'lines', mask: 'lines' });
  gsap.from(split.lines, { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.contact__title', start: 'top 80%', once: true } });
  gsap.from('.contact__dek, .contact__row > *', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.contact__dek', start: 'top 90%', once: true } });
}

// ---------------------------------------------------------------- boot
initCursor();
initMagnetic();
initLinks(initMenu());
prepareCover();

const loaded = new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true })));
document.fonts.ready.then(() => {
  // pins first, in page order, so later triggers measure the right offsets
  initPageTurn();
  initFeatures();
  initPageEntrances();
  initContents();
  initLetter();
  initSkills();
  initNotes();
  initOffDuty();
  initContact();
  initFolio();
  ScrollTrigger.refresh();
});
window.addEventListener('issue:open', enterCover, { once: true });
runLoader([document.fonts.ready, loaded]).then(() => ScrollTrigger.refresh());
