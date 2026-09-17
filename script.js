document.addEventListener('DOMContentLoaded', () => {
  // --- Language Switcher ---
  const langSelect = document.getElementById('lang-select');
  
  function updateLanguage(lang) {
    const t = translations[lang];
    if (!t) return;
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) {
        el.innerText = t[key];
      }
    });
  }

  langSelect.addEventListener('change', (e) => {
    updateLanguage(e.target.value);
  });
  updateLanguage('castillano'); // Init default

  // --- Scroll Animations (Wow Effect) ---
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el);
  });

  // --- Modal & Calendar Logic ---
  const modal = document.getElementById('calendar-modal');
  const closeBtn = document.getElementById('close-modal');
  const calendarGrid = document.getElementById('calendar-grid');
  let currentMoto = '';

  document.querySelectorAll('.btn-dispo').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentMoto = e.target.getAttribute('data-moto');
      openModal();
    });
  });

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  function openModal() {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    renderCalendar();
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  function renderCalendar() {
    calendarGrid.innerHTML = '';
    const today = new Date();
    
    // Generate next 14 days
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const isAvailable = Math.random() > 0.3; // 70% chance available for demo
      
      const dayEl = document.createElement('div');
      dayEl.className = `p-3 text-center border rounded-lg cursor-pointer transition-colors font-bold ${
        isAvailable ? 'bg-green-100 hover:bg-green-500 hover:text-white border-green-300 text-green-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
      }`;
      
      const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
      const dayNum = date.getDate();
      
      dayEl.innerHTML = `<span class="block text-xs uppercase">${dayName}</span><span class="text-lg">${dayNum}</span>`;
      
      if (isAvailable) {
        dayEl.addEventListener('click', () => {
          redirectToWhatsApp(date);
        });
      }
      calendarGrid.appendChild(dayEl);
    }
  }

  function redirectToWhatsApp(date) {
    const lang = langSelect.value;
    let template = translations[lang].wa_message;
    // Replace placeholder
    template = template.replace('{moto}', currentMoto);
    
    // Add date format
    const dateStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    const msg = encodeURIComponent(`${template} (Para el ${dateStr})`);
    
    const phone = "595995620416";
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  }
});
