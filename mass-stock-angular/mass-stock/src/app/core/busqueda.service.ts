import { Injectable, signal } from '@angular/core';

// Estado compartido de navegación: texto del buscador global y producto preseleccionado.
@Injectable({ providedIn: 'root' })
export class BusquedaService {
  texto = signal('');

  /** Producto elegido desde otra pantalla (alertas, flujo) para abrir "Registrar reposición" ya seleccionado. */
  productoParaReponer = signal<string | null>(null);
}
