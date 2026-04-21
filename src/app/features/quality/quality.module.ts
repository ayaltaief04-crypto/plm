import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { QualityRoutingModule } from './quality-routing.module';
import { QualityControlComponent } from './quality-control/quality-control.component';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

// --- AJOUTE CES DEUX LIGNES ---
import { MatSelectModule } from '@angular/material/select'; 
import { MatOptionModule } from '@angular/material/core'; 
// ------------------------------

@NgModule({
  declarations: [QualityControlComponent],
  imports: [
    CommonModule,
    QualityRoutingModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatSliderModule,
    MatSlideToggleModule,
    // --- ET AJOUTE-LES ICI AUSSI ---
    MatSelectModule,
    MatOptionModule
    // ------------------------------
  ],
  exports: [
    QualityControlComponent
  ]   
})
export class QualityModule { }