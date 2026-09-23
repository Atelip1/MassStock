// Pequeños helpers visuales compartidos por las tablas.

/** Iniciales del producto para la miniatura (ej. "Arroz Costeño 5kg" -> "AC"). */
export function iniciales(nombre: string | null | undefined): string {
  const palabras = (nombre ?? '').trim().split(/\s+/).filter((p) => /^[\p{L}]/u.test(p));
  return ((palabras[0]?.[0] ?? '') + (palabras[1]?.[0] ?? '')).toUpperCase() || '·';
}

/** Tono estable de la miniatura según el nombre, para que cada producto tenga siempre el mismo color. */
export function tonoThumb(nombre: string | null | undefined): string {
  let h = 0;
  for (const c of nombre ?? '') h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 't' + (h % 5);
}

export function fechaLarga(d = new Date()): string {
  const s = d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function horaCorta(d = new Date()): string {
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

/** "Hoy, 8:14 p. m." / "Ayer, 5:12 p. m." / "20 sept. 2025" */
export function fechaRelativa(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  if (d.toDateString() === hoy.toDateString()) return 'Hoy, ' + horaCorta(d);
  if (d.toDateString() === ayer.toDateString()) return 'Ayer, ' + horaCorta(d);
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Mensaje claro según el error HTTP (sin conexión, sin permiso, sesión vencida u otro). */
export function mensajeError(err: any): string {
  const status = err?.status;
  if (status === 0) return 'No se pudo conectar con la API. ¿Está corriendo `dotnet run`?';
  if (status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (status === 403)
    return 'La API no permite esta pantalla para tu rol. Si se actualizaron los permisos, reinicia la API (`dotnet run`).';
  return `Error del servidor (${status ?? '?'}): ${err?.error?.error ?? err?.message ?? 'intenta de nuevo.'}`;
}
