# Configurar la sincronización con Supabase

Sin estos pasos la app sigue funcionando en modo local.

## 1. Crear el proyecto

1. Crea una cuenta en [supabase.com](https://supabase.com).
2. Pulsa **New project**. Elige una región cercana, como São Paulo o Virginia.
3. Crea una contraseña de base de datos y guárdala en un lugar privado. La app no la necesita.

## 2. Crear las tablas

1. Abre **SQL Editor → New query**.
2. Pega todo el contenido de `supabase/migrations/20261101000000_records.sql`.
3. Pulsa **Run**. Debe indicar que no hubo errores.

4. Abre otra **New query**, pega `supabase/migrations/20261103000000_records_realtime.sql` y pulsa **Run**. Así los demás dispositivos se enteran de cada cambio al instante. Puedes ejecutarlo más de una vez.

Para revertirlo existe `supabase/rollback/20261101000000_records.down.sql`, pero borra todos los datos de la nube. `supabase/rollback/20261103000000_records_realtime.down.sql` solo apaga el aviso instantáneo.

## 3. Crear tu usuario y cerrar el registro

La app no tiene pantalla de registro. Solo entra quien exista en el proyecto.

1. Abre **Authentication → Users → Add user → Create new user**.
2. Escribe tu correo y una contraseña fuerte, y activa **Auto Confirm User**.
3. Abre la configuración de **Sign In / Providers** y desactiva **Allow new users to sign up**.

## 4. Preparar la recuperación de contraseña

El correo de Supabase trae un enlace que debe volver a tu web. No hace falta editar la plantilla ni configurar SMTP.

1. Abre **Authentication → URL Configuration**.
2. En **Site URL** escribe `https://liavsalamanca.github.io/lia-os/` y guarda.
3. En **Redirect URLs** añade `https://liavsalamanca.github.io/lia-os/`.

El enlace se abre en el navegador, no en la app instalada. Allí cambias la contraseña y después entras con ella en cualquier dispositivo.

El servicio de correo incluido en Supabase tiene un límite bajo de envíos por hora. Si no llega, espera un rato antes de pedir otro.

## 5. Conectar la app

Copia estos dos valores desde **Project Settings**:

- **URL del proyecto:** `https://xxxx.supabase.co`
- **Clave publishable:** `sb_publishable_...`

Nunca uses ni compartas la clave **secret** (`sb_secret_...`) ni la **service_role**: saltan todos los permisos.

En GitHub, abre **Settings → Secrets and variables → Actions → Variables** y crea:

| Nombre | Valor |
|---|---|
| `VITE_SUPABASE_URL` | La URL del proyecto |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | La clave publishable |

Son variables, no secretos: la clave publishable está pensada para ir en el navegador y los permisos los imponen las políticas de la base de datos.

Vuelve a publicar desde **Actions → Deploy → Run workflow**.

## 6. Conectar cada dispositivo

1. **Exporta un respaldo** en cada dispositivo antes de conectarlo.
2. Ve a **Configuración → Sincronización** e inicia sesión.
3. Pulsa **Conectar este dispositivo**.

Los datos se combinan por registro. Si un mismo registro cambió en dos lugares, gana el cambio más reciente.

## Cómo funciona

- La app guarda primero en el dispositivo. Sin internet sigue funcionando y envía los cambios al volver.
- Cada cambio se envía menos de un segundo después, y enseguida si sales de la app. Los demás dispositivos abiertos lo reciben en un par de segundos por el aviso en tiempo real. Si ese aviso falla, la app revisa la nube cada 15 segundos mientras está a la vista, y siempre al volver a ella.
- Un formulario abierto no se cambia mientras lo editas: al guardarlo, gana el cambio más reciente.
- Un borrado también se sincroniza. La nube guarda solo la marca del borrado, sin el contenido.
- Importar un respaldo con la sincronización activa lo reemplaza en todos los dispositivos.
- Los datos no tienen cifrado de extremo a extremo: quien administre el proyecto Supabase puede verlos en su panel.

## Plan gratuito

- Un proyecto gratuito con poca actividad durante una semana se pausa. Supabase avisa por correo y los datos se conservan. Se reactiva desde su panel, y mientras tanto la app sigue funcionando en local.
- La cuota es de 500 MB de base de datos por proyecto. Revisa la [página de precios](https://supabase.com/pricing), porque puede cambiar.
