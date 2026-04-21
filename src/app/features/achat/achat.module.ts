import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AchatRoutingModule } from './achat routing.module';
import { GestionFournisseursComponent } from './Gestion-fournisseurs/gestion-fournisseurs.component';

@NgModule({
  declarations: [
    GestionFournisseursComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AchatRoutingModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ]
})
export class AchatModule { }