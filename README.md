# AI Support Engine

Prototipo del equipo DMI: Francisco, Javier y Carlos. Clasifica solicitudes de soporte con un contrato común para dos motores.

## Integrantes y aportaciones

| Nombre completo | Matrícula | Aportación principal |
| --- | --- | --- |
| Francisco Xavier Gil Ginez | 3523110137 | Motor tradicional, API inicial, contrato común y casos de referencia |
| Javier Hernández Méndez | 3523110052 | Motor generativo con Groq, validación de salida y manejo de errores del proveedor |
| Carlos Eduardo Hernandez Camacho | 3515110194 | Comparación automatizada, evidencias reales, resultados y conclusión técnica |

### Francisco Xavier Gil Ginez

Implementó el motor tradicional mediante reglas para clasificar solicitudes como ACCESS, BUG, FEATURE o SECURITY, asignar prioridades y devolver respuestas predeterminadas. Definió la precedencia de seguridad y la revisión humana ante posibles incidentes o solicitudes ambiguas.

Preparó la API inicial POST /api/analyze, la validación de solicitudes, el contrato compartido y los errores controlados. Agregó doce casos de referencia, incluidos uno ambiguo y dos adversariales, las catorce pruebas iniciales, el comando de evidencia tradicional, CI y las exclusiones de archivos locales y secretos.

Archivos principales de su entrega inicial: `src/traditional.js`, `src/contract.js`, `src/server.js`, `tests/cases.json`, `tests/analyze.test.js`, `scripts/traditional-evidence.js`, `.github/workflows/ci.yml` y `.gitignore`. Varios recibieron ampliaciones posteriores del equipo.

