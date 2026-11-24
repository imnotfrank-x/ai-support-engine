# AI Support Engine

Prototipo del equipo DMI: Francisco, Javier y Carlos. Clasifica solicitudes de soporte con un contrato común para tres motores: reglas, IA generativa y Machine Learning local.

## Integrantes y aportaciones

| Nombre completo | Matrícula | Aportación principal |
| --- | --- | --- |
| Francisco Xavier Gil Ginez | 3523110137 | Motor tradicional, API inicial y posterior integración Node de ML, pruebas y comparación triple |
| Javier Hernández Méndez | 3523110052 | Motor generativo con Groq; dataset, preprocesamiento y entrenamiento de ML local |
| Carlos Eduardo Hernandez Camacho | 3515110194 | Comparación inicial y evidencias; servicio de inferencia ML con FastAPI |

### Francisco Xavier Gil Ginez

Implementó el motor tradicional mediante reglas para clasificar solicitudes como ACCESS, BUG, FEATURE o SECURITY, asignar prioridades y devolver respuestas predeterminadas. Definió la precedencia de seguridad y la revisión humana ante posibles incidentes o solicitudes ambiguas.

Preparó la API inicial POST /api/analyze, la validación de solicitudes, el contrato compartido y los errores controlados. Agregó doce casos de referencia, incluidos uno ambiguo y dos adversariales, las catorce pruebas iniciales, el comando de evidencia tradicional, CI y las exclusiones de archivos locales y secretos.

Archivos principales de su entrega inicial: `src/traditional.js`, `src/contract.js`, `src/server.js`, `tests/cases.json`, `tests/analyze.test.js`, `scripts/traditional-evidence.js`, `.github/workflows/ci.yml` y `.gitignore`. Varios recibieron ampliaciones posteriores del equipo.

