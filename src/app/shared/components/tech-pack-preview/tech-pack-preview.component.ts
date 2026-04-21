import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-tech-pack-preview',
  templateUrl: './tech-pack-preview.component.html',
  styleUrls: ['./tech-pack-preview.component.scss']
})
export class TechPackPreviewComponent {
  @Input() data: any; // Reçoit l'objet produit/version complet
  today: number = Date.now();
}