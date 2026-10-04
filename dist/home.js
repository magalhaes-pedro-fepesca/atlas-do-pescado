(() => {
  const hero = document.querySelector('.home-hero');
  const slides = [...hero.querySelectorAll('.home-slide')];
  const pause = document.getElementById('home-pause');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0;
  let paused = reduced.matches;
  function show(next) {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.classList.toggle('current', i === index);
      slide.setAttribute('aria-hidden', String(i !== index));
    });
    document.getElementById('home-slide-label').textContent = (index ? 'Aquicultura' : 'Pesca') + ' · ' + (index + 1) + ' de ' + slides.length;
  }
  function updatePause() {
    pause.textContent = paused ? 'Reproduzir' : 'Pausar';
    pause.setAttribute('aria-label', paused ? 'Reproduzir carrossel' : 'Pausar carrossel');
  }
  document.getElementById('home-prev').onclick = () => show(index - 1);
  document.getElementById('home-next').onclick = () => show(index + 1);
  pause.onclick = () => { paused = !paused; updatePause(); };
  reduced.addEventListener('change', () => { paused = reduced.matches; updatePause(); });
  setInterval(() => {
    if (!paused && !document.hidden && !document.getElementById('home-view').hidden && !hero.matches(':hover') && !hero.contains(document.activeElement)) show(index + 1);
  }, 6500);
  updatePause();
})();
