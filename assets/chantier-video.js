/* Accueil : hero vidéo « on soulève le toit ».
   La vidéo du chantier tourne dans les murs de la maison du logo. Au défilement, le toit s'envole
   et la vidéo passe en plein écran avec les étapes du chantier, puis la page reprend normalement.
   La classe html.stage-on est posée dans le <head> (pas de mouvement réduit, overflow:clip supporté) ;
   sans elle, la maison reste fixe et un bouton lance la vidéo avec le son. */
(function () {
  var stage = document.getElementById('stage');
  if (!stage) return;

  var root = document.documentElement;
  var pin = stage.querySelector('.stage-pin');
  var house = document.getElementById('house');
  var box = document.getElementById('stageBox');
  var roof = document.getElementById('roof');
  var video = document.getElementById('stageVideo');
  var ov = document.getElementById('stageOv');
  var ovIn = document.getElementById('stageOvIn');
  var hint = document.getElementById('stageHint');
  var text = document.querySelector('.hero-text');
  var chapBtns = ov.querySelectorAll('[data-ch]');
  var chapBars = ov.querySelectorAll('.chapters .bar');
  var playBtn = document.getElementById('stagePlay');
  var soundBtn = document.getElementById('soundBtn');
  var muteBtn = document.getElementById('hudMute');

  // Meilleur format lu par le navigateur : AV1 (Chrome, Firefox, Android), HEVC (Safari, iPhone), sinon H.264 en 1280 px.
  var DIR = '/assets/video/toiture-garage-bac-acier-brian-lafleur-';
  var codec = video.canPlayType('video/mp4; codecs="av01.0.08M.08"') ? 'av1'
    : video.canPlayType('video/mp4; codecs="hvc1.1.6.L120.90"') ? 'hevc' : 'h264';
  var LOOP = DIR + 'boucle-' + codec + '.mp4';
  var FULL = DIR + 'son-' + codec + '.mp4';
  // Début de chaque étape (charpente, bac acier, gouttière), en secondes. Même montage pour la boucle muette
  // et la version avec le son, qui ajoute seulement le logo à la fin.
  var CH = { loop: [0, 18.92, 31.77], full: [0, 18.92, 31.77] };
  var mode = 'loop', cur = -1, visible = true, loaded = false;

  /* ---------- Lecture ---------- */
  function play() {
    var p = video.play();
    // Refus de lecture automatique (mode économie d'énergie) : bouton. Onglet en arrière-plan : on réessaie au retour.
    if (p && p.catch) p.catch(function () { if (video.paused && !document.hidden) playBtn.hidden = false; });
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && loaded && visible && video.paused) play(); });
  function load(sound) {
    mode = sound ? 'full' : 'loop';
    loaded = true;
    video.classList.remove('on');
    video.muted = !sound;
    video.loop = !sound;
    video.controls = sound && !root.classList.contains('stage-on');
    video.src = sound ? FULL : LOOP;
    box.classList.toggle('sound', sound);
    soundBtn.setAttribute('aria-pressed', String(sound));
    soundBtn.querySelector('span').textContent = sound ? 'Couper le son' : 'Avec le son';
    cur = -1;
    if (visible) play();
  }
  function seek(i) {
    if (!loaded) load(false);
    var go = function () { video.currentTime = CH[mode][i] + 0.05; play(); };
    if (video.readyState >= 1) go(); else video.addEventListener('loadedmetadata', go, { once: true });
  }
  function steps() {
    var c = CH[mode], n = c.length, t = video.currentTime, d = video.duration || 0, i = 0, k, end, f;
    for (k = 1; k < n; k++) if (t >= c[k]) i = k;
    for (k = 0; k < n; k++) {
      end = k < n - 1 ? c[k + 1] : d;
      f = k < i ? 1 : k > i ? 0 : end > c[k] ? Math.min(1, (t - c[k]) / (end - c[k])) : 0;
      chapBars[k].style.setProperty('--f', f);
    }
    if (i === cur) return;
    cur = i;
    for (k = 0; k < n; k++) {
      chapBtns[k].classList.toggle('on', k === i);
      if (k === i) chapBtns[k].setAttribute('aria-current', 'step'); else chapBtns[k].removeAttribute('aria-current');
    }
  }

  video.addEventListener('timeupdate', steps);
  video.addEventListener('playing', function () { video.classList.add('on'); playBtn.hidden = true; });
  video.addEventListener('ended', function () { if (mode === 'full') load(false); });
  soundBtn.addEventListener('click', function () { load(mode !== 'full'); });
  muteBtn.addEventListener('click', function () { load(false); });
  playBtn.addEventListener('click', function () { load(true); });
  for (var b = 0; b < chapBtns.length; b++) {
    chapBtns[b].addEventListener('click', (function (i) { return function () { seek(i); }; })(b));
  }

  // Pause hors écran (batterie, données), reprise au retour.
  new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting;
    if (!loaded) return;
    if (visible) play(); else video.pause();
  }).observe(stage);

  // Économiseur de données ou mouvement réduit : pas de lecture automatique, un bouton à la place.
  var saveData = navigator.connection && navigator.connection.saveData;
  if (saveData || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    playBtn.hidden = false;
  } else {
    var start = function () { setTimeout(function () { if (!loaded) load(false); }, 150); };
    if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
  }

  /* ---------- Mise en scène au défilement ---------- */
  if (!root.classList.contains('stage-on')) return;

  var g = {}, ticking = false, last = -1;
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function inOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function out(t) { return 1 - Math.pow(1 - t, 3); }

  function measure() {
    g.vw = root.clientWidth;
    g.px = pin.getBoundingClientRect().left;
    g.top = parseFloat(getComputedStyle(pin).top) || 0;
    g.ph = pin.offsetHeight;
    g.hx = house.offsetLeft;
    g.hy = house.offsetTop;
    g.w = house.offsetWidth;
    g.h = house.offsetHeight;
    g.r = g.h * 0.2623; // hauteur du pignon
    g.d = Math.max(1, stage.offsetHeight - g.ph);
    pin.style.setProperty('--pin-x', g.px + 'px');
    pin.style.setProperty('--vw', g.vw + 'px');
    last = -1;
  }

  // t : avancée dans la scène (0 → 1). 0-55 % : le toit s'envole puis la vidéo s'agrandit. 50-100 % : plein écran, étapes et boutons.
  function render() {
    ticking = false;
    var t = clamp((g.top - stage.getBoundingClientRect().top) / g.d);
    if (t === last) return;
    last = t;
    var p = clamp(t / 0.55);
    var e1 = out(clamp(p / 0.4));
    var e2 = inOut(clamp((p - 0.15) / 0.85));
    var y1 = g.r * (1 - e1);
    var s = box.style;
    s.left = lerp(0, -(g.px + g.hx), e2) + 'px';
    s.top = lerp(y1, -g.hy, e2) + 'px';
    s.width = lerp(g.w, g.vw, e2) + 'px';
    s.height = lerp(g.h - y1, g.ph, e2) + 'px';
    s.borderRadius = 4 * (1 - e2) + 'px';
    roof.style.transform = 'translate3d(0,' + (-e1 * (g.r + g.ph * 0.3)).toFixed(1) + 'px,0) rotate(' + (-8 * e1).toFixed(2) + 'deg)';
    roof.style.opacity = 1 - e1;
    hint.style.opacity = 1 - clamp(p / 0.18);
    var to = 1 - clamp(p / 0.5);
    text.style.opacity = to;
    text.style.visibility = to < 0.02 ? 'hidden' : '';
    var o = clamp((t - 0.5) / 0.1);
    ov.style.opacity = o;
    ov.classList.toggle('on', o > 0.01);
    ovIn.style.transform = 'translate3d(0,' + ((1 - o) * 24).toFixed(1) + 'px,0)';
  }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(render); } }

  measure();
  render();
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', function () { measure(); req(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); req(); });
})();
