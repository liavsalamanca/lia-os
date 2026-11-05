# MASTER PLAN — LIA OS

> Documento principal de referencia del producto. Es la visión completa: todas las funcionalidades y módulos descritos aquí se conservan, aunque se implementen de forma progresiva.
> Los datos personales de identificación se retiraron de este documento porque el repositorio es público.
> El estado real del desarrollo, por fases y con tareas verificables, está en [docs/ROADMAP.md](docs/ROADMAP.md). Que algo aparezca aquí no significa que ya exista.

---

# MASTER PROMPT — LIA OS

Build My Personal Operating System

Actúa como un equipo de desarrollo de software de clase mundial compuesto por:

* Senior Full-Stack Software Engineer
* Product Manager
* UI/UX Designer especializado en productos premium
* Database Architect
* Cybersecurity Engineer
* QA Automation Engineer
* PWA Developer
* Especialista en productividad y automatización

Tu misión es DISEÑAR, PROGRAMAR, PROBAR Y PREPARAR PARA PRODUCCIÓN una aplicación web completa llamada LIA OS — Your Life, Your System.

No quiero solamente un prototipo visual, un dashboard de demostración ni una aplicación con botones decorativos.

Quiero un producto real, funcional, escalable, cuidadosamente diseñado y adaptado a mi vida.

## 1. CONTEXTO DEL PROYECTO

Ya tengo una primera versión de LIA OS desarrollada en HTML, CSS y JavaScript.

Mi proyecto utiliza GitHub y se publica mediante GitHub Pages.

Antes de modificar nada:

1. Inspecciona todos los archivos del repositorio.
2. Lee `README.md` y `PROMPT_CLAUDE.md`.
3. Revisa `index.html`, `assets/app.js`, `assets/styles.css`, `sw.js` y `manifest.webmanifest`, si están presentes.
4. Identifica funcionalidades existentes y cómo se guardan los datos.
5. Conserva lo que funciona.
6. Diseña una arquitectura mejorada y migra el proyecto cuando sea necesario.
7. Mantén compatibilidad con GitHub Pages.
8. Protege y permite migrar los datos existentes.

No quiero que elimines funcionalidades para simplificar el desarrollo.

## 2. MI PERFIL Y MIS NECESIDADES

Soy estudiante de diseño de moda, modelo, creadora de contenido, social media manager y emprendedora.

Tengo múltiples actividades y necesito un único sistema que me ayude a organizar mi vida.

Mis principales áreas son:

### Vida personal

* Organización diaria y semanal.
* Productividad y hábitos.
* Finanzas personales.
* Metas y objetivos.
* Rutinas de autocuidado.
* Bienestar y ejercicio.
* Diario y reflexiones.
* Compras y wishlist.

### Vida profesional

* Social Media Manager de Taikinsa, un restaurante.
* Gestión de contenido para redes sociales.
* Fotografía, video y edición.
* Proyectos freelance.
* Gestión de clientes y entregables.

### Emprendimientos

* Mariè: marca de accesorios rodinados.
* Dans Lia Vie: marca de accesorios en oro laminado.
* Negocio de encargos de productos desde Estados Unidos a Colombia.
* Ventas personales y closet sale.

### Carrera creativa

* Modelaje y castings.
* Portafolio fotográfico.
* Diseño de moda.
* Colecciones, moodboards y fichas técnicas.
* Proyectos editoriales.
* Investigación universitaria.

La aplicación debe ser modular, personalizable y permitir añadir nuevas áreas sin reconstruir todo.

## 3. EXPERIENCIA Y DISEÑO VISUAL

La estética es extremadamente importante.

Quiero un producto con identidad visual sofisticada, inspirado en la elegancia editorial de las revistas de moda y la claridad de las mejores aplicaciones de productividad.

### Identidad visual

* Nombre: LIA OS.
* Concepto: Your Life, Your System.
* Estética: editorial minimalism, quiet luxury, refined productivity.
* Color principal: vinotinto profundo.
* Colores secundarios: marfil, crema, blanco cálido y rose gold muy discreto.
* Tipografía serif elegante para titulares.
* Tipografía sans-serif moderna para información e interfaces.
* Mucho espacio negativo.
* Bordes delicados.
* Animaciones fluidas y sutiles.
* Iconografía consistente.
* Gráficos profesionales.
* Componentes con excelente jerarquía visual.

No quiero un dashboard genérico lleno de tarjetas coloridas.

Quiero una experiencia que parezca diseñada por un estudio profesional de producto digital.

