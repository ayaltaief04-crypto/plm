import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductFormComponent } from './features/product/product-form/product-form.component';
import { ReportComponent } from './features/product/report/report.component';

const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'products',
    loadChildren: () => import('./features/product/product.module').then(m => m.ProductModule)
  },
  {
    path: 'marketing',
    loadChildren: () => import('./features/marketing/marketing.module').then(m => m.MarketingModule)
  },
  {
    path: 'nomenclature',
    loadChildren: () => import('./features/nomenclature/nomenclature.module').then(m => m.NomenclatureModule)
  },
  {
    path: 'quality',
    loadChildren: () => import('./features/quality/quality.module').then(m => m.QualityModule)
  },

  // --- FEATURE ADMIN AJOUTÉE ICI ---
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule)
  },
  {
  path: 'fournisseurs',
  loadChildren: () => import('./features/achat/achat.module').then(m => m.AchatModule)
},
{
    path: 'textile',
    loadChildren: () => import('./features/textile/textile.module').then(m => m.TextileModule)
  },
  { 
    path: 'produit/rapport/:id', 
    component: ReportComponent 
  },
  // ---------------------------------

  { path: 'products/form', component: ProductFormComponent },
  { path: 'products/form/:id', component: ProductFormComponent },
  
  {
    path: 'profile',
    loadChildren: () => import('./features/profile/profile.module').then(m => m.ProfileModule)
  },
  { path: '', redirectTo: 'auth', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth' } // Toujours en dernier pour capturer les erreurs 404
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }