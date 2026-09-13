# MCServer Manager 🎮🚀

Plataforma web de administración integral para servidores de Minecraft (NeoForge, Forge y Vanilla) y túneles Playit.gg, con arquitectura de grado de producción, cero mocks, componentes micro-animados de **RareUI**, y empaquetado en un único contenedor Docker compatible con **Dokploy** y **Cloudflare Tunnel**.

---

## ✨ Características Principales

- **Gestor de Versiones Oficiales:** Consulta en vivo e instalación autónoma de versiones de Minecraft y NeoForge desde los repositorios oficiales de Mojang y NeoForge Maven.
- **Sin Mocks (100% Real):** Integración real con el sistema de archivos Linux, proceso Java en tiempo real, consultas RCON, y telemetría de hardware (`pidusage` y `systeminformation`).
- **Diseño Impecable con RareUI:**
  - Botones retro `RetroPixelButton` con animaciones de bloques y acentos de Minecraft.
  - Pestañas con transiciones líquidas `layoutId` (`AnimatedTab`).
  - Botones vidriados con barrido de luz `GlassShimmerButton`.
  - Suite completa de iconos SVG animados `RareIcons` (servidores con LEDs, radar de Playit, engranajes sincronizados, consola interactiva, etc.).
- **Consola Interactiva en Tiempo Real:** Emulador de terminal `xterm.js` con streaming bidireccional vía WebSocket (`/ws/console`), soporte de colores ANSI y ejecución de comandos RCON/stdin.
- **Gestor Visual de `server.properties`:** Formulario intuitivo por categorías lógicas (modo de juego, dificultad, MOTD con colores, puertos, whitelist, etc.) y editor avanzado en texto plano con guardado atómico y copias de seguridad `.bak`.
- **Administrador de Mods:** Carga Drag-and-Drop de archivos `.jar`, activación/desactivación instantánea mediante renombrado (`.jar` <-> `.jar.disabled`), renombrado y eliminación.
- **Control de Jugadores y Permisos:** Administración de Operadores (`ops.json`), Lista Blanca (`whitelist.json`), Baneos (`banned-players.json`) y acciones rápidas con avatares en 3D (Steve/Alex/Skin).
- **Módulo Playit.gg:** Detección automática del binario, inicio/parada del túnel y captura de la dirección pública asignada (`*.playit.gg`).
- **Despliegue Multi-Stage:** Un único `Dockerfile` que contiene **OpenJDK 21**, **Node.js 22 LTS**, el binario de **Playit.gg**, el backend compilado y el frontend estático servido en el puerto `3000`.

---

## 🏗️ Arquitectura del Monorepo

```text
mcserver-manager/
├── client/                     # Frontend SPA (React + Vite + TypeScript + Tailwind CSS + RareUI)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/         # Sidebar, Topbar, MobileNav, MainLayout
│   │   │   ├── rareui/         # RetroPixelButton, AnimatedTab, GlassShimmerButton, RareIcons
│   │   │   └── ui/             # Badges, Tabs, Modals
│   │   ├── features/
│   │   │   ├── auth/           # LoginView, AuthContext
│   │   │   ├── dashboard/      # Métricas de CPU/RAM/Disco/TPS, acciones rápidas
│   │   │   ├── console/        # Terminal xterm.js & hook useConsoleWs
│   │   │   ├── versions/       # Selector Minecraft / NeoForge, RAM & EULA
│   │   │   ├── properties/     # Editor reactivo de server.properties
│   │   │   ├── players/        # OPs, Whitelist, Bans, Acciones rápidas
│   │   │   ├── mods/           # Drag-and-drop jar upload, toggle, rename
│   │   │   ├── playit/         # Control y logs del túnel Playit
│   │   │   └── settings/       # Ruta raíz y validación de directorios
│   │   ├── lib/api.ts          # Cliente API tipado con autenticación HttpOnly
│   │   └── App.tsx
├── server/                     # Backend API & WebSocket (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── config/             # Constantes y rutas
│   │   ├── middlewares/        # auth.middleware.ts (JWT seguro)
│   │   ├── routes/             # Endpoints REST (/auth, /settings, /status, /versions, /properties, /players, /mods, /playit)
│   │   ├── services/
│   │   │   ├── config.service.ts     # Manejo de panel-config.json y rutas dinámicas
│   │   │   ├── properties.service.ts # Parser y guardado atómico con .bak
│   │   │   ├── players.service.ts    # CRUD ops.json, whitelist.json, Mojang UUID API
│   │   │   ├── mods.service.ts       # Subida, toggle (.disabled), renombrado y borrado
│   │   │   ├── versions.service.ts   # Descargador e instalador autónomo NeoForge/Mojang
│   │   │   ├── rcon.service.ts       # Conexión persistente RCON y comandos
│   │   │   ├── process.service.ts    # Control de procesos, parada limpia (/stop -> SIGTERM -> SIGKILL)
│   │   │   ├── monitor.service.ts    # Telemetría CPU/RAM/Disco/TPS en tiempo real
│   │   │   └── playit.service.ts     # Control del proceso y logs de Playit.gg
│   │   ├── ws/
│   │   │   └── console.ws.ts         # WebSocket /ws/console con tail de latest.log
│   │   └── index.ts                  # Punto de entrada y servidor de SPA estático
├── Dockerfile                  # Multi-stage build (Node 22 + Java 21 + Playit)
├── docker-compose.yml          # Despliegue listo para Dokploy
└── package.json                # Scripts para monorepo
```

---

## 🚀 Despliegue en Producción (Dokploy / Docker)

### Opción 1: Docker Compose

```bash
docker compose up -d --build
```

El panel estará disponible en `http://localhost:3000`.

### Variables de Entorno

| Variable | Descripción | Valor por Defecto |
| :--- | :--- | :--- |
| `PORT` | Puerto HTTP del panel y WebSocket | `3000` |
| `SERVER_ROOT` | Directorio raíz persistente para los archivos de Minecraft | `/data` |
| `MASTER_PASSWORD` | Contraseña inicial de administrador | Si está vacía, se solicita al primer inicio |
| `JWT_SECRET` | Clave secreta para firmar tokens de sesión | Autogenerada si no se define |

---

## 🌐 Configuración con Cloudflare Tunnel

Para publicar el panel a través de Cloudflare Tunnel:
1. Crea un túnel HTTP hacia `http://localhost:3000` (o el nombre del contenedor Docker).
2. En la configuración del dominio en el panel de Cloudflare, asegúrate de tener activada la opción **WebSockets** (Cloudflare Dashboard -> Network -> WebSockets habilitado).

---

## 💻 Desarrollo Local

### 1. Instalar dependencias

```bash
npm install
cd client && npm install
cd ../server && npm install
```

### 2. Ejecutar ambos servicios en modo desarrollo

```bash
# Desde la raíz:
npm run dev
```

Esto levantará concurrentemente:
- Frontend Vite con Hot Reload en `http://localhost:5173`
- Backend Express con TypeScript en `http://localhost:3000`

### 3. Compilar para producción

```bash
npm run build
```

---

## 🛡️ Seguridad

- Las contraseñas se almacenan mediante hashes criptográficos **bcrypt**.
- La sesión se mantiene mediante cookies seguras `HttpOnly` (`mc_token`).
- Los endpoints de subida y renombrado de mods cuentan con validación estricta para evitar vulnerabilidades de *Path Traversal*.
- Las escrituras a archivos de configuración (`server.properties`, `ops.json`, etc.) se realizan de manera atómica (escritura en `.tmp` y reemplazo atómico) con copias de respaldo `.bak`.
