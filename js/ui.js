// Rotating role line
  const roles = (window.SITE && window.SITE.hero.roles) || [];
  const roleEl = document.getElementById('roleRotator');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (roleEl && roles.length > 1 && !reduceMotion) {
    let ri = 0;
    setInterval(() => {
      roleEl.classList.add('swap');
      setTimeout(() => {
        ri = (ri + 1) % roles.length;
        roleEl.textContent = roles[ri];
        roleEl.classList.remove('swap');
      }, 350);
    }, 2800);
  }

  // Mobile menu toggle
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  navToggle.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen);
  });
  document.querySelectorAll('.mobile-menu a').forEach(a => {
    a.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Scroll reveal
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  // Active nav link on scroll
  const sections = document.querySelectorAll('main section[id], .hero');
  const navLinks = document.querySelectorAll('nav.links a, .mobile-menu a');
  const setActive = () => {
    let currentId = '';
    const scrollPos = window.scrollY + 120;
    document.querySelectorAll('section[id]').forEach(sec => {
      if (sec.offsetTop <= scrollPos) currentId = sec.id;
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + currentId);
    });
  };
  window.addEventListener('scroll', setActive, { passive: true });
  setActive();

  // Back to top button
  const toTop = document.getElementById('toTop');
  window.addEventListener('scroll', () => {
    toTop.classList.toggle('show', window.scrollY > 600);
  }, { passive: true });
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
