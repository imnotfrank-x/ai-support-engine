const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const responses = {
  SECURITY: 'Su reporte requiere revision del equipo de seguridad. No comparta contrasenas ni credenciales en este canal. Un especialista debe verificar el incidente.',
  ACCESS: 'Verifique sus credenciales y utilice la recuperacion de contrasena si corresponde. Si el problema continua, solicite asistencia al equipo de soporte.',
  BUG: 'Gracias por reportar la falla. Comparta los pasos para reproducirla y el mensaje de error, sin incluir informacion sensible.',
  FEATURE: 'Gracias por su propuesta. Describa el uso esperado y el beneficio para que el equipo de producto pueda evaluarla.'
};

// Prioridad de reglas: seguridad, acceso, nuevas funciones, fallas.
// El texto es dato: nunca se ejecutan instrucciones incluidas en la solicitud.
export function analyzeTraditional(message) {
  const text = normalize(message);
  const security = /vulnerabilidad|inyeccion sql|phishing|ransomware|malware|fuga|filtracion|acceso no autorizado|sin autorizacion|credenciales.{0,30}(expuest|visibl|public)|contrasenas.{0,30}(expuest|visibl|public)/;
  const activeIncident = /ransomware|extrayendo datos|robo de datos|filtracion activa|fuga activa|sin autorizacion|acceso no autorizado/;
  let category;
  let priority;
  let ambiguous = false;

  if (security.test(text)) {
    category = 'SECURITY';
    priority = activeIncident.test(text) ? 'CRITICAL' : 'HIGH';
  } else if (/iniciar sesion|inicio de sesion|iniciar session|login|contrasena|credenciales|cuenta.{0,20}bloquead/.test(text)) {
    category = 'ACCESS';
    priority = /todos|toda la empresa/.test(text) ? 'HIGH' : 'MEDIUM';
  } else if (/quiero.{0,30}(agregar|anadir|integrar)|necesitamos.{0,30}(notificacion|funcionalidad)|nueva funcionalidad|modo oscuro|me gustaria/.test(text)) {
    category = 'FEATURE';
    priority = 'LOW';
  } else if (/error|falla|se cierra|no funciona|dejo de funcionar|caid[oa]/.test(text)) {
    category = 'BUG';
    priority = /todos|toda la empresa|produccion|caida total/.test(text) ? 'HIGH' : 'MEDIUM';
  } else {
    // El contrato solo permite cuatro categorias. BUG es una etiqueta provisional.
    category = 'BUG';
    priority = 'MEDIUM';
    ambiguous = true;
  }

  return {
    category,
    priority,
    response: ambiguous ? 'Necesitamos mas detalles sobre su solicitud. Un agente debe revisar y confirmar la clasificacion.' : responses[category],
    requiresHumanReview: category === 'SECURITY' || ambiguous,
    mode: 'traditional'
  };
}
