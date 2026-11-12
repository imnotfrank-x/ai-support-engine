# AI Support Engine

Prototipo del equipo DMI: Francisco, Javier y Carlos. Clasifica solicitudes de soporte con un contrato comun para dos motores.

## Avance actual

Primera entrega parcial: motor tradicional por reglas, `POST /api/analyze`, validaciones, 12 casos de referencia y CI. El motor generativo sigue pendiente: su modo devuelve HTTP 501 y no simula respuestas. Aun faltan la comparacion de ambos motores, sus evidencias y la conclusion final de hasta 150 palabras.

## Ejecucion

Requisito: Node.js 22 o superior. No hay dependencias externas ni claves necesarias para este avance.

```sh
npm start
npm test
npm run evidence
```

La API escucha en `http://127.0.0.1:3000`. Se pueden configurar `PORT` y `HOST` como variables de entorno.

Peticion en PowerShell, con el servidor abierto en otra terminal:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/analyze' -Method Post -ContentType 'application/json' -Body '{"message":"No puedo iniciar sesion","mode":"traditional"}'
```

Respuesta:

```json
{
  "category": "ACCESS",
  "priority": "MEDIUM",
  "response": "Verifique sus credenciales y utilice la recuperacion de contrasena si corresponde. Si el problema continua, solicite asistencia al equipo de soporte.",
  "requiresHumanReview": false,
  "mode": "traditional"
}
```

`mode` admite `traditional` y `generative`. Los resultados exitosos requieren categoria ACCESS, BUG, FEATURE o SECURITY; prioridad LOW, MEDIUM, HIGH o CRITICAL; respuesta no vacia; indicador booleano de revision humana y modo solicitado.

Errores: 400 para JSON o campos invalidos, 413 para cuerpos mayores de 16 KiB, 415 para contenido distinto de JSON, 405 para metodos incorrectos, 404 para rutas inexistentes, 501 para el motor pendiente y 500 para errores internos sin revelar detalles. `message` acepta hasta 4000 caracteres.

## Reglas y referencias

La seguridad tiene precedencia y siempre requiere revision humana. Una vulnerabilidad se clasifica HIGH; indicios de extraccion de datos, ransomware o acceso no autorizado se clasifican CRITICAL. Acceso y fallas normalmente son MEDIUM y suben a HIGH si hay indicios de afectacion general o de produccion. Las nuevas funciones son LOW.

Si ninguna regla coincide, se devuelve BUG MEDIUM de manera provisional con revision humana. Esta es una convencion del equipo porque el contrato exige una de cuatro categorias, y debe revisarse con el profesor. El enfoque por palabras clave puede producir falsos positivos ante negaciones y omitir expresiones desconocidas; no es una herramienta de seguridad para produccion.

`tests/cases.json` contiene las referencias antes de ejecutar la comparacion: nueve casos normales, uno ambiguo y dos adversariales. `npm run evidence` imprime resultados reales del motor tradicional, formato valido y porcentaje de coincidencia exacta de categoria, prioridad y revision humana. Esta medida sobre doce casos no demuestra precision en solicitudes nuevas. La evidencia de CI queda en GitHub Actions; no se generan resultados ficticios del motor generativo.

## Flujo de ramas del equipo

El flujo acordado es `rama de trabajo -> develop -> main`. develop integra los cambios del equipo; main recibe entregas verificadas mediante un PR desde develop.

1. Actualizar origin/develop y crear una rama de trabajo desde esa referencia.
2. Implementar un cambio pequeno, ejecutar las pruebas y hacer commit de archivos concretos.
3. Hacer push solo de la rama y abrir un pull request con base develop.
4. Otro integrante revisa el codigo y CI debe pasar antes del merge en develop.
5. Al tener una entrega integrada y verificada, abrir un segundo PR con base main y compare develop.

No hacer push directo ni force push a develop o main. Ambas ramas estan protegidas con un PR obligatorio, una aprobacion de otro integrante y el check `test`, aplicando tambien a administradores. Los tres integrantes deben poder explicar el codigo. Los commits preparados con asistencia no sustituyen sus aportaciones ni su revision.

La [guia de Javier](docs/guia-javier.md) explica su rama, la integracion generativa real, pruebas y entrega mediante PR a develop.

Reparto propuesto, pendiente de acuerdo del equipo:

| Integrante | Trabajo |
| --- | --- |
| Francisco | Motor tradicional y referencias de prueba de esta primera entrega |
| Javier | Modelo generativo real, manejo de errores del proveedor y validacion de salida |
| Carlos | Ampliacion de API, comparacion automatizada, evidencias y README final |

Ramas sugeridas: `feat/francisco-motor-tradicional`, `feat/javier-motor-generativo`, `feat/carlos-comparativa`.

## Siguiente entrega

Conectar un modelo real local o por API, tratar el mensaje del usuario como datos, validar su salida con el contrato comun y mantener revision humana para posibles incidentes de seguridad. Guardar secretos en variables de entorno; nunca versionar claves. Despues ejecutar los mismos doce mensajes en ambos motores, registrar formato y aciertos, calcular porcentajes y redactar la conclusion con resultados medidos.

El repositorio contiene solo codigo, pruebas, automatizacion y esta guia. No subir node_modules, archivos .env, documentos de la actividad ni capturas ajenas al proyecto.
