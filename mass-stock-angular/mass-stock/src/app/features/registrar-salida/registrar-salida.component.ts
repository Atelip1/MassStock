import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Producto } from '../../models/producto.model';

type Motivo = 'venta' | 'merma' | 'vencido' | 'conteo';
import { IconComponent } from '../../shared/icon/icon.component';
import { WordmarkComponent } from '../../shared/wordmark/wordmark.component';

@Component({
  selector: 'app-registrar-salida',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent, WordmarkComponent],
  templateUrl: './registrar-salida.component.html',
  styleUrl: './registrar-salida.component.css',
})
export class RegistrarSalidaComponent implements OnInit {
  @Output() irA = new EventEmitter<string>();

  productos: Producto[] = [];
  enviando = false;
  feedback: { type: 'ok' | 'err'; text: string } | null = null;

  readonly motivos: { valor: Motivo; label: string; corto: string; descripcion: string; icono: string; tono: string }[] = [
    { valor: 'venta', label: 'Venta', corto: 'Venta', descripcion: 'Productos vendidos en tienda.', icono: 'cart', tono: 'green' },
    { valor: 'merma', label: 'Merma o daño', corto: 'Merma', descripcion: 'Productos dañados o no aptos.', icono: 'alert', tono: 'red' },
    { valor: 'vencido', label: 'Producto vencido', corto: 'Vencimiento', descripcion: 'Productos vencidos.', icono: 'calendar', tono: 'purple' },
    { valor: 'conteo', label: 'Ajuste de conteo cíclico', corto: 'Ajuste de conteo', descripcion: 'Corrección de stock por inventario.', icono: 'list', tono: 'blue' },
  ];

  form: ReturnType<FormBuilder['group']>;

  constructor(private api: ApiService, private auth: AuthService, private toast: ToastService, private fb: FormBuilder) {
    this.form = this.fb.group({
      productoId: ['', Validators.required],
      motivo: ['venta', Validators.required],
      cantidad: [null as number | null, [Validators.required, Validators.min(1)]],
      nota: [''],
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      this.productos = await this.api.listarProductos();
    } catch {
      this.feedback = { type: 'err', text: 'No se pudo conectar con la API.' };
    }
  }

  get productoSeleccionado(): Producto | undefined {
    return this.productos.find((p) => p.id === this.form.value.productoId);
  }

  cancelar(): void {
    this.irA.emit('inicio');
  }

  async onSubmit(): Promise<void> {
    this.feedback = null;

    if (this.form.invalid) {
      this.feedback = { type: 'err', text: 'Selecciona un producto, el motivo y una cantidad válida.' };
      return;
    }

    const { productoId, motivo, cantidad, nota } = this.form.value;
    const disponible = this.productoSeleccionado?.stockActual ?? 0;

    if (cantidad! > disponible) {
      this.feedback = { type: 'err', text: `No hay suficiente stock. Disponible: ${disponible}.` };
      return;
    }

    const tipo: 'venta' | 'ajuste' = motivo === 'venta' ? 'venta' : 'ajuste';
    const etiquetaMotivo = this.motivos.find((m) => m.valor === motivo)?.label ?? motivo;
    const motivoFinal = nota ? `${etiquetaMotivo} — ${nota}` : etiquetaMotivo;

    this.enviando = true;
    try {
      await this.api.registrarSalida({
        productoId: productoId!,
        cantidad: cantidad!,
        tipo,
        motivo: motivoFinal,
        usuario: this.auth.usuario()?.nombre,
      });
      this.feedback = { type: 'ok', text: 'Salida registrada. El stock se actualizó automáticamente.' };
      this.toast.ok('Salida registrada correctamente.');
      this.form.patchValue({ cantidad: null, nota: '' });
      this.productos = await this.api.listarProductos();
    } catch (err: any) {
      const msg = err?.error?.error ?? 'No se pudo registrar la salida.';
      this.feedback = { type: 'err', text: msg };
      this.toast.err(msg);
    } finally {
      this.enviando = false;
    }
  }
}
