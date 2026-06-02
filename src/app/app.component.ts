import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { GlobalNotificationService } from './core/services/global-notification.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'plm';

  constructor(
    public router: Router,
    private authService: AuthService,
    private globalNotif: GlobalNotificationService
  ) {}

  ngOnInit(): void {
    // Démarrer les notifications globales si déjà connecté (refresh page)
    if (this.authService.isLoggedIn()) {
      this.globalNotif.start();
    }

    // Démarrer quand le token change (connexion)
    this.authService.user$.subscribe(user => {
      if (user.role !== 'Invite' && this.authService.isLoggedIn()) {
        this.globalNotif.start();
      }
    });
  }
}
