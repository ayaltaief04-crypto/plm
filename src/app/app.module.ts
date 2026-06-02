import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// Modules Système & UI
import { OverlayModule } from '@angular/cdk/overlay';
import { DragDropModule } from '@angular/cdk/drag-drop';

// Tes Modules de Features
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ProductModule } from './features/product/product.module'; // <-- IMPORTÉ ICI
import { SharedModule } from './shared/shared.module';


// Intercepteurs
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { GlobalNotificationService } from './core/services/global-notification.service';
import { MarketingFormComponent } from './features/marketing/marketing-form/marketing-form.component';
import { MarketingModule } from './features/marketing/marketing.module';
import { QualityModule } from './features/quality/quality.module';
import { NomenclatureModule } from './features/nomenclature/nomenclature.module';

@NgModule({
  declarations: [
    AppComponent,
  
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    FormsModule,
    SharedModule,
    HttpClientModule,
    BrowserAnimationsModule, // Règle l'erreur NullInjector mat-select
    OverlayModule,           // Règle l'erreur NullInjector mat-select
    DragDropModule,
    ProductModule,
    MarketingModule,
    QualityModule,
    NomenclatureModule,      // <--- TRÈS IMPORTANT : Ajoute-le ici !
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }