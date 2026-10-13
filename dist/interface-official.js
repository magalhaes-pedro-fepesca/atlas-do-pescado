/* Page discovery uses existing navigation buttons and their existing handlers. */
(() => {
  const nav = document.getElementById('site-navigation');
  const search = document.getElementById('navigation-search');
  const status = document.getElementById('navigation-search-status');
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const buttons = [...nav.querySelectorAll('[data-scope]')];
  function filter() {
    const query = normalize(search.value.trim());
    buttons.forEach(button => { button.hidden = !normalize(button.getAttribute('aria-label')).includes(query); });
    nav.querySelectorAll('.navigation-group').forEach(group => { group.hidden = ![...group.querySelectorAll('[data-scope]')].some(button => !button.hidden); });
    const count = buttons.filter(button => !button.hidden).length;
    status.hidden = !query;
    status.textContent = count ? `${count} página${count === 1 ? '' : 's'} encontrada${count === 1 ? '' : 's'}.` : 'Nenhuma página encontrada.';
  }
  search.addEventListener('input', filter);
  search.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); buttons.find(button => !button.hidden)?.click(); }
  });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (!nav.classList.contains('is-open')) document.getElementById('navigation-toggle').click();
      search.focus();
    }
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('[data-scope]')) { search.value = ''; filter(); }
  });
  const hero = document.querySelector('.home-hero');
  const slides = [...hero.querySelectorAll('.home-slide')];
  const controls = document.createElement('div');
  controls.className = 'hero-slide-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Escolher imagem do carrossel');
  slides.forEach((slide, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Imagem ${index + 1}: ${slide.dataset.theme}`);
    button.addEventListener('click', () => window.atlasShowSlide?.(index));
    controls.append(button);
  });
  hero.append(controls);
  const update = () => [...controls.children].forEach((button, index) => button.setAttribute('aria-pressed', String(slides[index].classList.contains('current'))));
  new MutationObserver(update).observe(hero, {subtree:true, attributes:true, attributeFilter:['class']});
  update();
})();
