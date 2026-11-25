import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core';

@Component({ selector:'app-root', standalone:true, imports:[RouterOutlet,RouterLink], templateUrl:'./app.html', styleUrl:'./app.css' })
export class App {
  auth=inject(AuthService); router=inject(Router);
  logout(){ this.auth.logout(); this.router.navigateByUrl('/'); }
}
