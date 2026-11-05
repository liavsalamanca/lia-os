/*
 * Roar Studio Choice Awards 2026 (clausura del año)
 * Datos editables del evento, las marcas y las invitaciones de demostración.
 *
 * Todo lo que diga `null` está pendiente y la interfaz lo muestra como
 * "por confirmar". Para completar un dato basta con reemplazar el `null`.
 *
 * PRODUCCIÓN: este archivo solo debe contener información pública
 * (evento, marcas, programa). Las invitaciones NO viajan al
 * navegador en bloque: cada enlace privado pide al servidor únicamente la
 * invitación de su identificador (ver `InvitationService` en app.js).
 */
window.ROAR_DATA = {
  event: {
    organization: 'Roar Studio',
    organizationDescription: 'Agencia y academia de modelos',
    title: 'Roar Studio Choice Awards 2026',
    subtitle: 'Clausura del año 2026',
    calendarTitle: 'Roar Studio Choice Awards 2026',

    // Fecha y hora confirmadas. Bogotá no tiene horario de verano (UTC−5).
    startISO: '2026-12-12T18:30:00-05:00',
    timeZone: 'America/Bogota',
    dateLabel: '12 de diciembre de 2026',
    weekdayLabel: 'Sábado',
    timeLabel: '6:30 p. m.',
    // No hay hora de finalización confirmada: se deja vacía a propósito.
    endISO: null,

    venue: {
      name: 'Las Palmas Park',
      address: 'Calle 44 #28-56',
      neighborhood: 'Sotomayor',
      city: 'Bucaramanga, Santander',
      mapsUrl:
        'https://www.google.com/maps/search/?api=1&query=Las%20Palmas%20Park%2C%20Calle%2044%20%2328-56%2C%20Bucaramanga%2C%20Santander',
      mapsQuery: 'Las Palmas Park, Calle 44 #28-56, Bucaramanga, Santander',
    },

    dressCode: {
      label: 'Black & White',
      description: 'Viste de negro, de blanco o combina ambos, con un estilo elegante.',
      colors: ['#000000', '#ffffff'],
      // Enlace a una guía pública independiente (sin datos de la invitación).
      publicGuideUrl: null,
    },

    food: {
      title: 'Antes de llegar',
      text: 'Te recomendamos comer antes del evento, ya que durante la celebración no habrá servicio de comida.',
    },

    // Pendientes
    // Contacto confirmado de la organización
    contact: {
      name: 'Héctor Carrillo',
      role: 'Director de Roar Studio',
      phoneLabel: '+57 316 536 8405',
      whatsappNumber: '573165368405', // formato internacional, sin + ni espacios
      instagramUrl: 'https://www.instagram.com/roarstudiohc/',
      instagramHandle: '@roarstudiohc',
    },
    rsvpDeadlineLabel: null, // '30 de noviembre de 2026'
    accessControl: null, // cómo será el ingreso (se definirá más adelante)
  },

  /*
   * Marcas que presentan colección. Las tres entradas son espacios
   * provisionales (`placeholder: true`); reemplázalas con los datos reales.
   */
  brands: [
    {
      id: 'marca-a',
      placeholder: true,
      slotLabel: 'A',
      name: null,
      logo: null,
      collection: null,
      image: null,
      description: null,
      instagram: null,
      runwayOrder: null,
      runwayTime: null,
    },
    {
      id: 'marca-b',
      placeholder: true,
      slotLabel: 'B',
      name: null,
      logo: null,
      collection: null,
      image: null,
      description: null,
      instagram: null,
      runwayOrder: null,
      runwayTime: null,
    },
    {
      id: 'marca-c',
      placeholder: true,
      slotLabel: 'C',
      name: null,
      logo: null,
      collection: null,
      image: null,
      description: null,
      instagram: null,
      runwayOrder: null,
      runwayTime: null,
    },
  ],

  /*
   * Programa de pasarelas. Vacío = "Pronto compartiremos el orden".
   * Formato: [{ order: 1, brandId: 'marca-a', time: '7:00 p. m.' }]
   * (`time` es opcional; si no está confirmado, se omite).
   */
  runway: [],

  /* Patrocinadores y aliados. Vacío = la sección no se muestra. */
  sponsors: [],


};
