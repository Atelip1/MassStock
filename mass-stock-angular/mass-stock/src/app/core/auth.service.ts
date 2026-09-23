import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginResponse, Usuario } from '../models/usuario.model';
import { ToastService } from './toast.service';

const STORAGE_KEY = 'mass_stock_session';
const AVISO_MINUTOS_ANTES = 5;

function decodificarExpiracion(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    const data = JSON.parse(json);
    return typeof data.exp === 'number' ? data.exp * 1000 : null; // ms desde epoch
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  usuario = signal<Usuario | null>(this.leerSesionGuardada());
  sesionPorExpirar = signal(false);

  private timerAviso: ReturnType<typeof setTimeout> | null = null;
  private timerExpiracion: ReturnType<typeof setTimeout> | null = null;

  constructor(private http: HttpClient, private toast: ToastService) {
    if (this.token) this.programarExpiracion(this.token);
  }

  get token(): string | null {
    return this.raw()?.token ?? null;
  }

  get estaAutenticado(): boolean {
    return this.usuario() !== null;
  }

  async login(email: string, password: string): Promise<void> {
    const resp = await firstValueFrom(
      this.http.post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, { email, password })
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resp));
    this.usuario.set(resp.usuario);
    this.sesionPorExpirar.set(false);
    this.programarExpiracion(resp.token);
  }

  async cambiarPassword(passwordActual: string, passwordNueva: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(`${environment.apiBaseUrl}/auth/cambiar-password`, {
        passwordActual,
        passwordNueva,
      })
    );
  }

  logout(motivo?: 'expirada'): void {
    localStorage.removeItem(STORAGE_KEY);
    this.usuario.set(null);
    this.sesionPorExpirar.set(false);
    if (this.timerAviso) clearTimeout(this.timerAviso);
    if (this.timerExpiracion) clearTimeout(this.timerExpiracion);
    if (motivo === 'expirada') this.toast.info('Tu sesión expiró. Vuelve a iniciar sesión.');
  }

  private programarExpiracion(token: string): void {
    if (this.timerAviso) clearTimeout(this.timerAviso);
    if (this.timerExpiracion) clearTimeout(this.timerExpiracion);

    const expiraEn = decodificarExpiracion(token);
    if (!expiraEn) return;

    const msRestantes = expiraEn - Date.now();
    const msAviso = msRestantes - AVISO_MINUTOS_ANTES * 60 * 1000;

    if (msRestantes <= 0) {
      this.logout('expirada');
      return;
    }

    if (msAviso > 0) {
      this.timerAviso = setTimeout(() => this.sesionPorExpirar.set(true), msAviso);
    } else {
      this.sesionPorExpirar.set(true);
    }

    this.timerExpiracion = setTimeout(() => this.logout('expirada'), msRestantes);
  }

  private raw(): LoginResponse | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LoginResponse) : null;
  }

  private leerSesionGuardada(): Usuario | null {
    return this.raw()?.usuario ?? null;
  }
}