### Experiencia de usuario

* Mobile-first.
* Responsive para iPhone, iPad, laptop y escritorio.
* Dark mode y light mode.
* Sidebar en escritorio.
* Navegación inferior o menú adaptativo en móvil.
* Búsqueda global.
* Command palette.
* Acciones rápidas.
* Formularios inteligentes.
* Drag and drop donde aporte valor.
* Feedback visual de acciones.
* Estados vacíos elegantes.
* Accesibilidad mediante teclado.
* Navegación clara.
* Posibilidad de personalizar el dashboard.

## 4. ARQUITECTURA TÉCNICA

Evalúa el repositorio existente y prepara una arquitectura mantenible.

Stack recomendado, sujeto a tu evaluación técnica:

### Frontend

* React.
* TypeScript.
* Vite.
* Tailwind CSS.
* Componentes accesibles y reutilizables.
* Lucide Icons.
* Recharts para visualizaciones.
* React Hook Form y Zod para formularios y validaciones.

### Backend y persistencia

* Supabase.
* PostgreSQL.
* Supabase Auth.
* Supabase Storage para archivos privados.
* Row Level Security (RLS).
* Migraciones SQL versionadas.

### Publicación

* GitHub como repositorio.
* GitHub Pages para frontend.
* GitHub Actions para build y deployment.
* Configuración de rutas compatible con `/lia-os/`.
* PWA instalable.

Si existe una alternativa más adecuada, justifica brevemente por qué.

La aplicación debe mantener un modo local funcional cuando la base de datos todavía no esté configurada.

Nunca destruyas registros locales existentes.

Implementa una migración voluntaria e idempotente hacia la nube.

## 5. MÓDULOS COMPLETOS

### MODULE 01 — HOME / LIFE DASHBOARD

Crear una página principal que sea mi centro de operaciones.

Debe mostrar:

* Saludo personalizado.
* Fecha y hora de Colombia.
* Resumen del día.
* Próximos compromisos.
* Tres prioridades principales.
* Tareas vencidas.
* Hábitos del día.
* Progreso semanal.
* Proyectos activos.
* Eventos próximos.
* Resumen financiero configurable.
* Metas en progreso.
* Accesos rápidos.
* Mensaje motivacional opcional.

Permitir configurar qué widgets aparecen y en qué orden.

### MODULE 02 — TASKS & PROJECT MANAGEMENT

Sistema avanzado de productividad.

Funciones:

* Crear, editar, eliminar y completar tareas.
* Subtareas.
* Prioridades.
* Etiquetas.
* Fechas límite.
* Recordatorios.
* Tareas recurrentes.
* Categorías.
* Archivos adjuntos.
* Notas.
* Dependencias entre tareas cuando sea útil.
* Proyectos con hitos.
* Porcentajes de avance.
* Kanban board.
* Vista de lista.
* Vista calendario.
* Vista por prioridad.
* Filtros avanzados.
* Búsqueda.

Crear vistas inteligentes:

* Today.
* Tomorrow.
* This Week.
* Upcoming.
* Overdue.
* Someday.

### MODULE 03 — CALENDAR & TIME MANAGEMENT

Crear:

* Calendario mensual.
* Vista semanal.
* Vista diaria.
* Time blocking.
* Eventos.
* Sesiones de estudio.
* Citas.
* Reuniones.
* Fechas de entrega.
* Eventos personales.
* Recordatorios.

Preparar una integración opcional con Google Calendar mediante OAuth seguro y consentimiento explícito.

No afirmar que existe sincronización antes de implementarla.

### MODULE 04 — FOCUS & PRODUCTIVITY

Crear un espacio libre de distracciones.

Incluir:

* Pomodoro personalizable.
* Temporizador de concentración.
* Registro de sesiones.
* Estadísticas de productividad.
* Historial.
* Música o sonidos ambientales originales u obtenidos mediante recursos con licencia.
* Modo minimalista de concentración.
* Planificación semanal.
* Revisión semanal.

### MODULE 05 — PERSONAL FINANCES

Crear un sistema financiero para manejar diferentes fuentes de ingresos.

Funciones:

* Ingresos.
* Gastos.
* Categorías.
* Presupuestos.
* Transferencias.
* Cuentas.
* Métodos de pago.
* Gastos recurrentes.
* Suscripciones.
* Metas de ahorro.
* Flujo de caja.
* Reportes.
* Comparaciones mensuales.
* Gráficos.

Soportar COP y USD.

