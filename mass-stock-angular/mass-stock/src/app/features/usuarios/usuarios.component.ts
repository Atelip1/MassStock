import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { UsuarioAdmin } from '../../models/usuario.model';
import { IconComponent } from '../../shared/icon/icon.component';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css',
})
export class UsuariosComponent implements OnInit {
  usuarios: UsuarioAdmin[] = [];
  loading = true;
  enviando = false;
  feedback: { type: 'ok' | 'err'; text: string } | null = null;

  editandoId: string | null = null;

  readonly roles = [
    { valor: 'administrador', label: 'Administrador' },
    { valor: 'encargado', label: 'Encargado de tienda' },
    { valor: 'reponedor', label: 'Reponedor' },
  ];

  form: ReturnType<FormBuilder['group']>;

  constructor(private api: ApiService, private fb: FormBuilder, private toast: ToastService) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      rol: ['reponedor', Validators.required],
      activo: [true],
      password: [''], // requerido solo al crear
    });
  }

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.loading = true;
    try {
      this.usuarios = await this.api.listarUsuarios();
    } catch {
      this.feedback = { type: 'err', text: 'No se pudo conectar con la API.' };
    } finally {
      this.loading = false;
    }
  }

  editar(u: UsuarioAdmin): void {
    this.editandoId = u.id;
    this.form.patchValue({ nombre: u.nombre, email: u.email, rol: u.rol, activo: u.activo, password: '' });
    this.form.get('email')?.disable();
  }

  cancelarEdicion(): void {
    this.editandoId = null;
    this.form.reset({ nombre: '', email: '', rol: 'reponedor', activo: true, password: '' });
    this.form.get('email')?.enable();
  }

  async onSubmit(): Promise<void> {
    this.feedback = null;

    const v = this.form.getRawValue();

    if (!this.editandoId && (!v.password || v.password.length < 6)) {
      this.feedback = { type: 'err', text: 'La contraseña inicial debe tener al menos 6 caracteres.' };
      return;
    }

    this.enviando = true;
    try {
      if (this.editandoId) {
        await this.api.actualizarUsuario(this.editandoId, {
          nombre: v.nombre!,
          rol: v.rol!,
          activo: v.activo!,
          nuevaPassword: v.password || undefined,
        });
        this.feedback = { type: 'ok', text: 'Usuario actualizado.' };
        this.toast.ok('Usuario actualizado.');
      } else {
        await this.api.crearUsuario({ nombre: v.nombre!, email: v.email!, password: v.password!, rol: v.rol! });
        this.feedback = { type: 'ok', text: 'Usuario creado.' };
        this.toast.ok('Usuario creado.');
      }
      this.cancelarEdicion();
      await this.cargar();
    } catch (err: any) {
      this.feedback = { type: 'err', text: err?.error?.error ?? 'No se pudo guardar el usuario.' };
      this.toast.err('No se pudo guardar el usuario.');
    } finally {
      this.enviando = false;
    }
  }

  rolLegible(rol: string): string {
    return this.roles.find((r) => r.valor === rol)?.label ?? rol;
  }
}
