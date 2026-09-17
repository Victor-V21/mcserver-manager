# Contexto técnico vigente

Este documento describe la arquitectura actual de `mcserver-manager`. El servidor Minecraft no se ejecuta fuera del contenedor: el panel, Java, Minecraft/NeoForge, los mods y Playit comparten el mismo contenedor y el mismo volumen persistente.

## Reglas de almacenamiento

- La única raíz permitida por la aplicación es `/data`.
- `SERVER_ROOT`, `FILE_EXPLORER_ROOT` y `ALLOWED_ROOTS` deben apuntar a `/data`.
- El servidor se encuentra normalmente en `/data/server`.
- El explorador no debe mostrar ni administrar `/home` ni otros árboles del host.
- `/data` debe ser un volumen persistente de Docker en producción.

## Ciclo de vida de Minecraft

`ProcessService` busca, en este orden, `/data/server/run.sh`, `/data/server/start.sh`, `/data/scripts/start.sh` y finalmente `server.jar`. Lo ejecuta como proceso hijo con stdin/stdout/stderr conectados.

- `start`, `stop`, `restart` y `kill` actúan sobre ese proceso.
- `stop` escribe `stop` en la consola, espera el apagado limpio y usa señales como último recurso.
- `SIGTERM` del contenedor apaga primero Minecraft y Playit.
- La consola WebSocket transmite `latest.log` y envía comandos a stdin.

## Configuración de servidor

`PropertiesService` lee y escribe `/data/server/server.properties` con copias `.bak` y escritura atómica. Convierte booleanos y números a tipos útiles para la interfaz.

Para cuentas no premium:

- `online-mode=false` evita la validación de cuenta oficial.
- `enforce-secure-profile=false` evita exigir perfiles seguros incompatibles con ese modo.
- La interfaz muestra una advertencia y recomienda activar whitelist y proteger el panel.

## Versiones y mods

`VersionsService` descarga el manifiesto real de Mojang y las builds reales de NeoForge. Si una consulta remota falla, presenta una lista vacía o los archivos detectados en `/data`; nunca inventa versiones para el dashboard.

Los instaladores, `version-info.json`, mods, mundos, logs, backups del servidor y scripts se guardan en `/data/server`.

## Playit

`PlayitService` ejecuta el binario incluido en la imagen y usa `/data/playit/playit.toml` como identidad. La configuración del puerto local del manager se guarda en `/data/playit/manager.json`.

La API autenticada es:

- `GET /api/playit/status`
- `GET /api/playit/config`
- `PUT /api/playit/config`
- `POST /api/playit/action` con `start`, `stop` o `restart`

Los túneles se muestran únicamente después de leer un endpoint real de la salida del agente.

## Prueba local

`docker-compose.test.yml` monta `./test` en `/data`, desactiva los arranques automáticos y expone el panel en `localhost:3001`. El servicio de prueba debe iniciar el proceso con `/data/server/run.sh`; por eso el script del fixture debe usar rutas relativas al directorio del servidor.

## Despliegue

Dokploy debe desplegar el Compose sin variables de rutas del host. Se requieren un volumen persistente para `/data`, `MASTER_PASSWORD`, `JWT_SECRET` y el puerto web. El puerto `25565` se publica cuando se desea conexión directa; Playit puede usarse como alternativa para la dirección pública.
