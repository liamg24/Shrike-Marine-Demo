/* Shrike Marine — homepage
   1. Intro: clip plays once (bird lands, pulse). Status light + copy come up on the pulse.
   2. Exit: scroll-scrubbed timeline. Camera pushes in through birds 1 → 4 as the bird
      sweeps at the viewer, then cuts to black. Pace is set by SCROLL below.
   3. About and solutions content fades in as it enters. */
(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const video = hero.querySelector('.hero__video');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Clip timing, in seconds of the source file. The first ~0.9 s shows the bird leaving,
  // so playback starts from the dark frame just after it.
  const START_T = 0.92;
  const PULSE_T = 2.70;   // touchdown pulse peaks at ~2.75 s
  const REVEAL_T = 2.90;  // copy starts right after the pulse
  const STALL_MS = 3500;  // no progress by then (autoplay blocked, slow network) → show the still

  /* ---------- Intro ---------- */

  let online = false;
  let revealed = false;

  function goOnline() {
    if (online) return;
    online = true;
    hero.classList.add('is-online');
  }

  function reveal() {
    if (revealed) return;
    revealed = true;
    goOnline();
    const items = hero.querySelectorAll('[data-reveal]');
    if (reduceMotion) {
      gsap.to(items, { autoAlpha: 1, duration: 0.4, ease: 'none' });
      return;
    }
    gsap.fromTo(items,
      { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power2.out', stagger: 0.09 });
  }

  function showStill() {
    hero.classList.add('is-still');
    if (video) video.pause();
    reveal();
  }

  function watchClip() {
    const t = video.currentTime;
    if (t >= PULSE_T) goOnline();
    if (t >= REVEAL_T) { reveal(); return; }
    if (!video.paused && !video.ended) requestAnimationFrame(watchClip);
  }

  if (reduceMotion || !video) {
    showStill();
  } else {
    video.src = video.dataset.src;
    video.addEventListener('playing', () => requestAnimationFrame(watchClip));
    video.addEventListener('ended', reveal);
    video.addEventListener('error', showStill);
    video.addEventListener('loadedmetadata', () => {
      if (video.currentTime < START_T) video.currentTime = START_T;
    }, { once: true });

    video.muted = true;       // must be set as a property for autoplay policies
    video.autoplay = true;
    const p = video.play();
    if (p && p.catch) {
      p.catch((err) => {
        console.warn('[hero] intro clip did not autoplay:', err && err.name);
        showStill();
      });
    }

    setTimeout(() => {
      if (!revealed && video.currentTime < START_T + 0.2) showStill();
    }, STALL_MS);
  }

  /* ---------- Smooth scroll ---------- */

  gsap.registerPlugin(ScrollTrigger);

  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1 });   // touch keeps native scrolling by default
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- Scroll exit ---------- */

  // Scroll distance for each stage, in screen heights. Smaller = faster.
  //   intro    perched → wings raised (bird 1) → side close-up (bird 2)
  //   approach bird turns toward the viewer (bird 3)
  //   strike   talons fill the screen (bird 4)
  //   pass     the bird has gone overhead, tail trailing (bird 5)
  //   black    cut to black before the About section
  const SCROLL = { intro: 0.6, approach: 0.21, strike: 0.21, pass: 0.21, black: 0.17 };

  const A0 = SCROLL.intro;           // approach starts
  const S0 = A0 + SCROLL.approach;   // strike starts
  const P0 = S0 + SCROLL.strike;     // pass starts
  const K0 = P0 + SCROLL.pass;       // black starts
  const END = K0 + SCROLL.black;
  hero.style.setProperty('--runway', END);

  const mm = gsap.matchMedia();

  mm.add({
    wide: '(min-width: 900px) and (min-aspect-ratio: 1/1)',
    motion: '(prefers-reduced-motion: no-preference)',
  }, (ctx) => {
    const { wide, motion } = ctx.conditions;

    // Timeline time = screen heights scrolled (0 → END).
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom bottom',
        scrub: lenis ? true : 0.5,
        invalidateOnRefresh: true,
      },
    });

    const I = SCROLL.intro, A = SCROLL.approach, S = SCROLL.strike, P = SCROLL.pass, K = SCROLL.black;

    tl.fromTo('.hud__fill', { scaleX: 0 }, { scaleX: 1, duration: K0 }, 0)
      .to('.hero__copy', { autoAlpha: 0, y: motion ? -56 : 0, duration: 0.4 * I, ease: 'power1.in' }, 0)
      .to('.hero__brand', { autoAlpha: 0, duration: 0.25 * I }, 0.05 * I)
      // bird 1: perched → wings raised
      .to('.hero__wide', { autoAlpha: 1, duration: 0.18 * I }, 0.22 * I)
      .to('.hero__plate', { autoAlpha: 0, duration: 0.18 * I }, 0.27 * I)
      // bird 2: side close-up, while the camera is still pushing in
      .to('.hero__close', { autoAlpha: 1, duration: 0.22 * I }, 0.65 * I)
      .to('.hero__wide', { autoAlpha: 0, duration: 0.18 * I }, 0.76 * I)
      // bird 3: turns toward the viewer
      .to('.hero__void', { autoAlpha: 1, duration: 0.4 * A }, A0 + 0.1 * A)
      .to('.hero__b3', { autoAlpha: 1, duration: 0.4 * A, ease: 'power1.in' }, A0 + 0.1 * A)
      .to('.hero__camera', { autoAlpha: 0, duration: 0.3 * A }, A0 + 0.4 * A)
      .to('.hero__hud', { autoAlpha: 0, duration: 0.3 * A }, A0)
      // bird 4: talons fill the frame
      .to('.hero__b4', { autoAlpha: 1, duration: 0.3 * S, ease: 'power1.in' }, S0)
      .to('.hero__b3', { autoAlpha: 0, duration: 0.2 * S }, S0 + 0.2 * S)
      // bird 5: it has passed overhead, tail and sparks trailing
      .to('.hero__b5', { autoAlpha: 1, duration: 0.3 * P, ease: 'power1.in' }, P0)
      .to('.hero__b4', { autoAlpha: 0, duration: 0.2 * P }, P0 + 0.2 * P)
      // black
      .to('.hero__fade', { autoAlpha: 1, duration: 0.8 * K, ease: 'power2.in' }, K0)
      .set({}, {}, END);

    if (motion) {
      tl.to('.hero__camera', { scale: 1.22, duration: 0.45 * I, ease: 'power1.in' }, 0)
        .to('.hero__camera', {
          scale: wide ? 2.1 : 1.9,
          x: () => (wide ? -0.12 * window.innerWidth : 0),
          y: () => (wide ? 0.10 : 0.20) * window.innerHeight,   // bring the bird to mid-frame
          duration: 0.55 * I,
          ease: 'power1.inOut',
        }, 0.45 * I)
        // bird 2 lunges toward the camera as bird 3 takes over
        .to('.hero__close', { scale: 1.6, duration: A, ease: 'power2.in' }, A0)
        // each shot starts at full-screen size (never below scale 1, so the frame always
        // fills the viewport) and keeps pushing in, so the cuts read as one continuous rush
        .fromTo('.hero__b3', { scale: 1 }, { scale: 1.3, duration: A + 0.4 * S, ease: 'power2.in' }, A0 + 0.1 * A)
        .fromTo('.hero__b4', { scale: 1 }, { scale: 1.45, duration: S + 0.4 * P, ease: 'power2.in' }, S0)
        // bird 5 drifts up and away: the bird is now behind and above the viewer
        // (the drift stays within the scale headroom, so no edge is ever exposed)
        .fromTo('.hero__b5', { scale: 1.15, yPercent: 0 }, { scale: 1.1, yPercent: -6, duration: P + K, ease: 'power1.out' }, P0);
    }
  });

  /* ---------- About / solutions: reveal on enter ---------- */

  gsap.utils.toArray('[data-inview]').forEach((el) => {
    gsap.fromTo(el,
      { autoAlpha: 0, y: reduceMotion ? 0 : 18 },
      {
        autoAlpha: 1,
        y: 0,
        duration: reduceMotion ? 0.4 : 0.8,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
  });

  // Fonts change copy height; recompute positions once they are in.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
})();
