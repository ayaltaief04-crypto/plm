import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MarketingFormComponent } from './marketing-form/marketing-form.component';

const routes: Routes = [

  // On passe l'ID du produit pour savoir quoi marketter
  { path: 'strategie/:id', component: MarketingFormComponent }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MarketingRoutingModule { }
