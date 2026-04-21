import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NomenclatureRoutingModule } from './nomenclature-routing.module';
import { NomenclatureViewComponent } from './nomenclature-view/nomenclature-view.component';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // ← AJOUTER
import { MatTooltipModule } from '@angular/material/tooltip';                  // ← AJOUTER

@NgModule({
  declarations: [
    NomenclatureViewComponent
  ],
  imports: [
    CommonModule,
    NomenclatureRoutingModule,
    ReactiveFormsModule,
    FormsModule,                  // ← AJOUTER (pour [(ngModel)] si utilisé)
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatProgressSpinnerModule,     // ← AJOUTER (pour <mat-spinner> dans le template)
    MatTooltipModule              // ← AJOUTER (pour matTooltip sur les boutons)
  ],
  exports: [
    NomenclatureViewComponent
  ]
})
export class NomenclatureModule { }
