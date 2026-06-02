import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  email = '';
  motDePasse = '';
  erreur = '';
  isLoading = false;
  isSupportMode = false;
  supportMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.redirectByRole();
    }
  }

  onSubmit(): void {
    this.erreur = '';

    if (!this.email || !this.motDePasse) {
      this.erreur = 'Veuillez remplir tous les champs.';
      return;
    }

    this.isLoading = true;

    this.authService.login(this.email, this.motDePasse).subscribe({
      next: () => {
      
        this.isLoading = false;
      },
      error: () => {
        this.erreur = 'Mot de passe incorrect ou Email inexistant';
        this.isLoading = false;
      }
    });
  }

 

  

  private redirectByRole(): void {
    const role = this.authService.getRole().toLowerCase();
    if (role === 'admin') {
      this.router.navigate(['/admin/users']);
    } else {
      this.router.navigate(['/products/catalogue']);
    }
  }
}