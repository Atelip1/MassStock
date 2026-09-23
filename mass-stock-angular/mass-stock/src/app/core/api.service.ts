import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { Producto, ProductoAlerta, ProductoOpcion } from '../models/producto.model';
import { RotacionProducto, TendenciaDia } from '../models/reporte.model';
import { MovimientoHistorial, Proveedor } from '../models/proveedor.model';
import { UsuarioAdmin } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private hubConnection: signalR.HubConnection | null = null;

  constructor(private http: HttpClient, private zone: NgZone) {}

  // ---- HU01: lectura de stock ----------------------------------
  listarProductos(): Promise<Producto[]> {
    return firstValueFrom(this.http.get<Producto[]>(`${environment.apiBaseUrl}/productos`));
  }

  listarProductosOpciones(): Promise<ProductoOpcion[]> {
    return firstValueFrom(this.http.get<ProductoOpcion[]>(`${environment.apiBaseUrl}/productos/opciones`));
  }

  // ---- Catálogo: alta y edición de productos ---------------------
  crearProducto(params: {
    sku: string;
    nombre: string;
    categoria?: string;
    unidad?: string;
    stockMinimo: number;
    stockInicial: number;
    proveedorId?: string;
  }): Promise<Producto> {
    return firstValueFrom(
      this.http.post<Producto>(`${environment.apiBaseUrl}/productos`, {
        sku: params.sku,
        nombre: params.nombre,
        categoria: params.categoria || null,
        unidad: params.unidad || 'unidad',
        stockMinimo: params.stockMinimo,
        stockInicial: params.stockInicial,
        proveedorId: params.proveedorId || null,
      })
    );
  }

  actualizarProducto(
    id: string,
    params: { nombre: string; categoria?: string; unidad?: string; stockMinimo: number; proveedorId?: string }
  ): Promise<void> {
    return firstValueFrom(
      this.http.put<void>(`${environment.apiBaseUrl}/productos/${id}`, {
        nombre: params.nombre,
        categoria: params.categoria || null,
        unidad: params.unidad || 'unidad',
        stockMinimo: params.stockMinimo,
        proveedorId: params.proveedorId || null,
      })
    );
  }

  // ---- Proveedores -------------------------------------------------
  listarProveedores(): Promise<Proveedor[]> {
    return firstValueFrom(this.http.get<Proveedor[]>(`${environment.apiBaseUrl}/proveedores`));
  }

  crearProveedor(params: { nombre: string; contacto?: string }): Promise<Proveedor> {
    return firstValueFrom(
      this.http.post<Proveedor>(`${environment.apiBaseUrl}/proveedores`, {
        nombre: params.nombre,
        contacto: params.contacto || null,
      })
    );
  }

  // ---- HU03: alertas de quiebre de stock -------------------------
  listarAlertas(): Promise<ProductoAlerta[]> {
    return firstValueFrom(this.http.get<ProductoAlerta[]>(`${environment.apiBaseUrl}/productos/alertas`));
  }

  // ---- HU04: reporte de rotación ---------------------------------
  obtenerReporteRotacion(dias: number): Promise<RotacionProducto[]> {
    return firstValueFrom(
      this.http.get<RotacionProducto[]>(`${environment.apiBaseUrl}/reportes/rotacion`, {
        params: { dias },
      })
    );
  }

  obtenerTendencia(dias: number): Promise<TendenciaDia[]> {
    return firstValueFrom(
      this.http.get<TendenciaDia[]>(`${environment.apiBaseUrl}/reportes/tendencia`, {
        params: { dias },
      })
    );
  }

  // ---- Historial de movimientos (auditoría) -----------------------
  listarHistorial(limite = 100): Promise<MovimientoHistorial[]> {
    return firstValueFrom(
      this.http.get<MovimientoHistorial[]>(`${environment.apiBaseUrl}/movimientos/historial`, {
        params: { limite },
      })
    );
  }

  // ---- Gestión de usuarios (solo administrador) --------------------
  listarUsuarios(): Promise<UsuarioAdmin[]> {
    return firstValueFrom(this.http.get<UsuarioAdmin[]>(`${environment.apiBaseUrl}/usuarios`));
  }

  crearUsuario(params: { nombre: string; email: string; password: string; rol: string }): Promise<UsuarioAdmin> {
    return firstValueFrom(this.http.post<UsuarioAdmin>(`${environment.apiBaseUrl}/usuarios`, params));
  }

  actualizarUsuario(
    id: string,
    params: { nombre: string; rol: string; activo: boolean; nuevaPassword?: string }
  ): Promise<void> {
    return firstValueFrom(
      this.http.put<void>(`${environment.apiBaseUrl}/usuarios/${id}`, {
        nombre: params.nombre,
        rol: params.rol,
        activo: params.activo,
        nuevaPassword: params.nuevaPassword || null,
      })
    );
  }

  // Conecta al hub de SignalR y ejecuta onStockActualizado() cada vez
  // que la API avisa que hubo un cambio de stock.
  conectarHub(onStockActualizado: () => void): void {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.hubUrl)
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on('stockActualizado', () => this.zone.run(onStockActualizado));
    this.hubConnection.start().catch((err) => console.error('Error conectando al hub de SignalR:', err));
  }

  desconectarHub(): void {
    this.hubConnection?.stop();
    this.hubConnection = null;
  }

  get hubConectado(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  // ---- HU05: registrar ingreso de mercadería ---------------------
  registrarIngreso(params: {
    productoId: string;
    cantidad: number;
    guiaRemision?: string;
    usuario?: string;
  }): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${environment.apiBaseUrl}/movimientos/ingreso`, {
        productoId: params.productoId,
        cantidad: params.cantidad,
        guiaRemision: params.guiaRemision || null,
        usuario: params.usuario || null,
      })
    );
  }

  // ---- HU02: registrar reposición de percha ----------------------
  registrarReposicion(params: {
    productoId: string;
    cantidad: number;
    usuario?: string;
    nota?: string;
  }): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${environment.apiBaseUrl}/movimientos/reposicion`, {
        productoId: params.productoId,
        cantidad: params.cantidad,
        usuario: params.usuario || null,
        nota: params.nota || null,
      })
    );
  }

  // ---- Registrar salida: venta, merma, vencimiento, ajuste --------
  registrarSalida(params: {
    productoId: string;
    cantidad: number;
    tipo: 'venta' | 'ajuste';
    motivo?: string;
    usuario?: string;
  }): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${environment.apiBaseUrl}/movimientos/salida`, {
        productoId: params.productoId,
        cantidad: params.cantidad,
        tipo: params.tipo,
        motivo: params.motivo || null,
        usuario: params.usuario || null,
      })
    );
  }
}
