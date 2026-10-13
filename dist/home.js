(() => {
  const hero = document.querySelector('.home-hero');
  const slides = [...hero.querySelectorAll('.home-slide')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0;
  let paused = reduced.matches;
  function show(next) {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.classList.toggle('current', i === index);
      slide.setAttribute('aria-hidden', String(i !== index));
    });
  }
  window.atlasShowSlide = show;
  reduced.addEventListener('change', () => { paused = reduced.matches; });
  setInterval(() => {
    if (!paused && document.documentElement.dataset.motion !== 'reduce' && document.documentElement.dataset.carousel !== 'off' && !document.hidden && !document.getElementById('home-view').hidden && !hero.matches(':hover') && !hero.contains(document.activeElement)) show(index + 1);
  }, 4500);
  show(0);
})();

(() => {
  const home = document.getElementById('home-view');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!home || motion.matches || !('IntersectionObserver' in window)) return;
  const blocks = [...home.querySelectorAll('.home-section > :not(.home-columns), .home-columns > *')];
  const reveal = block => {
    block.classList.add('home-revealed');
    observer.unobserve(block);
  };
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
  }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
  blocks.forEach(block => {
    if (block.getBoundingClientRect().top < window.innerHeight) return;
    if (block.parentElement.classList.contains('home-columns')) {
      const position = [...block.parentElement.children].indexOf(block);
      block.style.setProperty('--home-reveal-delay', Math.min(position * 60, 120) + 'ms');
    }
    block.classList.add('home-reveal');
    observer.observe(block);
  });
  home.addEventListener('focusin', event => {
    const block = event.target.closest('.home-reveal');
    if (block) reveal(block);
  });
  motion.addEventListener('change', () => {
    if (motion.matches) { blocks.forEach(reveal); observer.disconnect(); }
  });
})();
