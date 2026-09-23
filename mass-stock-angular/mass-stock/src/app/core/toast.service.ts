import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  type: 'ok' | 'err' | 'info';
  text: string;
}

const DURACION_MS = 4000;
let contador = 0;

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  ok(text: string): void {
    this.mostrar('ok', text);
  }

  err(text: string): void {
    this.mostrar('err', text);
  }

  info(text: string): void {
    this.mostrar('info', text);
  }

  descartar(id: number): void {
    this.toasts.update((lista) => lista.filter((t) => t.id !== id));
  }

  private mostrar(type: Toast['type'], text: string): void {
    const id = ++contador;
    this.toasts.update((lista) => [...lista, { id, type, text }]);
    setTimeout(() => this.descartar(id), DURACION_MS);
  }
}
