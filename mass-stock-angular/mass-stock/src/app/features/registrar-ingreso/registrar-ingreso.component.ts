import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { ProductoOpcion } from '../../models/producto.model';
import { IconComponent } from '../../shared/icon/icon.component';
import { WordmarkComponent } from '../../shared/wordmark/wordmark.component';

@Component({
  selector: 'app-registrar-ingreso',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent, WordmarkComponent],
  templateUrl: './registrar-ingreso.component.html',
  styleUrl: './registrar-ingreso.component.css',
})
export class RegistrarIngresoComponent implements OnInit {
  @Output() irA = new EventEmitter<string>();

  productos: ProductoOpcion[] = [];
  enviando = false;
  feedback: { type: 'ok' | 'err'; text: string } | null = null;

  form: ReturnType<FormBuilder['group']>;

  constructor(private api: ApiService, private fb: FormBuilder, private toast: ToastService) {
    this.form = this.fb.group({
      productoId: ['', Validators.required],
      cantidad: [null as number | null, [Validators.required, Validators.min(1)]],
      guiaRemision: [''],
      usuario: [''],
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      this.productos = await this.api.listarProductosOpciones();
    } catch {
      this.feedback = { type: 'err', text: 'No se pudo conectar con la API. ¿Está corriendo `dotnet run`?' };
    }
  }

  cancelar(): void {
    this.irA.emit('inicio');
  }

  async onSubmit(): Promise<void> {
    this.feedback = null;

    if (this.form.invalid) {
      this.feedback = { type: 'err', text: 'Selecciona un producto e ingresa una cantidad válida.' };
      return;
    }

    const { productoId, cantidad, guiaRemision, usuario } = this.form.value;
    this.enviando = true;
    try {
      await this.api.registrarIngreso({
        productoId: productoId!,
        cantidad: cantidad!,
        guiaRemision: guiaRemision ?? undefined,
        usuario: usuario ?? undefined,
      });
      this.feedback = { type: 'ok', text: 'Ingreso registrado. El stock se actualizó automáticamente.' };
      this.toast.ok('Ingreso registrado correctamente.');
      this.form.patchValue({ cantidad: null, guiaRemision: '' });
    } catch (err: any) {
      this.feedback = { type: 'err', text: 'No se pudo registrar el ingreso: ' + (err?.message ?? '') };
      this.toast.err('No se pudo registrar el ingreso.');
    } finally {
      this.enviando = false;
    }
  }
}
