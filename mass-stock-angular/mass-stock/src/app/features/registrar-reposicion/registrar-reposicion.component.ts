import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { BusquedaService } from '../../core/busqueda.service';
import { ProductoOpcion } from '../../models/producto.model';
import { IconComponent } from '../../shared/icon/icon.component';
import { WordmarkComponent } from '../../shared/wordmark/wordmark.component';

@Component({
  selector: 'app-registrar-reposicion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent, WordmarkComponent],
  templateUrl: './registrar-reposicion.component.html',
  styleUrl: './registrar-reposicion.component.css',
})
export class RegistrarReposicionComponent implements OnInit {
  @Output() irA = new EventEmitter<string>();

  productos: ProductoOpcion[] = [];
  enviando = false;
  feedback: { type: 'ok' | 'err'; text: string } | null = null;

  form: ReturnType<FormBuilder['group']>;

  constructor(private api: ApiService, private auth: AuthService, private fb: FormBuilder, private toast: ToastService, private busqueda: BusquedaService) {
    this.form = this.fb.group({
      productoId: ['', Validators.required],
      cantidad: [null as number | null, [Validators.required, Validators.min(1)]],
      nota: [''],
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      this.productos = await this.api.listarProductosOpciones();
      const preseleccion = this.busqueda.productoParaReponer();
      if (preseleccion && this.productos.some((p) => p.id === preseleccion)) {
        this.form.patchValue({ productoId: preseleccion });
      }
      this.busqueda.productoParaReponer.set(null);
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

    const { productoId, cantidad, nota } = this.form.value;
    this.enviando = true;
    try {
      await this.api.registrarReposicion({
        productoId: productoId!,
        cantidad: cantidad!,
        nota: nota ?? undefined,
        usuario: this.auth.usuario()?.nombre,
      });
      this.feedback = { type: 'ok', text: 'Reposición registrada. El stock se actualizó automáticamente.' };
      this.toast.ok('Reposición registrada correctamente.');
      this.form.patchValue({ cantidad: null, nota: '' });
    } catch (err: any) {
      this.feedback = { type: 'err', text: 'No se pudo registrar la reposición: ' + (err?.error?.error ?? '') };
      this.toast.err('No se pudo registrar la reposición.');
    } finally {
      this.enviando = false;
    }
  }
}
