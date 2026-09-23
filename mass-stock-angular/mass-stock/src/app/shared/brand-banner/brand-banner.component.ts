import { Component, Input } from '@angular/core';
import { WordmarkComponent } from '../wordmark/wordmark.component';

// Banner amarillo de marca que cierra las pantallas principales.
@Component({
  selector: 'app-brand-banner',
  standalone: true,
  imports: [WordmarkComponent],
  template: `
    <div class="brand-banner">
      <app-wordmark [size]="52" color="var(--on-yellow)"></app-wordmark>
      <span class="sep"></span>
      <span class="bb-text">Productos siempre disponibles<br />para tus clientes.</span>
      <span class="bb-quote">{{ linea1 }}<br />{{ linea2 }}</span>
    </div>
  `,
})
export class BrandBannerComponent {
  @Input() linea1 = '“Un mejor control,';
  @Input() linea2 = 'una mejor tienda”';
}
