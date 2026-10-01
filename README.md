# 📺 Visor TV Sistemas - Frontend (React 19 + Vite + Tailwind CSS)

Aplicación Frontend de alto rendimiento para el reproductor de Smart TVs y el panel de administración de Visor TV.

---

## 🚀 Características

- **Reproductor Visor TV para Pantallas / Smart TVs**: Pantalla completa, auto-ocultación de controles tras inactividad, reloj digital en tiempo real, transiciones suaves y hot-reload de playlist sin interrupciones.
- **Panel Administrativo Completo**:
  - Gestión de Sedes (crear, editar, ordenar con drag & drop, activar/desactivar).
  - Gestor Multimedia (subida de videos en MP4/WebM, imágenes, URLs externas, reordenamiento, borrado masivo).
  - Métricas y Estadísticas en tiempo real (almacenamiento en disco, uso del sistema).
  - Configuración general de visualización de las pantallas TV.
- **Compatible con Hostinger**: Generación estática con Vite y archivo `.htaccess` optimizado para enrutamiento SPA (React Router).

---

## 🛠️ Desarrollo Local

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Configurar `.env`:
   ```env
   VITE_API_BASE_URL=/api
   ```
   *(Vite ya incluye proxy en `vite.config.js` para redirigir `/api` al backend de Laravel en `http://127.0.0.1:8000`).*

3. Iniciar servidor de desarrollo:
   ```bash
   npm run dev
   ```
   Acceder a: `http://localhost:5173`

---

## 🌐 Compilación y Despliegue en Hostinger

1. Compilar para producción:
   ```bash
   npm run build
   ```
   Esto generará la carpeta `dist/` con todos los archivos minificados y el `.htaccess` listo para Hostinger.

2. Subir a Hostinger:
   - Sube el contenido de la carpeta `dist/` a la carpeta `public_html` de tu dominio en Hostinger.
   - El archivo `.htaccess` incluido en `dist/` asegurará que rutas como `/admin`, `/admin/sedes`, `/tv/:slug` no devuelvan error 404 al recargar el navegador.

