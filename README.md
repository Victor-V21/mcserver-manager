# MCServer Manager 🎮🚀

Plataforma web de administración integral para servidores de Minecraft (NeoForge, Forge, Fabric y Vanilla) y túneles Playit.gg, con arquitectura de grado de producción, cero mocks, diagnóstico de crashes asistido por Inteligencia Artificial (Google Gemini), componentes micro-animados de **RareUI**, y empaquetado en un único contenedor Docker compatible con **Dokploy** y **Cloudflare Tunnel**.

---

## ✨ Características Principales

### 🧠 Diagnóstico Inteligente de Errores y Crasheos con IA (Google Gemini)
- **Análisis Universal de Causas:** No se limita a dependencias de mods; analiza con objetividad médica fallos de memoria RAM (`OutOfMemoryError`), puertos ocupados (`BindException`), incompatibilidades de versión de Java, EULA no aceptada (`eula=false`), mods de cliente instalados por error en servidor dedicado, corrupción de chunks/mundos (`RegionFile`, NBT) y errores de sintaxis en archivos `.properties`, `.toml` o `.json`.
- **Inyección de Contexto Real:** Lee directamente los reportes oficiales de crash de Minecraft (`crash-reports/crash-*.txt`), la lista de archivos `.jar` instalados, la versión de Minecraft, el loader y los registros recientes de consola.
- **Desglose Estructurado en el Dashboard:**
  - 🏷️ **Librerías / Dependencias requeridas:** Etiquetas distintivas en cian con sus versiones mínimas requeridas (`Create 0.6.10+`, `Sable 2.0.0+`, etc.).
  - 📦 **Mod(s) instalados o Componente afectado:** Identificación clara entre archivos instalados en conflicto o componentes del sistema (Memoria, Red, Java, Mundo).
  - 📋 **Desglose técnico por mod:** Viñetas detalladas que explican qué archivo específico solicita cuál librería.
  - 💡 **Solución paso a paso en español:** Instrucciones accionables con botones de navegación contextual (Gestionar Mods, Ver Consola, Actualizar Loader).
- **Banner Animado con Cronómetro:** Indicador futurista en tiempo real con cronómetro en vivo (`⏱️ 00:04s`), haz de escaneo y halo giratorio mientras se consulta el modelo.
- **Resiliencia y Alta Disponibilidad:**
  - Latencia ultrarrápida configurada con `thinkingBudget: 0` (~1.5s de respuesta).
  - Fallback automático en cascada entre modelos (`gemini-3-flash-preview`, `gemini-3.6-flash`, `gemini-3.8-flash`) ante errores 503 por sobrecarga temporal de servidores de Google o límites de cuota (429).
  - Analizador sintáctico local de respaldo para garantizar diagnósticos detallados incluso sin conexión a internet.
  - Configurable desde **Ajustes del Panel** (activar/desactivar IA, ingresar API Key y selector de modelos).

---

### 📦 Gestor de Mods con Confirmación Sostenida ("Hold to Confirm")
- **Acciones Masivas Seguras:**
  - ⏸️ **Desactivar todos los mods:** Botón ámbar que requiere mantener presionado durante 1.5 segundos con barra de progreso fluida para evitar clics accidentales; renombra todos los `.jar` a `.jar.disabled`.
  - 🗑️ **Eliminar todos los mods:** Botón destructivo rojo que requiere mantener presionado durante 2.0 segundos antes de eliminar los mods del servidor.
- **Actualización Fluida sin Recargas:** Cambios de estado instantáneos en la interfaz sin parpadeos ni recargas completas de pantalla.
- **Carga Drag-and-Drop:** Sube múltiples archivos `.jar` simultáneamente arrastrándolos directamente al navegador con barra de progreso en vivo.
- **Gestión Individual:** Activación/desactivación unitaria, renombrado y eliminación.

---

