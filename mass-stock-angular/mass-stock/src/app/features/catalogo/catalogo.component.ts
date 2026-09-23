import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { PermisosService } from '../../core/permisos.service';
import { Producto } from '../../models/producto.model';
import { Proveedor } from '../../models/proveedor.model';
import { IconComponent } from '../../shared/icon/icon.component';
import { iniciales, tonoThumb } from '../../core/ui.util';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IconComponent],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.css',
})
export class CatalogoComponent implements OnInit {
  productos: Producto[] = [];
  proveedores: Proveedor[] = [];
  loading = true;
  enviando = false;
  feedback: { type: 'ok' | 'err'; text: string } | null = null;

  editandoId: string | null = null;

  readonly iniciales = iniciales;

  /** Solo el administrador da de alta o edita; los demás roles ven el catálogo. */
  get puedeEditar(): boolean {
    return this.permisos.puedeEditar('catalogo');
  }
  readonly tonoThumb = tonoThumb;
  mostrarNuevoProveedor = false;
  nuevoProveedorNombre = '';

  form: ReturnType<FormBuilder['group']>;

  constructor(private api: ApiService, private fb: FormBuilder, private toast: ToastService, private permisos: PermisosService) {
    this.form = this.fb.group({
      sku: ['', Validators.required],
      nombre: ['', Validators.required],
      categoria: [''],
      unidad: ['unidad'],
      stockMinimo: [0, [Validators.required, Validators.min(0)]],
      stockInicial: [0, [Validators.required, Validators.min(0)]],
      proveedorId: [''],
    });
  }

  async ngOnInit(): Promise<void> {
    await this.cargarTodo();
  }

  async cargarTodo(): Promise<void> {
    this.loading = true;
    try {
      [this.productos, this.proveedores] = await Promise.all([
        this.api.listarProductos(),
        this.api.listarProveedores(),
      ]);
    } catch {
      this.feedback = { type: 'err', text: 'No se pudo conectar con la API.' };
    } finally {
      this.loading = false;
    }
  }

  editar(p: Producto): void {
    this.editandoId = p.id;
    this.form.patchValue({
      sku: p.sku,
      nombre: p.nombre,
      categoria: p.categoria ?? '',
      unidad: 'unidad',
      stockMinimo: p.stockMinimo,
      stockInicial: p.stockActual,
    });
    this.form.get('sku')?.disable();
    this.form.get('stockInicial')?.disable();
  }

  cancelarEdicion(): void {
    this.editandoId = null;
    this.form.reset({ sku: '', nombre: '', categoria: '', unidad: 'unidad', stockMinimo: 0, stockInicial: 0, proveedorId: '' });
    this.form.get('sku')?.enable();
    this.form.get('stockInicial')?.enable();
  }

  async crearProveedorRapido(): Promise<void> {
    if (!this.nuevoProveedorNombre.trim()) return;
    try {
      const proveedor = await this.api.crearProveedor({ nombre: this.nuevoProveedorNombre.trim() });
      this.proveedores = [...this.proveedores, proveedor].sort((a, b) => a.nombre.localeCompare(b.nombre));
      this.form.patchValue({ proveedorId: proveedor.id });
      this.nuevoProveedorNombre = '';
      this.mostrarNuevoProveedor = false;
    } catch {
      this.feedback = { type: 'err', text: 'No se pudo crear el proveedor.' };
    }
  }

  async onSubmit(): Promise<void> {
    this.feedback = null;
    if (this.form.invalid) {
      this.feedback = { type: 'err', text: 'Completa SKU, nombre y stock mínimo.' };
      return;
    }

    const v = this.form.getRawValue();
    this.enviando = true;
    try {
      if (this.editandoId) {
        await this.api.actualizarProducto(this.editandoId, {
          nombre: v.nombre!,
          categoria: v.categoria ?? undefined,
          unidad: v.unidad ?? undefined,
          stockMinimo: v.stockMinimo!,
          proveedorId: v.proveedorId ?? undefined,
        });
        this.feedback = { type: 'ok', text: 'Producto actualizado.' };
        this.toast.ok('Producto actualizado.');
      } else {
        await this.api.crearProducto({
          sku: v.sku!,
          nombre: v.nombre!,
          categoria: v.categoria ?? undefined,
          unidad: v.unidad ?? undefined,
          stockMinimo: v.stockMinimo!,
          stockInicial: v.stockInicial!,
          proveedorId: v.proveedorId ?? undefined,
        });
        this.feedback = { type: 'ok', text: 'Producto creado.' };
        this.toast.ok('Producto creado.');
      }
      this.cancelarEdicion();
      await this.cargarTodo();
    } catch (err: any) {
      this.feedback = { type: 'err', text: err?.error?.error ?? 'No se pudo guardar el producto.' };
      this.toast.err('No se pudo guardar el producto.');
    } finally {
      this.enviando = false;
    }
  }
}
