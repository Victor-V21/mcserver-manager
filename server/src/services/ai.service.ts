import { GoogleGenAI, Type, Schema } from '@google/genai';
import { ConfigService } from './config.service';

export interface CrashDiagnostic {
  modName: string;
  error: string;
  solution: string;
  severity: 'error' | 'warning';
  missingDependencies?: string[];
  details?: string[];
}

export interface CrashContext {
  logs: string;
  mods: string[];
  crashReport?: string;
  mcVersion?: string;
  loader?: string;
  loaderVersion?: string;
  javaVersion?: string;
}

export class AiService {
  private static instance: AiService;
  private configService: ConfigService;

  private constructor() {
    this.configService = ConfigService.getInstance();
  }

  public static getInstance(): AiService {
    if (!AiService.instance) {
      AiService.instance = new AiService();
    }
    return AiService.instance;
  }

  public async analyzeCrash(
    input: string | CrashContext,
    modsParam?: string[]
  ): Promise<CrashDiagnostic | null> {
    const config = this.configService.getConfig();
    
    if (!config.aiDiagnosticEnabled || !config.aiApiKey) {
      console.log('[AiService] AI Diagnostic is disabled or API Key is missing.');
      return null;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: config.aiApiKey });
      
      let logs = typeof input === 'string' ? input : input.logs || '';
      const mods = typeof input === 'string' ? (modsParam || []) : input.mods || [];
      const crashReport = typeof input === 'object' ? input.crashReport : '';
      const mcVersion = typeof input === 'object' ? input.mcVersion || '1.21.1' : '1.21.1';
      const loader = typeof input === 'object' ? input.loader || 'neoforge' : 'neoforge';
      const loaderVersion = typeof input === 'object' ? input.loaderVersion || '' : '';
      const javaVersion = typeof input === 'object' ? input.javaVersion || 'Java 21' : 'Java 21';

      // Trim crash report or log text intelligently to prioritize the actual error block
      let errorContext = '';
      if (crashReport && crashReport.trim().length > 0) {
        errorContext = `REPORTE DE CRASH OFICIAL DE MINECRAFT:\n${crashReport.slice(0, 8000)}\n\nÚLTIMAS LÍNEAS DEL REGISTRO DE CONSOLA:\n${logs.slice(-4000)}`;
      } else {
        // Find where errors or fatals start in the log
        const fatalIndex = logs.lastIndexOf('FATAL');
        const errorIndex = logs.lastIndexOf('ERROR');
        const targetIndex = Math.max(fatalIndex, errorIndex);
        if (targetIndex > 0 && targetIndex > logs.length - 12000) {
          errorContext = `REGISTROS DE CONSOLA (ZONA DEL CRASH):\n${logs.slice(Math.max(0, targetIndex - 2000), targetIndex + 8000)}`;
        } else {
          errorContext = `REGISTROS DE CONSOLA:\n${logs.slice(-8000)}`;
        }
      }

