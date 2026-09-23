import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';
import { IconComponent } from '../../shared/icon/icon.component';
import { WordmarkComponent } from '../../shared/wordmark/wordmark.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent, WordmarkComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  enviando = false;
  error: string | null = null;
  verPassword = false;

  readonly usuariosDemo = ['admin@mass.pe', 'encargado@mass.pe', 'reponedor@mass.pe'];

  form: ReturnType<FormBuilder['group']>;

  constructor(private auth: AuthService, private fb: FormBuilder, public theme: ThemeService) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  usarDemo(email: string): void {
    this.form.patchValue({ email, password: 'Mass123!' });
  }

  async onSubmit(): Promise<void> {
    this.error = null;
    if (this.form.invalid) {
      this.error = 'Ingresa un correo válido y tu contraseña.';
      return;
    }

    const { email, password } = this.form.value;
    this.enviando = true;
    try {
      await this.auth.login(email!, password!);
    } catch {
      this.error = 'Correo o contraseña incorrectos.';
    } finally {
      this.enviando = false;
    }
  }
}
