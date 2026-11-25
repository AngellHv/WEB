import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core';
import { HomePage, LoginPage, TrackingPage, DashboardPage, RepairListPage, TechnicianPage, NewRepairPage, ClientPage } from './pages';
export const routes: Routes = [
  {path:'',component:HomePage,title:'GALATECH | Servicio técnico'},
  {path:'seguimiento',component:TrackingPage,title:'Seguimiento de reparación'},
  {path:'seguimiento/:code',component:TrackingPage,title:'Seguimiento de reparación'},
  {path:'login',component:LoginPage,title:'Acceso al sistema'},
  {path:'panel',component:DashboardPage,canActivate:[authGuard],title:'Panel de trabajo'},
  {path:'reparaciones',component:RepairListPage,canActivate:[authGuard],pathMatch:'full',title:'Reparaciones'},
  {path:'reparaciones/:code',component:RepairListPage,canActivate:[authGuard],title:'Detalle de reparación'},
  {path:'tecnicos',component:TechnicianPage,canActivate:[roleGuard('ADMIN')],title:'Gestión de técnicos'},
  {path:'nueva-reparacion',component:NewRepairPage,canActivate:[roleGuard('ADMIN')],title:'Registrar reparación'},
  {path:'clientes',component:ClientPage,canActivate:[roleGuard('ADMIN')],title:'Clientes'},
  {path:'**',redirectTo:''}
];
