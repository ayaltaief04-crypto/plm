import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GestionFournisseursComponent } from './Gestion-fournisseurs/gestion-fournisseurs.component';
const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'fournisseurs',
        component: GestionFournisseursComponent,
        title: 'PLM - Gestion des Fournisseurs'
      },
      {
        path: '',
        redirectTo: 'fournisseurs',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AchatRoutingModule { }