Separar claramente las finanzas personales de las de cada negocio.

No conectar cuentas bancarias sin autorización y mecanismos de integración seguros.

### MODULE 06 — USA ORDERS MANAGER

Crear un sistema completo para mi negocio de encargos desde Estados Unidos.

Funciones:

* Clientes.
* Catálogo de productos.
* Links de productos.
* Tallas.
* Colores.
* Cantidades.
* Proveedores.
* Precios originales.
* Descuentos.
* Costo de envío dentro de USA.
* Peso en libras.
* Consolidación de paquetes.
* Costos de casillero.
* Impuestos aplicables.
* Tasa USD/COP.
* Márgenes de ganancia.
* Cotizaciones.
* Pedidos confirmados.
* Anticipos.
* Saldos pendientes.
* Estados de pedidos.
* Fechas estimadas.
* Entregas.
* Historial de compras.

Valores iniciales configurables:

* Casillero: USD 5 por libra.
* Peso fraccionario calculado proporcionalmente.
* Umbral de USD 200 como referencia de la estrategia actual.
* IVA estimado configurable, con advertencia de que las reglas tributarias dependen del pedido y normativa vigente.

Crear:

* Calculadora automática.
* Cotizaciones exportables a PDF.
* Mensajes preparados para WhatsApp.
* Panel de ganancias.
* Reportes de clientes.
* Alertas de pagos pendientes.

Los cálculos deben tener pruebas automatizadas.

### MODULE 07 — TAIKINSA STUDIO

Crear una aplicación profesional de social media management.

Marca: Restaurante Taikinsa.

Incluir:

* Calendario editorial.
* Banco de ideas.
* Publicaciones.
* Reels.
* Historias.
* Campañas.
* Biblioteca de contenido.
* Shot lists.
* Guiones.
* Copies.
* Hashtags.
* Pipeline de producción.
* Estados de aprobación.
* Métricas.
* Reportes mensuales.
* Comparaciones de rendimiento.
* Checklist de grabación.
* Biblioteca de referencias.
* Registro de colaboraciones.

La comunicación de Taikinsa es elegante, profesional y sin emojis.

Crear generadores de plantillas para reportes y presentaciones.

No simular integraciones con Instagram ni programación automática de publicaciones. Estas requieren APIs y permisos reales.

### MODULE 08 — JEWELRY BUSINESS MANAGER

Gestionar dos marcas independientes:

* Mariè.
* Dans Lia Vie.

Cada marca tendrá:

* Inventario.
* SKU.
* Referencias.
* Colecciones.
* Proveedores.
* Costos.
* Precios.
* Márgenes.
* Stock.
* Ventas.
* Clientes.
* Pedidos.
* Garantías.
* Gastos.
* Reportes.
* Objetivos comerciales.

Permitir comparar la rentabilidad por producto y colección.

### MODULE 09 — MODELING CAREER

Un espacio para administrar mi carrera como modelo.

Funciones:

* Perfil profesional.
* Medidas editables.
* Fotografías.
* Comp cards.
* Enlace público del portafolio.
* Agencias.
* Castings.
* Audiciones.
* Sesiones fotográficas.
* Contactos.
* Colaboraciones.
* Tarifas.
* Contratos.
* Pagos.
* Portafolio de trabajos.

Permitir generar una comp card descargable y una página pública separada de la información privada.

### MODULE 10 — FASHION ATELIER

Crear un estudio digital de diseño de moda.

Funciones:

* Colecciones.
* Moodboards.
* Paletas de color.
* Tejidos.
* Materiales.
* Bocetos.
* Fichas técnicas.
* Costos de producción.
* Proveedores.
* Cronogramas.
* Lookbooks.
* Referencias.
* Proyectos editoriales.

Permitir registrar todas las etapas de una colección y exportar fichas.

### MODULE 11 — UNIVERSITY & RESEARCH

Espacio académico para:

* Materias.
* Proyectos.
* Entregas.
* Bibliografía.
* Investigación.
* Encuestas.
* Resultados.
* Documentos.
* Cronogramas.
* Fashion films.
* Seguimiento del trabajo de grado.

El proyecto académico principal estudia la influencia de Instagram en la identidad estética de jóvenes de 18 a 25 años de mi ciudad.

Incluir gestores de referencias y progreso de investigación.

### MODULE 12 — WELLNESS & ROUTINES

Crear:

* Habit tracker.
* Rutinas AM/PM.
* Skincare.
* Haircare.
* Ejercicio.
* Hidratación.
* Sueño.
* Energía.
* Registro general de bienestar.
* Checklists.
* Historial de hábitos.