Evidencia de autoría: [commit 82a530b](https://github.com/imnotfrank-x/ai-support-engine/commit/82a530be62c9fe3fcab9e5db7493765475eccb7a) y [PR 1](https://github.com/imnotfrank-x/ai-support-engine/pull/1). El motor tradicional obtuvo doce coincidencias de doce en los casos de referencia.

### Javier Hernández Méndez

Integró la API de Groq con el modelo predeterminado `openai/gpt-oss-20b`. Implementó `analyzeGenerative`, las instrucciones del modelo, la separación del mensaje como datos no confiables, la solicitud de JSON Schema estricto y la validación local de la respuesta.

Conectó el modo generativo al endpoint y agregó timeout, límite de tamaño de respuesta y errores controlados de autenticación, cuota, disponibilidad y formato. Conservó revisión humana ante indicios de seguridad sin alterar la categoría o prioridad del modelo. Agregó pruebas con proveedores controlados y el runner para conservar las doce respuestas reales y sus fallos; la ejecución final quedó incorporada en las evidencias de Carlos.

Archivos principales: `src/generative.js`, integración en `src/server.js`, `scripts/generative-evidence.js`, `tests/generative.test.js` y `tests/generative-evidence.test.js`, además de ajustes en pruebas existentes, comandos, CI y documentación. Su entrega dejó treinta y cuatro pruebas aprobadas, sin que las pruebas automatizadas consumieran cuota de Groq.

Evidencia de autoría: [commit 3f6dbf1](https://github.com/imnotfrank-x/ai-support-engine/commit/3f6dbf1a69ac30e367daeca06e2db7139b5a157d) y [PR 3](https://github.com/imnotfrank-x/ai-support-engine/pull/3), integrado en `develop`.

### Carlos Eduardo Hernandez Camacho

Implementó la comparación automática de los dos motores sobre los mismos doce casos. Verificó identificadores, mensajes y referencias, recalculó las métricas desde las respuestas y distinguió clasificación correcta de coincidencia completa con revisión humana. Los errores y formatos inválidos permanecen en el denominador.

Agregó el runner de evidencia HTTP real y el registro de fecha y commit evaluado. Incorporó las respuestas reales de Groq, la evidencia tradicional, las ejecuciones HTTP con error de configuración y posterior éxito, la tabla de veinticuatro filas en CSV y Markdown y una conclusión técnica de ciento tres palabras. Agregó diez pruebas de comparación y documentó cómo reproducir los resultados.

Archivos principales: `scripts/compare.js`, `scripts/api-evidence.js`, `tests/compare.test.js`, los archivos de `evidence/`, la instrumentación de ambos runners, `package.json` y este README. La entrega integrada cuenta con cuarenta y cuatro pruebas aprobadas.

Evidencia de autoría: [commit 2658caa](https://github.com/imnotfrank-x/ai-support-engine/commit/2658caaa3ed7ae21e9689fb085e11da2a10b7c88) y [PR 5](https://github.com/imnotfrank-x/ai-support-engine/pull/5), integrado en `develop`. Ambos motores lograron doce de doce clasificaciones correctas; al incluir revisión humana, el tradicional obtuvo doce de doce y Groq once de doce.

## Estado

- Motor tradicional por reglas y motor generativo mediante **Groq**, conectados a `POST /api/analyze`.
- Modelo predeterminado: **`openai/gpt-oss-20b`**, con salida JSON Schema estricta y validación local del contrato.
- Manejo de errores, cancelación por timeout, revisión humana ante indicios de seguridad y herramienta de evidencia para los 12 casos de referencia.
- **Evaluación real completada el 17 de noviembre de 2026:** ambos motores lograron 12/12 clasificaciones correctas. En coincidencia completa, tradicional obtuvo 12/12 y Groq 11/12.

Se eligió una API externa en lugar de Ollama para evitar la descarga y ejecución de modelos locales. El modelo utilizado no es `llama3.2:3b`. La comparación automatizada y las evidencias reales están disponibles en `evidence/`.

## Ejecución

Requisito: Node.js 22 o superior. No hay dependencias externas de npm; no es necesario ejecutar `npm install`.

```sh
npm test
npm run evidence
npm start
```

La API escucha en `http://127.0.0.1:3000`. Se pueden configurar `PORT` y `HOST`. El motor tradicional y las pruebas automatizadas no requieren clave ni conexión a Groq.

## Configurar Groq

1. Crear una cuenta en [Groq Console](https://console.groq.com).
2. Elegir el [plan gratuito](https://console.groq.com/settings/billing/plans) y crear una [API key](https://console.groq.com/keys).
3. Configurar `GROQ_API_KEY` únicamente en el entorno del servidor. No compartirla por chat, ponerla en el frontend ni subirla a Git.

| Variable | Predeterminado | Uso |
| --- | --- | --- |
| `GROQ_API_KEY` | obligatorio, sin valor por defecto | Clave privada de Groq |
| `GROQ_MODEL` | `openai/gpt-oss-20b` | Modelo compatible con JSON Schema estricto y `reasoning_effort: low` |
| `GROQ_TIMEOUT_MS` | `30000` | Timeout por análisis: entero de 1 a 2147483647 ms |
| `GROQ_DIAGNOSTICS` | desactivado | `1` conserva respuesta raw en errores para evidencia local; nunca en la API HTTP |

El endpoint está fijado a `https://api.groq.com/openai/v1/chat/completions`; no se siguen redirecciones para proteger la clave. El modelo predeterminado está documentado por Groq como compatible con [salidas estructuradas estrictas](https://console.groq.com/docs/structured-outputs).

Para introducir la clave sin mostrarla ni escribirla literalmente en el historial, usar PowerShell:

```powershell
$credential = Get-Credential -UserName 'groq' -Message 'Introduce tu API key en el campo de contraseña'
$env:GROQ_API_KEY = $credential.GetNetworkCredential().Password
$env:GROQ_MODEL = 'openai/gpt-oss-20b'
$env:GROQ_TIMEOUT_MS = '30000'
npm start
```

La variable queda disponible para procesos iniciados desde esa terminal, no para otras terminales ni para el editor ya abierto. También se puede crear un `.env` local ignorado por Git y cargarlo explícitamente con `node --env-file=.env src/server.js`. Node no carga `.env` automáticamente. El agente no necesita leer ese archivo.

### Límites, coste y privacidad

- El plan gratuito tiene límites por modelo, organización y disponibilidad; no es uso ilimitado. Consultar los [límites vigentes de la cuenta](https://console.groq.com/docs/rate-limits). El código no cambia de plan ni activa facturación.
- Los mensajes y respuestas se procesan en **un proveedor externo**, no localmente. Usar los casos sintéticos de referencia, nunca contraseñas, tokens, datos personales ni incidentes reales sensibles.
- Las evidencias guardan mensajes y respuestas completos. Revisarlas antes de publicarlas, especialmente si se habilitan diagnósticos raw.
- No hay reintentos automáticos ni fallback al motor tradicional. Un límite de cuota o fallo del proveedor se conserva como error, no como respuesta inventada.

## API y contrato

Con el servidor iniciado, petición en PowerShell:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/analyze' -Method Post -ContentType 'application/json' -Body '{"message":"No puedo iniciar sesion","mode":"generative"}'
```

`mode` admite `traditional` y `generative`. `message` debe ser texto no vacío de hasta 4000 caracteres. Los resultados exitosos cumplen `src/contract.js`:

- `category`: `ACCESS`, `BUG`, `FEATURE` o `SECURITY`.
- `priority`: `LOW`, `MEDIUM`, `HIGH` o `CRITICAL`.
- `response`: texto no vacío y contextualizado.
- `requiresHumanReview`: booleano; obligatorio `true` para `SECURITY`.
- `mode`: el modo solicitado.

El mensaje del usuario se envía como datos no confiables, separado de las instrucciones del sistema. Se rechazan campos extras, JSON malformado, salidas truncadas, rechazos del modelo y resultados fuera del contrato. La respuesta del proveedor se limita a 128 KiB; el timeout cubre conexión y lectura.

| HTTP | Situación |
| --- | --- |
| 400 | JSON o campos de entrada inválidos |
| 413 | Cuerpo mayor de 16 KiB |
| 415 | Content-Type distinto de JSON |
| 405 / 404 | Método incorrecto / ruta inexistente |
| 502 | Respuesta del proveedor inválida o petición rechazada por el proveedor |
| 503 | Clave/configuración inválida, cuota agotada, modelo o proveedor no disponible |
| 504 | Timeout del proveedor |
| 500 | Error interno, sin revelar detalles |

El modo generativo ya no devuelve 501. La API nunca expone la clave ni respuestas raw del proveedor.

## Seguridad y referencias

La seguridad tiene precedencia y siempre requiere revisión humana. Vulnerabilidades y credenciales expuestas: HIGH. Extracción activa de datos, ransomware o acceso no autorizado: CRITICAL. Acceso y fallas: MEDIUM, o HIGH ante afectación general o de producción. Funcionalidades nuevas: LOW. Casos sin información suficiente: BUG MEDIUM provisional, con revisión humana y solicitud de detalles.

El motor exige revisión para toda salida SECURITY. Además, una barrera conservadora reutiliza las reglas tradicionales para activar revisión ante indicios de seguridad aunque el modelo clasifique mal. **No corrige categoría ni prioridad** para mejorar métricas. Puede producir falsos positivos y no garantiza detectar todos los incidentes; no es una herramienta de seguridad para producción.

`tests/cases.json` fija nueve casos normales, uno ambiguo y dos adversariales antes de medir. No modificar las referencias en función de los resultados. La clasificación provisional BUG es una convención del equipo que debe revisarse con el profesor.

## Evidencia con el modelo real

Desde la terminal con `GROQ_API_KEY` configurada:

```sh
npm run --silent evidence:generative -- --output "evidence/groq-run-01.json"
```

Si la clave está en un `.env` local:

```sh
node --env-file=.env scripts/generative-evidence.js --output "evidence/groq-run-01.json"
```

El script llama directamente a `analyzeGenerative`; no requiere iniciar el servidor Node. Ejecuta los doce mensajes secuencialmente, exactamente una llamada por caso, sin enviar las referencias al modelo ni repetir selectivamente hasta acertar.

Conserva cada respuesta completa, incluso clasificaciones incorrectas, y los errores operacionales. Si se habilita `GROQ_DIAGNOSTICS=1`, también conserva `error.rawResponse` de salidas rechazadas. Registra proveedor, modelo configurado, timestamps UTC, duraciones, referencias, resultados, formato válido y coincidencia exacta de categoría, prioridad y revisión humana. Nunca registra `GROQ_API_KEY` como configuración.

Los porcentajes usan los doce casos como denominador, incluidos los fallidos; no comparan literalmente el texto de respuesta. Se devuelve código 1 ante errores operacionales, de formato o escritura; una clasificación incorrecta con formato válido reduce los aciertos pero no provoca por sí sola código de error. Las cuotas pueden impedir completar todas las inferencias: conservar esa ejecución y documentar cualquier ejecución posterior completa, sin ocultar fallos.

`--output` crea los directorios padre y guarda atómicamente el mismo JSON emitido a stdout, incluso ante errores. Una ruta existente se reemplaza: usar nombres distintos por ejecución. `npm run evidence` mide solo el motor tradicional. Doce casos no demuestran precisión en solicitudes nuevas. No se incluyen resultados generativos ficticios.

## Validación y colaboración

```sh
npm test
npm run evidence
```

Las pruebas cubren ambos motores, contrato, configuración, autenticación, cuota, JSON inválido, revisión humana, timeouts de conexión y lectura, integración HTTP con un proveedor local controlado y conservación de evidencia. No llaman a Groq ni gastan cuota.

Para la comparación la base es `origin/develop` y la rama es `feat/carlos-comparativa`:

```sh
git fetch origin
# Solo si la rama aún no existe:
git switch -c feat/carlos-comparativa origin/develop
npm test
# Tras revisar y hacer commit de archivos concretos:
git push -u origin feat/carlos-comparativa
```

Abrir PR con base **`develop`**. Otro integrante revisa y CI debe pasar antes de integrar. El workflow cubre PR hacia `develop` y `main`; no hacer push directo ni force push a estas ramas. Las protecciones remotas deben exigir PR, aprobación y el check `test`. Los tres integrantes deben poder explicar el código; la asistencia no sustituye su revisión.

Las aportaciones, nombres completos y matrículas de los tres integrantes se documentan en la sección [Integrantes y aportaciones](#integrantes-y-aportaciones) de este mismo README.

No subir `node_modules`, `.env`, claves, documentos de la actividad ni capturas ajenas al proyecto.

## Reproducir la comparación de Carlos

Preparación: 15 de noviembre de 2026 (America/Mexico_City). Base evaluada de los motores: `0368e08a10b8d9fefd16eb75f1017058652cca70`. Modelo configurado para la ejecución real del 17 de noviembre de 2026: `openai/gpt-oss-20b`. Los motores y `tests/cases.json` no fueron modificados. Los runners registran el commit HEAD y la fecha UTC; los cambios locales de instrumentación y comparación se entregan en esta rama.

Evidencia disponible:

- `evidence/traditional-run-01.json`: 12/12 coincidencias completas, 100%.
- `evidence/api-run-01.json`: HTTP real local, tradicional 200, generativo 503 por clave ausente, petición inválida 400. El 503 demuestra manejo de error y **no** una inferencia real del modelo.
- `evidence/groq-run-01.json`: 12/12 clasificaciones correctas (100%), 11/12 coincidencias completas (91.67%), sin errores operacionales ni formatos inválidos. En el caso 5 pidió revisión humana, aunque la referencia indica que no la requiere.
- `evidence/api-run-02.json`: tradicional y generativo con HTTP 200; petición inválida con HTTP 400. Se conserva la primera corrida con el error de configuración.
- `evidence/comparison.csv` y `evidence/comparison.md`: 24 filas, métricas y conclusión final. Ambos motores acertaron el caso ambiguo y los dos adversariales. Esta muestra pequeña no demuestra precisión general.

Con una clave guardada localmente en `.env` (ignorado por Git):

```powershell
node --env-file=.env scripts/generative-evidence.js --output evidence/groq-run-02.json
node --env-file=.env scripts/api-evidence.js evidence/api-run-03.json
npm run compare -- evidence/traditional-run-01.json evidence/groq-run-02.json
npm test
git diff --check
```

Si se usa `GROQ_API_KEY` en el entorno de la terminal, omitir `--env-file=.env`. Para otra ejecución tradicional, usar `npm run --silent evidence | Set-Content -Encoding utf8 evidence/traditional-run-02.json`. Usar nombres nuevos para conservar cada corrida y sus fallos. El runner HTTP inicia el servidor real en un puerto local libre, envía las tres peticiones y lo cierra; no requiere `npm start` adicional.

`scripts/compare.js` verifica identificadores únicos, mensajes, tipos y referencias contra `tests/cases.json`, une por id y genera **24 filas** en `evidence/comparison.csv` y `evidence/comparison.md`. Acepta un tercer argumento opcional para otro directorio de salida. No modifica las entradas. El Markdown incluye métricas, procedencia y una conclusión de menos de 150 palabras calculada a partir de los resultados.

Se recalculan dos indicadores para ambos motores:

- **Clasificación correcta:** respuesta válida, sin error, categoría y prioridad correctas.
- **Coincidencia completa:** lo anterior y revisión humana correcta; corresponde a `correct` en los runners originales.

Cada porcentaje usa los doce casos, incluidos errores y formatos inválidos. Los JSON conservan las respuestas completas. Las pruebas de comparación usan datos controlados exclusivamente para comprobar la lógica; no miden la calidad de Groq. Revisar la conclusión generada junto con las respuestas reales antes de abrir el PR a `develop`.