      const prompt = `
Actúa como un Sysadmin experto en servidores de Minecraft (NeoForge, Forge, Fabric, Paper, Vanilla).
El servidor falló al iniciar o crasheó. Tu objetivo es analizar la causa raíz objetiva del fallo y explicarle al usuario con TOTAL CLARIDAD qué ocurrió y la solución exacta paso a paso.

IMPORTANTE SOBRE LAS CAUSAS:
NO asumas que todo fallo es por mods o dependencias faltantes. Un servidor puede fallar por múltiples razones diferentes:
- Falta de memoria RAM / Asignación insuficiente de heap (OutOfMemoryError, Java heap space, GC overhead limit).
- Incompatibilidad o versión incorrecta de Java (ej. requerir Java 21 pero ejecutar Java 17, o clases compiladas con versión superior de JVM).
- Puerto de red ya en uso / BindException (ej. FAILED TO BIND TO PORT! Address already in use, puerto 25565 ocupado por otro proceso).
- EULA de Minecraft no aceptada (eula.txt con eula=false).
- Mods exclusivos de cliente instalados por error en el servidor (ej. NoClassDefFoundError en net.minecraft.client.*, mods con shaders, minimapas de cliente, etc.).
- Corrupción de mundo, chunks o datos de jugadores (Exception ticking world, RegionFile, corrupt NBT).
- Archivos de configuración (.toml, .json, server.properties) con errores de sintaxis o valores inválidos.
- Incompatibilidad entre versiones de Minecraft o del loader (NeoForge/Forge/Fabric).
- Dependencias o librerías faltantes requeridas por mods.
- Permisos de archivos o falta de espacio en disco (Permission denied, No space left on device).

CONTEXTO DEL SERVIDOR:
- Versión de Minecraft: ${mcVersion}
- Cargador: ${loader} ${loaderVersion}
- Entorno Java: ${javaVersion}
- Lista de mods instalados actualmente en server/mods/:
${mods.length > 0 ? mods.slice(0, 120).join(', ') : '(No hay mods instalados)'}

${errorContext}

INSTRUCCIONES CLAVES DE DIAGNÓSTICO:
1. En "modName":
   - Si el problema es causado por mods instalados específicos, lista sus nombres legibles o archivos JAR.
   - SI EL PROBLEMA NO ES POR MODS (ej. es memoria RAM, puerto ocupado, Java, EULA, mundo corrupto, configuración del servidor), indica el componente del sistema o área afectada (ej. "Sistema / Memoria RAM", "Red / Puerto 25565", "Configuración / EULA", "Java Runtime", "Mundo / Chunks corruptos", "Configuración / server.properties").
2. En "missingDependencies": Si faltan librerías o dependencias de mods, lístalas con sus versiones mínimas requeridas (ej. ["Create 6.0.9+"]). Si el error NO es por dependencias faltantes, devuelve un array vacío [].
3. En "error": Una oración precisa, clara, directa y sin tecnicismos oscuros en español sobre qué impidió iniciar o continuar el servidor.
4. En "solution": Explicación amigable, clara y paso a paso en español de cómo resolver el problema específico (ej. aumentar la memoria asignada en el panel, liberar el puerto 25565, instalar Java 21, aceptar el EULA, descargar la dependencia faltante, borrar el archivo corrupto, etc.).
5. En "details": Lista con viñetas breves explicando detalles técnicos útiles (ej. mod afectado, clase que lanzó la excepción, archivo específico que falló, puerto que colisionó, etc.). Si no hay detalles adicionales, devuelve una lista vacía [].
6. En "severity": 'error' para fallos fatales que impiden que el servidor funcione, y 'warning' para advertencias o problemas menores.
`;

      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          modName: {
            type: Type.STRING,
            description: "Nombres de los mods involucrados, o el componente del sistema afectado si no es un error de mods (ej. 'Sistema / Memoria RAM', 'Red / Puerto 25565', 'Configuración / EULA').",
          },
          error: {
            type: Type.STRING,
            description: "Una breve descripción técnica clara sobre la causa del fallo (en español).",
          },
          solution: {
            type: Type.STRING,
            description: "Solución amigable, clara y accionable en español para el usuario.",
          },
          missingDependencies: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Librerías o mods faltantes con sus versiones requeridas (ej. 'Create 0.6.10+'). Array vacío si no faltan dependencias.",
          },
          details: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Desglose o detalles técnicos específicos del fallo.",
          },
          severity: {
            type: Type.STRING,
            enum: ['error', 'warning'],
            description: "Usa 'error' para fallos fatales que crashean el servidor, y 'warning' para dependencias opcionales o problemas menores.",
          },
        },
        required: ["modName", "error", "solution", "severity"],
      };

      const requestedModel = (config.aiModel && config.aiModel.trim()) || "gemini-3-flash-preview";
      
      // Build candidate list: start with user's model, add robust fallbacks
      const candidates: string[] = [
        requestedModel,
        'gemini-3-flash-preview',
        'gemini-3.6-flash',
        'gemini-3.8-flash'
      ];
      const uniqueCandidates = [...new Set(candidates)];

      for (const modelName of uniqueCandidates) {
        try {
          console.log(`[AiService] Requesting crash analysis with model: ${modelName}...`);
          const isThinkingModel = modelName.includes('preview') || modelName.includes('2.5');
          const genConfig: any = {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
          };
          if (isThinkingModel) {
            genConfig.thinkingConfig = { thinkingBudget: 0 };
          }

          let response;
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: genConfig
            });
          } catch (firstErr: any) {
            // If thinkingConfig caused 400 INVALID_ARGUMENT, retry without it
            if (genConfig.thinkingConfig && firstErr.status === 400) {
              delete genConfig.thinkingConfig;
              response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: genConfig
              });
            } else {
              throw firstErr;
            }
          }

          if (response?.text) {
            const parsed = JSON.parse(response.text) as CrashDiagnostic;
            console.log(`[AiService] Successfully diagnosed crash with ${modelName}:`, parsed.modName);
            return parsed;
          }
        } catch (modelErr: any) {
          console.warn(`[AiService] Model ${modelName} failed (${modelErr.status || modelErr.message?.slice(0, 80)}). Trying next candidate...`);
        }
      }

      console.error('[AiService] All model candidates failed.');
      return null;
    } catch (err) {
      console.error('[AiService] Error in AI Crash Analysis setup:', err);
      return null;
    }
  }
}
