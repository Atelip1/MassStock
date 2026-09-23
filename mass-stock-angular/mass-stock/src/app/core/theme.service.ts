import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'mass_stock_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  oscuro = signal(this.leerPreferencia());

  constructor() {
    this.aplicar(this.oscuro());
  }

  alternar(): void {
    const nuevo = !this.oscuro();
    this.oscuro.set(nuevo);
    this.aplicar(nuevo);
    localStorage.setItem(STORAGE_KEY, nuevo ? 'dark' : 'light');
  }

  private aplicar(oscuro: boolean): void {
    document.documentElement.classList.toggle('dark', oscuro);
  }

  private leerPreferencia(): boolean {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado) return guardado === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
}
