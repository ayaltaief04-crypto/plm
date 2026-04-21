import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service'; // Chemin corrigé (double auth)

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  email = '';
  motDePasse = '';
  erreur = '';
  isSupportMode = false;
  supportMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Si déjà connecté, on redirige direct
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

    this.authService.login(this.email, this.motDePasse).subscribe({
  next: (res) => {
    // res est l'objet { token: "..." } envoyé par ton AuthController.cs
    this.authService.saveSession(res.token); 
    this.redirectByRole();
  },
  error: (err) => {
    this.erreur = 'Identifiants incorrects ou serveur éteint.';
  }
});
  }

  toggleMode(): void {
    this.isSupportMode = !this.isSupportMode;
    this.erreur = '';
  }

  envoyerSupport(): void {
    if (!this.supportMessage.trim()) {
      this.erreur = 'Veuillez décrire votre problème.';
      return;
    }
    alert("Votre demande a été envoyée à l'administrateur.");
    this.supportMessage = '';
    this.isSupportMode = false;
  }

  private redirectByRole(): void {
  const role = this.authService.getRole().toLowerCase();
  
  if (role === 'admin') {
    // Redirige vers la gestion des utilisateurs par défaut
    this.router.navigate(['/admin/users']); 
  } else if (role === 'styliste') {
    this.router.navigate(['/products/catalogue']);
  } else {
    this.router.navigate(['/products/catalogue']);
  }
}
  }
