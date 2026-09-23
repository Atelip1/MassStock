// Genera y descarga un CSV en el navegador, sin dependencias externas.
export function descargarCsv(nombreArchivo: string, encabezados: string[], filas: (string | number)[][]): void {
  const escapar = (valor: string | number): string => {
    const texto = String(valor ?? '');
    if (texto.includes(',') || texto.includes('"') || texto.includes('\n')) {
      return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
  };

  const lineas = [encabezados, ...filas].map((fila) => fila.map(escapar).join(','));
  // BOM para que Excel detecte UTF-8 correctamente (tildes, ñ)
  const contenido = '\uFEFF' + lineas.join('\r\n');

  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  link.click();
  URL.revokeObjectURL(url);
}
