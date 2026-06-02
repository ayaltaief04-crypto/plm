import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { ForumService } from './forum.service';
import { AuthService } from './auth.service';

/**
 * Service global : se connecte au hub SignalR sans produit spécifique
 * pour recevoir les notifications de tous les produits même hors du forum.
 */
@Injectable({ providedIn: 'root' })
export class GlobalNotificationService {
  private hubConnection?: signalR.HubConnection;
  private started = false;

  constructor(
    private forumService: ForumService,
    private authService: AuthService
  ) {}

  start(): void {
    if (this.started) return;
    const token = this.authService.getToken();
    if (!token) return;
    this.started = true;

    const baseUrl = environment.apiUrl.replace('/api', '');
    // Connexion sans produitId → le hub mettra l'utilisateur dans un groupe "global"
    const hubUrl = `${baseUrl}/chatHub`;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => this.authService.getToken() ?? '',
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hubConnection.on('ReceiveMessage', (raw: any) => {
      const currentUserId = this.authService.getCurrentUser().id;
      const auteurId = String(raw.utilisateurId ?? raw.UtilisateurId ?? raw.auteurId ?? '');
      if (auteurId && auteurId !== String(currentUserId)) {
        const produitNom = raw.produitNom ?? raw.ProduitNom ?? `Produit #${raw.produitId ?? ''}`;
        this.forumService.pushGlobalNotification(raw, produitNom);
      }
    });

    this.hubConnection.start().catch(err =>
      console.warn('[GlobalNotif] SignalR start failed (non-critical):', err)
    );
  }

  stop(): void {
    this.hubConnection?.stop();
    this.started = false;
  }
}
