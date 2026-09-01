/**
 * Mobile nav toggle + generic accordion behavior (used by the
 * "What do these numbers mean?" panel and any other accordion-item).
 */
(function () {
  function initMobileNav() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.mobile-nav');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  function initAccordions() {
    document.querySelectorAll('.accordion-trigger').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const panelId = trigger.getAttribute('aria-controls');
        const panel = panelId ? document.getElementById(panelId) : null;
        if (!panel) return;
        const isOpen = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', String(!isOpen));
        panel.hidden = isOpen;
      });
    });
  }

  /**
   * Desktop "Pick'ems" nav dropdown. Opens on hover via CSS alone; this
   * adds click-to-toggle for keyboard and touch users (who can't hover),
   * plus close-on-outside-click and close-on-Escape.
   */
  function initNavDropdown() {
    const dropdown = document.querySelector('.nav-dropdown');
    const trigger = dropdown ? dropdown.querySelector('.nav-dropdown-trigger') : null;
    if (!dropdown || !trigger) return;

    function close() {
      dropdown.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', () => {
      const isOpen = dropdown.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target)) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initAccordions();
    initNavDropdown();
  });
})();
