import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QualityControlComponent } from './quality-control/quality-control.component';

const routes: Routes = [
  
  { path: 'check/:id', component: QualityControlComponent }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class QualityRoutingModule { }
