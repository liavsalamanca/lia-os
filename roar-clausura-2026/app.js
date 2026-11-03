/*
 * Roar Studio Choice Awards 2026 — lógica del prototipo.
 *
 * Organización:
 *   Store              almacenamiento local seguro (solo para la demostración)
 *   InvitationService  única puerta de entrada a los datos de una invitación
 *   render*            componentes de cada sección
 *   Modal              diálogo accesible reutilizable
 *   Demo               selector "Solo demostración" (se elimina en producción)
 */
(function () {
  'use strict';

  var DATA = window.ROAR_DATA;
  var ENV = window.ROAR_ENV || {};
  var EVENT = DATA.event;
  var STORAGE_PREFIX = 'roar-clausura-2026:demo:';

  document.documentElement.classList.add('js');

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
  /* InvitationService                                                   */
  /*                                                                     */
  /* PRODUCCIÓN — reemplazar esta implementación por llamadas al         */
  /* servidor, manteniendo la misma forma de los datos:                  */
  /*   load(token)                -> GET  /api/invitaciones/:token       */
  /*   respond(token, id, status) -> POST /api/invitaciones/:token/respuestas */
  /*   setName(token, id, name)   -> POST /api/invitaciones/:token/nombres    */
  /* El servidor valida el token, los cupos (`seats`) y qué lugares       */
  /* admiten nombre. El navegador solo recibe la invitación consultada.  */
  /* ------------------------------------------------------------------ */
  var InvitationService = {
    list: function () { return DATA.demoInvitations; },

    load: function (id) {
      var base = DATA.demoInvitations.filter(function (inv) { return inv.id === id; })[0] || DATA.demoInvitations[0];
      var saved = Store.read('inv:' + base.id, { responses: {}, names: {} });
      var seats = Math.max(1, base.seats | 0);
      var defaultRole = base.kind === 'brand' ? 'Representante' : 'Acompañante';

      // Los lugares se generan a partir de `seats`, nunca a partir de nombres.
      var slots = [];
      for (var i = 0; i < seats; i++) {
        var person = base.people[i] || { id: 'slot-' + (i + 1), name: null, role: defaultRole, nameEditable: true };
        var name = person.name || saved.names[person.id] || null;
        slots.push({
          id: person.id,
          role: person.role,
          name: name,
          nameEditable: !!person.nameEditable && !person.name,
          isHolder: i === 0,
          status: saved.responses[person.id] || 'pending',
        });
      }
      if (base.people.length > seats && window.console) {
        console.warn('La invitación ' + base.id + ' tiene más personas que cupos; se ignoran las sobrantes.');
      }
      return {
        id: base.id, kind: base.kind, demoLabel: base.demoLabel,
        greetingName: base.greetingName, displayName: base.displayName,
        brandName: base.brandName || null, principal: base.principal || null,
        seats: seats, slots: slots,
      };
    },

    respond: function (invId, personId, status) {
      if (['confirmed', 'declined', 'pending'].indexOf(status) === -1) return false;
      var inv = this.load(invId);
      var slot = inv.slots.filter(function (s) { return s.id === personId; })[0];
      if (!slot) return false;                     // no existe ese lugar
      if (status === 'confirmed' && !slot.name) return false; // primero el nombre
      var saved = Store.read('inv:' + invId, { responses: {}, names: {} });
      saved.responses[personId] = status;
      Store.write('inv:' + invId, saved);
      return true;
    },

    setName: function (invId, personId, name) {
      var clean = String(name || '').replace(/\s+/g, ' ').trim();
      if (clean.length < 3 || clean.length > 80) return { ok: false, error: 'Escribe nombre y apellido (entre 3 y 80 caracteres).' };
      var inv = this.load(invId);
      var slot = inv.slots.filter(function (s) { return s.id === personId; })[0];
      // Solo se puede nombrar un lugar que ya existe dentro del cupo.
      if (!slot || !slot.nameEditable) return { ok: false, error: 'Este lugar no admite cambios de nombre.' };
      var saved = Store.read('inv:' + invId, { responses: {}, names: {} });
      saved.names[personId] = clean;
      Store.write('inv:' + invId, saved);
      return { ok: true };
    },

    clearName: function (invId, personId) {
      var saved = Store.read('inv:' + invId, { responses: {}, names: {} });
      delete saved.names[personId];
      delete saved.responses[personId];
      Store.write('inv:' + invId, saved);
    },

    isOpened: function (invId) { return !!Store.read('opened:' + invId, false); },
    markOpened: function (invId) { Store.write('opened:' + invId, true); },
  };

  /* ------------------------------------------------------------------ */
  /* Estado de la página                                                 */
  /* ------------------------------------------------------------------ */
  var state = {
    invId: Store.read('profile', DATA.demoInvitations[0].id),
    editing: {},       // lugares con la respuesta en edición (solo interfaz)
    editingName: {},
    justChanged: null,
  };

  function current() { return InvitationService.load(state.invId); }

  function counts(inv) {
    var c = { confirmed: 0, declined: 0, pending: 0 };
    inv.slots.forEach(function (s) { c[s.status] += 1; });
    return c;
  }

  var KIND_LABEL = {
    model: 'Modelo · Invitación individual',
    modelPlusOne: 'Modelo · Con acompañante',
    brand: 'Marca invitada',
  };
  var STATUS_LABEL = { confirmed: 'Confirmado', declined: 'No asistirá', pending: 'Sin respuesta' };

  function statusPill(status) {
    return '<span class="pill pill--' + status + '">' + STATUS_LABEL[status] + '</span>';
  }

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
    InvitationService.markOpened(state.invId);
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

  function renderCover(inv) {
    $('#cover-greeting').textContent = inv.greetingName + ', te esperamos.';
  }

  /* ------------------------------------------------------------------ */
  /* Tu invitación                                                       */
  /* ------------------------------------------------------------------ */
  function introFor(inv) {
    if (inv.kind === 'model') {
      return {
        lead: 'Este lugar está reservado para ti.',
        sub: 'Tu invitación incluye 1 acceso personal.',
      };
    }
    if (inv.kind === 'modelPlusOne') {
      return {
        lead: 'Tenemos dos lugares reservados para esta noche.',
        sub: 'Tu invitación incluye tu acceso y el de tu acompañante registrado.',
      };
    }
    var principal = inv.principal ? '<br>Representante principal: <strong>' + esc(inv.principal) + '</strong>.' : '';
    return {
      lead: 'Nos alegra contar con ' + esc(inv.brandName) + ' en Roar Studio Choice Awards 2026, la clausura de nuestro año.',
      sub: 'Esta invitación incluye ' + plural(inv.seats, 'acceso autorizado', 'accesos autorizados') +
        ' para representantes de la marca.' + principal,
      html: true,
    };
  }

  function tallyHTML(inv) {
    var c = counts(inv);
    return '<dl class="tally">' +
      '<div class="tally__seats"><dt>Cupos autorizados</dt><dd>' + inv.seats + '</dd></div>' +
      '<div><dt>Confirmaron</dt><dd>' + c.confirmed + '</dd></div>' +
      '<div><dt>No asistirán</dt><dd>' + c.declined + '</dd></div>' +
      '<div><dt>Sin respuesta</dt><dd>' + c.pending + '</dd></div>' +
      '</dl>';
  }

  function responseHTML(inv, slot, single) {
    var isNew = state.justChanged === slot.id ? ' is-new' : '';
    var changeBtn = '<button class="btn btn--text" type="button" data-action="edit" data-person="' + esc(slot.id) + '">Cambiar ' + (single ? 'mi respuesta' : 'respuesta') + '</button>';
    if (slot.status === 'confirmed') {
      var text = single
        ? 'Gracias, ' + esc(inv.greetingName) + '. Te esperamos el sábado 12 de diciembre a las ' + esc(EVENT.timeLabel) + ' en ' + esc(EVENT.venue.name) + '.'
        : esc(slot.name) + ' está en la lista de esta noche.';
      return '<div class="response response--confirmed' + isNew + '">' +
        '<p class="response__stamp">Asistencia confirmada</p>' +
        '<p class="response__text">' + text + '</p>' + changeBtn + '</div>';
    }
    var declinedText = single
      ? 'Gracias por avisarnos. Lamentamos no verte esa noche.'
      : 'Registramos que ' + esc(slot.name || 'esta persona') + ' no podrá asistir.';
    return '<div class="response response--declined' + isNew + '">' +
      '<p class="response__stamp">No podrá asistir</p>' +
      '<p class="response__text">' + declinedText + ' El lugar no se asigna a otra persona.</p>' + changeBtn + '</div>';
  }

  function actionsHTML(inv, slot, single) {
    var id = esc(slot.id);
    var self = slot.isHolder && inv.kind !== 'brand';
    var confirmLabel = single || self ? 'Confirmar mi asistencia' : 'Confirmar asistencia';
    var declineLabel = single || self ? 'No podré asistir' : 'No asistirá';
    var editing = state.editing[slot.id];
    var cancel = editing ? '<button class="btn btn--text" type="button" data-action="cancel-edit" data-person="' + id + '">Mantener respuesta</button>' : '';
    if (!slot.name) {
      return '<div class="actions"><button class="btn" type="button" disabled>Confirmar asistencia</button></div>' +
        '<p class="namefield__hint">Para confirmar este lugar, primero registra el nombre.</p>';
    }
    return '<div class="actions">' +
      '<button class="btn btn--primary" type="button" data-action="confirm" data-person="' + id + '">' + confirmLabel + '</button>' +
      '<button class="btn ' + (single ? 'btn--text' : 'btn--ghost') + '" type="button" data-action="decline" data-person="' + id + '">' + declineLabel + '</button>' +
      cancel + '</div>';
  }

  function nameFieldHTML(inv, slot) {
    var fid = 'name-' + slot.id;
    var who = inv.kind === 'brand' ? 'del representante' : 'de tu acompañante';
    var hint = inv.kind === 'brand'
      ? 'Completa un lugar ya autorizado para la marca. Escribir un nombre no agrega accesos.'
      : 'Este nombre ocupa el segundo lugar ya reservado. No agrega accesos.';
    return '<form class="namefield" data-person="' + esc(slot.id) + '" novalidate>' +
      '<label for="' + esc(fid) + '">Nombre ' + who + '</label>' +
      '<div class="namefield__row">' +
      '<input id="' + esc(fid) + '" name="name" type="text" autocomplete="name" maxlength="80" required value="' + esc(slot.name || '') + '" aria-describedby="' + esc(fid) + '-hint ' + esc(fid) + '-error">' +
      '<button class="btn" type="submit">Guardar nombre</button>' +
      (state.editingName[slot.id] ? '<button class="btn btn--text" type="button" data-action="cancel-name" data-person="' + esc(slot.id) + '">Cancelar</button>' : '') +
      '</div>' +
      '<p class="namefield__hint" id="' + esc(fid) + '-hint">' + hint + '</p>' +
      '<p class="field-error" id="' + esc(fid) + '-error" aria-live="polite"></p>' +
      '</form>';
  }

  function seatHTML(inv, slot, index) {
    var showName = slot.name && !state.editingName[slot.id];
    var nameHTML = showName
      ? '<span class="seat__name">' + esc(slot.name) + '</span>'
      : '<span class="seat__name seat__name--missing">Nombre pendiente</span>';
    var body = '';
    if (!showName && slot.nameEditable) body += nameFieldHTML(inv, slot);
    if (showName && slot.nameEditable && slot.status === 'pending') {
      body += '<button class="btn btn--text" type="button" data-action="edit-name" data-person="' + esc(slot.id) + '">Corregir nombre</button>';
    }
    if (slot.status === 'pending' || state.editing[slot.id]) body += actionsHTML(inv, slot, false);
    else body += responseHTML(inv, slot, false);

    return '<li class="seat">' +
      '<div class="seat__head">' +
      '<span class="seat__num">' + String(index + 1).padStart(2, '0') + '</span>' +
      '<span class="seat__who"><span class="seat__role">' + esc(slot.role) + ' · Acceso ' + (index + 1) + ' de ' + inv.seats + '</span>' + nameHTML + '</span>' +
      '<span class="seat__status">' + statusPill(slot.status) + '</span>' +
      '</div><div class="seat__body">' + body + '</div></li>';
  }

  function renderInvite(inv) {
    var intro = introFor(inv);
    var who = '<div class="invite__who">' +
      '<span class="pill invite__type">' + esc(KIND_LABEL[inv.kind]) + '</span>' +
      '<h3 class="invite__name">' + esc(inv.displayName) + '</h3>' +
      '<p class="invite__lead">' + intro.lead + '</p>' +
      '<p class="invite__sub">' + intro.sub + '</p>' +
      '</div>';

    var right;
    if (inv.seats === 1) {
      var slot = inv.slots[0];
      var block = slot.status === 'pending' || state.editing[slot.id] ? actionsHTML(inv, slot, true) : responseHTML(inv, slot, true);
      right = '<div class="invite__panel" style="display:grid;gap:20px">' +
        '<div style="display:grid;gap:12px"><p class="seat__role">Estado · ' + STATUS_LABEL[slot.status] + '</p>' + block + '</div></div>';
    } else {
      right = '<div class="invite__panel" style="display:grid;gap:20px">' + tallyHTML(inv) +
        '<ul class="seats">' + inv.slots.map(function (s, i) { return seatHTML(inv, s, i); }).join('') + '</ul>' +
        (counts(inv).declined ? '<p class="namefield__hint">Un lugar que no se usa no se reasigna automáticamente.</p>' : '') +
        '</div>';
    }

    var root = $('#invite-root');
    var active = document.activeElement;
    var refocus = active && root.contains(active) ? { action: active.getAttribute('data-action'), person: active.getAttribute('data-person'), id: active.id } : null;
    root.innerHTML = who + right;
    restoreFocus(root, refocus);
  }

  function restoreFocus(root, info) {
    var target = null;
    if (info && info.person) {
      target = root.querySelector('[data-person="' + CSS.escape(info.person) + '"][data-action="edit"]') ||
        root.querySelector('[data-person="' + CSS.escape(info.person) + '"][data-action="confirm"]') ||
        root.querySelector('#name-' + CSS.escape(info.person)) ||
        root.querySelector('[data-person="' + CSS.escape(info.person) + '"][data-action="edit-name"]');
    } else if (info && info.id) {
      target = root.querySelector('#' + CSS.escape(info.id));
    }
    if (target) target.focus({ preventScroll: true });
  }

  function onInviteClick(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var person = btn.getAttribute('data-person');
    var action = btn.getAttribute('data-action');
    var inv = current();
    var slot = inv.slots.filter(function (s) { return s.id === person; })[0];
    if (!slot) return;

    if (action === 'confirm' || action === 'decline') {
      var status = action === 'confirm' ? 'confirmed' : 'declined';
      if (!InvitationService.respond(inv.id, person, status)) return;
      delete state.editing[person];
      state.justChanged = person;
      renderAll();
      state.justChanged = null;
      announce(status === 'confirmed'
        ? 'Asistencia confirmada para ' + slot.name + '.'
        : 'Registrado: ' + (slot.name || 'esta persona') + ' no podrá asistir.');
    } else if (action === 'edit') {
      state.editing[person] = true; renderAll();
    } else if (action === 'cancel-edit') {
      delete state.editing[person]; renderAll();
    } else if (action === 'edit-name') {
      state.editingName[person] = true; renderAll();
    } else if (action === 'cancel-name') {
      delete state.editingName[person]; renderAll();
    }
  }

  function onInviteSubmit(e) {
    var form = e.target.closest('.namefield');
    if (!form) return;
    e.preventDefault();
    var person = form.getAttribute('data-person');
    var input = form.querySelector('input');
    var res = InvitationService.setName(state.invId, person, input.value);
    if (!res.ok) {
      form.querySelector('.field-error').textContent = res.error;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    delete state.editingName[person];
    renderAll();
    announce('Nombre guardado. Ya puedes confirmar su asistencia.');
  }

  /* ------------------------------------------------------------------ */
  /* Dress code y moodboard                                              */
  /* ------------------------------------------------------------------ */
  /*
   * Ilustraciones de figurín (estilo boceto de moda). Línea marfil, tela
   * en tonos translúcidos y detalles dorados. Se reemplazan por fotos con
   * `image` en data.js.
   */
  var F = ' fill="currentColor" fill-opacity=".09"';     // tela
  var FD = ' fill="currentColor" fill-opacity=".16"';    // tela oscura / sombra
  var G = ' fill="#e3c27c" fill-opacity=".85" stroke="#e3c27c"'; // dorado
  var SK = ' fill="currentColor" fill-opacity=".05"';    // piel
  var THIN = ' stroke-width=".6" stroke-opacity=".55"';
  var ART = {
    suit:
      '<ellipse cx="60" cy="14" rx="5.6" ry="7"' + SK + '/>' +
      '<path d="M54.6 12.5q.6-8.6 5.6-8.6t5.6 8q-2.2-3.4-5.6-3.6-3.4.2-5.6 4.2z"' + FD + '/>' +
      '<path d="M57.6 20.5v4.2M62.4 20.5v4.2"/>' +
      '<path d="M43.5 29.5Q60 23.5 76.5 29.5L79 76q-8 3.4-15.6.6L60 60l-3.4 16.6Q49 79.4 41 76z"' + F + '/>' +
      '<path d="M55.2 24.6L60 36.5l4.8-11.9z" fill="currentColor" fill-opacity=".22"/>' +
      '<path d="M59 30.5h2l1.4 19.5-2.4 4-2.4-4z"' + G + ' stroke-width=".5"/>' +
      '<path d="M55.2 24.6l-4 13.4 6.4 7.6 2.4 10.4M64.8 24.6l4 13.4-6.4 7.6-2.4 10.4"/>' +
      '<path d="M69.5 40.5l5.5-1.2-.4 2.6z"' + G + ' stroke-width=".4"/>' +
      '<circle cx="60" cy="62" r="1.1" fill="currentColor"/><circle cx="60" cy="68.5" r="1.1" fill="currentColor"/>' +
      '<path d="M45 64.5h9M66 64.5h9"' + THIN + '/>' +
      '<path d="M43.5 29.5Q38.6 50 39.6 77.5l5.2-.4q.4-22 3.6-36.6M76.5 29.5Q81.4 50 80.4 77.5l-5.2-.4q-.4-22-3.6-36.6"' + F + '/>' +
      '<ellipse cx="42.2" cy="80.4" rx="2.3" ry="3"' + SK + '/><ellipse cx="77.8" cy="80.4" rx="2.3" ry="3"' + SK + '/>' +
      '<path d="M45.4 76.6L48.2 149h8.2l3-58h1.2l3 58h8.2l2.8-72.4"' + FD + '/>' +
      '<path d="M52.4 92v54M67.6 92v54"' + THIN + '/>' +
      '<path d="M48 149l-2.4 4.6h11.2l-.4-4.6M63.6 149l-.4 4.6h11.2L72 149"' + FD + '/>',
    suitTie:
      '<ellipse cx="60" cy="14" rx="5.6" ry="7"' + SK + '/>' +
      '<path d="M54.4 13q0-9 5.8-9 5.6 0 5.6 8.6-1.4-4-5.6-4.4-4.4.6-5.8 4.8z"' + FD + '/>' +
      '<path d="M57.6 20.5v4.2M62.4 20.5v4.2"/>' +
      '<path d="M44 29.5Q60 24 76 29.5l2.6 46q-7.6 3.4-15 .8L60 58l-3.6 18.3q-7.4 2.6-15-.8z"' + F + '/>' +
      '<path d="M55.4 24.8L60 40l4.6-15.2z" fill="currentColor" fill-opacity=".22"/>' +
      '<path d="M55.4 24.8l1.2 6.2 3.4-2M64.6 24.8l-1.2 6.2-3.4-2"' + THIN + '/>' +
      '<path d="M55.4 24.8l-4.6 14.8 7 8.2L60 58M64.6 24.8l4.6 14.8-7 8.2L60 58"/>' +
      '<circle cx="60" cy="64" r="1.1" fill="currentColor"/>' +
      '<path d="M44 29.5q-5.2 22-3.8 47l5.2-.2q.8-21 3.8-35.6M76 29.5q5.2 22 3.8 47l-5.2-.2q-.8-21-3.8-35.6"' + F + '/>' +
      '<path d="M41 72.4h5M74 72.4h5"' + G + ' stroke-width=".6"/>' +
      '<ellipse cx="42.8" cy="79.6" rx="2.3" ry="3"' + SK + '/><ellipse cx="77.2" cy="79.6" rx="2.3" ry="3"' + SK + '/>' +
      '<path d="M45.6 75.8l3.6 73.2h8l2.6-56h.4l2.6 56h8l3.6-73.2"' + FD + '/>' +
      '<path d="M53.2 94v52M66.8 94v52"' + THIN + '/>' +
      '<path d="M49 149l-2.6 4.6h11L57.2 149M62.8 149l-.2 4.6h11L71 149"' + FD + '/>',
    dressFlow:
      '<ellipse cx="60" cy="13" rx="5.2" ry="6.6"' + SK + '/>' +
      '<path d="M54.6 13.4q-1.4-9.6 5.6-9.8 7.4.2 5.4 10.6 2 7.6 4.8 11.4-5.4-.8-6.6-8.8M54.6 13.4q-.6 6.4-3 10.6 3.6-1 4.6-5.4"' + FD + '/>' +
      '<path d="M58.2 19.4v6M61.8 19.4v6"/>' +
      '<path d="M50.4 28q9.6-3.4 19.2 0"' + THIN + '/>' +
      '<path d="M52.6 30.4q7.4 4.4 14.8 0l-1.6 21.4q-5.8 2.6-11.6 0z"' + F + '/>' +
      '<path d="M52.6 30.4l-1.2-3M67.4 30.4l1.2-3"/>' +
      '<path d="M54.2 51.8Q44 92 28 151q32 9 64 0-16-59-26.2-99.2"' + F + '/>' +
      '<path d="M54.2 51.8q6 3 11.6 0"' + G + ' fill="none" stroke-width="1.2"/>' +
      '<path d="M57.4 56Q51 100 41 153M62.6 56q4.6 44 14.4 97M60 55.4v99M55 58q-9 46-20 93M65 58q9 46 22 93"' + THIN + '/>' +
      '<path d="M28 151q8 3.8 16 1.4 8 3 16 .4 8 2.6 16 0 8 3 16-1.8"' + THIN + '/>' +
      '<path d="M50.4 28q-4.4 12-3.6 26 .4 8 4.8 10.6M69.6 28q4.4 12 3.6 26-.4 8-4.8 10.6"' + SK + '/>',
    dressColumn:
      '<ellipse cx="60" cy="13" rx="5.2" ry="6.6"' + SK + '/>' +
      '<path d="M54.8 11.8q.4-8.4 5.4-8.4 5.2 0 5.4 8.4-2.6-3-5.4-3t-5.4 3z"' + FD + '/><circle cx="60" cy="4" r="2.6"' + FD + '/>' +
      '<path d="M58.2 19.4v6M61.8 19.4v6"/>' +
      '<path d="M51 28.4q9-3 18 0"' + THIN + '/>' +
      '<path d="M53 30.6L67.8 27q-1.6 15-.6 30.4 3.2 46 1.4 93.6H52.6q-2-47.6 1.2-93.6 1-14-.8-26.8z"' + F + '/>' +
      '<path d="M53 30.6L67.8 27"' + G + ' fill="none" stroke-width="1"/>' +
      '<path d="M54.2 57.4q5.8 2 11.6 0"' + THIN + '/>' +
      '<path d="M63.6 108l1.6 43"/>' +
      '<path d="M56 62q-1.6 44 0 88M61 60q1 40 0 50"' + THIN + '/>' +
      '<path d="M51 28.4q-3.6 13-2.8 27.6.4 6 3.4 8.8M69 28.4q3.6 13 2.8 27.6-.4 6-3.4 8.8"' + SK + '/>' +
      '<path d="M48.4 52.4l3.4.4M71.6 52.4l-3.4.4"' + G + ' stroke-width=".8"/>' +
      '<path d="M57.8 151l-1.4 4h6.4l-.8-4"' + FD + '/>',
    heel:
      '<ellipse cx="58" cy="138.6" rx="44" ry="3" fill="currentColor" fill-opacity=".07" stroke="none"/>' +
      '<path d="M14 124q0-10 12-13 12-3 20-3 24-10 46-34 6-8 11-6 3 12-2 24l-2 0q-19 10-41 26-14 10-34 10-10 0-10-4z"' + F + '/>' +
      '<path d="M46 108q26-6 51-28 3-3 4-6.4"' + THIN + '/>' +
      '<path d="M46 108q24-5 50-27 4-3 6-7l-1 18q-20 10-42 24z" fill="currentColor" fill-opacity=".14" stroke="none"/>' +
      '<path d="M97.6 93l-2.2 44h-4.2l-1.2-38.4"' + F + '/>' +
      '<path d="M95.4 137h-4.2"' + G + ' stroke-width="1.4"/>' +
      '<path d="M18 121q9-3 20-2.4"' + THIN + '/>',
    accessories:
      '<path d="M22 96h76a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6v-28a6 6 0 0 1 6-6z"' + F + '/>' +
      '<path d="M16 104q44 20 88 0"' + THIN + '/>' +
      '<rect x="55" y="110" width="10" height="6" rx="1.5"' + G + ' stroke-width=".6"/>' +
      '<path d="M22 96q4-14 38-14t38 14"' + THIN + ' fill="none"/>' +
      '<circle cx="30" cy="22" r="2.6"' + G + ' stroke-width=".5"/><path d="M30 24.6v10"/><path d="M30 34.6l-5 10.4a5 5 0 0 0 10 0z"' + F + '/><circle cx="30" cy="45" r="1.6"' + G + ' stroke-width=".4"/>' +
      '<circle cx="48" cy="22" r="2.6"' + G + ' stroke-width=".5"/><path d="M48 24.6v10"/><path d="M48 34.6l-5 10.4a5 5 0 0 0 10 0z"' + F + '/><circle cx="48" cy="45" r="1.6"' + G + ' stroke-width=".4"/>' +
      '<path d="M76 20v10M76 54v10"' + ' stroke-width="5" stroke-opacity=".25"/>' +
      '<circle cx="76" cy="42" r="11"' + F + '/><circle cx="76" cy="42" r="8.4"' + THIN + '/>' +
      '<path d="M76 42v-5.4M76 42l3.8 2.4"' + ' stroke="#e3c27c"/>' +
      '<rect x="92" y="34" width="8" height="8" rx="1.4"' + G + ' stroke-width=".5"/><rect x="92" y="48" width="8" height="8" rx="1.4"' + G + ' stroke-width=".5"/>',
  };
  function artSVG(key, label) {
    return '<svg viewBox="0 0 120 160" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="' + esc(label) + '">' + (ART[key] || '') + '</svg>';
  }
  function moodVisual(item) {
    return item.image
      ? '<img src="' + esc(item.image) + '" alt="' + esc(item.title) + '" loading="lazy" decoding="async">'
      : artSVG(item.art, 'Ilustración provisional: ' + item.title);
  }

  var moodFilter = 'todo';
  function visibleMood() {
    return DATA.moodboard.filter(function (m) { return moodFilter === 'todo' || m.category === moodFilter; });
  }

  function renderMoodTabs() {
    var tabs = $('#mood-tabs');
    tabs.innerHTML = DATA.moodboardCategories.map(function (c) {
      var sel = c.id === moodFilter;
      return '<button class="mood__tab" type="button" role="tab" id="tab-' + c.id + '" aria-controls="mood-grid" aria-selected="' + sel + '" tabindex="' + (sel ? 0 : -1) + '" data-cat="' + c.id + '">' + esc(c.label) + '</button>';
    }).join('');
  }

  function renderMood() {
    var grid = $('#mood-grid');
    grid.setAttribute('role', 'tabpanel');
    grid.setAttribute('aria-labelledby', 'tab-' + moodFilter);
    grid.innerHTML = visibleMood().map(function (m, i) {
      return '<li class="mood__item"><button type="button" data-mood="' + esc(m.id) + '" aria-label="Ampliar referencia: ' + esc(m.title) + '">' +
        '<span class="mood__frame">' + moodVisual(m) +
        (m.image ? '' : '<span class="mood__tag mono">Ilustración provisional</span>') +
        '<span class="mood__zoom" aria-hidden="true"><svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor"><path d="M6 1H1v5M10 15h5v-5M1 1l5 5M15 15l-5-5"/></svg></span>' +
        '</span><span class="mood__caption"><strong>' + esc(m.title) + '</strong><span>' + esc(m.note) + '</span></span>' +
        '</button></li>';
    }).join('');
  }

  function onMoodTabs(e) {
    var tab = e.target.closest('[role="tab"]');
    if (!tab) return;
    moodFilter = tab.getAttribute('data-cat');
    renderMoodTabs(); renderMood();
    $('#tab-' + moodFilter).focus();
  }
  function onMoodTabsKey(e) {
    if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].indexOf(e.key) === -1) return;
    var cats = DATA.moodboardCategories.map(function (c) { return c.id; });
    var i = cats.indexOf(moodFilter);
    if (e.key === 'ArrowRight') i = (i + 1) % cats.length;
    if (e.key === 'ArrowLeft') i = (i - 1 + cats.length) % cats.length;
    if (e.key === 'Home') i = 0;
    if (e.key === 'End') i = cats.length - 1;
    e.preventDefault();
    moodFilter = cats[i];
    renderMoodTabs(); renderMood();
    $('#tab-' + moodFilter).focus();
  }

  function openMood(id) {
    var list = visibleMood();
    var index = list.map(function (m) { return m.id; }).indexOf(id);
    if (index < 0) return;
    var show = function (i) {
      var m = list[i];
      Modal.setContent(
        '<p class="eyebrow">Dress code · Referencia ' + (i + 1) + ' de ' + list.length + '</p>' +
        '<div class="modal__visual">' + moodVisual(m) + '</div>' +
        '<h3 class="modal__title" id="modal-title">' + esc(m.title) + '</h3>' +
        '<p class="modal__text">' + esc(m.note) + '</p>' +
        (m.image ? '' : '<p class="pending-note">Ilustración provisional. Se reemplazará por una fotografía de referencia.</p>') +
        (list.length > 1 ? '<div class="modal__nav"><button class="btn btn--ghost btn--small" type="button" data-step="-1">Anterior</button><button class="btn btn--ghost btn--small" type="button" data-step="1">Siguiente</button></div>' : '')
      );
      index = i;
    };
    Modal.open({
      onKey: function (e) {
        if (e.key === 'ArrowRight') show((index + 1) % list.length);
        if (e.key === 'ArrowLeft') show((index - 1 + list.length) % list.length);
      },
      onClick: function (e) {
        var step = e.target.closest('[data-step]');
        if (step) show((index + Number(step.getAttribute('data-step')) + list.length) % list.length);
      },
    });
    show(index);
  }

  function renderDressContext(inv) {
    var el = $('#dress-context');
    var text = inv.kind === 'modelPlusOne'
      ? 'El dress code aplica para ambos. Comparte estas referencias con tu acompañante.'
      : inv.kind === 'brand'
        ? 'Comparte el dress code con los representantes incluidos en tu invitación.'
        : '';
    el.textContent = text;
    el.hidden = !text;
  }

  /* ------------------------------------------------------------------ */
  /* Marcas, aliados y programa                                          */
  /* ------------------------------------------------------------------ */
  function brandName(b) { return b.name || 'Marca por anunciar'; }

  function renderBrands() {
    $('#brands-grid').innerHTML = DATA.brands.map(function (b) {
      var visual = b.image
        ? '<img src="' + esc(b.image) + '" alt="" loading="lazy" decoding="async">'
        : '<span class="brand__letter" aria-hidden="true">' + esc(b.slotLabel) + '</span>' +
          '<span class="brand__logo-slot mono">' + (b.logo ? '' : 'Logo pendiente') + '</span>';
      var meta = b.collection ? 'Colección ' + esc(b.collection) : 'Colección por confirmar';
      return '<li class="brand"><button type="button" data-brand="' + esc(b.id) + '" aria-haspopup="dialog">' +
        '<span class="brand__visual">' + visual + '</span>' +
        '<span class="brand__info">' +
        (b.placeholder ? '<span class="demo-tag" style="width:fit-content">Contenido provisional</span>' : '') +
        '<span class="brand__name">' + esc(brandName(b)) + '</span>' +
        '<span class="brand__meta">' + meta + '</span>' +
        '<span class="brand__more">Ver detalles</span>' +
        '</span></button></li>';
    }).join('');
  }

  function tbd(text) { return '<span class="tbd">' + esc(text) + '</span>'; }

  function openBrand(id) {
    var b = DATA.brands.filter(function (x) { return x.id === id; })[0];
    if (!b) return;
    var run = DATA.runway.filter(function (r) { return r.brandId === b.id; })[0];
    var order = run ? 'Pasarela ' + run.order + (run.time ? ' · ' + esc(run.time) : '') : tbd('Orden por confirmar');
    var ig = b.instagram
      ? '<a href="' + esc(b.instagram) + '" target="_blank" rel="noopener noreferrer">Ver en Instagram</a>'
      : tbd('Por confirmar');
    Modal.open({});
    Modal.setContent(
      (b.placeholder ? '<span class="demo-tag" style="width:fit-content">Contenido provisional</span>' : '<p class="eyebrow">Marca en pasarela</p>') +
      '<div class="modal__visual modal__visual--brand">' +
      (b.image ? '<img src="' + esc(b.image) + '" alt="" style="width:100%;height:100%;object-fit:cover">' : '<span class="brand__letter" aria-hidden="true">' + esc(b.slotLabel) + '</span>') +
      '</div>' +
      '<h3 class="modal__title" id="modal-title">' + esc(brandName(b)) + '</h3>' +
      '<p class="modal__text">' + (b.description ? esc(b.description) : tbd('La descripción de la marca y su colección se publicará cuando la organización la confirme.')) + '</p>' +
      '<dl class="modal__facts">' +
      '<div><dt>Colección</dt><dd>' + (b.collection ? esc(b.collection) : tbd('Por confirmar')) + '</dd></div>' +
      '<div><dt>Desfile</dt><dd>' + order + '</dd></div>' +
      '<div><dt>Instagram</dt><dd>' + ig + '</dd></div>' +
      '<div><dt>Logo</dt><dd>' + (b.logo ? '<img src="' + esc(b.logo) + '" alt="Logo de ' + esc(brandName(b)) + '" style="max-height:48px;width:auto">' : tbd('Pendiente')) + '</dd></div>' +
      '</dl>'
    );
  }

  function renderSponsors() {
    var section = $('#aliados');
    if (!DATA.sponsors || !DATA.sponsors.length) { section.hidden = true; return; }
    section.hidden = false;
    $('#sponsors-list').innerHTML = DATA.sponsors.map(function (s) {
      return '<li>' + (s.logo ? '<img src="' + esc(s.logo) + '" alt="' + esc(s.name) + '" style="max-height:56px;width:auto">' : esc(s.name)) + '</li>';
    }).join('');
  }

  function renderRunway() {
    var root = $('#runway-root');
    if (!DATA.runway.length) {
      root.innerHTML = '<p class="runway-empty"><span class="label">Programa</span> Pronto compartiremos el orden de las pasarelas.</p>';
      return;
    }
    var rows = DATA.runway.slice().sort(function (a, b) { return a.order - b.order; });
    root.innerHTML = '<p class="label">Programa de pasarelas</p><ol class="runway-list">' + rows.map(function (r) {
      var b = DATA.brands.filter(function (x) { return x.id === r.brandId; })[0] || {};
      return '<li><span class="mono">' + String(r.order).padStart(2, '0') + '</span>' +
        '<span class="runway-list__name">' + esc(brandName(b)) + '</span>' +
        '<span class="runway-list__time">' + (r.time ? esc(r.time) : '') + '</span></li>';
    }).join('') + '</ol>';
  }

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
  function renderPersonalTexts(inv) {
    $('#hero-greeting').textContent = 'Una invitación para ' + inv.displayName;
  }

  function whatsappUrl(inv) {
    var c = EVENT.contact;
    var who = inv ? (inv.kind === 'brand' ? inv.principal || inv.brandName : inv.displayName) : '';
    var msg = 'Hola Héctor' + (who ? ', soy ' + who : '') + '. Tengo una duda sobre mi invitación a ' + EVENT.title + '.';
    return 'https://wa.me/' + c.whatsappNumber + '?text=' + encodeURIComponent(msg);
  }

  function renderContact(inv) {
    var c = EVENT.contact;
    if (!c) { $('#contact').hidden = true; $('#fab-whatsapp').hidden = true; return; }
    $('#contact-name').textContent = c.name;
    $('#contact-role').textContent = c.role;
    $('#contact-phone').textContent = c.phoneLabel;
    var wa = whatsappUrl(inv);
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
    var REGIONS = ['#topbar', 'main', '.footer', '#demo', '#fab-whatsapp'];
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
  /* Panel "Solo demostración" — eliminar en producción                  */
  /* ------------------------------------------------------------------ */
  function setupDemo() {
    var toggle = $('#demo-toggle');
    var panel = $('#demo-panel');
    var setOpen = function (open) {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) { var checked = $('#demo-options input:checked'); if (checked) checked.focus(); }
    };
    $('#demo-options').innerHTML = InvitationService.list().map(function (inv, i) {
      return '<label class="demo__option"><input type="radio" name="demo-profile" id="demo-' + esc(inv.id) + '" value="' + esc(inv.id) + '"' + (inv.id === state.invId ? ' checked' : '') + '>' +
        '<span>' + (i + 1) + '. ' + esc(inv.demoLabel) + '</span></label>';
    }).join('');
    toggle.addEventListener('click', function () { setOpen(panel.hidden); });
    $('#demo-close').addEventListener('click', function () { setOpen(false); toggle.focus(); });
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setOpen(false); toggle.focus(); } });
    document.addEventListener('click', function (e) { if (!panel.hidden && !e.target.closest('#demo')) setOpen(false); });

    $('#demo-options').addEventListener('change', function (e) {
      if (e.target.name !== 'demo-profile') return;
      switchProfile(e.target.value);
      $('#demo-status').textContent = 'Mostrando: ' + current().demoLabel + '.';
    });
    $('#demo-reset').addEventListener('click', function () {
      Store.clearAll();
      state.editing = {}; state.editingName = {};
      Store.write('profile', state.invId);
      renderAll();
      $('#demo-status').textContent = 'Demostración restablecida: respuestas borradas en los tres ejemplos.';
      setOpen(false);
      showCover(true);
    });
  }

  function switchProfile(id) {
    state.invId = id;
    state.editing = {}; state.editingName = {};
    Store.write('profile', id);
    renderAll();
    if (!InvitationService.isOpened(id)) {
      // Cerrar el panel para que la portada quede despejada.
      $('#demo-panel').hidden = true;
      $('#demo-toggle').setAttribute('aria-expanded', 'false');
      showCover(true);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Render general                                                      */
  /* ------------------------------------------------------------------ */
  function renderAll() {
    var inv = current();
    renderCover(inv);
    renderPersonalTexts(inv);
    renderInvite(inv);
    renderDressContext(inv);
    renderContact(inv);
    $('#demo-current').textContent = inv.demoLabel;
    var radio = document.getElementById('demo-' + inv.id);
    if (radio) radio.checked = true;
  }

  function init() {
    bindFields();
    renderMoodTabs(); renderMood();
    renderBrands(); renderSponsors(); renderRunway(); setupCopyPhone();
    setupPlace();
    updateCountdown();
    setInterval(updateCountdown, 30000);
    setupNav();
    setupSpotlights();
    setupDemo();
    renderAll();

    $('#invite-root').addEventListener('click', onInviteClick);
    $('#invite-root').addEventListener('submit', onInviteSubmit);
    $('#mood-tabs').addEventListener('click', onMoodTabs);
    $('#mood-tabs').addEventListener('keydown', onMoodTabsKey);
    $('#mood-grid').addEventListener('click', function (e) {
      var b = e.target.closest('[data-mood]'); if (b) openMood(b.getAttribute('data-mood'));
    });
    $('#brands-grid').addEventListener('click', function (e) {
      var b = e.target.closest('[data-brand]'); if (b) openBrand(b.getAttribute('data-brand'));
    });
    $('#open-invitation').addEventListener('click', openInvitation);
    $('#replay-cover').addEventListener('click', function () { showCover(true); });

    if (InvitationService.isOpened(state.invId)) hideCover(); else showCover(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