### 📊 Telemetría y Rendimiento Real (Sin Mocks)
- **Monitoreo en Tiempo Real:** Uso de CPU del sistema y del proceso Java, memoria RAM consumida (asignada vs disponible) y espacio en disco.
- **TPS y MSPT Reales:** Lectura en vivo de TPS (Ticks Per Second) y tiempo promedio por tick mediante comandos de telemetría e integración de procesos.

---

### 📁 Explorador de Directorios del Servidor y Detección de Minecraft
- **Navegación Visual del Sistema de Archivos:** Permite explorar de forma segura e interactiva las rutas internas del servidor y del contenedor Docker desde **Ajustes del Panel**.
- **Detección Automática de Servidores Minecraft:** Analiza e identifica al instante carpetas que contengan `server/`, `server.jar`, `mods/` o `server.properties` resaltándolas con la insignia ✨ **Minecraft**.
- **Accesos Rápidos a Volúmenes Docker:** Atajos directos a rutas estándar como `/data`, `/home`, `/app` y `/` con verificación de existencia en tiempo real.
- **Validación y Guardado In-Situ:** Diagnóstico de subdirectorios clave (`server/`, `mods/`, `logs/`, etc.) y guardado dinámico de la ruta raíz sin reiniciar el contenedor.

---

### 💻 Consola Interactiva y Red
- **Terminal xterm.js:** Emulador completo con streaming bidireccional vía WebSocket (`/ws/console`), soporte de colores ANSI y ejecución de comandos RCON y entrada estándar (stdin).
- **Túnel Playit.gg Integrado:** Detección y gestión del binario de Playit.gg, control de inicio/parada y captura automática de la dirección pública asignada (`*.playit.gg`).
- **Editor Visual de `server.properties`:** Formulario interactivo por categorías lógicas y editor en texto plano con guardado atómico y copias de seguridad automáticas `.bak`.
- **Control de Jugadores:** Gestión completa de OPs (`ops.json`), Lista Blanca (`whitelist.json`), Baneos (`banned-players.json`) y avatares de skins de Mojang.

---

## 🏗️ Arquitectura del Proyecto

```text
mcserver-manager/
├── client/                         # Frontend SPA (React 18 + Vite + TypeScript + Tailwind CSS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/             # Sidebar, Topbar, MobileNav, MainLayout
│   │   │   ├── rareui/             # HoldButton, GlassShimmerButton, AnimatedTab, RareIcons
│   │   │   └── common/             # Modales y componentes reutilizables
│   │   ├── features/
│   │   │   ├── dashboard/          # Métricas, estado, diagnóstico con IA y acciones
│   │   │   ├── console/            # Terminal xterm.js & hook useConsoleWs
│   │   │   ├── mods/               # Gestor de mods con subida, toggle y hold buttons
│   │   │   ├── versions/           # Selector e instalador de Minecraft / NeoForge
│   │   │   ├── properties/         # Editor reactivo de server.properties
│   │   │   ├── players/            # OPs, Whitelist y Bans
│   │   │   ├── playit/             # Control y logs del túnel Playit.gg
│   │   │   └── settings/           # Configuración de IA (Gemini), modelos y rutas
│   │   ├── lib/
│   │   │   ├── api.ts              # Cliente HTTP tipado con credenciales seguras
│   │   │   └── types.ts            # Definiciones de tipos compartidos
│   │   └── App.tsx
├── server/                         # Backend API & WebSocket (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── config/                 # Constantes y rutas del servidor
│   │   ├── middlewares/            # Autenticación JWT y validaciones
│   │   ├── routes/                 # Endpoints REST (/auth, /status, /mods, /settings, etc.)
│   │   ├── services/
│   │   │   ├── ai.service.ts       # Integración con Google Gemini (@google/genai)
│   │   │   ├── process.service.ts  # Control de proceso Minecraft, captura de logs y crashes
│   │   │   ├── mods.service.ts     # CRUD y operaciones masivas de mods (disable-all, delete-all)
│   │   │   ├── config.service.ts   # Persistencia en panel-config.json
│   │   │   ├── rcon.service.ts     # Protocolo RCON cliente
│   │   │   ├── monitor.service.ts  # Métricas de hardware y TPS
│   │   │   ├── versions.service.ts # Descargas oficiales de Mojang y NeoForge Maven
│   │   │   └── playit.service.ts   # Control del túnel Playit.gg
│   │   ├── ws/
│   │   │   └── console.ws.ts       # Servidor WebSocket para streaming de consola
│   │   └── index.ts                # Inicialización y servidor de archivos estáticos
├── Dockerfile                      # Multi-stage build (Node 22 + Java 21 + Playit)
├── docker-compose.yml              # Despliegue listo para Dokploy / Servidor dedicado
└── package.json                    # Scripts del monorepo
```

