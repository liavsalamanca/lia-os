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
  var PAGE_REGIONS = ['#topbar', 'main', '.footer'];
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
    cover.classList.add('is-opening');
    setTimeout(done, 1250);
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
      right = '<div class="invite__panel" style="display:grid;gap:20px">' + tallyHTML(inv) +
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
  var ART = {
    suit: '<path d="M38 30l14-8 8 12 8-12 14 8 6 92-24 4-4-54-4 54-24-4z"/><path d="M52 22l3 34 5 14M68 22l-3 34-5 14"/><path d="M54 26l6 12 6-12"/><circle cx="60" cy="88" r="1.6"/><circle cx="60" cy="100" r="1.6"/><path d="M38 30l-10 82 9 2M82 30l10 82-9 2"/><path d="M42 96h10M70 70h8"/>',
    suitTie: '<path d="M38 30l14-8 8 12 8-12 14 8 6 92-24 4-4-54-4 54-24-4z"/><path d="M52 22l3 34 5 14M68 22l-3 34-5 14"/><path d="M54 26l6 12 6-12"/><path d="M58 38h4l2 26-4 8-4-8z"/><circle cx="60" cy="92" r="1.6"/><path d="M38 30l-10 82 9 2M82 30l10 82-9 2"/>',
    dressFlow: '<path d="M50 18l-2 22M70 18l2 22"/><path d="M48 40q12 7 24 0l-2 24q-10 4-20 0z"/><path d="M50 64q-14 40-26 84 36 10 72 0-12-44-26-84"/><path d="M56 70q-6 40-10 80M64 70q6 40 12 80M60 68v82"/>',
    dressColumn: '<path d="M47 22q13 9 26 0l-2 38 5 88H44l5-88z"/><path d="M48 60h24"/><path d="M66 104v44"/><path d="M52 22v-6M68 22v-6"/>',
    heel: '<path d="M18 112q22-2 42-14t32-28l8 2q4 8 0 20l-4 46h-6l-2-36q-18 12-48 24H18z"/><path d="M60 98q8 6 6 16"/><path d="M18 112v12"/>',
    accessories: '<circle cx="36" cy="34" r="4"/><path d="M36 38v14"/><path d="M36 52l-6 10h12z"/><circle cx="84" cy="34" r="4"/><path d="M84 38v14"/><path d="M84 52l-6 10h12z"/><path d="M28 94h64v40H28z"/><path d="M28 94l32 22 32-22"/><circle cx="60" cy="112" r="2.4"/>',
  };
  function artSVG(key, label) {
    return '<svg viewBox="0 0 120 160" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="' + esc(label) + '">' + (ART[key] || '') + '</svg>';
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
      root.innerHTML = '<div class="runway-empty">' +
        '<div><p class="runway-empty__text">Pronto compartiremos el orden de las pasarelas.</p>' +
        '<p class="runway-empty__sub">Aquí verás qué marca desfila primero en cuanto el programa esté confirmado.</p></div>' +
        '<ol class="runway-ghost" aria-hidden="true">' +
        DATA.brands.map(function () { return '<li><span class="mono">—</span><span class="bar"></span></li>'; }).join('') +
        '</ol></div>';
      return;
    }
    var rows = DATA.runway.slice().sort(function (a, b) { return a.order - b.order; });
    root.innerHTML = '<ol class="runway-list">' + rows.map(function (r) {
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

  function updateCountdown() {
    var el = $('#countdown-value');
    var diff = new Date(EVENT.startISO).getTime() - Date.now();
    if (diff <= 0) {
      el.textContent = 'La celebración comenzó el 12 de diciembre a las ' + EVENT.timeLabel + '.';
      $('#countdown .label').textContent = 'Choice Awards 2026';
      return;
    }
    var mins = Math.floor(diff / 60000);
    var d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
    var parts = [];
    if (d) parts.push(plural(d, 'día', 'días'));
    if (h || d) parts.push(plural(h, 'hora', 'horas'));
    parts.push(plural(m, 'minuto', 'minutos'));
    el.textContent = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' y ' + parts[parts.length - 1] : parts[0];
  }

  /* ------------------------------------------------------------------ */
  /* Resumen y textos dependientes de la invitación                      */
  /* ------------------------------------------------------------------ */
  function accessSentence(inv) {
    if (inv.kind === 'model') return 'Tu invitación incluye 1 acceso personal.';
    if (inv.kind === 'modelPlusOne') return 'Tu invitación incluye 2 accesos: el tuyo y el de tu acompañante registrado.';
    return 'La invitación de ' + inv.brandName + ' incluye ' + plural(inv.seats, 'acceso', 'accesos') + ' para sus representantes.';
  }

  function renderSummary(inv) {
    var c = counts(inv);
    $('#summary-root').innerHTML =
      '<article class="pass" aria-label="Resumen de la invitación">' +
      '<div class="pass__top"><img src="assets/roar-choice-awards-2026.png" alt="Roar Studio Choice Awards 2026" width="914" height="566"><span class="mono">Choice Awards 2026<br>' + esc(KIND_LABEL[inv.kind]) + '</span></div>' +
      '<div class="pass__body">' +
      '<p class="pass__name">' + esc(inv.displayName) + '</p>' +
      '<dl class="pass__grid">' +
      '<div><dt>Fecha</dt><dd>Sáb. 12 dic. 2026</dd></div>' +
      '<div><dt>Hora</dt><dd>' + esc(EVENT.timeLabel) + '</dd></div>' +
      '<div><dt>Lugar</dt><dd>' + esc(EVENT.venue.name) + '</dd></div>' +
      '<div><dt>Accesos autorizados</dt><dd>' + inv.seats + '</dd></div>' +
      '<div><dt>Confirmaron</dt><dd>' + c.confirmed + ' de ' + inv.seats + '</dd></div>' +
      '<div><dt>No asistirán</dt><dd>' + c.declined + '</dd></div>' +
      '</dl>' +
      '<div><p class="label" style="margin-bottom:8px">Personas incluidas</p><ul class="pass__people">' +
      inv.slots.map(function (s) {
        return '<li><span>' + (s.name ? esc(s.name) : '<span class="tbd">Nombre pendiente</span>') + ' <span class="seat__role">· ' + esc(s.role) + '</span></span>' + statusPill(s.status) + '</li>';
      }).join('') + '</ul></div>' +
      '</div>' +
      '<p class="pass__foot">Este resumen no es una entrada. La organización informará más adelante cómo será el ingreso.</p>' +
      '</article>';
  }

  function renderPersonalTexts(inv) {
    $('#hero-greeting').textContent = 'Una invitación para ' + inv.displayName;
    $('#details-access').textContent = accessSentence(inv) + ' Los accesos corresponden únicamente a las personas incluidas en ella.';
  }

  function renderContact() {
    var c = EVENT.contact;
    if (!c) return;
    $('#faq-contact').innerHTML = 'Escríbenos: ' + esc(c.label || '') + (c.phone ? ' <span>' + esc(c.phone) + '</span>' : '');
  }

  /* ------------------------------------------------------------------ */
  /* Modal accesible                                                     */
  /* ------------------------------------------------------------------ */
  var Modal = (function () {
    var root, dialog, body, lastFocus, handlers = {};
    var REGIONS = ['#topbar', 'main', '.footer', '#demo'];
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
    renderSummary(inv);
    $('#demo-current').textContent = inv.demoLabel;
    var radio = document.getElementById('demo-' + inv.id);
    if (radio) radio.checked = true;
  }

  function init() {
    bindFields();
    renderMoodTabs(); renderMood();
    renderBrands(); renderSponsors(); renderRunway(); renderContact();
    setupPlace();
    updateCountdown();
    setInterval(updateCountdown, 30000);
    setupNav();
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
