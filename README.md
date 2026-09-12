# Frío & Gestión

Sistema de gestión para tu empresa de instalación y mantenimiento de aires
acondicionados. Guarda todo en una base de datos real (Supabase), así que
puedes entrar desde tu celular y tu computador y ver siempre la misma
información.

## 1. Crear el proyecto en Supabase (la base de datos)

1. Ve a https://supabase.com y crea una cuenta gratis.
2. Crea un nuevo proyecto (elige una contraseña de base de datos y guárdala).
3. Cuando el proyecto esté listo, ve a **SQL Editor** → **New query**.
4. Abre el archivo `supabase_schema.sql` de esta carpeta, copia todo su
   contenido, pégalo ahí y dale **Run**. Esto crea las tablas y la seguridad
   necesaria para que solo tú (con tu usuario) veas tus datos.
5. Ve a **Project Settings → API**. Ahí vas a encontrar dos valores que
   necesitas para el siguiente paso:
   - **Project URL**
   - **anon public key**

## 2. Configurar el proyecto localmente

1. Instala [Node.js](https://nodejs.org) si no lo tienes (versión 18 o más).
2. Copia el archivo `.env.example` y renómbralo a `.env`.
3. Pega ahí tu **Project URL** y tu **anon public key** de Supabase:
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key-publica
   ```
4. Abre una terminal en esta carpeta y ejecuta:
   ```
   npm install
   npm run dev
   ```
5. Abre el enlace que aparece (normalmente http://localhost:5173) — ahí puedes
   crear tu cuenta (correo y contraseña) y empezar a probar la app.

## 3. Subir el proyecto a Vercel

1. Crea un repositorio en GitHub y sube esta carpeta completa (sin el archivo
   `.env`, que ya está excluido por `.gitignore`).
2. Ve a https://vercel.com, crea una cuenta (puedes entrar con tu cuenta de
   GitHub) y da clic en **Add New → Project**.
3. Selecciona el repositorio que acabas de subir.
4. Antes de darle "Deploy", abre la sección **Environment Variables** y agrega
   las mismas dos variables de tu archivo `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Dale **Deploy**. En un par de minutos Vercel te da un enlace público
   (algo como `https://frio-gestion.vercel.app`) — ese es tu sistema, ya
   accesible desde el celular y el computador.

## Cómo entrar desde varios dispositivos

Usa el **mismo correo y contraseña** para iniciar sesión desde el celular y
desde el computador — así ambos ven la misma información, porque todo se
guarda en la misma base de datos.

Si más adelante quieres que un empleado tenga su propio usuario pero viendo
la misma información que tú (en vez de compartir una sola cuenta), es un
ajuste sencillo sobre este mismo proyecto — solo dímelo.

## Mejoras futuras

El código está organizado por secciones (Panel, Instalaciones, Contabilidad,
Logs, Materiales, Mantenimientos) dentro de `src/App.jsx`, cada una en su
propia función. Para pedir mejoras (por ejemplo, exportar reportes, agregar
fotos a los logs, o notificaciones por WhatsApp), puedes traer este mismo
proyecto de vuelta y seguir construyendo sobre él.
