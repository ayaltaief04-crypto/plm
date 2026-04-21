import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CatalogueComponent } from '../catalogue/catalogue.component';
import { ProductFormComponent } from './product-form/product-form.component';
import { ProductSummaryComponent } from '../catalogue/components/product-summary/product-summary.component';
import { VersionListComponent } from './version-list/version-list.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: 'catalogue',        component: CatalogueComponent },
      { path: 'creer-produit',    component: ProductFormComponent },
      { path: 'product-form/:id', component: ProductFormComponent },   // ← AJOUTÉ
      { path: 'detail/:id',       component: ProductSummaryComponent },
      { path: 'versions/:id',     component: VersionListComponent },
      { path: '',                 redirectTo: 'catalogue', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductRoutingModule { }
