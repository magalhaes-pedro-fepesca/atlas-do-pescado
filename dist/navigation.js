(() => {
  const toggle = document.getElementById('navigation-toggle');
  const nav = document.getElementById('site-navigation');
  const mobile = window.matchMedia('(max-width:760px)');
  const backdrop = document.querySelector('.navigation-backdrop');
  const icons = {home:'House', international:'Globe', national:'Brazil', municipal:'MunicipalMap', trade:'TradeFlow', labs:'ChartGear', catalog:'DatabaseSearch', method:'Checklist', policy:'ShieldCheck'};
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
    if(button.dataset.scope==='atlantic'){
      const avatar=document.createElement('span');avatar.className='atlantic-nav-avatar';const image=document.createElement('img');image.src='assets/atlantic-ai.png';image.alt='';avatar.append(image);for(const star of ['✦','✧']){const spark=document.createElement('span');spark.className='atlantic-spark';spark.textContent=star;spark.setAttribute('aria-hidden','true');avatar.append(spark)}button.replaceChildren(avatar,text);
      const badge = document.createElement('span');
      badge.className = 'navigation-badge';
      badge.textContent = 'Em breve';
      button.append(badge);
      button.setAttribute('aria-label', 'Atlantic AI — Em breve');
    }else button.replaceChildren(icon(icons[button.dataset.scope]), text);
  });
  const toggleIcon = icon('PanelLeftOpen');
  toggle.replaceChildren(toggleIcon);
  function setOpen(open) {
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('navigation-open', open);
    backdrop.hidden = !open || !mobile.matches;
    nav.inert = mobile.matches && !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Recolher navegação' : 'Expandir navegação');
    toggle.title = open ? 'Recolher navegação' : 'Expandir navegação';
    toggleIcon.src = 'assets/navigation/' + (open ? 'PanelLeftClose' : 'PanelLeftOpen') + '.svg';
  }
  function close() {
    setOpen(false);
  }
  setOpen(!mobile.matches);
  mobile.addEventListener('change', () => setOpen(!mobile.matches));
  backdrop.addEventListener('click', () => { close(); toggle.focus(); });
  toggle.addEventListener('click', () => {
    setOpen(!nav.classList.contains('is-open'));
  });
  nav.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (window.matchMedia('(max-width:760px)').matches) { close(); toggle.focus(); }
  });
  document.addEventListener('click', event => {
    if (window.matchMedia('(max-width:760px)').matches && !nav.contains(event.target) && !toggle.contains(event.target)) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      close();
      toggle.focus();
    }
    if (event.key === 'Tab' && mobile.matches && nav.classList.contains('is-open')) {
      const controls = [toggle, ...nav.querySelectorAll('button:not([disabled]), input:not([disabled])')];
      const visible = controls.filter(el => !el.closest('[hidden]'));
      const first = visible[0], last = visible[visible.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
})();
