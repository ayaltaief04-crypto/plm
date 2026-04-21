import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  userName: string = '';
  userRole: string = '';
  userRoleRaw: string = '';
  notificationCount: number = 3;

  @Output() toggleSidebar = new EventEmitter<void>();

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
  // On écoute en continu les changements
  this.authService.user$.subscribe(user => {
    this.userName = user.name;
    this.userRoleRaw = user.role;
    this.userRole = this.getRoleLabel(user.role);
    console.log('Navbar mise à jour avec :', user.name);
  });
}

  loadUserInfo(): void {
    // Récupération depuis localStorage (rempli par AuthService.saveSession)
    this.userName = this.authService.getUserName() || 'Utilisateur';
    this.userRoleRaw = this.authService.getRole();
    this.userRole = this.getRoleLabel(this.userRoleRaw);
  }

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      'Styliste': 'Styliste',
      'ResponsableMarketing': 'Resp. Marketing',
      'Ingenieurtextile': 'Ing. Textile',
      'ResponsableAchat': 'Resp. Achat',
      'ResponsableQualite': 'Resp. Qualité',
      'Admin': 'Administrateur',
      'Invite': 'Invité'
    };
    return labels[role] || role;
  }

  get userInitials(): string {
    if (!this.userName) return '?';
    return this.userName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  get roleIcon(): string {
    const icons: Record<string, string> = {
      'Styliste': 'palette',
      'ResponsableMarketing': 'campaign',
      'Ingenieurtextile': 'engineering',
      'ResponsableAchat': 'shopping_cart',
      'ResponsableQualite': 'verified',
      'Admin': 'admin_panel_settings',
    };
    return icons[this.userRoleRaw] || 'person';
  }

  toggleMenu() { this.toggleSidebar.emit(); }
  onLogout() { this.authService.logout(); }
}
