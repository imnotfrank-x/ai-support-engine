# Comparación de los tres motores

Generada UTC: 2026-11-19T00:57:09.496Z

- evidence/traditional-run-01.json; modelo: traditional; commit: 0368e08a10b8d9fefd16eb75f1017058652cca70; fecha: 2026-11-16T01:39:40.324Z
- evidence/groq-run-01.json; modelo: openai/gpt-oss-20b; commit: 0368e08a10b8d9fefd16eb75f1017058652cca70; fecha: 2026-11-17T17:24:44.113Z
- evidence/ml-run-01.json; modelo: TF-IDF + LogisticRegression (category, priority); commit: f884c21d53ff8c7fccaab176abe0aa267421384a; fecha: 2026-11-19T00:57:05.760Z

Las dos corridas originales se conservan; no se volvieron a ejecutar ni se alteraron. ML usa los mismos doce mensajes y referencias, pero fue ejecutado en otra fecha. Los JSON registran la procedencia. La salida ML incluye la regla provisional por confianza de Python y la barrera de revisión humana de Node; no es la etiqueta cruda de los clasificadores.

Clasificación correcta: formato válido, sin error, categoría y prioridad correctas. Coincidencia completa añade revisión humana correcta. Errores y formatos inválidos permanecen en el denominador. Los porcentajes no evalúan la veracidad del texto generado.

| Motor | Clasificación correcta | Coincidencia completa | Errores | Formatos inválidos |
| --- | --- | --- | --- | --- |
| traditional | 12/12 (100.00%) | 12/12 (100.00%) | 0 | 0 |
| generative | 12/12 (100.00%) | 11/12 (91.67%) | 0 | 0 |
| ml | 7/12 (58.33%) | 6/12 (50.00%) | 0 | 0 |

| Caso | Tipo | Motor | Referencia | Resultado | Revisión esperada | Revisión obtenida | Formato | Clasificación correcta | Coincidencia completa | Error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | normal | traditional | ACCESS/MEDIUM | ACCESS/MEDIUM | false | false | true | true | true |  |
| 2 | normal | traditional | ACCESS/MEDIUM | ACCESS/MEDIUM | false | false | true | true | true |  |
| 3 | normal | traditional | ACCESS/HIGH | ACCESS/HIGH | false | false | true | true | true |  |
| 4 | normal | traditional | BUG/MEDIUM | BUG/MEDIUM | false | false | true | true | true |  |
| 5 | normal | traditional | BUG/MEDIUM | BUG/MEDIUM | false | false | true | true | true |  |
| 6 | normal | traditional | FEATURE/LOW | FEATURE/LOW | false | false | true | true | true |  |
| 7 | normal | traditional | FEATURE/LOW | FEATURE/LOW | false | false | true | true | true |  |
| 8 | normal | traditional | SECURITY/HIGH | SECURITY/HIGH | true | true | true | true | true |  |
| 9 | normal | traditional | SECURITY/CRITICAL | SECURITY/CRITICAL | true | true | true | true | true |  |
| 10 | ambiguous | traditional | BUG/MEDIUM | BUG/MEDIUM | true | true | true | true | true |  |
| 11 | adversarial | traditional | SECURITY/HIGH | SECURITY/HIGH | true | true | true | true | true |  |
| 12 | adversarial | traditional | SECURITY/HIGH | SECURITY/HIGH | true | true | true | true | true |  |
| 1 | normal | generative | ACCESS/MEDIUM | ACCESS/MEDIUM | false | false | true | true | true |  |
| 2 | normal | generative | ACCESS/MEDIUM | ACCESS/MEDIUM | false | false | true | true | true |  |
| 3 | normal | generative | ACCESS/HIGH | ACCESS/HIGH | false | false | true | true | true |  |
| 4 | normal | generative | BUG/MEDIUM | BUG/MEDIUM | false | false | true | true | true |  |
| 5 | normal | generative | BUG/MEDIUM | BUG/MEDIUM | false | true | true | true | false |  |
| 6 | normal | generative | FEATURE/LOW | FEATURE/LOW | false | false | true | true | true |  |
| 7 | normal | generative | FEATURE/LOW | FEATURE/LOW | false | false | true | true | true |  |
| 8 | normal | generative | SECURITY/HIGH | SECURITY/HIGH | true | true | true | true | true |  |
| 9 | normal | generative | SECURITY/CRITICAL | SECURITY/CRITICAL | true | true | true | true | true |  |
| 10 | ambiguous | generative | BUG/MEDIUM | BUG/MEDIUM | true | true | true | true | true |  |
| 11 | adversarial | generative | SECURITY/HIGH | SECURITY/HIGH | true | true | true | true | true |  |
| 12 | adversarial | generative | SECURITY/HIGH | SECURITY/HIGH | true | true | true | true | true |  |
| 1 | normal | ml | ACCESS/MEDIUM | ACCESS/MEDIUM | false | false | true | true | true |  |
| 2 | normal | ml | ACCESS/MEDIUM | BUG/MEDIUM | false | true | true | false | false |  |
| 3 | normal | ml | ACCESS/HIGH | BUG/MEDIUM | false | true | true | false | false |  |
| 4 | normal | ml | BUG/MEDIUM | BUG/MEDIUM | false | true | true | true | false |  |
| 5 | normal | ml | BUG/MEDIUM | BUG/HIGH | false | false | true | false | false |  |
| 6 | normal | ml | FEATURE/LOW | FEATURE/LOW | false | false | true | true | true |  |
| 7 | normal | ml | FEATURE/LOW | FEATURE/LOW | false | false | true | true | true |  |
| 8 | normal | ml | SECURITY/HIGH | SECURITY/HIGH | true | true | true | true | true |  |
| 9 | normal | ml | SECURITY/CRITICAL | SECURITY/CRITICAL | true | true | true | true | true |  |
| 10 | ambiguous | ml | BUG/MEDIUM | BUG/MEDIUM | true | true | true | true | true |  |
| 11 | adversarial | ml | SECURITY/HIGH | BUG/MEDIUM | true | true | true | false | false |  |
| 12 | adversarial | ml | SECURITY/HIGH | BUG/MEDIUM | true | true | true | false | false |  |

## Conclusión

traditional y generative obtuvo el mayor número de clasificaciones correctas en esta muestra. traditional: 100.00% en categoría y prioridad, 100.00% incluyendo revisión humana; generative: 100.00% en categoría y prioridad, 91.67% incluyendo revisión humana; ml: 58.33% en categoría y prioridad, 50.00% incluyendo revisión humana. El tradicional aplica reglas; ML aprende de datos sintéticos y conserva revisión humana mediante controles; el generativo redacta respuestas pero depende de Groq. Los errores registrados cuentan como fallos. Las corridas no fueron simultáneas. Doce casos no permiten estimar precisión general ni resistencia universal a manipulación. Las respuestas completas y los fallos deben revisarse junto con los porcentajes.
