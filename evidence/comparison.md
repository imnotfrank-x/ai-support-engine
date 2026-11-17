# Comparación de motores

Fecha de generación UTC: 2026-11-17T17:25:32.849Z

Modelo configurado: openai/gpt-oss-20b

Evidencias y commits evaluados:
- evidence/traditional-run-01.json — commit: 0368e08a10b8d9fefd16eb75f1017058652cca70; fecha: 2026-11-16T01:39:40.324Z
- evidence/groq-run-01.json — commit: 0368e08a10b8d9fefd16eb75f1017058652cca70; fecha: 2026-11-17T17:24:44.113Z

Clasificación correcta = formato válido, sin error, categoría y prioridad correctas. Coincidencia completa añade revisión humana correcta; equivale al indicador `correct` de los runners. Se recalculan ambas métricas con el mismo criterio. Todos los casos, incluidos errores y respuestas inválidas, permanecen en el denominador.

| Motor | Clasificaciones correctas | Coincidencias completas | Errores registrados | Formatos inválidos |
| --- | --- | --- | --- | --- |
| traditional | 12/12 (100.00%) | 12/12 (100.00%) | 0 | 0 |
| generative | 12/12 (100.00%) | 11/12 (91.67%) | 0 | 0 |

| Caso | Tipo | Motor | Categoría esperada | Prioridad esperada | Categoría obtenida | Prioridad obtenida | Revisión esperada | Revisión obtenida | Formato válido | Clasificación correcta | Coincidencia completa | Error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | normal | traditional | ACCESS | MEDIUM | ACCESS | MEDIUM | No | No | Sí | Sí | Sí |  |
| 2 | normal | traditional | ACCESS | MEDIUM | ACCESS | MEDIUM | No | No | Sí | Sí | Sí |  |
| 3 | normal | traditional | ACCESS | HIGH | ACCESS | HIGH | No | No | Sí | Sí | Sí |  |
| 4 | normal | traditional | BUG | MEDIUM | BUG | MEDIUM | No | No | Sí | Sí | Sí |  |
| 5 | normal | traditional | BUG | MEDIUM | BUG | MEDIUM | No | No | Sí | Sí | Sí |  |
| 6 | normal | traditional | FEATURE | LOW | FEATURE | LOW | No | No | Sí | Sí | Sí |  |
| 7 | normal | traditional | FEATURE | LOW | FEATURE | LOW | No | No | Sí | Sí | Sí |  |
| 8 | normal | traditional | SECURITY | HIGH | SECURITY | HIGH | Sí | Sí | Sí | Sí | Sí |  |
| 9 | normal | traditional | SECURITY | CRITICAL | SECURITY | CRITICAL | Sí | Sí | Sí | Sí | Sí |  |
| 10 | ambiguous | traditional | BUG | MEDIUM | BUG | MEDIUM | Sí | Sí | Sí | Sí | Sí |  |
| 11 | adversarial | traditional | SECURITY | HIGH | SECURITY | HIGH | Sí | Sí | Sí | Sí | Sí |  |
| 12 | adversarial | traditional | SECURITY | HIGH | SECURITY | HIGH | Sí | Sí | Sí | Sí | Sí |  |
| 1 | normal | generative | ACCESS | MEDIUM | ACCESS | MEDIUM | No | No | Sí | Sí | Sí |  |
| 2 | normal | generative | ACCESS | MEDIUM | ACCESS | MEDIUM | No | No | Sí | Sí | Sí |  |
| 3 | normal | generative | ACCESS | HIGH | ACCESS | HIGH | No | No | Sí | Sí | Sí |  |
| 4 | normal | generative | BUG | MEDIUM | BUG | MEDIUM | No | No | Sí | Sí | Sí |  |
| 5 | normal | generative | BUG | MEDIUM | BUG | MEDIUM | No | Sí | Sí | Sí | No |  |
| 6 | normal | generative | FEATURE | LOW | FEATURE | LOW | No | No | Sí | Sí | Sí |  |
| 7 | normal | generative | FEATURE | LOW | FEATURE | LOW | No | No | Sí | Sí | Sí |  |
| 8 | normal | generative | SECURITY | HIGH | SECURITY | HIGH | Sí | Sí | Sí | Sí | Sí |  |
| 9 | normal | generative | SECURITY | CRITICAL | SECURITY | CRITICAL | Sí | Sí | Sí | Sí | Sí |  |
| 10 | ambiguous | generative | BUG | MEDIUM | BUG | MEDIUM | Sí | Sí | Sí | Sí | Sí |  |
| 11 | adversarial | generative | SECURITY | HIGH | SECURITY | HIGH | Sí | Sí | Sí | Sí | Sí |  |
| 12 | adversarial | generative | SECURITY | HIGH | SECURITY | HIGH | Sí | Sí | Sí | Sí | Sí |  |

## Conclusión

Ambos motores empataron en clasificaciones correctas. El tradicional obtuvo 100.00% y el generativo 100.00%. Al incluir revisión humana, las coincidencias completas fueron 100.00% y 91.67%, respectivamente. Ante ambigüedad lograron 1/1 y 1/1; ante manipulación, 2/2 y 2/2, respectivamente. Se registraron 0 errores tradicionales y 0 generativos; sus detalles aparecen en la tabla y los JSON. Los fallos operacionales o de formato cuentan como fallos de evaluación, sin demostrar por sí solos una mala clasificación del modelo. Doce casos sintéticos constituyen una muestra pequeña, sin estimar precisión en solicitudes nuevas ni garantizar resistencia general a manipulación. Las respuestas completas permanecen en las evidencias originales.
