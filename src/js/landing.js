/**
 * JS Interactivity & Animations for CalorIA Verde Landing Page
 */

window.initLandingPage = function() {
  console.log('[CalorIA] Inicializando Landing Page...');

  // 1. Reveal Animations on Scroll
  const reveals = document.querySelectorAll('.lp-reveal, .lp-reveal-left, .lp-reveal-right');
  const revealOnScroll = () => {
    reveals.forEach(el => {
      const windowHeight = window.innerHeight;
      const elementTop = el.getBoundingClientRect().top;
      const elementVisible = 100;
      if (elementTop < windowHeight - elementVisible) {
        el.classList.add('active');
      }
    });
  };
  window.addEventListener('scroll', revealOnScroll);
  // Trigger once on init
  setTimeout(revealOnScroll, 100);

  // 2. Sticky Nav Blur & Shadow on Scroll
  const nav = document.getElementById('lpNav');
  const navOnScroll = () => {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', navOnScroll);
  navOnScroll(); // Trigger once

  // 3. Hamburger Menu
  const hamburger = document.getElementById('lpHamburger');
  const mobileMenu = document.getElementById('lpMobileMenu');
  const mobileClose = document.getElementById('lpMobileClose');

  if (hamburger && mobileMenu) {
    hamburger.onclick = () => {
      mobileMenu.classList.add('active');
    };
  }
  if (mobileClose && mobileMenu) {
    mobileClose.onclick = () => {
      mobileMenu.classList.remove('active');
    };
  }

  // 4. Custom Follow Cursor (Desktop only)
  const cursorDot = document.getElementById('lpCursorDot');
  const cursorRing = document.getElementById('lpCursorRing');

  if (cursorDot && cursorRing && window.innerWidth > 992) {
    document.addEventListener('mousemove', (e) => {
      cursorDot.style.left = e.clientX + 'px';
      cursorDot.style.top = e.clientY + 'px';
      
      cursorRing.animate({
        left: e.clientX + 'px',
        top: e.clientY + 'px'
      }, { duration: 500, fill: 'forwards' });
    });

    // Hover effects for links and buttons
    const interactiveElements = document.querySelectorAll('a, button, .lp-faq-btn');
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursorRing.classList.add('hover');
        cursorDot.classList.add('hover');
      });
      el.addEventListener('mouseleave', () => {
        cursorRing.classList.remove('hover');
        cursorDot.classList.remove('hover');
      });
    });
  }
};

// Global Helpers
window.closeLpMenu = function() {
  const mobileMenu = document.getElementById('lpMobileMenu');
  if (mobileMenu) mobileMenu.classList.remove('active');
};

window.toggleFaq = function(button) {
  const item = button.parentElement;
  const isCurrentlyOpen = item.classList.contains('active');

  // Close all FAQs first
  document.querySelectorAll('.lp-faq-item').forEach(el => {
    el.classList.remove('active');
    const arrow = el.querySelector('.lp-faq-arrow');
    if (arrow) arrow.style.transform = 'rotate(0deg)';
  });

  // Open clicked one if it wasn't open
  if (!isCurrentlyOpen) {
    item.classList.add('active');
    const arrow = button.querySelector('.lp-faq-arrow');
    if (arrow) arrow.style.transform = 'rotate(180deg)';
  }
};
