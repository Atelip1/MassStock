import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from './core/auth.service';
import { ApiService } from './core/api.service';
import { ThemeService } from './core/theme.service';
import { ToastService } from './core/toast.service';
import { BusquedaService } from './core/busqueda.service';
import { Modulo, PermisosService } from './core/permisos.service';
import { LoginComponent } from './features/login/login.component';
import { InicioComponent } from './features/inicio/inicio.component';
import { StockDashboardComponent } from './features/stock-dashboard/stock-dashboard.component';
import { RegistrarIngresoComponent } from './features/registrar-ingreso/registrar-ingreso.component';
import { RegistrarReposicionComponent } from './features/registrar-reposicion/registrar-reposicion.component';
import { RegistrarSalidaComponent } from './features/registrar-salida/registrar-salida.component';
import { AlertasComponent } from './features/alertas/alertas.component';
import { ReportesComponent } from './features/reportes/reportes.component';
import { CatalogoComponent } from './features/catalogo/catalogo.component';
import { HistorialComponent } from './features/historial/historial.component';
import { UsuariosComponent } from './features/usuarios/usuarios.component';
import { FlujoReposicionComponent } from './features/flujo-reposicion/flujo-reposicion.component';
import { IndicadoresComponent } from './features/indicadores/indicadores.component';
import { ToastContainerComponent } from './shared/toast-container/toast-container.component';
import { IconComponent } from './shared/icon/icon.component';
import { WordmarkComponent } from './shared/wordmark/wordmark.component';

type Tab = Modulo;

const INTERVALO_ALERTAS_MS = 30_000;
const SIDEBAR_KEY = 'mass_stock_sidebar_oculta';
const MQ_MOVIL = '(max-width: 900px)';

