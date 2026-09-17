# MCServer Manager

Panel web para instalar y administrar un servidor Minecraft/NeoForge, sus mods, mundos, configuraciones y el agente Playit desde un único contenedor Docker.

## Arquitectura

El proceso Node del panel inicia Minecraft como proceso hijo dentro del mismo contenedor. Todo el estado queda en `/data`:

```text
/data/
├── panel-config.json
├── server/             # NeoForge/Minecraft, mundo, mods y logs
├── scripts/            # scripts de arranque generados
└── playit/             # identidad y configuración persistente del agente
```

La consola web escribe en la entrada estándar del proceso Minecraft. Las acciones de jugadores modifican los JSON del servidor y, si el proceso está activo, envían el comando equivalente a su consola.

## Desarrollo local

```bash
npm install --prefix client
npm install --prefix server
npm run build
```

Para probar el servidor incluido en `test/` dentro de un contenedor:

```bash
docker compose -f docker-compose.test.yml up -d --build
```

La interfaz queda en [http://localhost:3001](http://localhost:3001) y el puerto de Minecraft de prueba en `127.0.0.1:25566`. La prueba monta únicamente `test/` en `/data`; no utiliza carpetas del home ni servicios del host.

Para detenerla:

```bash
docker compose -f docker-compose.test.yml down
```

## Despliegue con Dokploy

Usa el `docker-compose.yml` del repositorio. En las variables de entorno del servicio configura al menos:

```dotenv
MASTER_PASSWORD=una-contraseña-larga-del-panel
JWT_SECRET=un-secreto-aleatorio-persistente
MINECRAFT_AUTOSTART=true
PLAYIT_AUTOSTART=false
PLAYIT_LOCAL_PORT=25565
```

El Compose crea el volumen nombrado `mcserver-data` y lo monta en `/data`. En Dokploy no agregues bind mounts hacia `/home`, `/home/vm`, sockets del sistema o rutas de otro servidor. Publica el puerto `3000` para el panel y `25565` para Minecraft si se necesita acceso directo.

En un despliegue existente, realiza primero una copia de seguridad de los datos del servidor y cópialos al volumen `/data/server` del nuevo servicio. No reutilices `panel-config.json` si contiene rutas antiguas fuera de `/data`; el panel las migra a la raíz interna.

## Primer arranque

1. Abre el panel y establece la contraseña inicial.
2. En **Versión & Motor**, instala Minecraft y NeoForge y acepta el EULA.
3. En **Configuración del Servidor**, revisa `online-mode`. Al dejarlo desactivado se aceptan cuentas no premium; el panel también desactiva `enforce-secure-profile` para que ese modo sea coherente.
4. Usa **Gestor de Mods** para subir los `.jar` y reinicia Minecraft.
5. En **Túnel Playit.gg**, abre el enlace para obtener una clave Docker de Playit, pégala en **Vincular agente** y guarda el puerto local `25565`. La identidad se guarda en `/data/playit` y se entrega al agente mediante su socket IPC local.

El modo no premium reduce la verificación de identidad. Usa una whitelist, una contraseña fuerte para el panel y HTTPS antes de compartir el servicio.

## Variables

| Variable | Uso | Valor habitual |
|---|---|---|
| `SERVER_ROOT` | Raíz única de datos del contenedor | `/data` |
| `FILE_EXPLORER_ROOT` | Raíz del explorador | `/data` |
| `ALLOWED_ROOTS` | Rutas que el explorador puede visitar | `/data` |
| `PANEL_CONFIG_PATH` | Configuración persistente del panel | `/data/panel-config.json` |
| `MINECRAFT_AUTOSTART` | Iniciar Minecraft al arrancar Node | `true` |
| `PLAYIT_AUTOSTART` | Iniciar Playit al arrancar Node | `false` |
| `PLAYIT_LOCAL_PORT` | Puerto local al que apunta Playit | `25565` |
| `PLAYIT_IPC_SOCKET_PATH` | Socket IPC local de Playit; normalmente no hace falta definirlo | `/run/playit/playitd.sock` |
| `MASTER_PASSWORD` | Contraseña inicial si aún no existe configuración | obligatoria |
| `JWT_SECRET` | Firma persistente de sesiones | obligatoria |

## Estructura del proyecto

```text
client/                 # React + Vite
server/src/
├── routes/             # API autenticada
├── services/           # Minecraft, versiones, mods, Playit y telemetría
├── ws/                 # consola en vivo y logs
└── data/               # reglas de diagnóstico
Dockerfile              # Node 22 + Java 21 + agente Playit
docker-compose.yml      # despliegue persistente de un solo contenedor
docker-compose.test.yml # prueba con el fixture local
```
