/* =========================================
   Baby Shower RSVP — Main JavaScript
   ========================================= */

// ---- Configuration ----
// Replace this URL with your deployed Google Apps Script web app URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwM6D1LWW1mtT4wuYBwVJUaymS0hTUDMIU3X9jG82Ir4TeRDqFDC-IYXHwIJ5WBNW5L/exec';

// ---- DOM Elements ----
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const rsvpForm = document.getElementById('rsvpForm');
const addGuestBtn = document.getElementById('addGuestBtn');
const guestsList = document.getElementById('guestsList');
const guestRowTemplate = document.getElementById('guestRowTemplate');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoading = submitBtn.querySelector('.btn-loading');
const rsvpSuccess = document.getElementById('rsvpSuccess');
const rsvpError = document.getElementById('rsvpError');
const retryBtn = document.getElementById('retryBtn');

// ---- Navbar scroll effect ----
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  navbar.classList.toggle('scrolled', scrollY > 50);
  lastScroll = scrollY;
});

// ---- Mobile nav toggle ----
navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('active');
  navLinks.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('active');
    navLinks.classList.remove('open');
  });
});

// ---- Active nav link on scroll ----
const sections = document.querySelectorAll('.section, .hero');
const navAnchors = navLinks.querySelectorAll('a');

function updateActiveNav() {
  const scrollPos = window.scrollY + 120;

  sections.forEach(section => {
    const top = section.offsetTop;
    const height = section.offsetHeight;
    const id = section.getAttribute('id');

    if (scrollPos >= top && scrollPos < top + height) {
      navAnchors.forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
      });
    }
  });
}

window.addEventListener('scroll', updateActiveNav);

// ---- Scroll reveal ----
function initReveal() {
  document.querySelectorAll('.card, .section-title, .section-divider, .section-subtitle, .hero-content')
    .forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

initReveal();

// ---- Guest management ----
let guestCount = 0;

addGuestBtn.addEventListener('click', () => {
  guestCount++;
  const row = guestRowTemplate.content.cloneNode(true);
  const guestRow = row.querySelector('.guest-row');
  guestRow.dataset.guestId = guestCount;

  const firstInput = guestRow.querySelector('.guest-first');
  const lastInput = guestRow.querySelector('.guest-last');
  firstInput.name = `guestFirst_${guestCount}`;
  lastInput.name = `guestLast_${guestCount}`;

  const labels = guestRow.querySelectorAll('label');
  labels[0].textContent = `First Name `;
  labels[0].innerHTML += '<span class="required">*</span>';
  labels[1].textContent = `Last Name `;
  labels[1].innerHTML += '<span class="required">*</span>';

  const removeBtn = guestRow.querySelector('.btn-remove');
  removeBtn.addEventListener('click', () => {
    guestRow.style.animation = 'none';
    guestRow.style.opacity = '0';
    guestRow.style.transform = 'translateY(-8px)';
    guestRow.style.transition = '0.2s ease';
    setTimeout(() => guestRow.remove(), 200);
  });

  guestsList.appendChild(row);
  firstInput.focus();
});

// ---- Form validation ----
function validateField(input, errorEl) {
  const value = input.value.trim();
  if (!value) {
    input.classList.add('error');
    if (errorEl) errorEl.textContent = 'This field is required';
    return false;
  }
  input.classList.remove('error');
  if (errorEl) errorEl.textContent = '';
  return true;
}

function clearFieldError(input) {
  input.addEventListener('input', () => {
    input.classList.remove('error');
    const errorEl = input.parentElement.querySelector('.form-error');
    if (errorEl) errorEl.textContent = '';
  });
}

document.getElementById('firstName').addEventListener('input', function () {
  this.classList.remove('error');
  document.getElementById('firstNameError').textContent = '';
});

document.getElementById('lastName').addEventListener('input', function () {
  this.classList.remove('error');
  document.getElementById('lastNameError').textContent = '';
});

// ---- Form submission ----
rsvpForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const firstName = document.getElementById('firstName');
  const lastName = document.getElementById('lastName');
  let isValid = true;

  isValid = validateField(firstName, document.getElementById('firstNameError')) && isValid;
  isValid = validateField(lastName, document.getElementById('lastNameError')) && isValid;

  const guestRows = guestsList.querySelectorAll('.guest-row');
  const guests = [];

  guestRows.forEach(row => {
    const gFirst = row.querySelector('.guest-first');
    const gLast = row.querySelector('.guest-last');
    const gFirstError = gFirst.parentElement.querySelector('.form-error');
    const gLastError = gLast.parentElement.querySelector('.form-error');

    const fValid = validateField(gFirst, gFirstError);
    const lValid = validateField(gLast, gLastError);
    isValid = fValid && lValid && isValid;

    if (fValid && lValid) {
      guests.push({
        firstName: gFirst.value.trim(),
        lastName: gLast.value.trim()
      });
    }

    [gFirst, gLast].forEach(input => {
      input.addEventListener('input', () => {
        input.classList.remove('error');
        const err = input.parentElement.querySelector('.form-error');
        if (err) err.textContent = '';
      }, { once: true });
    });
  });

  if (!isValid) return;

  const payload = {
    firstName: firstName.value.trim(),
    lastName: lastName.value.trim(),
    guests: guests,
    totalAttending: 1 + guests.length,
    timestamp: new Date().toISOString()
  };

  setLoading(true);

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // no-cors means we can't read the response, so we assume success
    showSuccess();
  } catch (error) {
    console.error('RSVP submission error:', error);
    showError();
  }
});

function setLoading(loading) {
  submitBtn.disabled = loading;
  btnText.hidden = loading;
  btnLoading.hidden = !loading;
}

function showSuccess() {
  setLoading(false);
  rsvpForm.hidden = true;
  rsvpError.hidden = true;
  rsvpSuccess.hidden = false;
  rsvpSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showError() {
  setLoading(false);
  rsvpForm.hidden = true;
  rsvpSuccess.hidden = true;
  rsvpError.hidden = false;
}

retryBtn.addEventListener('click', () => {
  rsvpError.hidden = true;
  rsvpForm.hidden = false;
  setLoading(false);
});
