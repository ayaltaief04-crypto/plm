import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TextileManagementComponent } from './textile-management.component';

const routes: Routes = [
  {
    path: '',
    component: TextileManagementComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TextileRoutingModule { }