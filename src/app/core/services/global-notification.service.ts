
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
  if (!token) {
    console.warn('[GlobalNotif] ❌ Pas de token');
    return;
  }
  this.started = true;

  const baseUrl = environment.apiUrl.replace('/api', '');
  const hubUrl = `${baseUrl}/chatHub`;
  console.log('[GlobalNotif] 🔌 Connexion vers:', hubUrl);

  this.hubConnection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => this.authService.getToken() ?? '',
      skipNegotiation: true,
      transport: signalR.HttpTransportType.WebSockets
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Information) // ← Warning → Information
    .build();

  this.hubConnection.on('ReceiveMessage', (raw: any) => {
    console.log('[GlobalNotif] 📩 Message reçu:', raw);
    const currentUserId = this.authService.getCurrentUser().id;
    const auteurId = String(raw.utilisateurId ?? raw.UtilisateurId ?? raw.auteurId ?? '');
    console.log('[GlobalNotif] auteurId:', auteurId, '| currentUserId:', currentUserId);
    if (auteurId && auteurId !== String(currentUserId)) {
      const produitNom = raw.produitNom ?? raw.ProduitNom ?? `Produit #${raw.produitId ?? ''}`;
      this.forumService.pushGlobalNotification(raw, produitNom);
    }
  });

  this.hubConnection.start()
    .then(() => {
      console.log('[GlobalNotif] ✅ Connecté');
      return this.hubConnection!.invoke('JoinGlobalNotifications');
    })
    .then(() => {
      console.log('[GlobalNotif] ✅ Rejoint GlobalNotifications');
    })
    .catch(err => {
      console.error('[GlobalNotif] ❌ Erreur:', err);
      this.started = false; // ← reset pour permettre retry
    });
}}