Evidencia de autoría: [commit 82a530b](https://github.com/imnotfrank-x/ai-support-engine/commit/82a530be62c9fe3fcab9e5db7493765475eccb7a) y [PR 1](https://github.com/imnotfrank-x/ai-support-engine/pull/1). El motor tradicional obtuvo doce coincidencias de doce en los casos de referencia.

En la ampliación ML (Parte 3), conectó Node con FastAPI mediante `src/ml.js`, registró `mode: "ml"`, agregó inyección de dependencias y errores 502/503/504, pruebas Node aisladas de Python, runners de evidencia real y la comparación de los tres motores. Conservó las etiquetas del servicio y una barrera que solo activa revisión humana ante indicios de seguridad. Su rama es `feat/francisco-ml-node`; las instrucciones y resultados están en [Integración ML local](#integración-ml-local).

### Javier Hernández Méndez

Integró la API de Groq con el modelo predeterminado `openai/gpt-oss-20b`. Implementó `analyzeGenerative`, las instrucciones del modelo, la separación del mensaje como datos no confiables, la solicitud de JSON Schema estricto y la validación local de la respuesta.

Conectó el modo generativo al endpoint y agregó timeout, límite de tamaño de respuesta y errores controlados de autenticación, cuota, disponibilidad y formato. Conservó revisión humana ante indicios de seguridad sin alterar la categoría o prioridad del modelo. Agregó pruebas con proveedores controlados y el runner para conservar las doce respuestas reales y sus fallos; la ejecución final quedó incorporada en las evidencias de Carlos.

Archivos principales: `src/generative.js`, integración en `src/server.js`, `scripts/generative-evidence.js`, `tests/generative.test.js` y `tests/generative-evidence.test.js`, además de ajustes en pruebas existentes, comandos, CI y documentación. Su entrega dejó treinta y cuatro pruebas aprobadas, sin que las pruebas automatizadas consumieran cuota de Groq.

Evidencia de autoría: [commit 3f6dbf1](https://github.com/imnotfrank-x/ai-support-engine/commit/3f6dbf1a69ac30e367daeca06e2db7139b5a157d) y [PR 3](https://github.com/imnotfrank-x/ai-support-engine/pull/3), integrado en `develop`.

En la ampliación ML (Parte 1), preparó el dataset sintético de 280 tickets, la normalización de texto, el entrenamiento TF-IDF con regresión logística para categoría y prioridad, las métricas y las pruebas del dataset y entrenamiento. Su aportación se integró mediante el [PR 10](https://github.com/imnotfrank-x/ai-support-engine/pull/10).

### Carlos Eduardo Hernandez Camacho

Implementó la comparación automática de los dos motores sobre los mismos doce casos. Verificó identificadores, mensajes y referencias, recalculó las métricas desde las respuestas y distinguió clasificación correcta de coincidencia completa con revisión humana. Los errores y formatos inválidos permanecen en el denominador.

Agregó el runner de evidencia HTTP real y el registro de fecha y commit evaluado. Incorporó las respuestas reales de Groq, la evidencia tradicional, las ejecuciones HTTP con error de configuración y posterior éxito, la tabla de veinticuatro filas en CSV y Markdown y una conclusión técnica de ciento tres palabras. Agregó diez pruebas de comparación y documentó cómo reproducir los resultados.

Archivos principales: `scripts/compare.js`, `scripts/api-evidence.js`, `tests/compare.test.js`, los archivos de `evidence/`, la instrumentación de ambos runners, `package.json` y este README. La entrega integrada cuenta con cuarenta y cuatro pruebas aprobadas.

Evidencia de autoría: [commit 2658caa](https://github.com/imnotfrank-x/ai-support-engine/commit/2658caaa3ed7ae21e9689fb085e11da2a10b7c88) y [PR 5](https://github.com/imnotfrank-x/ai-support-engine/pull/5), integrado en `develop`. Ambos motores lograron doce de doce clasificaciones correctas; al incluir revisión humana, el tradicional obtuvo doce de doce y Groq once de doce.

En la ampliación ML (Parte 2), implementó `ml/src/predict.py` y `ml/src/app.py`: carga de modelos, inferencia, regla de baja confianza, plantillas y endpoints `/health` y `/predict`. Agregó las pruebas del servicio FastAPI. Su aportación se integró mediante el [PR 9](https://github.com/imnotfrank-x/ai-support-engine/pull/9).

## Estado

Dataset vigente desde el 24 de noviembre de 2026: `ml/data/tickets.csv` contiene **200 ejemplos sintéticos**, sustituyendo los 280 anteriores. Las filas de datos 1–160 se usan para entrenar y las 161–200 quedan reservadas para prueba (sin contar el encabezado). El mismo reparto se utiliza en categoría, prioridad y los ejemplos básicos de Javier. Las evidencias fechadas anteriormente se conservan como resultados históricos del dataset anterior; no describen los modelos reentrenados con estos 200 ejemplos.

- Motor tradicional por reglas, generativo mediante **Groq** y ML local mediante **FastAPI**, conectados a `POST /api/analyze`.
- Modelo predeterminado: **`openai/gpt-oss-20b`**, con salida JSON Schema estricta y validación local del contrato.
- Manejo de errores, cancelación por timeout, revisión humana ante indicios de seguridad y herramienta de evidencia para los 12 casos de referencia.
- **Evaluación real completada el 17 de noviembre de 2026:** ambos motores lograron 12/12 clasificaciones correctas. En coincidencia completa, tradicional obtuvo 12/12 y Groq 11/12.
- **Ampliación ML evaluada el 18 de noviembre de 2026 (America/Mexico_City):** 7/12 clasificaciones correctas y 6/12 coincidencias completas. Se conservaron los doce resultados, incluidos los fallos, en `evidence/ml-run-01.json`.

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

`mode` admite `traditional`, `generative` y `ml`. `message` debe ser texto no vacío de hasta 4000 caracteres. Los resultados exitosos cumplen `src/contract.js`:

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

## Integración ML local

Para usar el dataset vigente hay que reentrenar y reiniciar FastAPI. No se debe reutilizar un `.joblib` entrenado con los 280 ejemplos antiguos. Véanse los [comandos de entrenamiento y evaluación del dataset de 200](#dataset-de-200-y-ejemplos-de-javier).

La arquitectura es híbrida: Node.js funciona como gateway y dueño del contrato; `src/ml.js` consulta por HTTP al servicio Python. FastAPI carga en memoria los dos pipelines de Javier y devuelve los cinco campos esperados. Los modos tradicional y ML pueden operar localmente sin una API externa durante la inferencia; el generativo sigue utilizando Groq.

```text
POST /api/analyze -> Node.js y validaciones
                     |-- traditional -> reglas locales
                     |-- generative  -> Groq
                     `-- ml          -> src/ml.js -> FastAPI /predict -> modelos entrenados
```

### Preparación y arranque

Desde la raíz del proyecto, con Python compatible con `ml/requirements.txt` y Node.js 22 o superior:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r ml/requirements.txt
.\.venv\Scripts\python.exe ml/src/train.py
.\.venv\Scripts\python.exe -m uvicorn ml.src.app:app --host 127.0.0.1 --port 8000
```

El entrenamiento genera los `.joblib` ignorados por Git. No requiere cambiar el dataset ni las referencias. Solo deben cargarse modelos generados localmente por el proyecto; los binarios de joblib no son un formato seguro para archivos no confiables. Reentrenar también regenera `ml/artifacts/metrics.json`; revisar ese cambio antes de versionarlo.

En otra terminal, dentro del mismo proyecto:

```powershell
npm start
```

Y para probar la integración HTTP real:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health'
$body = @{ message = 'Alguien entro a mi cuenta sin autorizacion'; mode = 'ml' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/analyze' -Method Post -ContentType 'application/json' -Body $body
```

| Variable del servidor Node | Predeterminado | Uso |
| --- | --- | --- |
| `ML_SERVICE_URL` | `http://127.0.0.1:8000/predict` | URL HTTP/HTTPS de inferencia, sin credenciales ni fragmento; no proviene del cliente |
| `ML_TIMEOUT_MS` | `5000` | Timeout de conexión y lectura, entero positivo de hasta 2147483647 ms |
| `ML_ARTIFACTS_DIR` | `ml/artifacts` respecto al proyecto | Solo para el runner de evidencia, permite registrar hashes y métricas si los modelos están en otra carpeta |

Una configuración inválida, fallo de red o HTTP 503 del servicio se traduce en 503. Timeout devuelve 504. Estados inesperados del servicio (incluidos 422/500), JSON inválido, campos extra y resultados fuera de contrato devuelven 502. El gateway no expone el cuerpo del error de Python ni las trazas. No sigue redirecciones ni sustituye silenciosamente ML por otro motor.

### Pruebas y evidencias reproducibles

```powershell
npm test
.\.venv\Scripts\python.exe -m unittest discover -s ml/tests -v
npm run evidence:ml -- --output evidence/ml-run-02.json
npm run evidence:ml:api -- evidence/ml-api-run-02.json
npm run compare:ml -- evidence/traditional-run-01.json evidence/groq-run-01.json evidence/ml-run-02.json
```

Los dos comandos de evidencia requieren FastAPI real encendido. `evidence:ml` consulta el servicio mediante `analyzeMl` una vez por cada caso, en orden, sin reintentos ni referencias enviadas al modelo. Conserva respuestas y errores. Sin argumentos usa `evidence/ml-run-01.json`; si ya existe, se rechaza la operación para preservar la corrida. Usar nombres nuevos. `evidence:ml:api` inicia un gateway HTTP real en un puerto libre y lo cierra al terminar; registra dos solicitudes ML y una entrada inválida, sin mocks.

`compare:ml` produce `comparison-ml.csv` y `comparison-ml.md`, con 36 filas y la misma definición de acierto para todos. Admite una cuarta ruta opcional para guardar la comparación en otra carpeta. No altera la comparación de dos motores ni los JSON anteriores. Al reutilizar las evidencias originales, compara las mismas referencias pero corridas de distintas fechas y commits, no una ejecución simultánea.

La corrida de Francisco registró **60 pruebas Node y 18 pruebas Python aprobadas**. Las pruebas Node no requieren Python, servicio activo, claves ni conexión a Groq. CI ejecuta ambos conjuntos en jobs separados; las pruebas Python entrenan sus propios artefactos temporales.

### Resultados reales de la comparación triple

| Motor | Categoría y prioridad correctas | Coincidencia completa con revisión humana | Formato válido |
| --- | --- | --- | --- |
| Traditional | 12/12 (100%) | 12/12 (100%) | 12/12 |
| Generative (Groq) | 12/12 (100%) | 11/12 (91.67%) | 12/12 |
| ML local | 7/12 (58.33%) | 6/12 (50%) | 12/12 |

Fuentes: [ML real](evidence/ml-run-01.json), [gateway y FastAPI reales](evidence/ml-api-run-01.json), [tabla y conclusión triple](evidence/comparison-ml.md). La evidencia ML contiene el commit evaluado, el estado limpio de los archivos versionados, fechas UTC, hashes de modelos y dataset y métricas del entrenamiento local. Para no sobrescribir el reporte de entrenamiento previo, esta verificación entrenó en una carpeta temporal fuera del repositorio y arrancó `create_app(artifacts_dir)` con esos modelos; se utilizó el puerto 8018. Las instrucciones anteriores usan la carpeta y puerto predeterminados. Las versiones exactas usadas están en la evidencia.

El servicio Python aplica un umbral fijo de confianza de categoría de 0.55: por debajo devuelve BUG/MEDIUM provisional con revisión humana. Node conserva esa salida y solo fuerza revisión si las reglas tradicionales detectan seguridad. Por ello, estos porcentajes evalúan el motor completo y no las etiquetas crudas de regresión logística. Los casos 2, 3, 11 y 12 quedaron incorrectos tras la regla provisional; el caso 5 falló en prioridad y el caso 4 difirió en revisión humana. No se ajustó el umbral ni el entrenamiento mirando estos doce casos.

Las métricas históricas del dataset de 280, sobre 56 ejemplos de prueba (85.71% en categoría y 82.14% en prioridad), evalúan otro conjunto y cada objetivo por separado; no equivalen al 58.33% conjunto sobre estas doce referencias. Los datos sintéticos y la muestra pequeña limitan la generalización. Los porcentajes tampoco garantizan que el texto de respuesta sea verdadero o que todos los incidentes se detecten.

## Dataset de 200 y ejemplos de Javier

El único CSV vigente es `ml/data/tickets.csv`, con columnas `message,category,priority`. No se agregan copias paralelas de entrenamiento y prueba: su orden fija la partición. Contiene 50 ejemplos de cada categoría; las primeras 160 filas tienen 40 por categoría y las últimas 40 tienen 10 por categoría. Hay 50 prioridades LOW, 60 MEDIUM, 65 HIGH y 25 CRITICAL, según el impacto descrito. Los mensajes no se repiten tras normalizarlos ni coinciden con los doce casos externos.

No barajar ni ordenar el CSV antes de entrenar: las últimas 40 filas son el conjunto reservado y no deben participar en `fit`, en el ajuste del vocabulario ni en la selección de parámetros. `split_dataset()` comparte exactamente ese reparto entre los dos objetivos y los ejemplos de Javier. `--random-state` controla el modelo, no cambia las filas reservadas. Si se cambia `--test-size`, se cambia el límite de la reserva; mantener el valor predeterminado 0.2 para respetar 160/40.

Desde la raíz del repositorio, con las dependencias de `ml/requirements.txt` instaladas:

```powershell
# Ejemplo básico de Javier: solo categoría; modelo separado del servicio.
.\.venv\Scripts\python.exe ml/examples/train_basic.py
.\.venv\Scripts\python.exe ml/examples/evaluate_basic.py

# Dos clasificadores que utiliza el servicio FastAPI: categoría y prioridad.
.\.venv\Scripts\python.exe ml/src/train.py
.\.venv\Scripts\python.exe -m unittest discover -s ml/tests -v
```

Verificación del 24 de noviembre de 2026: **23 pruebas Python y 60 Node aprobadas**. El ejemplo básico de Javier logró 35/40 (87.5%) en categoría. Los pipelines del servicio lograron 36/40 (90%) en categoría y 36/40 (90%) en prioridad por separado; los reportes están en `ml/artifacts/metrics.json`, con hash del CSV, versiones y reparto. No son porcentajes de coincidencia conjunta ni de la API completa con la regla de confianza.

### Tabla de los 40 casos en terminal

`python ml/examples/evaluate_basic.py` imprime una fila por cada caso reservado (filas de datos 161–200): mensaje abreviado, categoría real, predicción y acierto. Después muestra **accuracy** en porcentaje y aciertos/total, precisión, recall, F1-score y soporte por categoría, promedios macro y ponderado, y matriz de confusión. El ejemplo básico solo predice categoría.

`python ml/src/train.py` imprime la tabla de esos mismos 40 casos con categoría y prioridad reales y predichas, acierto conjunto y los reportes de métricas y matrices de confusión de los dos objetivos. Se conserva la división 160/40 y no se ocultan errores. Los textos solo se abrevian para mostrar la tabla; el CSV no cambia. Los reportes son de los clasificadores, sin el fallback de confianza de la API.

Para mostrarlo al profesor, ejecutar los comandos anteriores desde el entorno virtual. Si falta el modelo básico, ejecutar primero `python ml/examples/train_basic.py`. La salida tabular se verificó con **29 pruebas Python aprobadas**, incluyendo que se imprimen exactamente las 40 filas y que las métricas coinciden con las calculadas sobre el holdout.

Se mantiene el umbral de 0.55 del servicio. Por ejemplo, el mensaje de acceso no autorizado usado en la demostración obtiene categoría cruda SECURITY con confianza aproximada 0.3883 y la API devuelve BUG/MEDIUM provisional con revisión humana. Se documenta la incertidumbre y se conserva la revisión; no se ajustó el umbral para aumentar el resultado de prueba.

El conjunto de 40 permite evaluar esta demostración sintética, no garantizar generalización real. Las evidencias anteriores no se reescriben; nuevas ejecuciones deben guardarse con otro nombre. Los `.joblib` y `.venv` permanecen fuera de Git. La integración de los scripts de Javier conserva su commit original `7faa431`; estos cambios ajustan su lectura al reparto fijo.
