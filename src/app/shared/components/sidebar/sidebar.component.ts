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
  userRole: string = ''; // Sera mis à jour via l'observable

  private authSub?: Subscription;
  private reunionSub?: Subscription;

  constructor(
    private reunionSvc: ReunionService,
    private authSvc: AuthService 
  ) {}

  ngOnInit() {
    // 1. S'abonner aux changements d'utilisateur (Login/Logout/Switch)
    this.authSub = this.authSvc.user$.subscribe((user: UserSession | null) => {
      if (user && user.role) {
        // On nettoie le rôle pour la comparaison HTML
        this.userRole = user.role.trim().toLowerCase();
        console.log('Sidebar - Rôle actuel :', this.userRole);

        // 2. Si ce n'est pas un admin, on active le flux des réunions
        if (this.userRole !== 'admin') {
          this.subscribeToReunions();
        } else {
          // Si on devient admin, on coupe les réunions
          this.reunionSub?.unsubscribe();
          this.upcomingCount = 0;
        }
      } else {
        this.userRole = 'invite';
      }
    });
  }

  private subscribeToReunions() {
    // On nettoie l'ancien abonnement avant d'en créer un nouveau
    this.reunionSub?.unsubscribe();
    this.reunionSub = this.reunionSvc.reunions$.subscribe(() => {
      this.upcomingCount = this.reunionSvc.getUpcoming().length;
    });
  }

  ngOnDestroy() {
    // Nettoyage crucial pour éviter les fuites de mémoire
    this.authSub?.unsubscribe();
    this.reunionSub?.unsubscribe();
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    // Si on réduit la barre, on ferme le panneau des réunions pour l'ergonomie
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