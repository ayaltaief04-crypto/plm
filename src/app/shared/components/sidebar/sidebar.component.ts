import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReunionService } from '../../../core/services/reunion.service';
import { AuthService, UserSession } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  isCollapsed = false;
  reunionsPanelOpen = false;
  upcomingCount = 0;
  userRole: string = ''; 

  private authSub?: Subscription;
  private reunionSub?: Subscription;

  constructor(
    private reunionSvc: ReunionService,
    private authSvc: AuthService 
  ) {}

  ngOnInit() {
    // S'abonner aux changements d'utilisateur pour mettre à jour le rôle dynamiquement
    this.authSub = this.authSvc.user$.subscribe((user: UserSession | null) => {
      if (user && user.role) {
        // Nettoyage et normalisation du rôle
        this.userRole = user.role.trim().toLowerCase();
        console.log('Sidebar - Rôle détecté :', this.userRole);

        if (this.userRole !== 'admin') {
          this.subscribeToReunions();
        } else {
          this.reunionSub?.unsubscribe();
          this.upcomingCount = 0;
          this.reunionsPanelOpen = false;
        }
      } else {
        this.userRole = 'invite';
      }
    });
  }

 private subscribeToReunions() {
  this.reunionSub?.unsubscribe();
  this.reunionSub = this.reunionSvc.reunions$.subscribe(() => {
    // Utiliser le rôle original (pas lowercase) pour le filtre
    const roleOriginal = this.authSvc.getRole() || '';
    const reunionsFiltrees = this.reunionSvc.getReunionsPourRole(roleOriginal);
    const now = new Date().getTime();
    this.upcomingCount = reunionsFiltrees
      .filter(r => r.date && new Date(r.date).getTime() >= now)
      .length;
  });
}

  ngOnDestroy() {
    this.authSub?.unsubscribe();
    this.reunionSub?.unsubscribe();
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    if (this.isCollapsed) {
      this.reunionsPanelOpen = false;
    }
  }

  toggleReunionsPanel() {
    this.reunionsPanelOpen = !this.reunionsPanelOpen;
  }

  closeReunionsPanel() {
    this.reunionsPanelOpen = false;
  }
}