No convertir registros personales en diagnósticos médicos.

Permitir crear y personalizar rutinas.

### MODULE 13 — IDEA VAULT

Crear un segundo cerebro creativo.

Funciones:

* Capturar ideas rápidamente.
* Guardar links.
* Añadir imágenes.
* Etiquetar.
* Organizar por proyecto.
* Añadir notas.
* Relacionar ideas.
* Favoritos.
* Buscador.

Permitir convertir una idea en proyecto o tarea.

### MODULE 14 — JOURNAL & PERSONAL GROWTH

Crear un diario digital privado.

Incluir:

* Entradas.
* Estados de ánimo.
* Gratitud.
* Reflexiones.
* Seguimiento de metas.
* Revisión mensual.
* Preguntas opcionales para journaling.
* Búsqueda por fecha.

Priorizar privacidad.

### MODULE 15 — GOALS & DREAMS

Crear un sistema de objetivos:

* Corto plazo.
* Mediano plazo.
* Largo plazo.
* Metas financieras.
* Metas profesionales.
* Metas personales.
* Wishlist.
* Vision board.
* Seguimiento de progreso.
* Hitos.

Permitir relacionar metas con proyectos y tareas.

### MODULE 16 — CLOSET SALE & PERSONAL INVENTORY

Crear:

* Catálogo de prendas y artículos.
* Fotografías.
* Tallas.
* Estado.
* Precios.
* Publicaciones pendientes.
* Canales de venta.
* Compradores.
* Pagos.
* Productos vendidos.
* Ganancias.

Añadir un generador de fichas de producto para Marketplace e Instagram.

### MODULE 17 — SETTINGS & DATA MANAGEMENT

Incluir:

* Perfil.
* Preferencias.
* Moneda.
* Zona horaria.
* Personalización de dashboard.
* Modo claro y oscuro.
* Exportación de datos.
* Importación.
* Respaldos.
* Gestión de archivos.
* Configuración de notificaciones.
* Configuración de integraciones.
* Cierre de sesión.
* Eliminación de cuenta y datos, con confirmación.

## 6. INTELIGENCIA Y AUTOMATIZACIONES

Preparar una arquitectura para funciones inteligentes.

Ejemplos:

* Convertir una idea en tareas.
* Detectar tareas vencidas.
* Resumir el avance semanal.
* Calcular ganancias.
* Generar cotizaciones.
* Generar reportes.
* Mostrar próximos compromisos.
* Identificar proyectos detenidos.
* Sugerir prioridades.

Los cálculos y reglas deterministas deben funcionar sin inteligencia artificial.

Las funciones que requieran APIs externas deben utilizar integraciones reales y seguras.

Nunca pongas claves secretas de servicios de IA en el navegador.

## 7. SEGURIDAD Y PRIVACIDAD

Esta aplicación contendrá información personal y financiera.

Es obligatorio:

* Autenticación real cuando se active la nube.
* RLS por usuario en Supabase.
* Permisos mínimos.
* Validación de entradas.
* Protección de archivos privados.
* Manejo seguro de sesiones.
* Protección contra XSS.
* No incluir credenciales en GitHub.
* No utilizar claves secretas o service_role en frontend.
* Copias de seguridad exportables.
* Migraciones reversibles cuando sea posible.
* Separación estricta entre páginas públicas y privadas.

Usar claves publishable de Supabase en frontend únicamente con controles de acceso correctamente configurados.

Nunca subir datos personales reales al repositorio como datos de demostración.

## 8. FUNCIONES UNIVERSALES

Todos los módulos que gestionen registros deben tener:

* CRUD real.
* Persistencia.
* Validaciones.
* Estados vacíos.
* Búsqueda.
* Filtros.
* Ordenamiento.
* Formularios responsive.
* Confirmación antes de acciones destructivas.
* Feedback de éxito/error.
* Manejo de errores de red.
* Estados de carga.
* Accesibilidad básica.
* Funciones de importación/exportación cuando correspondan.

No quiero botones sin funcionalidad.

## 9. METODOLOGÍA DE DESARROLLO

IMPORTANTE: no te limites a entregarme un plan.

Debes escribir y modificar código real en el repositorio.

Organiza el trabajo en fases:

### Fase 1 — Auditoría y arquitectura

Inspecciona el proyecto existente. Configura la arquitectura y conserva la funcionalidad actual.

### Fase 2 — Core de LIA OS

