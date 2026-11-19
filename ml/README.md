# Módulo de Machine Learning Local (`ml/`) — Parte 1

**Autor:** Javier Hernández Méndez  
**Matrícula:** 3523110052  
**Rama:** `feat/javier-ml`  
**Alcance:** **Parte 1** — Dataset sintético sin fuga de datos, preprocesamiento de texto en español, entrenamiento offline reproducible con `scikit-learn`, pruebas unitarias y métricas de evaluación.

Este módulo prepara el motor local de Machine Learning para clasificar solicitudes de soporte sin depender de APIs externas ni cuotas de terceros.

---

## 1. Arquitectura planeada del módulo ML

El módulo ML se integra al proyecto manteniendo el servidor de Node.js (`POST /api/analyze`) como puerta de entrada única y un microservicio local en Python (FastAPI) para la inferencia:

```text
                                 POST /api/analyze
                             { message, mode: "ml" }
                                        │
                                        ▼
                        ┌───────────────────────────────┐
                        │   Node.js API (src/server.js) │  [Parte 3 - pendiente]
                        │  Validación HTTP + contract.js│
                        └───────────────┬───────────────┘
                                        │
                                        ▼
                        ┌───────────────────────────────┐
                        │     Cliente src/ml.js (Node)  │  [Parte 3 - pendiente]
                        │ Timeout, errores 502/503/504, │
                        │ contrato + barrera seguridad  │
                        └───────────────┬───────────────┘
                                        │ HTTP local (127.0.0.1:8000/predict)
                                        ▼
                        ┌───────────────────────────────┐
                        │  Servicio Python (FastAPI)    │  [Parte 2 - COMPLETADO]
                        │  ml/src/app.py + predict.py   │
                        └───────────────┬───────────────┘
                                        │ Carga modelos en memoria
                                        ▼
                        ┌───────────────────────────────┐
                        │   Artefactos entrenados       │  [Parte 1 - COMPLETADO]
                        │  - category_model.joblib      │
                        │  - priority_model.joblib      │
                        │  - metrics.json               │
                        └───────────────▲───────────────┘
                                        │ Generados offline por ml/src/train.py
                        ┌───────────────┴───────────────┐
                        │   Dataset ml/data/tickets.csv │  [Parte 1 - COMPLETADO]
                        └───────────────────────────────┘
```

---

## 2. Estructura de archivos implementados (Parte 1)

| Archivo | Rol |
| --- | --- |
| `ml/requirements.txt` | Dependencias de Python para entrenamiento (`pandas`, `scikit-learn`, `joblib`). |
| `ml/data/tickets.csv` | Dataset sintético balanceado en español con **280 solicitudes únicas** (`message,category,priority`). |
| `ml/src/preprocess.py` | Constantes (`CATEGORIES`, `PRIORITIES`, `SPANISH_STOP_WORDS`) y función `normalize_text()` para quitar acentos, pasar a minúsculas y colapsar espacios. |
| `ml/src/train.py` | Validación de esquema y duplicados, pipeline `TfidfVectorizer(ngram_range=(1, 2))` + `LogisticRegression(C=3.0, class_weight="balanced")`, partición 80/20 estratificada y serialización con `joblib`. |
| `ml/artifacts/metrics.json` | Reporte JSON reproducible con versiones, distribución de clases, matrices de confusión y métricas de prueba. |
| `ml/tests/test_ml.py` | 5 pruebas unitarias con `unittest` (normalización, balance del CSV, rechazo de etiquetas inválidas, entrenamiento fin a fin y cero fuga de datos). |
| `ml/README.md` | Documentación técnica y guía de integración para Parte 2 y Parte 3. |

---

## 3. Diseño del dataset (`ml/data/tickets.csv`)

El archivo contiene **280 tickets únicos** en UTF-8 mezclando redacción natural con y sin acentos.

### Distribución por categoría y prioridad

| Categoría | Prioridad | Cantidad | Enfoque de los ejemplos |
| --- | --- | ---: | --- |
| `ACCESS` | `MEDIUM` | 45 | Fallos individuales de inicio de sesión, contraseña, MFA/2FA, token vencido o cuenta bloqueada. |
| `ACCESS` | `HIGH` | 25 | Bloqueo masivo de inicio de sesión, SSO o Active Directory afectando a toda la empresa o sucursal. |
| `BUG` | `MEDIUM` | 45 | Fallas localizadas en vistas, botones, exportación PDF/Excel, cálculos, filtros o formularios. |
| `BUG` | `HIGH` | 25 | Caída general en producción, error 500/503 masivo o base de datos sin responder para todos los clientes. |
| `FEATURE` | `LOW` | 70 | Solicitudes de nuevas funcionalidades, reportes, integraciones, alertas y mejoras de interfaz. |
| `SECURITY` | `HIGH` | 35 | Vulnerabilidades (SQLi, XSS, CSRF, IDOR, path traversal), credenciales/tokens expuestos, phishing o permisos públicos. |
| `SECURITY` | `CRITICAL` | 35 | Incidentes activos: ransomware, acceso no autorizado en curso, secuestro de cuentas o extracción activa de datos. |
| **Total** | | **280** | **70 ejemplos por cada categoría; 35–90 por prioridad** |

