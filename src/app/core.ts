import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { Router, CanActivateFn } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';

export const API_URL = 'http://localhost:8080/api';
export interface User { id:string; name:string; email:string; role:'ADMIN'|'TECHNICIAN'; active:boolean; createdAt?:string; }
export interface HistoryEvent { previousStatus:string|null; status:string; label:string; observation:string|null; technician:string|null; createdAt:string; }
export interface Repair { id:string; trackingCode:string; clientId:string; clientName:string; clientPhone:string; equipmentId:string; equipmentKind:string; equipmentBrand:string; equipmentModel:string; serialNumber:string; problemReported:string; diagnosis:string; internalObservations:string; customerObservations:string; status:string; statusLabel:string; technician:string; technicianId:string; estimatedDelivery:string|null; createdAt:string; history?:HistoryEvent[]; }
export interface Tracking { trackingCode:string; status:string; statusLabel:string; equipment:string; brand:string; model:string; diagnosis:string|null; customerObservations:string|null; estimatedDelivery:string|null; receivedAt:string; history:HistoryEvent[]; }
export interface Client { id:string; name:string; lastName:string; dni:string; phone:string; email:string; }
export interface Equipment { id:string; clientId:string; kind:string; brand:string; model?:string; serialNumber?:string; }

@Injectable({providedIn:'root'}) export class AuthService {
  private http=inject(HttpClient); private router=inject(Router);
  user=signal<User|null>(this.restoreUser());
  get token(){return localStorage.getItem('galatech_token');}
  async login(email:string,password:string){const data=await firstValueFrom(this.http.post<{token:string;user:User}>(`${API_URL}/auth/login`,{email,password}).pipe(timeout({first:15000})));localStorage.setItem('galatech_token',data.token);localStorage.setItem('galatech_user',JSON.stringify(data.user));this.user.set(data.user);}
  logout(){localStorage.removeItem('galatech_token');localStorage.removeItem('galatech_user');this.user.set(null);}
  private restoreUser():User|null {try{return JSON.parse(localStorage.getItem('galatech_user')||'null')}catch{return null}}
}
@Injectable({providedIn:'root'}) export class ApiService {
  http=inject(HttpClient);
  get<T>(path:string){return firstValueFrom(this.http.get<T>(`${API_URL}${path}`).pipe(timeout({first:15000})));}
  post<T>(path:string,body:unknown){return firstValueFrom(this.http.post<T>(`${API_URL}${path}`,body).pipe(timeout({first:15000})));}
  put<T>(path:string,body:unknown){return firstValueFrom(this.http.put<T>(`${API_URL}${path}`,body).pipe(timeout({first:15000})));}
  patch<T>(path:string,body:unknown){return firstValueFrom(this.http.patch<T>(`${API_URL}${path}`,body).pipe(timeout({first:15000})));}
}
export const authInterceptor:HttpInterceptorFn=(req,next)=>{const auth=inject(AuthService);return next(auth.token?req.clone({setHeaders:{Authorization:`Bearer ${auth.token}`}}):req)};
export const authGuard:CanActivateFn=()=>{const auth=inject(AuthService);if(auth.user())return true;return inject(Router).createUrlTree(['/login'])};
export const roleGuard=(role:'ADMIN'|'TECHNICIAN'):CanActivateFn=>()=>{const auth=inject(AuthService);if(auth.user()?.role===role)return true;return inject(Router).createUrlTree([auth.user()?'/panel':'/login'])};