Construye autenticación, navegación, dashboard, tareas, proyectos, calendario y configuración.

### Fase 3 — Datos y sincronización

Implementa Supabase, migraciones, políticas RLS, almacenamiento, sincronización y respaldos.

### Fase 4 — Business Suite

Desarrolla Encargos USA, Taikinsa Studio, gestión de marcas y finanzas.

### Fase 5 — Creative Suite

Desarrolla modelaje, atelier, investigación e Idea Vault.

### Fase 6 — Personal Suite

Desarrolla wellness, diario, metas, hábitos y closet sale.

### Fase 7 — Automatización

Implementa funcionalidades avanzadas y las integraciones que sean técnicamente posibles.

### Fase 8 — QA y publicación

Ejecuta pruebas, corrige problemas, optimiza la app y configura GitHub Pages.

No intentes generar toda la aplicación en un único archivo gigantesco.

Trabaja mediante módulos y commits lógicos.

Al completar cada fase:

1. Ejecuta las pruebas disponibles.
2. Corrige errores.
3. Comprueba el build.
4. Documenta los cambios.
5. Continúa con la siguiente fase mientras tengas capacidad de ejecución.

Si una fase necesita mis credenciales, una cuenta externa o alguna aprobación, implementa todo lo que sea posible sin secretos y documenta exactamente qué configuración me corresponde realizar.

No inventes resultados de pruebas.

## 10. CONTROL DE CALIDAD

Implementa:

* TypeScript con tipado estricto, si se migra a TypeScript.
* Validaciones.
* Pruebas unitarias con Vitest o equivalente.
* Pruebas de integración.
* Pruebas end-to-end de los flujos críticos con Playwright o equivalente.
* Verificaciones de diseño responsive.
* Gestión de errores.
* Accesibilidad.
* Optimización de rendimiento.

Comprueba especialmente:

* Crear y editar tareas.
* Guardado y recuperación.
* Cálculos financieros.
* Cotizaciones.
* Gestión de inventario.
* Creación de proyectos.
* Inicio y cierre de sesión.
* Aislamiento de datos entre usuarios.
* Importación de datos anteriores.
* Funcionamiento en GitHub Pages.

## 11. PUBLICACIÓN EN GITHUB

El proyecto debe estar listo para mi repositorio de GitHub.

Configura:

* README profesional.
* Estructura de carpetas.
* `.gitignore`.
* `.env.example`.
* GitHub Actions.
* Build de producción.
* Publicación en GitHub Pages.
* Manifest PWA.
* Service worker correctamente versionado.
* Documentación de configuración de Supabase.
* Scripts para desarrollo y pruebas.

Si se utiliza Vite, configura correctamente la ruta base `/lia-os/` o hazla configurable.

Evita errores de rutas al actualizar la página.

No incluyas secretos en el repositorio ni en el build.

## 12. DEFINICIÓN DE TERMINADO

Considera cada módulo terminado únicamente cuando:

1. Todas sus pantallas principales existen.
2. Sus acciones funcionan.
3. Los datos se guardan y recuperan.
4. Los formularios validan.
5. Su diseño responde correctamente en móvil y escritorio.
6. Las funciones críticas están probadas.
7. Está integrado con la navegación general.
8. No rompe otros módulos.

Una interfaz con información de ejemplo no equivale a una funcionalidad terminada.

Si una función aún no está implementada, márcala como pendiente y no afirmes que funciona.

## 13. RESULTADO ESPERADO

Quiero que LIA OS se convierta en mi propio sistema operativo personal, una herramienta que pueda utilizar todos los días durante años.

Debe sentirse:

* Rápida.
* Inteligente.
* Personal.
* Elegante.
* Organizada.
* Profesional.
* Confiable.
* Escalable.

No sacrifiques la funcionalidad por el diseño, ni el diseño por la funcionalidad.

Ambas son fundamentales.

## INSTRUCCIÓN FINAL

Empieza inmediatamente inspeccionando el repositorio existente. Después, toma las decisiones arquitectónicas necesarias y comienza a implementar la Fase 1.

No respondas solamente con explicaciones o fragmentos de código. Trabaja directamente en los archivos del proyecto.

Continúa con las fases siguientes de forma incremental dentro de los límites de ejecución disponibles.

Al terminar cada sesión, entrega un resumen de funciones implementadas, pruebas realizadas, archivos modificados, funcionalidades pendientes y el siguiente paso exacto. No marques como terminado el proyecto completo mientras queden módulos pendientes.
