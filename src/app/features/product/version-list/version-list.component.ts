import { Component, Input, Output, EventEmitter } from '@angular/core';
import { StyleVersion, Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-version-list',
  templateUrl: './version-list.component.html',
  styleUrls: ['./version-list.component.scss']
})
export class VersionListComponent {
  @Input() product: Product | null = null;

  @Output() action = new EventEmitter<{type: string, version: StyleVersion}>();
  @Output() generateNew = new EventEmitter<void>();

  trigger(type: string, v: StyleVersion) {
    this.action.emit({ type, version: v });
  }

  requestNew() {
    this.generateNew.emit();
  }

  getStatusClass(statut: string): string {
    if (!statut) return 'publie';
    const s = statut.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (s.includes('valid'))   return 'valide';
    if (s.includes('clotur'))  return 'cloture';
    if (s.includes('en cours')) return 'en-cours';
    if (s.includes('brouill')) return 'brouillon';
    return 'publie';
  }
}
