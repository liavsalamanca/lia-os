/*
 * Roar Studio Choice Awards 2026 — invitación digital.
 *
 * Organización:
 *   Store         almacenamiento local seguro (apertura vista y respuesta preparada)
 *   Invitado      nombre opcional en el enlace (?para=Nombre%20Apellido)
 *   RSVP          confirmación por WhatsApp con mensaje listo
 *   Modal         diálogo accesible reutilizable
 */
(function () {
  'use strict';

  var DATA = window.ROAR_DATA;
  var ENV = window.ROAR_ENV || {};
  var EVENT = DATA.event;
  var STORAGE_PREFIX = 'roar-choice-awards-2026:';

  document.documentElement.classList.add('js');

  /* ------------------------------------------------------------------ */
  /* Textura de terciopelo generada en el navegador                      */
  /* Pliegues irregulares con luz difusa, brillo rasante (propio del     */
  /* terciopelo), sombra en los valles y grano del pelo de la tela.      */
  /* Se repite en horizontal sin costuras. Si falla, queda el degradado. */
  /* ------------------------------------------------------------------ */
  function velvetTexture(w, h, folds) {
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;
    var img = ctx.createImageData(w, h);
    var d = img.data;
    var TAU = Math.PI * 2;
    var L = [-0.38, 0, 0.92]; // luz desde arriba a la izquierda, al frente
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    // Fases fijas por armónico para que cada pliegue sea distinto
    var p1 = rnd() * TAU, p2 = rnd() * TAU, p3 = rnd() * TAU, p4 = rnd() * TAU;
    function height(x, t) {
      var X = x / w;
      // Los pliegues se abren un poco hacia abajo (caída por gravedad)
      var u = X * folds + t * 0.35 * Math.sin(TAU * X * 2 + p4) + 0.18 * Math.sin(TAU * X * 3 + p3);
      return Math.sin(TAU * u + p1) * 1.0 +
             Math.sin(TAU * u * 2 + p2) * 0.28 +
             Math.sin(TAU * (X * folds * 3) + p3 + t * 2.2) * 0.08;
    }
    for (var y = 0; y < h; y++) {
      var t = y / (h - 1);
      // Caída de luz: más oscuro arriba (bajo la cenefa) y al pie
      var vert = 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, 0.08 + t * 0.98));
      for (var x = 0; x < w; x++) {
        var hc = height(x, t);
        var dh = (height(x + 1, t) - height(x - 1, t)) * 0.5 * (w / folds) * 0.9;
        var nx = -dh, nz = 1, len = Math.sqrt(nx * nx + nz * nz);
        nx /= len; nz /= len;
        var diffuse = Math.max(0, nx * L[0] + nz * L[2]);
        var sheen = Math.pow(1 - nz, 1.4) * 0.9;                 // brillo rasante del terciopelo
        var occl = 0.35 + 0.65 * ((hc + 1.36) / 2.72);            // valles más oscuros
        var I = (0.12 + 0.88 * diffuse) * occl * vert + sheen * 0.42 * vert;
        I = Math.max(0, Math.min(1.15, I));
        var grain = (rnd() - 0.5) * 0.07;
        var k = Math.max(0, I + grain);
        // Rampa de color: sombra casi negra → carmín → brillo rosado
        var r = 16 + 190 * Math.pow(k, 1.1) + 40 * Math.max(0, k - 0.75) * 4;
        var g = 2 + 16 * Math.pow(k, 2.2) + 30 * Math.max(0, k - 0.8) * 3;
        var b = 5 + 26 * Math.pow(k, 1.8) + 30 * Math.max(0, k - 0.8) * 3;
        var i = (y * w + x) * 4;
        d[i] = Math.min(255, r); d[i + 1] = Math.min(255, g); d[i + 2] = Math.min(255, b); d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    try { return canvas.toDataURL('image/jpeg', 0.86); } catch (e) { return null; }
  }
  try {
    var velvet = velvetTexture(520, 900, 6);
    if (velvet) {
      document.documentElement.style.setProperty('--velvet-tex', 'url("' + velvet + '")');
      document.documentElement.classList.add('has-velvet');
    }
  } catch (e) { /* se queda el terciopelo en degradado */ }

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                          */
  /* ------------------------------------------------------------------ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function get(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function announce(text) {
    var el = $('#sr-announcer');
    if (!el) {
      el = document.createElement('p');
      el.id = 'sr-announcer';
      el.setAttribute('role', 'status');
      el.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap';
      document.body.appendChild(el);
    }
    el.textContent = '';
    setTimeout(function () { el.textContent = text; }, 30);
  }

  /* ------------------------------------------------------------------ */
  /* Store: localStorage protegido (puede fallar en modo privado)        */
  /* ------------------------------------------------------------------ */
  var memory = {};
  var Store = {
    read: function (key, fallback) {
      try {
        var raw = window.localStorage.getItem(STORAGE_PREFIX + key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return memory[key] !== undefined ? memory[key] : fallback;
      }
    },
    write: function (key, value) {
      memory[key] = value;
      try { window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value)); } catch (e) { /* solo memoria */ }
    },
    clearAll: function () {
      memory = {};
      try {
        var keys = [];
        for (var i = 0; i < window.localStorage.length; i++) {
          var k = window.localStorage.key(i);
          if (k && k.indexOf(STORAGE_PREFIX) === 0) keys.push(k);
        }
        keys.forEach(function (k) { window.localStorage.removeItem(k); });
      } catch (e) { /* nada que limpiar */ }
    },
  };

  /* ------------------------------------------------------------------ */
  /* Invitado                                                            */
  /* El enlace puede llevar el nombre para personalizar el saludo:       */
  /*   .../roar-clausura-2026/?para=Nombre%20Apellido                    */
  /* Es solo un saludo: no da acceso ni define cupos.                    */
  /* ------------------------------------------------------------------ */
  function readGuestName() {
    try {
      var params = new URLSearchParams(window.location.search);
      var n = (params.get('para') || params.get('invitado') || '').replace(/\s+/g, ' ').trim();
      return n.length >= 2 && n.length <= 80 ? n : '';
    } catch (e) { return ''; }
  }
  var GUEST = readGuestName();
  function firstName(n) { return n.split(' ')[0]; }

  /* ------------------------------------------------------------------ */
  /* Campos fijos del evento (data-field)                                */
  /* ------------------------------------------------------------------ */
  function bindFields() {
    $all('[data-field]').forEach(function (el) {
      var value = get(DATA, el.getAttribute('data-field'));
      el.textContent = value == null || value === '' ? 'Por confirmar' : value;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Portada                                                             */
  /* ------------------------------------------------------------------ */
  var PAGE_REGIONS = ['#topbar', 'main', '.footer', '#fab-whatsapp'];
  function setInert(selectors, on) {
    selectors.forEach(function (sel) {
      var el = $(sel);
      if (!el) return;
      if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
      else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
    });
  }

  function showCover(animated) {
    var cover = $('#cover');
    cover.hidden = false;
    cover.classList.remove('is-opening');
    cover.style.opacity = '';
    if (animated && !reducedMotion()) {
      cover.classList.remove('is-entering');
      void cover.offsetWidth;
      cover.classList.add('is-entering');
    }
    document.body.classList.add('is-locked');
    setInert(PAGE_REGIONS, true);
    setTimeout(function () { $('#open-invitation').focus({ preventScroll: true }); }, 50);
  }

  function hideCover() {
    var cover = $('#cover');
    cover.hidden = true;
    cover.classList.remove('is-opening', 'is-entering');
    document.body.classList.remove('is-locked');
    setInert(PAGE_REGIONS, false);
  }

  function openInvitation() {
    var cover = $('#cover');
    Store.write('opened', true);
    var done = function () {
      hideCover();
      window.scrollTo(0, 0);
      var target = $('#hero-title');
      if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    };
    if (reducedMotion()) { cover.classList.add('is-opening'); setTimeout(done, 220); return; }
    // 1) La faja y la tarjeta se retiran  2) aparece el telón cerrado  3) el telón se abre
    var curtains = $('#curtains');
    curtains.hidden = false;
    curtains.classList.remove('is-open', 'is-done');
    cover.classList.add('is-opening');
    setTimeout(function () {
      done();
      setTimeout(function () { curtains.classList.add('is-open'); }, 250);
      setTimeout(function () { curtains.classList.add('is-done'); }, 2500);
      setTimeout(function () { curtains.hidden = true; curtains.classList.remove('is-open', 'is-done'); }, 3300);
    }, 1250);
  }

  /* ------------------------------------------------------------------ */
  /* Luz de seguimiento (hero y Tu invitación)                           */
  /* Sigue el mouse o el dedo; sin puntero, recorre la zona sola.        */
  /* ------------------------------------------------------------------ */
  function setupSpotlights() {
    var zones = $all('.spot');
    if (!zones.length) return;
    if (reducedMotion()) { zones.forEach(function (z) { z.classList.add('spot--static'); }); return; }
    var pointer = null;   // {x, y} en coordenadas de la ventana
    var lastMove = 0;
    var visible = new Set();
    var state = zones.map(function () { return { x: 0.5, y: 0.4, tx: 0.5, ty: 0.4, r: 1 }; });

    function onMove(e) {
      var p = e.touches ? e.touches[0] : e;
      if (!p) return;
      pointer = { x: p.clientX, y: p.clientY };
      lastMove = performance.now();
    }
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) visible.add(en.target); else visible.delete(en.target); });
      });
      zones.forEach(function (z) { io.observe(z); });
    } else zones.forEach(function (z) { visible.add(z); });

    function frame(t) {
      zones.forEach(function (z, i) {
        if (!visible.has(z)) return;
        var rect = z.getBoundingClientRect();
        var st = state[i];
        var active = pointer && t - lastMove < 4000 &&
          pointer.y >= rect.top && pointer.y <= rect.bottom;
        if (active) {
          st.tx = pointer.x / window.innerWidth; // la capa de luz ocupa todo el ancho
          st.ty = (pointer.y - rect.top) / rect.height;
          z.classList.add('spot--live');
        } else {
          // Recorrido automático, como un cañón de seguimiento en un evento
          var k = t / 1000 + i * 2.3;
          st.tx = 0.5 + Math.sin(k * 0.45) * 0.32;
          st.ty = 0.45 + Math.sin(k * 0.71) * 0.22;
          z.classList.remove('spot--live');
        }
        st.x += (st.tx - st.x) * (active ? 0.18 : 0.04);
        st.y += (st.ty - st.y) * (active ? 0.18 : 0.04);
        z.style.setProperty('--spot-x', (st.x * 100).toFixed(2) + '%');
        z.style.setProperty('--spot-y', (st.y * 100).toFixed(2) + '%');
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function renderCover() {
    $('#cover-greeting').textContent = GUEST ? firstName(GUEST) + ', te esperamos.' : 'Te esperamos.';
  }

  /* ------------------------------------------------------------------ */
  /* Confirmación de asistencia por WhatsApp                             */
  /* No hay servidor: el mensaje llega al WhatsApp de la organización.   */
  /* La página solo recuerda en este navegador qué respuesta se preparó. */
  /* ------------------------------------------------------------------ */
  var rsvpEditing = false;
  function waLink(text) {
    return 'https://wa.me/' + EVENT.contact.whatsappNumber + '?text=' + encodeURIComponent(text);
  }
  function rsvpMessage(status, name) {
    return status === 'confirmed'
      ? 'Hola Héctor, soy ' + name + '. Confirmo mi asistencia a ' + EVENT.title + ' el sábado 12 de diciembre a las ' + EVENT.timeLabel + ' en ' + EVENT.venue.name + '.'
      : 'Hola Héctor, soy ' + name + '. Lamentablemente no podré asistir a ' + EVENT.title + '. Gracias por la invitación.';
  }
  function cleanName(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
  function validName(v) { var n = cleanName(v); return n.length >= 3 && n.length <= 80; }

  function renderRsvp() {
    var root = $('#invite-root');
    var saved = Store.read('rsvp', null);
    var name = (saved && saved.name) || GUEST;
    var who = '<div class="invite__who">' +
      '<span class="pill invite__type">Invitación personal</span>' +
      '<h3 class="invite__name">' + (GUEST ? esc(GUEST) : 'Te esperamos') + '</h3>' +
      '<p class="invite__lead">Hemos reservado un lugar para ti esta noche.</p>' +
      '<p class="invite__sub">Confirma tu asistencia con ' + esc(EVENT.contact.name) + ' por WhatsApp. Solo toma un momento.</p>' +
      '</div>';
    var panel;
    if (saved && saved.status && !rsvpEditing) {
      var ok = saved.status === 'confirmed';
      panel = '<div class="response ' + (ok ? 'response--confirmed' : 'response--declined') + '">' +
        '<p class="response__stamp">' + (ok ? 'Confirmación preparada' : 'Respuesta preparada') + '</p>' +
        '<p class="response__text">Abrimos WhatsApp con tu mensaje para ' + esc(firstName(EVENT.contact.name)) + '. Tu respuesta queda registrada cuando envías ese mensaje.</p>' +
        '<div class="actions">' +
        '<a class="btn btn--primary" href="' + esc(waLink(rsvpMessage(saved.status, saved.name))) + '" target="_blank" rel="noopener noreferrer">Abrir WhatsApp de nuevo</a>' +
        '<button class="btn btn--text" type="button" data-rsvp-edit>Cambiar mi respuesta</button>' +
        '</div></div>';
    } else {
      panel = '<form class="rsvp" id="rsvp-form" novalidate>' +
        '<div class="namefield">' +
        '<label for="rsvp-name">Tu nombre y apellido</label>' +
        '<input id="rsvp-name" name="name" type="text" autocomplete="name" maxlength="80" required value="' + esc(name) + '" aria-describedby="rsvp-error">' +
        '<p class="field-error" id="rsvp-error" aria-live="polite"></p>' +
        '</div>' +
        '<div class="actions">' +
        '<a class="btn btn--primary" data-rsvp="confirmed" href="#" target="_blank" rel="noopener noreferrer">Confirmar asistencia</a>' +
        '<a class="btn btn--text" data-rsvp="declined" href="#" target="_blank" rel="noopener noreferrer">No podré asistir</a>' +
        '</div>' +
        '<p class="namefield__hint">Se abrirá WhatsApp con el mensaje listo. Solo tienes que enviarlo.</p>' +
        '</form>';
    }
    root.innerHTML = who + '<div class="invite__panel">' + panel + '</div>';
    updateRsvpLinks();
  }

  function updateRsvpLinks() {
    var input = $('#rsvp-name');
    if (!input) return;
    var n = cleanName(input.value);
    $all('[data-rsvp]').forEach(function (a) {
      a.href = waLink(rsvpMessage(a.getAttribute('data-rsvp'), n || '…'));
      a.classList.toggle('is-pending', !validName(n));
    });
  }

  function onRsvpClick(e) {
    if (e.target.closest('[data-rsvp-edit]')) { rsvpEditing = true; renderRsvp(); $('#rsvp-name').focus(); return; }
    var link = e.target.closest('[data-rsvp]');
    if (!link) return;
    var input = $('#rsvp-name');
    var n = cleanName(input.value);
    if (!validName(n)) {
      e.preventDefault();
      $('#rsvp-error').textContent = 'Escribe tu nombre y apellido para que Héctor sepa quién confirma.';
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    // Se deja abrir el enlace de WhatsApp y se recuerda la respuesta preparada
    var status = link.getAttribute('data-rsvp');
    Store.write('rsvp', { status: status, name: n });
    rsvpEditing = false;
    setTimeout(function () {
      renderRsvp();
      announce(status === 'confirmed' ? 'Abrimos WhatsApp con tu confirmación.' : 'Abrimos WhatsApp con tu respuesta.');
    }, 50);
  }

  /* Dress code: la referencia se amplía en un diálogo */
  function openDressBoard() {
    Modal.open({});
    Modal.setContent(
      '<p class="eyebrow">Dress code</p>' +
      '<h3 class="modal__title dc-title dc-title--modal" id="modal-title"><span class="dc-title__script">Black <span class="amp">&amp;</span> White</span></h3>' +
      '<img class="dc-modal-img" src="assets/dress-code-referencia.jpg" alt="Referencias de looks en negro y blanco" width="736" height="1104">' +
      '<p class="modal__text">' + esc(EVENT.dressCode.description) + '</p>'
    );
  }

  /* Mención de marcas: solo nombres cuando estén confirmados */
  function renderBrandMention() {
    var el = $('#brands-mention');
    if (!el) return;
    var names = DATA.brands.filter(function (b) { return !b.placeholder && b.name; }).map(function (b) { return b.name; });
    if (!names.length) return; // se mantiene el texto genérico del HTML
    var list = names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' y ' + names[names.length - 1];
    el.innerHTML = 'Presentan sus colecciones en pasarela: <strong>' + esc(list) + '</strong>.';
  }

  /* ------------------------------------------------------------------ */
  /* Marcas, aliados y programa                                          */
  /* ------------------------------------------------------------------ */




  /* ------------------------------------------------------------------ */
  /* Fecha, ubicación, calendario y cuenta regresiva                     */
  /* ------------------------------------------------------------------ */
  function utcStamp(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }
  function locationText() {
    var v = EVENT.venue;
    return v.name + ', ' + v.address + ', ' + v.neighborhood + ', ' + v.city;
  }
  function calendarDetails() {
    return 'Roar Studio Choice Awards 2026, clausura del año de Roar Studio, agencia y academia de modelos. ' +
      'Dress code elegante: traje para hombres; vestido y tacones para mujeres. ' +
      'Te recomendamos comer antes de llegar: no habrá servicio de comida durante el evento.';
  }

  function setupPlace() {
    $('#maps-link').href = EVENT.venue.mapsUrl;
    var heroMaps = $('#hero-maps');
    if (heroMaps) {
      heroMaps.href = EVENT.venue.mapsUrl;
      // Abre Google Maps en otra pestaña y deja la dirección completa visible aquí
      heroMaps.addEventListener('click', function () {
        $('#hero-address').hidden = false;
        heroMaps.setAttribute('aria-expanded', 'true');
      });
    }

    // Google Calendar exige inicio y fin: se usa la misma hora para no inventar un cierre.
    var start = new Date(EVENT.startISO);
    var stamp = utcStamp(start);
    var g = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(EVENT.calendarTitle) +
      '&dates=' + stamp + '/' + stamp +
      '&ctz=' + encodeURIComponent(EVENT.timeZone) +
      '&location=' + encodeURIComponent(locationText()) +
      '&details=' + encodeURIComponent(calendarDetails());
    $('#cal-google').href = g;

    var icsBtn = $('#cal-ics');
    if (!ENV.icsDownload) icsBtn.hidden = true;
    icsBtn.addEventListener('click', downloadICS);

    var toggle = $('#cal-toggle');
    var panel = $('#cal-options');
    toggle.addEventListener('click', function () {
      var open = panel.hidden;
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function (e) {
      if (!panel.hidden && !e.target.closest('.calmenu')) { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); }
    });
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); }
    });

    if (ENV.mapEmbed) {
      $('#mapbox').hidden = false;
      $('#map-toggle').addEventListener('click', function () {
        var frame = $('#map-frame');
        var open = frame.hidden;
        if (open && !frame.firstChild) {
          frame.innerHTML = '<iframe title="Mapa de ' + esc(EVENT.venue.name) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=' +
            encodeURIComponent(EVENT.venue.mapsQuery) + '&output=embed"></iframe>';
        }
        frame.hidden = !open;
        this.setAttribute('aria-expanded', String(open));
        this.textContent = open ? 'Ocultar mapa' : 'Ver mapa aquí';
      });
    }
  }

  function icsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1'); }
  function downloadICS() {
    // Sin DTEND: el evento queda con hora de inicio y sin cierre inventado (RFC 5545).
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Roar Studio//Choice Awards 2026//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:choice-awards-2026-roar-studio',
      'DTSTAMP:' + utcStamp(new Date()),
      'DTSTART:' + utcStamp(new Date(EVENT.startISO)),
      'SUMMARY:' + icsEscape(EVENT.calendarTitle),
      'LOCATION:' + icsEscape(locationText()),
      'DESCRIPTION:' + icsEscape(calendarDetails()),
      'END:VEVENT', 'END:VCALENDAR',
    ];
    var blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'roar-studio-choice-awards-2026.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function setUnit(unit, value, one, many) {
    var num = document.querySelector('.cd-num[data-unit="' + unit + '"]');
    var label = document.querySelector('[data-unit-label="' + unit + '"]');
    var text = String(value).padStart(2, '0');
    if (num && num.textContent !== text) {
      num.textContent = text;
      num.classList.remove('tick'); void num.offsetWidth; num.classList.add('tick');
    }
    if (label) label.textContent = value === 1 ? one : many;
  }

  function updateCountdown() {
    var el = $('#countdown-value');
    var chip = $('#chip-countdown');
    var diff = new Date(EVENT.startISO).getTime() - Date.now();
    if (diff <= 0) {
      el.textContent = 'La celebración comenzó el 12 de diciembre a las ' + EVENT.timeLabel + '.';
      $('#countdown .label').textContent = EVENT.title;
      $('.countdown__grid').hidden = true;
      chip.textContent = '12 de diciembre · ' + EVENT.timeLabel;
      return;
    }
    var mins = Math.floor(diff / 60000);
    var d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
    setUnit('d', d, 'día', 'días');
    setUnit('h', h, 'hora', 'horas');
    setUnit('m', m, 'minuto', 'minutos');
    el.textContent = 'Faltan ' + plural(d, 'día', 'días') + ', ' + plural(h, 'hora', 'horas') + ' y ' + plural(m, 'minuto', 'minutos') + '.';
    chip.textContent = d > 0 ? 'Faltan ' + plural(d, 'día', 'días') : 'Es hoy · ' + EVENT.timeLabel;
  }

  /* ------------------------------------------------------------------ */
  /* Resumen y textos dependientes de la invitación                      */
  /* ------------------------------------------------------------------ */
  function renderPersonalTexts() {
    $('#hero-greeting').textContent = GUEST ? 'Una invitación para ' + GUEST : 'Una invitación personal';
  }

  function whatsappUrl() {
    var msg = 'Hola Héctor' + (GUEST ? ', soy ' + GUEST : '') + '. Tengo una duda sobre mi invitación a ' + EVENT.title + '.';
    return waLink(msg);
  }

  function renderContact() {
    var c = EVENT.contact;
    if (!c) { $('#contact').hidden = true; $('#fab-whatsapp').hidden = true; return; }
    $('#contact-name').textContent = c.name;
    $('#contact-role').textContent = c.role;
    $('#contact-phone').textContent = c.phoneLabel;
    var wa = whatsappUrl();
    $('#contact-whatsapp').href = wa;
    $('#fab-whatsapp').href = wa;
    $('#contact-instagram').href = c.instagramUrl;
    if ($('#faq-contact')) $('#faq-contact').textContent = 'Escríbele por WhatsApp a ' + c.name + ', ' + c.role.charAt(0).toLowerCase() + c.role.slice(1) + ', al ' + c.phoneLabel + '.';
  }

  function setupCopyPhone() {
    var btn = $('#copy-phone');
    var status = $('#copy-status');
    btn.addEventListener('click', function () {
      var text = EVENT.contact.phoneLabel;
      var done = function () { status.textContent = 'Número copiado.'; setTimeout(function () { status.textContent = ''; }, 2500); };
      var fallback = function () {
        var range = document.createRange();
        range.selectNodeContents($('#contact-phone'));
        var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        status.textContent = 'Número seleccionado: cópialo desde el menú de tu teléfono.';
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
        else fallback();
      } catch (e) { fallback(); }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Modal accesible                                                     */
  /* ------------------------------------------------------------------ */
  var Modal = (function () {
    var root, dialog, body, lastFocus, handlers = {};
    var REGIONS = ['#topbar', 'main', '.footer', '#fab-whatsapp'];
    function focusables() {
      return $all('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])', dialog)
        .filter(function (el) { return el.offsetParent !== null; });
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') {
        var f = focusables();
        if (!f.length) { e.preventDefault(); return; }
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        return;
      }
      if (handlers.onKey) handlers.onKey(e);
    }
    function onClick(e) {
      if (e.target.closest('[data-close]')) { close(); return; }
      if (handlers.onClick) handlers.onClick(e);
    }
    function open(h) {
      root = root || $('#modal'); dialog = dialog || $('.modal__dialog', root); body = body || $('#modal-body');
      handlers = h || {};
      lastFocus = document.activeElement;
      root.hidden = false;
      document.body.classList.add('is-locked');
      setInert(REGIONS, true);
      document.addEventListener('keydown', onKey);
      root.addEventListener('click', onClick);
      setTimeout(function () { dialog.focus(); }, 10);
    }
    function setContent(html) { body.innerHTML = html; dialog.scrollTop = 0; }
    function close() {
      if (!root || root.hidden) return;
      root.hidden = true;
      document.body.classList.remove('is-locked');
      setInert(REGIONS, false);
      document.removeEventListener('keydown', onKey);
      root.removeEventListener('click', onClick);
      handlers = {};
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    return { open: open, setContent: setContent, close: close };
  })();

  /* ------------------------------------------------------------------ */
  /* Navegación por secciones                                            */
  /* ------------------------------------------------------------------ */
  function setupNav() {
    var links = $all('.sectionnav a');
    var nav = $('.sectionnav');
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    if (!('IntersectionObserver' in window)) return;
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0; });
      var best = null, bestRatio = 0;
      Object.keys(visible).forEach(function (id) { if (visible[id] > bestRatio) { best = id; bestRatio = visible[id]; } });
      links.forEach(function (a) { a.classList.remove('is-current'); a.removeAttribute('aria-current'); });
      if (best && map[best]) {
        var a = map[best];
        a.classList.add('is-current');
        a.setAttribute('aria-current', 'true');
        var left = a.offsetLeft - nav.clientWidth / 2 + a.clientWidth / 2;
        nav.scrollTo({ left: Math.max(0, left), behavior: reducedMotion() ? 'auto' : 'smooth' });
      }
    }, { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.01, 0.25, 0.5] });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ------------------------------------------------------------------ */
  /* Inicio                                                              */
  /* ------------------------------------------------------------------ */
  function init() {
    bindFields();
    renderCover();
    renderPersonalTexts();
    renderRsvp();
    renderContact();
    renderBrandMention();
    setupCopyPhone();
    setupPlace();
    updateCountdown();
    setInterval(updateCountdown, 30000);
    setupNav();
    setupSpotlights();

    var inviteRoot = $('#invite-root');
    inviteRoot.addEventListener('click', onRsvpClick);
    inviteRoot.addEventListener('input', function (e) {
      if (e.target.id !== 'rsvp-name') return;
      $('#rsvp-error').textContent = '';
      e.target.removeAttribute('aria-invalid');
      updateRsvpLinks();
    });
    inviteRoot.addEventListener('submit', function (e) { e.preventDefault(); });
    $('#dress-photo').addEventListener('click', openDressBoard);
    $('#open-invitation').addEventListener('click', openInvitation);
    $('#replay-cover').addEventListener('click', function () { showCover(true); });

    if (Store.read('opened', false)) hideCover(); else showCover(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
