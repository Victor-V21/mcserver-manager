# AGENT INSTRUCTION: Full-Stack Minecraft & Playit Management Panel (Production Grade)

Actúa como un Ingeniero de Software Full-Stack Senior y DevOps especializado en Node.js, TypeScript, React, Linux y administración de servidores de videojuegos.

Tu objetivo es diseñar e implementar una plataforma web completa, responsiva (optimizada para móviles y escritorio) y autónoma para la administración integral de un servidor de Minecraft (con soporte NeoForge/Forge/Vanilla) y su túnel Playit.gg.

---

## 1. STACK TECNOLÓGICO Y ARQUITECTURA

- **Arquitectura:** Monorepo o estructura unificada `client/` + `server/` empaquetada en un solo contenedor Docker.
- **Frontend (`/client`):**
  - React (versión moderna) + Vite + TypeScript.
  - Tailwind CSS para diseño moderno, tema oscuro (estilo panel de control/datacenter) y totalmente responsivo (mobile-first para smartphones y desktop).
  - Componentes de UI: Lucide React (iconos), `@tanstack/react-query` (gestión de estado del servidor), `xterm` y `@xterm/addon-fit` (emulador de terminal para la consola).
- **Backend (`/server`):**
  - Node.js con Fastify o Express bajo TypeScript estricto.
  - `ws` (WebSockets nativos) para streaming de logs y consola bidireccional.
  - `rcon-client` para envío y recepción de comandos en tiempo de ejecución.
  - `systeminformation` y `pidusage` para telemetría en tiempo real (CPU, RAM, disco, procesos).
  - Autenticación: JWT en cookies `HttpOnly` seguras con expiración de sesión y contraseña maestra configurada por entorno o hash persistido.
  - Subida de archivos: `fastify-multipart` o `multer` con streaming directo a disco para mods `.jar`.
- **Despliegue:**
  - Un único `Dockerfile` multi-stage que construya el frontend estático, compile el backend TypeScript, sirva la SPA y la API en el mismo puerto (ej. `3000`), compatible al 100% con **Dokploy** y **Cloudflare Tunnel** (soporte de WebSockets activo).

---

## 2. REQUISITOS FUNCIONALES DETALLADOS

### A. Autenticación y Seguridad

1. Pantalla de inicio de sesión (`/login`) moderna, responsiva y limpia.
2. Acceso protegido por usuario y contraseña.
3. Almacenamiento seguro del hash (bcrypt/argon2) en un archivo de configuración local del panel (`panel-config.json`).
4. Middleware de protección en todas las rutas de API y el handshake del WebSocket.

### B. Configuración Global y Directorio Raíz Dinámico

1. Pestaña de **Ajustes del Panel**:
   - Selector/Input para configurar la **Ruta Raíz del Servidor** (por defecto: `/home/vm/mcserver`).
   - El sistema debe verificar en tiempo real si la ruta existe y validar los subdirectorios clave:
     - `server/` (archivos del juego)
     - `server/mods/` (carpeta de mods)
     - `server/server.properties`
     - `server/logs/latest.log`
     - `playit/` (binario o carpeta de playit)
     - `scripts/` (scripts de arranque/parada como `start.sh`)
   - Capacidad de actualizar la ruta desde la interfaz sin reiniciar el contenedor, guardándose en `panel-config.json`.

### C. Dashboard Principal

1. **Estado Global:** Tarjeta de estado del servidor (En línea, Detenido, Reiniciando, Crash).
2. **Acciones Rápidas:** Botones con confirmación modal para:
   - Iniciar Servidor (ejecuta el script de inicio o proceso Java).
   - Detener Servidor (ejecuta `/stop` graceful vía RCON con fallback a SIGTERM/SIGKILL).
   - Reiniciar Servidor.
   - Forzar Apagado (Kill inmediato en caso de cuelgue).
3. **Monitoreo de Recursos en Tiempo Real:**
   - % de uso de CPU del host y del proceso Java.
   - RAM en uso vs. RAM asignada/total del sistema (con gráfica o barra de progreso).
   - Espacio en disco disponible en el volumen del servidor.
   - TPS estimados del mundo (mediante consulta RCON `/forge tps` o similar si NeoForge está activo).
4. **Jugadores Conectados:**
   - Conteo actual / Máximo.
   - Lista visual de jugadores con sus avatares/cabezas (renderizados usando la API de Crafatar: `https://crafatar.com/avatars/{uuid}?size=48&default=MHF_Steve` o por username).
   - Botón de acción rápida por jugador (Kickear, Banear, Op/Deop).

