// Mensaje de recordatorio por WhatsApp: plantilla con {nombre} y {fecha}.
// {fecha} se expande sola según cuántas sesiones tenga esa semana (ver
// expandirFecha). Compartido entre WhatsAppRemindersModal (el envío real)
// y la página de Ajustes (donde cada entrenador escribe la suya, con una
// vista previa que usa estas mismas funciones).

export const DEFAULT_REMINDER_TEMPLATE = 'Hola {nombre}, te recordamos {fecha}. ¡Te esperamos!';

export interface SesionPlantilla {
  start: Date;
  end: Date;
}

function duracion(minutos: number) {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h ${resto}min`;
}

function fechaLarga(d: Date) {
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

function hora(d: Date) {
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function lineaSesion(s: SesionPlantilla) {
  const mins = Math.round((s.end.getTime() - s.start.getTime()) / 60000);
  return `${fechaLarga(s.start)} a las ${hora(s.start)} (${duracion(mins)})`;
}

export function expandirFecha(sesiones: SesionPlantilla[]): string {
  if (sesiones.length === 1) {
    return `que tienes una sesión el ${lineaSesion(sesiones[0])}`;
  }
  return ['tus próximas sesiones:', ...sesiones.map((s) => `· ${lineaSesion(s)}`)].join('\n');
}

export function renderRecordatorio(
  template: string | undefined,
  nombre: string,
  sesiones: SesionPlantilla[],
): string {
  const t = template && template.trim() ? template : DEFAULT_REMINDER_TEMPLATE;
  return t.replaceAll('{nombre}', nombre).replaceAll('{fecha}', expandirFecha(sesiones));
}