---

## 🚀 Despliegue en Producción (Dokploy / Docker)

### Ejecución con Docker Compose

```bash
docker compose up -d --build
```

El panel estará disponible de inmediato en `http://localhost:3000`.

### 📂 Mapeo de Volúmenes (Host vs Contenedor)

Debido al aislamiento de contenedores Docker, las rutas del host (por ejemplo, `/home/vm/mcserver`) **no son visibles** dentro del contenedor a menos que se monten como volumen:

- **Opción recomendada (Montar a `/data`):**
  ```yaml
  volumes:
    - /home/vm/mcserver:/data
  ```
  En la interfaz del panel (**Ajustes del Panel**), establece la ruta raíz en `/data`.

- **Opción alternativa (Ruta idéntica):**
  ```yaml
  volumes:
    - /home/vm/mcserver:/home/vm/mcserver
  ```
  En la interfaz del panel (**Ajustes del Panel**), podrás utilizar directamente `/home/vm/mcserver`.

> 💡 Puedes utilizar el botón **"Explorar Servidor"** en Ajustes para navegar visualmente por las carpetas del contenedor y confirmar dónde está montado tu servidor de Minecraft.

### Variables de Entorno

| Variable | Descripción | Valor por Defecto |
| :--- | :--- | :--- |
| `PORT` | Puerto HTTP del panel y del WebSocket | `3000` |
| `SERVER_ROOT` | Directorio raíz persistente para los archivos del servidor Minecraft | `/data` |
| `MASTER_PASSWORD` | Contraseña inicial de administrador | Si está vacía, se solicita en el primer acceso |
| `JWT_SECRET` | Clave secreta para firmar tokens de sesión | Autogenerada criptográficamente |

---

## 🌐 Configuración con Cloudflare Tunnel

Para publicar el panel hacia internet con Cloudflare Tunnel:
1. Apunta el servicio del túnel hacia `http://localhost:3000` (o el nombre del contenedor en la red Docker).
2. En el panel de Cloudflare, accede a: **Domain -> Network -> WebSockets** y asegúrate de que esté **Activado** para el correcto funcionamiento de la consola en vivo y la telemetría.

---

## 💻 Desarrollo Local

### 1. Instalar dependencias

```bash
npm install
cd client && npm install
cd ../server && npm install
```

### 2. Iniciar en modo desarrollo

```bash
npm run dev
```

Levantará concurrentemente:
- **Frontend Vite:** `http://localhost:5173` (con Hot Module Replacement).
- **Backend Express & WS:** `http://localhost:3000`.

### 3. Compilar bundle de producción

```bash
npm run build
```

---

## 🛡️ Seguridad

- **Hashes Criptográficos:** Contraseñas protegidas mediante `bcryptjs` con salting seguro.
- **Protección de Sesión:** Autenticación basada en cookies `HttpOnly` (`mc_token`) con SameSite estricto.
- **Sanitización de Rutas:** Validación contra ataques de *Path Traversal* en subidas, descargas y renombrado de mods o archivos.
- **Escrituras Atómicas:** Modificaciones a archivos de configuración (`server.properties`, `ops.json`, etc.) realizadas mediante escritura previa en archivos temporales y sustitución atómica para prevenir corrupción de datos en caso de apagones o detenciones abruptas.
