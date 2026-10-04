(() => {
  const toggle = document.getElementById('navigation-toggle');
  const nav = document.getElementById('site-navigation');
  const icons = {technical:'Ruler',home:'House', national:'MapPinned', international:'Globe', trade:'Ship', municipal:'Building2', catalog:'Database', technology:'Microscope', news:'Newspaper', method:'BookOpen', policy:'ShieldCheck'};
  function icon(name) {
    const image = document.createElement('img');
    image.src = 'assets/navigation/' + name + '.svg';
    image.alt = '';
    image.width = image.height = 24;
    image.setAttribute('aria-hidden', 'true');
    return image;
  }
  nav.querySelectorAll('[data-scope]').forEach(button => {
    const label = button.textContent.trim();
    const text = document.createElement('span');
    text.className = 'navigation-text';
    text.textContent = label;
    button.setAttribute('aria-label', label);
    button.title = label;
    button.replaceChildren(icon(icons[button.dataset.scope]), text);
  });
  const toggleIcon = icon('PanelLeftOpen');
  toggle.replaceChildren(toggleIcon);
  function setOpen(open) {
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('navigation-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Recolher navegação' : 'Expandir navegação');
    toggle.title = open ? 'Recolher navegação' : 'Expandir navegação';
    toggleIcon.src = 'assets/navigation/' + (open ? 'PanelLeftClose' : 'PanelLeftOpen') + '.svg';
  }
  function close() {
    setOpen(false);
  }
  close();
  toggle.addEventListener('click', () => {
    setOpen(!nav.classList.contains('is-open'));
  });
  nav.addEventListener('click', event => {
    const button = event.target.closest('[data-scope]');
    if (!button) return;
    close();
    if (window.matchMedia('(max-width:760px)').matches) toggle.focus();
  });
  document.addEventListener('click', event => {
    if (!nav.contains(event.target) && !toggle.contains(event.target)) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      close();
      toggle.focus();
    }
  });
})();
