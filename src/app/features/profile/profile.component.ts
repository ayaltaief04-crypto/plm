import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/user.model';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {

  user: User | null = null;
  loading = true;
  error = '';

  // Formulaire mot de passe
  showPasswordSection = false;
  passwordForm = { newPass: '', confirmPass: '' };
  showNewPass = false;
  showConfirmPass = false;
  passwordError = '';
  passwordSuccess = '';
  passwordSubmitting = false;

  readonly roleLabels: Record<string, string> = {
    'Styliste':             'Styliste',
    'ResponsableMarketing': 'Responsable Marketing',
    'Ingenieurtextile':     'Ingénieur Textile',
    'ResponsableAchat':     'Responsable Achats',
    'ResponsableQualite':   'Responsable Qualité',
    'Admin':                'Administrateur',
  };

  readonly roleIcons: Record<string, string> = {
    'Styliste':             'palette',
    'ResponsableMarketing': 'campaign',
    'Ingenieurtextile':     'engineering',
    'ResponsableAchat':     'shopping_cart',
    'ResponsableQualite':   'verified',
    'Admin':                'admin_panel_settings',
  };

  constructor(
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    const session = this.authService.getCurrentUser();
    const userId = Number(session.id);

    if (!userId) {
      // Pas d'ID en session : on construit un profil minimal depuis le token
      this.user = {
        Nom: session.name,
        Email: '',
        Role: session.role,
        Actif: true,
      };
      this.loading = false;
      return;
    }

    // Essaie d'abord GET /Users/{id} (accessible à tous les rôles normalement)
    this.userService.getUserById(userId).pipe(
      catchError(() => {
        // Si 403/404, fallback : construit le profil depuis la session JWT
        const fallback: User = {
          IdUtilisateur: userId,
          Nom: session.name,
          Email: '',
          Role: session.role,
          Actif: true,
        };
        return of(fallback);
      })
    ).subscribe(user => {
      this.user = user;
      this.loading = false;
    });
  }

  get roleLabel(): string {
    return this.roleLabels[this.user?.Role || ''] || this.user?.Role || '—';
  }

  get roleIcon(): string {
    return this.roleIcons[this.user?.Role || ''] || 'person';
  }

  get initials(): string {
    const nom = this.user?.Nom || '';
    const parts = nom.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return nom.slice(0, 2).toUpperCase() || 'U';
  }

  togglePasswordSection(): void {
    this.showPasswordSection = !this.showPasswordSection;
    if (!this.showPasswordSection) {
      this.resetPasswordForm();
    }
  }

  submitPassword(): void {
    this.passwordError = '';
    this.passwordSuccess = '';

    const { newPass, confirmPass } = this.passwordForm;

    if (!newPass || !confirmPass) {
      this.passwordError = 'Veuillez remplir les deux champs.';
      return;
    }
    if (newPass.length < 6) {
      this.passwordError = 'Le mot de passe doit contenir au moins 6 caractères.';
      return;
    }
    if (newPass !== confirmPass) {
      this.passwordError = 'Les mots de passe ne correspondent pas.';
      return;
    }

    const userId = this.user?.IdUtilisateur || Number(this.authService.getCurrentUser().id);
    if (!userId) return;

    this.passwordSubmitting = true;

    this.userService.updatePassword(userId, newPass).subscribe({
      next: () => {
        this.passwordSuccess = 'Mot de passe mis à jour avec succès !';
        this.passwordSubmitting = false;
        this.passwordForm = { newPass: '', confirmPass: '' };
        setTimeout(() => {
          this.showPasswordSection = false;
          this.passwordSuccess = '';
        }, 2500);
      },
      error: () => {
        this.passwordError = 'Erreur lors de la mise à jour. Veuillez réessayer.';
        this.passwordSubmitting = false;
      }
    });
  }

  private resetPasswordForm(): void {
    this.passwordForm = { newPass: '', confirmPass: '' };
    this.passwordError = '';
    this.passwordSuccess = '';
    this.showNewPass = false;
    this.showConfirmPass = false;
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  }
}