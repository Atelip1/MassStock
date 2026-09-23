import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Rol } from '../models/usuario.model';

export type Modulo =
  | 'inicio'
  | 'stock'
  | 'ingreso'
  | 'reposicion'
  | 'salida'
  | 'alertas'
  | 'flujo'
  | 'reportes'
  | 'historial'
  | 'catalogo'
  | 'usuarios'
  | 'indicadores';

/** 'total' = puede usar el módulo; 'lectura' = solo visualizar; 'no' = oculto. */
export type Acceso = 'total' | 'lectura' | 'no';

// Matriz de permisos por rol. Debe coincidir con los [Authorize(Roles=...)]
// de MassStock.Api, que es quien realmente protege los datos.
const MATRIZ: Record<Modulo, Record<Rol, Acceso>> = {
  inicio:      { administrador: 'total', encargado: 'total',   reponedor: 'total' },
  stock:       { administrador: 'total', encargado: 'total',   reponedor: 'total' },
  ingreso:     { administrador: 'total', encargado: 'total',   reponedor: 'no' },
  reposicion:  { administrador: 'total', encargado: 'total',   reponedor: 'total' },
  salida:      { administrador: 'total', encargado: 'total',   reponedor: 'no' },
  alertas:     { administrador: 'total', encargado: 'total',   reponedor: 'total' },
  flujo:       { administrador: 'total', encargado: 'total',   reponedor: 'total' },
  reportes:    { administrador: 'total', encargado: 'total',   reponedor: 'no' },
  historial:   { administrador: 'total', encargado: 'total',   reponedor: 'no' },
  catalogo:    { administrador: 'total', encargado: 'lectura', reponedor: 'lectura' },
  usuarios:    { administrador: 'total', encargado: 'no',      reponedor: 'no' },
  indicadores: { administrador: 'total', encargado: 'total',   reponedor: 'no' },
};

@Injectable({ providedIn: 'root' })
export class PermisosService {
  constructor(private auth: AuthService) {}

  acceso(modulo: Modulo): Acceso {
    const rol = this.auth.usuario()?.rol;
    return rol ? MATRIZ[modulo][rol] : 'no';
  }

  /** El módulo aparece en el menú (con acceso total o de solo lectura). */
  puedeVer(modulo: Modulo): boolean {
    return this.acceso(modulo) !== 'no';
  }

  /** El usuario puede crear/editar en el módulo, no solo mirarlo. */
  puedeEditar(modulo: Modulo): boolean {
    return this.acceso(modulo) === 'total';
  }
}
