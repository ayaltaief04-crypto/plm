import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ForumService } from '../../../core/services/forum.service';
import { ForumNotification } from '../../../core/models/forum-message.model';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {

  userName: string = '';
  userRole: string = '';
  userRoleRaw: string = '';

  notifications: ForumNotification[] = [];
  unreadCount: number = 0;

  @Output() toggleSidebar = new EventEmitter<void>();

  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private authService: AuthService,
    private forumService: ForumService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.authService.user$.subscribe(user => {
        this.userName    = user.name;
        this.userRoleRaw = user.role;
        this.userRole    = this.getRoleLabel(user.role);
      })
    );

    this.subs.push(
      this.forumService.notifications$.subscribe(notifs => {
        // Tri : non-lues en premier, puis par date décroissante
        this.notifications = [...notifs].sort((a, b) => {
          if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }).slice(0, 20);
        this.unreadCount = notifs.filter(n => !n.isRead).length;
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // ─── Notification actions ────────────────────────────────────────

  onNotifMenuOpen(): void {
    // On ne marque pas tout comme lu automatiquement — l'utilisateur
    // doit cliquer ou utiliser "Tout marquer comme lu"
  }

  onNotifClick(n: ForumNotification): void {
    this.forumService.markAsRead(n.messageId);
    // Naviguer vers le produit concerné et ouvrir l'onglet forum
    this.router.navigate(['/products/form', n.productId], {
      queryParams: { section: 'forum' }
    });
  }

  markAllRead(): void {
    this.forumService.markAllAsRead();
  }

  clearAllNotifications(): void {
    this.forumService.clearNotifications();
  }

  formatNotifDate(dateStr: string | Date): string {
    const d    = new Date(dateStr);
    const now  = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diff < 60)    return 'à l\'instant';
    if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  // ─── Helpers ────────────────────────────────────────────────────

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      'Styliste':             'Styliste',
      'ResponsableMarketing': 'Resp. Marketing',
      'Ingenieurtextile':     'Ing. Textile',
      'ResponsableAchat':     'Resp. Achat',
      'ResponsableQualite':   'Resp. Qualité',
      'Admin':                'Administrateur',
      'Invite':               'Invité'
    };
    return labels[role] || role;
  }

  get roleIcon(): string {
    const icons: Record<string, string> = {
      'Styliste':             'palette',
      'ResponsableMarketing': 'campaign',
      'Ingenieurtextile':     'engineering',
      'ResponsableAchat':     'shopping_cart',
      'ResponsableQualite':   'verified',
      'Admin':                'admin_panel_settings',
    };
    return icons[this.userRoleRaw] || 'person';
  }

  toggleMenu() { this.toggleSidebar.emit(); }
  onProfile()  { this.router.navigate(['/profile']); }
  onLogout()   { this.authService.logout(); }
}
