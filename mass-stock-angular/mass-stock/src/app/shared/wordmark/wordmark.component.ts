import { Component, Input } from '@angular/core';

// Logotipo "Mass✓" en texto, para usarlo sobre fondos azules o amarillos sin depender de una imagen.
@Component({
  selector: 'app-wordmark',
  standalone: true,
  template: `<span class="wm" [style.font-size.px]="size" [style.color]="color">Mass<svg viewBox="0 0 40 24" aria-hidden="true"><path d="M3 13.5 11 21 37 3" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`,
  styles: [`
    :host { display: inline-flex; }
    .wm {
      display: inline-flex; align-items: flex-end; gap: .08em;
      font-family: var(--font-display); font-weight: 800; font-style: italic;
      letter-spacing: -0.03em; line-height: .9;
    }
    svg { width: .95em; height: .6em; margin-bottom: .12em; }
  `],
})
export class WordmarkComponent {
  @Input() size = 28;
  @Input() color = 'var(--brand-yellow)';
}
