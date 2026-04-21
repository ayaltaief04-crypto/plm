import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms'; // Indispensable pour [formGroup]
import { MarketingRoutingModule } from './marketing-routing.module';
import { MarketingFormComponent } from './marketing-form/marketing-form.component';

// Imports Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

@NgModule({
  declarations: [
    MarketingFormComponent
  ],
  imports: [
    CommonModule,
    MarketingRoutingModule,
    ReactiveFormsModule, // <--- Pour faire disparaître l'erreur NG8002 (formGroup)
    
    // Matériels pour supprimer les erreurs NG8001
    MatCardModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSliderModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  exports: [
    MarketingFormComponent
  ]
})

export class MarketingModule { }