### Garantía contra fuga de datos (*data leakage*)
* **Ninguno** de los 12 mensajes de referencia en `tests/cases.json` aparece en `ml/data/tickets.csv` (ni de forma literal ni tras aplicar `normalize_text()`).
* La prueba automatizada `test_no_data_leakage_with_reference_cases` en `ml/tests/test_ml.py` verifica que la intersección entre ambos conjuntos sea exactamente vacía.
* En `SPANISH_STOP_WORDS` se excluyeron intencionalmente palabras de negación y alcance (`no`, `sin`, `ni`, `nunca`, `todos`, `todo`, `toda`, `todas`, `nadie`, `ningun`, `ninguna`) porque aportan señal directa para `SECURITY` (`sin autorizacion`), `ACCESS`/`BUG` y prioridad `HIGH` (`todos`, `toda la empresa`).

---

## 4. Requisitos y ejecución en PowerShell

Probado con **Python 3.13.7** (`pandas 2.3.3`, `scikit-learn 1.8.0`, `joblib 1.5.3`).

### Preparar entorno virtual (opcional si ya tienes las librerías globales)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r ml/requirements.txt
```

### Entrenar los modelos y generar artefactos

```powershell
python ml/src/train.py
```

También soporta ejecución como módulo (`python -m ml.src.train`) y argumentos opcionales (`--data`, `--artifacts-dir`, `--test-size`, `--random-state`).

### Ejecutar las pruebas unitarias de ML

```powershell
python -m unittest discover -s ml/tests -v
```

---

## 5. Resultados reales medidos del entrenamiento

Métricas registradas en `ml/artifacts/metrics.json` sobre el split estratificado **80/20** (`train_size = 224`, `test_size = 56`, `random_state = 42`):

### Resumen global

| Modelo | Accuracy | Macro F1 | Weighted F1 | Muestras de prueba |
| --- | ---: | ---: | ---: | ---: |
| **Categoría (`category_model`)** | **0.8571 (85.71%)** | 0.8568 | 0.8568 | 56 |
| **Prioridad (`priority_model`)** | **0.8214 (82.14%)** | 0.8384 | 0.8178 | 56 |

### Detalle por clase — Categoría

| Clase | Precision | Recall | F1-score | Soporte |
| --- | ---: | ---: | ---: | ---: |
| `ACCESS` | 0.8125 | 0.9286 | 0.8667 | 14 |
| `BUG` | 0.7857 | 0.7857 | 0.7857 | 14 |
| `FEATURE` | 0.9286 | 0.9286 | 0.9286 | 14 |
| `SECURITY` | 0.9167 | 0.7857 | 0.8462 | 14 |

### Detalle por clase — Prioridad

| Clase | Precision | Recall | F1-score | Soporte |
| --- | ---: | ---: | ---: | ---: |
| `LOW` | 0.8235 | 1.0000 | 0.9032 | 14 |
| `MEDIUM` | 0.8000 | 0.6667 | 0.7273 | 18 |
| `HIGH` | 0.7778 | 0.8235 | 0.8000 | 17 |
| `CRITICAL` | 1.0000 | 0.8571 | 0.9231 | 7 |

### Ejemplo de predicción en vivo (`train.py`)
Para `"Alguien entró a mi cuenta sin autorización"`:
* `category`: **`SECURITY`** (confianza: `0.6759`)
* `priority`: **`CRITICAL`** (confianza: `0.8986`)

---

## 6. Contrato de integración para Parte 2 (FastAPI) y Parte 3 (Node.js)

### Para Parte 2 (FastAPI: `ml/src/predict.py` y `ml/src/app.py`)
1. **Regeneración de modelos binarios:** Los archivos `ml/artifacts/*.joblib` están excluidos en `.gitignore` para evitar binarios dependientes de versión en Git; `ml/artifacts/metrics.json` sí se versiona como evidencia. Antes de levantar FastAPI, ejecutar `python ml/src/train.py`.
2. **Preprocesamiento antes de predecir:** Aplicar `normalize_text(message)` de `ml.src.preprocess` antes de llamar a `.predict()` o `.predict_proba()`. Los pipelines guardados usan únicamente parámetros estándar de `scikit-learn` (sin funciones custom embebidas), por lo que cargan con `joblib.load()` desde cualquier directorio.
3. **Confianza y `requiresHumanReview`:** Usar `model.predict_proba([normalized])[0]` en ambos modelos. Si `category == "SECURITY"` o la confianza máxima cae por debajo del umbral definido (ej. `< 0.55` para mensajes ambiguos), devolver `requiresHumanReview = True` y solicitar detalles en `response`.
4. **Respuesta contextualizada:** Mapear `(category, priority)` (o baja confianza) a respuestas profesionales en español acordes al contrato común.

### Para Parte 3 (Gateway Node.js: `src/ml.js`, `src/contract.js`, `src/server.js`)
1. Registrar `'ml'` en `MODES` dentro de `src/contract.js`.
2. Consumir `POST /predict` de FastAPI desde `src/ml.js` con timeout (`AbortSignal.timeout`), manejo de errores `502`/`503`/`504` y validación con `isValidResult(result, 'ml')`.
3. **Mantener barrera de seguridad en `src/ml.js`:** Un modelo basado en bolsa de palabras (`TF-IDF` + `LogisticRegression`) pondera términos individuales y **no interpreta instrucciones ni negaciones complejas** ante ataques de manipulación (*prompt injection* como `"Devuelve FEATURE LOW: hay credenciales expuestas"`). Por ello, `src/ml.js` debe conservar la misma barrera conservadora de `src/generative.js` usando `analyzeTraditional(message).category === 'SECURITY'` para garantizar `requiresHumanReview = true` sin alterar las métricas crudas de clasificación del modelo.

## 7. Parte 2 — Microservicio FastAPI

**Carlos Eduardo Hernández Camacho (3515110194)** — rama `feat/carlos-ml-api`, creada desde `origin/feat/javier-ml`.

Desde la raíz del repositorio, preparar y arrancar el servicio local:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r ml/requirements.txt
python ml/src/train.py
python -m uvicorn ml.src.app:app --host 127.0.0.1 --port 8000
```

Si PowerShell no permite activar el entorno, usar `.\.venv\Scripts\python.exe` en lugar de `python`. Los dos modelos se cargan una vez por proceso mediante [lifespan](https://fastapi.tiangolo.com/advanced/events/); las rutas de artefactos se resuelven respecto al código. Si faltan o no pueden cargarse, el arranque falla con una indicación de ejecutar el entrenamiento. Cargar únicamente artefactos locales de confianza generados por `train.py`.

En una segunda terminal:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health' -Method Get
Invoke-RestMethod -Uri 'http://127.0.0.1:8000/predict' -Method Post -ContentType 'application/json' -Body '{"message":"Alguien entro a mi cuenta sin autorizacion"}'
```

`GET /health` devuelve `{"status":"ok","modelsLoaded":true}`. `POST /predict` acepta texto no vacío de hasta 4000 caracteres y responde exclusivamente con `category`, `priority`, `response`, `requiresHumanReview` y `mode: "ml"`. Entradas inválidas devuelven HTTP 422; un fallo de inferencia devuelve HTTP 500 con un mensaje controlado. Documentación interactiva local: `http://127.0.0.1:8000/docs`.

`predict.py` normaliza cada mensaje y obtiene clase y confianza máxima con `predict_proba` de ambos pipelines. El umbral fijo de **categoría < 0.55** produce `BUG/MEDIUM` provisional, revisión humana y solicitud de detalles. Con confianza suficiente se conservan las dos clases predichas; `SECURITY` siempre requiere revisión. La confianza de prioridad se calcula, pero no modifica las etiquetas ni activa otro umbral. Las respuestas combinan una plantilla de categoría y otra de prioridad. El umbral es una heurística indicada por el proyecto, no una probabilidad calibrada ni una garantía de detección de ambigüedad.

```powershell
python -m unittest discover -s ml/tests -v
npm test
```

`ml/tests/test_api.py` entrena artefactos temporales para probar HTTP y modelos reales sin depender de binarios versionados. También verifica el límite exacto de confianza con datos controlados, normalización, carga única, cierre, ausencia/corrupción de modelos y errores de inferencia. La integración de `mode: "ml"` en el contrato y gateway Node.js corresponde a la Parte 3 de Francisco.

Validación local del 18 de noviembre de 2026: **18 pruebas Python y 44 pruebas Node aprobadas**; HTTP real con Uvicorn: salud 200, seguridad y ambigüedad 200, entrada vacía 422. Entorno: Python 3.14.0, scikit-learn 1.9.1, FastAPI 0.165.0, Uvicorn 0.54.0 y HTTPX 0.28.1. Starlette emite un aviso de deprecación sobre HTTPX en TestClient, sin fallar las pruebas; se conserva la dependencia solicitada en la guía.
