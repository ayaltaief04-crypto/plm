import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component'; // Vérifie bien ce chemin

const routes: Routes = [
 { path: 'login', component: LoginComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)], // Utilise forChild ici !
  exports: [RouterModule]
})
export class AuthRoutingModule { }