### D. Consola en Tiempo Real (Terminal Interactiva)

1. Integración con `xterm.js` con soporte para colores ANSI y auto-ajuste de tamaño (`FitAddon`).
2. Conexión WebSocket bidireccional:
   - **Lectura:** Stream de logs mediante `fs.watch` / tail de `server/logs/latest.log` transmitiendo nuevas líneas al cliente.
   - **Escritura:** Barra de entrada de comandos en la parte inferior. Al enviar un comando, se envía vía WebSocket al backend y se ejecuta mediante RCON (o stdin si el proceso está acoplado).
3. Historial de comandos enviados mediante las flechas Arriba/Abajo del teclado.
4. Botón para limpiar consola y toggle para pausar/reanudar el auto-scroll.

### E. Gestor Integral de Configuración (`server.properties`)

1. El backend debe parsear `server.properties` respetando comentarios y tipos de datos.
2. La UI debe ofrecer controles visuales intuitivos agrupados por categorías lógicas en vez de un simple archivo de texto plano:
   - **Mundo y Juego:** Gamemode (Survival, Creative, Adventure, Spectator), Dificultad (Peaceful, Easy, Normal, Hard), Hardcore (toggle), Semilla del Mundo (`level-seed`), Nombre del Nivel, Generación de Estructuras.
   - **Red y Jugabilidad:** `server-port`, `max-players`, `view-distance`, `simulation-distance`, `pvp` (toggle), `allow-flight`, `spawn-protection`.
   - **Reglas del Servidor:** `white-list` (toggle), `online-mode` (toggle), `enable-command-block` (toggle), `allow-nether` (toggle).
   - **MOTD Personalizado:** Editor visual para el mensaje del día con previsualización en vivo de los códigos de colores clásicos de Minecraft (`§` o `&`).
   - **Modo Avanzado:** Pestaña con editor de texto plano (Monaco Editor o textarea con sintaxis) para editar directamente el archivo completo con validación antes de guardar.
3. Botón de guardado que escribe atómicamente el archivo en disco y muestra una alerta recomendando reiniciar el servidor para aplicar cambios.

### F. Control de Jugadores y Permisos

1. **Operadores (`ops.json`):**
   - Tabla interactiva con avatar, nombre, UUID y selector para el nivel de permiso (Nivel 1 al 4, con descripción de qué hace cada nivel).
   - Opción para añadir nuevos OPs por nombre de usuario (el backend resuelve el UUID) y botón para revocar OP.
2. **Whitelist (`whitelist.json`):**
   - Toggle para activar/desactivar la whitelist en tiempo real.
   - Lista de usuarios permitidos con opción de añadir/eliminar.
3. **Baneos (`banned-players.json` y `banned-ips.json`):**
   - Tabla con razón del ban, fecha y botón de desbanear.

### G. Administrador de Mods (`server/mods/`)

1. Vista en cuadrícula o tabla de todos los archivos en la carpeta de mods.
2. **Subida de Mods:** Zona Drag-and-Drop para subir uno o múltiples archivos `.jar` con barra de progreso.
3. **Activar / Desactivar (Ocultar):**
   - Switch interactivo para cada mod: Si se desactiva, el backend renombra `nombre-del-mod.jar` a `nombre-del-mod.jar.disabled`. Si se activa, lo vuelve a renombrar a `.jar`.
4. **Acciones de archivo:**
   - Renombrar archivo.
   - Eliminar archivo (con modal de confirmación).
   - Ver tamaño del archivo y fecha de última modificación.
5. Buscador en tiempo real y filtro por estado (Activos / Inactivos).

### H. Módulo de Túnel Playit.gg

1. Detección del estado del proceso de `playit` (comprobando si el proceso está corriendo mediante PID o servicio).
2. Botones de acción: Iniciar, Detener, Reiniciar túnel `playit`.
3. Visor de logs del proceso Playit para comprobar los túneles activos, dominios asignados e IPs públicas de conexión.

---

## 3. ESTRUCTURA DE ARCHIVOS ESPERADA

```text
mc-manager/
├── client/                      # Frontend Vite + React + TS + Tailwind
│   ├── src/
│   │   ├── components/          # UI: Layout, Navbar, Sidebar, Modals
│   │   ├── features/
│   │   │   ├── auth/            # Login view & context
│   │   │   ├── dashboard/       # Métricas, estado, quick actions
│   │   │   ├── console/         # xterm.js terminal & WS hook
│   │   │   ├── properties/      # Formulario reactivo de server.properties
│   │   │   ├── players/         # ops, whitelist, bans
│   │   │   ├── mods/            # Gestor de mods (.jar upload/toggle/rename)
│   │   │   ├── playit/          # Control y logs del túnel playit
│   │   │   └── settings/        # Configuración de ruta raíz y credenciales
│   │   ├── lib/api.ts           # Cliente Axios o Fetch tipado
│   │   └── App.tsx
│   ├── tailwind.config.js
│   └── package.json
├── server/                      # Backend Node + TS
│   ├── src/
│   │   ├── controllers/         # Handlers de cada ruta
│   │   ├── services/
│   │   │   ├── config.service.ts    # Manejo de panel-config.json y rutas dinámicas
│   │   │   ├── properties.service.ts # Parser bidireccional server.properties
│   │   │   ├── players.service.ts   # CRUD ops.json, whitelist.json
│   │   │   ├── mods.service.ts      # Archivos .jar, rename, upload, delete
│   │   │   ├── rcon.service.ts      # Conexión y comandos RCON
│   │   │   ├── monitor.service.ts   # CPU/RAM pidusage & systeminformation
│   │   │   ├── process.service.ts   # Control de start.sh, stop, kill
│   │   │   └── playit.service.ts    # Control y logs de Playit
│   │   ├── routes/              # Definición de endpoints REST y WS
│   │   ├── middlewares/auth.ts  # Verificación de JWT
│   │   └── index.ts             # Punto de entrada Fastify/Express + WS server
│   ├── tsconfig.json
│   └── package.json
├── Dockerfile                   # Multi-stage production build
├── docker-compose.yml           # Para testeo local y despliegue Dokploy
└── README.md
```

4. ESPECIFICACIÓN DE LA API REST Y WEBSOCKETS
   POST /api/auth/login -> Valida contraseña y emite Cookie HTTP-only.

GET /api/auth/me -> Verifica sesión activa.

GET /api/settings & POST /api/settings -> Obtiene/actualiza la ruta raíz y valida carpetas.

GET /api/status -> Devuelve: { isRunning: boolean, pid: number, cpu: number, ram: { used, total }, players: { online, max, list: [...] } }.

POST /api/server/action -> Body: { action: 'start' | 'stop' | 'restart' | 'kill' }.

GET /api/properties & PUT /api/properties -> Lee y guarda server.properties.

GET /api/players/ops & POST /api/players/ops & DELETE /api/players/ops/:uuid -> Gestión de OPs.

GET /api/players/whitelist & POST /api/players/whitelist/:name & DELETE /api/players/whitelist/:name.

GET /api/mods -> Lista de mods: [{ name, size, modified, isEnabled }].

POST /api/mods/upload -> Subida multipart de .jar.

PATCH /api/mods/toggle -> Body: { filename, enable: boolean } (renombra .jar <-> .jar.disabled).

DELETE /api/mods/:filename -> Elimina el mod.

GET /api/playit/status & POST /api/playit/action -> { action: 'start' | 'stop' | 'restart' }.

WS /ws/console -> Stream en tiempo real de logs y canal para ejecutar comandos.

5. REGLAS DE IMPLEMENTACIÓN CRÍTICAS PARA EL AGENTE
   Sin Mocks ni Stubs: Implementa código 100% funcional. No escribas // TODO: Implementar luego ni inventes respuestas estáticas simuladas.

Manejo de Errores de Disco: Todas las lecturas y escrituras de archivos deben verificar permisos y existencia, creando copias de seguridad temporales (.bak) antes de sobrescribir archivos críticos como server.properties u ops.json.

Escritura Atómica: Emplea escritura atómica (ej. escribir en un .tmp y luego fs.rename) para evitar corromper archivos si el proceso se interrumpe.

Compatibilidad Móvil: Todo el diseño en Tailwind debe usar grid/flex adaptables con barra de navegación inferior o menú hamburguesa colapsable para que sea cómodo de operar desde un teléfono.

Configuración Inicial: Si no existe panel-config.json, el backend debe crearlo con valores por defecto y permitir configurar la contraseña maestra en el primer arranque si no se definió en variable de entorno.

Comienza generando la estructura del monorepo, las dependencias y el código base del servidor y del cliente paso a paso con máxima calidad.
