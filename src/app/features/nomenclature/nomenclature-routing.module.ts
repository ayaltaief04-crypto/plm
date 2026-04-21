import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NomenclatureViewComponent } from './nomenclature-view/nomenclature-view.component';

const routes: Routes = [
  // L'URL sera : /nomenclature/bom/1 (où 1 est l'ID du produit)
  { 
    path: 'bom/:id', 
    component: NomenclatureViewComponent 
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NomenclatureRoutingModule { }
