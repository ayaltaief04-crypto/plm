import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Importations Material (selon tes besoins)
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TextileRoutingModule } from './textile-routing.module';
import { TextileManagementComponent } from './textile-management.component';

@NgModule({
  declarations: [
    TextileManagementComponent
  ],
  imports: [
    CommonModule,
    TextileRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
    // Ajoute ici ton SharedModule si tu en as un pour les boutons/inputs
  ]
})
export class TextileModule { }