function leerSidebarOculta(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1';
  } catch {
    return false;
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoginComponent,
    InicioComponent,
    StockDashboardComponent,
    RegistrarIngresoComponent,
    RegistrarReposicionComponent,
    RegistrarSalidaComponent,
    AlertasComponent,
    ReportesComponent,
    CatalogoComponent,
    HistorialComponent,
    UsuariosComponent,
    FlujoReposicionComponent,
    IndicadoresComponent,
    ToastContainerComponent,
    IconComponent,
    WordmarkComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  tab: Tab = 'inicio';
  menuMovilAbierto = false;
  sidebarOculta = leerSidebarOculta();
  menuUsuarioAbierto = false;
  conteoAlertas = 0;

  @ViewChild('buscador') buscador?: ElementRef<HTMLInputElement>;

  mostrarCambiarPassword = false;
  enviandoPassword = false;
  passwordFeedback: { type: 'ok' | 'err'; text: string } | null = null;

  passwordForm: ReturnType<FormBuilder['group']>;

  private intervaloAlertas: ReturnType<typeof setInterval> | null = null;

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private fb: FormBuilder,
    public theme: ThemeService,
    private toast: ToastService,
    public busqueda: BusquedaService,
    public permisos: PermisosService
  ) {
    this.passwordForm = this.fb.group({
      passwordActual: ['', Validators.required],
      passwordNueva: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    if (this.puedeVerAlertas) {
      this.refrescarConteoAlertas();
      this.intervaloAlertas = setInterval(() => this.refrescarConteoAlertas(), INTERVALO_ALERTAS_MS);
    }
  }

  ngOnDestroy(): void {
    if (this.intervaloAlertas) clearInterval(this.intervaloAlertas);
  }

  private async refrescarConteoAlertas(): Promise<void> {
    try {
      const alertas = await this.api.listarAlertas();
      this.conteoAlertas = alertas.length;
    } catch {
      // silencioso: el badge simplemente no se actualiza esta vez
    }
  }

  setTab(tab: string): void {
    // nunca mostrar una pantalla que el rol no tiene permitida
    this.tab = this.permisos.puedeVer(tab as Tab) ? (tab as Tab) : 'inicio';
    this.menuMovilAbierto = false;
    this.menuUsuarioAbierto = false;
    window.scrollTo({ top: 0 });
  }

  @HostListener('document:keydown', ['$event'])
  atajoBuscar(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.buscador?.nativeElement.focus();
    }
    if (e.key === 'Escape') {
      this.menuUsuarioAbierto = false;
      if (this.mostrarCambiarPassword) this.cerrarPassword();
    }
  }

  irAAlertas(): void {
    this.setTab(this.permisos.puedeVer('alertas') ? 'alertas' : 'stock');
  }

  get navItems(): { tab: Tab; label: string; icon: string; divider?: boolean; lectura: boolean }[] {
    const items: { tab: Tab; label: string; icon: string; divider?: boolean }[] = [
      { tab: 'inicio', label: 'Inicio', icon: 'home' },
      { tab: 'stock', label: 'Stock en tiempo real', icon: 'grid' },
      { tab: 'ingreso', label: 'Registrar ingreso', icon: 'box-plus' },
      { tab: 'reposicion', label: 'Registrar reposición', icon: 'plus-circle' },
      { tab: 'salida', label: 'Registrar salida', icon: 'arrow-right' },
      { tab: 'alertas', label: 'Alertas de quiebre', icon: 'alert' },
      { tab: 'flujo', label: 'Flujo de reposición', icon: 'flow' },
      { tab: 'reportes', label: 'Reportes de rotación', icon: 'bars' },
      { tab: 'historial', label: 'Historial', icon: 'clock' },
      { tab: 'catalogo', label: 'Catálogo', icon: 'catalog', divider: true },
      { tab: 'usuarios', label: 'Usuarios', icon: 'users' },
      { tab: 'indicadores', label: 'Indicadores', icon: 'gauge' },
    ];
    return items
      .filter((i) => this.permisos.puedeVer(i.tab))
      .map((i) => ({ ...i, lectura: this.permisos.acceso(i.tab) === 'lectura' }));
  }

  get inicial(): string {
    return (this.auth.usuario()?.nombre ?? '?').trim().charAt(0).toUpperCase();
  }

  private get esMovil(): boolean {
    return window.matchMedia?.(MQ_MOVIL).matches ?? false;
  }

  /** ¿El menú lateral está visible ahora mismo? (en móvil es un panel superpuesto) */
  get menuVisible(): boolean {
    return this.esMovil ? this.menuMovilAbierto : !this.sidebarOculta;
  }

  // El botón de tres líneas muestra/oculta el menú: en escritorio lo colapsa
  // (y recuerda la preferencia); en móvil abre/cierra el panel superpuesto.
  toggleMenu(): void {
    if (this.esMovil) {
      this.menuMovilAbierto = !this.menuMovilAbierto;
      return;
    }
    this.sidebarOculta = !this.sidebarOculta;
    try {
      localStorage.setItem(SIDEBAR_KEY, this.sidebarOculta ? '1' : '0');
    } catch {
      // sin almacenamiento: la preferencia dura solo esta sesión
    }
  }

  logout(): void {
    this.menuUsuarioAbierto = false;
    this.auth.logout();
  }

  abrirPassword(): void {
    this.mostrarCambiarPassword = true;
    this.menuUsuarioAbierto = false;
    this.menuMovilAbierto = false;
    this.passwordFeedback = null;
    this.passwordForm.reset();
  }

  cerrarPassword(): void {
    this.mostrarCambiarPassword = false;
    this.passwordFeedback = null;
  }

  async onCambiarPassword(): Promise<void> {
    this.passwordFeedback = null;
    if (this.passwordForm.invalid) {
      this.passwordFeedback = { type: 'err', text: 'Completa ambos campos (mínimo 6 caracteres la nueva).' };
      return;
    }

    const { passwordActual, passwordNueva } = this.passwordForm.value;
    this.enviandoPassword = true;
    try {
      await this.auth.cambiarPassword(passwordActual!, passwordNueva!);
      this.passwordFeedback = { type: 'ok', text: 'Contraseña actualizada.' };
      this.toast.ok('Contraseña actualizada.');
      this.passwordForm.reset();
    } catch (err: any) {
      this.passwordFeedback = { type: 'err', text: err?.error?.error ?? 'No se pudo cambiar la contraseña.' };
    } finally {
      this.enviandoPassword = false;
    }
  }

  private get rol() {
    return this.auth.usuario()?.rol;
  }

  get puedeVerAlertas(): boolean {
    return this.permisos.puedeVer('alertas');
  }

  get rolLegible(): string {
    if (this.rol === 'administrador') return 'Administrador';
    if (this.rol === 'encargado') return 'Encargado de tienda';
    if (this.rol === 'reponedor') return 'Reponedor';
    return '';
  }
}
