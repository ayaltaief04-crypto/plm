import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ProductFormComponent } from './product-form/product-form.component';
import { CatalogueComponent } from '../catalogue/catalogue.component';
import { ProductSummaryComponent } from '../catalogue/components/product-summary/product-summary.component';
import { ProductRoutingModule } from './product-routing.module';
import { VersionListComponent } from './version-list/version-list.component';
import { ChecklistVersionComponent } from './checklist-version/checklist-version.component';
import { ForumComponent } from './forum/forum.component';
import { ReportService } from '@app/core/services/report.service';
import { HttpClientModule } from '@angular/common/http';
import { SharedModule } from '../../shared/shared.module';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';

// CDK Drag & Drop
import { DragDropModule } from '@angular/cdk/drag-drop';

// Feature Modules
import { NomenclatureModule } from '../nomenclature/nomenclature.module';
import { MarketingModule } from '../marketing/marketing.module';
import { QualityModule } from '../quality/quality.module';
import { ReportComponent } from './report/report.component';

@NgModule({
  declarations: [
    ProductFormComponent,
    CatalogueComponent,
    ProductSummaryComponent,
    VersionListComponent,
    ChecklistVersionComponent,
    ForumComponent,
    ReportComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTabsModule,
    ProductRoutingModule,
    DragDropModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatOptionModule,
    MatMenuModule,
    MatTooltipModule,
    MarketingModule,
    NomenclatureModule,
    QualityModule,
    HttpClientModule,
    SharedModule
  ],
  exports: [
    ProductFormComponent,
    CatalogueComponent,
    ProductSummaryComponent,
    ReportComponent
    
    
  ]
})
export class ProductModule { }
