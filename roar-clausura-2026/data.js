/*
 * Roar Studio Choice Awards 2026 (clausura del año)
 * Datos editables del evento, las marcas y las invitaciones de demostración.
 *
 * Todo lo que diga `null` está pendiente y la interfaz lo muestra como
 * "por confirmar". Para completar un dato basta con reemplazar el `null`.
 *
 * PRODUCCIÓN: este archivo solo debe contener información pública
 * (evento, marcas, programa, moodboard). Las invitaciones NO viajan al
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
      label: 'Elegante',
      men: 'Traje',
      women: 'Vestido y tacones',
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

  /*
   * Moodboard del dress code. `image: null` muestra una ilustración
   * provisional. Para usar fotografías propias: image: 'assets/mood/traje-1.jpg'.
   */
  moodboard: [
    { id: 'traje-1', category: 'trajes', title: 'Traje de dos piezas', note: 'Una silueta limpia y bien ajustada.', art: 'suit', image: null },
    { id: 'traje-2', category: 'trajes', title: 'Traje con corbata o sin ella', note: 'El traje marca el código; los detalles son tuyos.', art: 'suitTie', image: null },
    { id: 'vestido-1', category: 'vestidos', title: 'Vestido de líneas fluidas', note: 'Movimiento y comodidad para toda la noche.', art: 'dressFlow', image: null },
    { id: 'vestido-2', category: 'vestidos', title: 'Vestido de corte estructurado', note: 'El largo y el color los eliges tú.', art: 'dressColumn', image: null },
    { id: 'tacon-1', category: 'accesorios', title: 'Tacones', note: 'El estilo y la altura que te resulten cómodos.', art: 'heel', image: null },
    { id: 'accesorio-1', category: 'accesorios', title: 'Accesorios', note: 'Piezas que acompañen el look sin competir con él.', art: 'accessories', image: null },
  ],

  moodboardCategories: [
    { id: 'todo', label: 'Todo' },
    { id: 'trajes', label: 'Trajes' },
    { id: 'vestidos', label: 'Vestidos' },
    { id: 'accesorios', label: 'Tacones y accesorios' },
  ],

  /*
   * SOLO DEMOSTRACIÓN. Tres invitaciones ficticias para revisar el diseño.
   * En producción, cada invitación vive en el servidor y se consulta con un
   * identificador privado no predecible (ej. /i/8f3c…); nunca se envían
   * todas al navegador.
   *
   * `seats` es el número de accesos autorizados por la organización.
   * `people` nunca puede superar `seats`. Un lugar sin nombre (name: null)
   * puede completarse, pero escribir un nombre no crea accesos nuevos.
   */
  demoInvitations: [
    {
      id: 'demo-individual',
      demoLabel: 'Modelo · invitación individual',
      kind: 'model',
      greetingName: 'Valentina',
      displayName: 'Valentina Ríos',
      seats: 1,
      people: [{ id: 'p1', name: 'Valentina Ríos', role: 'Modelo', nameEditable: false }],
    },
    {
      id: 'demo-acompanante',
      demoLabel: 'Modelo con acompañante autorizado',
      kind: 'modelPlusOne',
      greetingName: 'Samuel',
      displayName: 'Samuel Ortega',
      seats: 2,
      people: [
        { id: 'p1', name: 'Samuel Ortega', role: 'Modelo', nameEditable: false },
        // Nombre pendiente: se puede completar dentro del cupo ya asignado.
        { id: 'p2', name: null, role: 'Acompañante', nameEditable: true },
      ],
    },
    {
      id: 'demo-marca',
      demoLabel: 'Representantes de marca invitada',
      kind: 'brand',
      brandName: 'Atelier Ejemplo',
      greetingName: 'Atelier Ejemplo',
      displayName: 'Atelier Ejemplo',
      principal: 'Daniela Pardo',
      seats: 2,
      people: [
        { id: 'p1', name: 'Daniela Pardo', role: 'Representante principal', nameEditable: false },
        { id: 'p2', name: 'Andrés Mejía', role: 'Representante', nameEditable: false },
      ],
    },
  ],
};
