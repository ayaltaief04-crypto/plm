import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserManagementComponent } from './user-management/user-management.component';
import { GestionListesComponent } from './gestion-listes/gestion-listes.component';

const routes: Routes = [
  {
    path: '', // Chemin vide car le préfixe 'admin' sera défini dans le app-routing
    children: [
      { 
        path: 'users', 
        component: UserManagementComponent,
        title: 'PLM - Gestion Utilisateurs' 
      },
      { 
        path: 'listes', 
        component: GestionListesComponent, 
        title: 'PLM - Gestion des Listes'
      },
      { 
        path: '', 
        redirectTo: 'users', 
        pathMatch: 'full' 
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }