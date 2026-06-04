import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface UserSession {
  name: string;
  role: string;
  id: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/Auth`;

  private readonly roleMapping: Record<string, string> = {
    '0': 'Styliste',
    '1': 'ResponsableMarketing',
    '2': 'Ingenieurtextile',
    '3': 'ResponsableAchat',
    '4': 'ResponsableQualite',
    '5': 'Admin'
  };

  
  private userSubject = new BehaviorSubject<UserSession>({
    name: sessionStorage.getItem('userName') || 'Utilisateur',
    role: sessionStorage.getItem('userRole') || 'Invite',
    id: sessionStorage.getItem('userId') || ''
  });

  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, motDePasse: string): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/login`, { email, motDePasse }).pipe(
    tap(res => {
      if (res && res.token) {
        this.saveSession(res.token);
        this.handleNavigation();
      }
    }),
    catchError(err => {
      console.error('Erreur Login:', err);
      return throwError(() => err);
    })
  );
}

  public saveSession(token: string): void {
    if (!token) return;
    // On utilise sessionStorage au lieu de localStorage
    sessionStorage.setItem('token', token);
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      const userId = payload['nameid'] || 
                     payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || 
                     payload['sub'] || '';

      const userName = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
                       payload['unique_name'] || 
                       payload['name'] || 
                       payload['given_name'] ||
                       payload['email']?.split('@')[0] || 'Utilisateur';

      const rawRole = payload['role'] || 
                      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      
      const roleToMap = Array.isArray(rawRole) ? rawRole[0] : rawRole;
      const roleName = this.roleMapping[roleToMap?.toString()] || roleToMap || 'Invite';

      // Stockage dans SessionStorage
      sessionStorage.setItem('userId', userId);
      sessionStorage.setItem('userName', userName);
      sessionStorage.setItem('userRole', roleName);

      this.userSubject.next({ id: userId, name: userName, role: roleName });

    } catch (e) {
      console.error('Erreur décodage token:', e);
    }
  }

  private handleNavigation(): void {
    const role = this.getRole().toLowerCase();
    if (role === 'admin') {
      this.router.navigate(['/admin/users']);
    } else {
      this.router.navigate(['/products/catalogue']);
    }
  }

  getCurrentUser(): UserSession {
    return this.userSubject.value;
  }

  getUserName(): string {
    return this.userSubject.value.name;
  }

  getRole(): string {
    return this.userSubject.value.role;
  }

  getToken(): string | null {
    return sessionStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    // Nettoyage du SessionStorage
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userRole');

    this.userSubject.next({ name: 'Utilisateur', role: 'Invite', id: '' });
    this.router.navigate(['/auth/login']);
  }
}