import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ForumMessage, ForumNotification } from '../models/forum-message.model';

@Injectable({ providedIn: 'root' })
export class ForumService {
  private hubConnection!: signalR.HubConnection;
  private readonly base = `${environment.apiUrl}/Forum`;
  private readonly NOTIF_KEY = 'plm_forum_notifications';
  
  private messagesSubject = new BehaviorSubject<ForumMessage[]>([]);
  private notificationsSubject = new BehaviorSubject<ForumNotification[]>(this.loadNotifications());
  private connectedSubject = new BehaviorSubject<boolean>(false);

  messages$ = this.messagesSubject.asObservable();
  notifications$ = this.notificationsSubject.asObservable();
  connected$ = this.connectedSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ════════════════════════════════════════════════════════════════════
  //  SIGNALR (Connexion & Groupes)
  // ════════════════════════════════════════════════════════════════════

  async startSignalRConnection(
    produitId: number,
    currentUserId: string,
    currentUserName: string,
    produitNom: string
  ): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) return;

    const baseUrl = environment.apiUrl.replace('/api', '');
    const hubUrl = `${baseUrl}/chatHub?produitId=${produitId}`;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => localStorage.getItem('token') ?? '',
        skipNegotiation: true, 
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.hubConnection.onreconnecting(() => this.connectedSubject.next(false));
    this.hubConnection.onreconnected(async () => {
      this.connectedSubject.next(true);
      await this.hubConnection.invoke('JoinProductChat', produitId);
    });
    this.hubConnection.onclose(() => this.connectedSubject.next(false));

    try {
      await this.hubConnection.start();
      this.connectedSubject.next(true);
      await this.hubConnection.invoke('JoinProductChat', produitId);
    } catch (err) {
      console.error('SignalR connection error:', err);
      this.connectedSubject.next(false);
    }

    this.registerSignalRHandlers(currentUserId, produitNom);
  }

  stopSignalRConnection(produitId?: number): void {
    if (this.hubConnection) {
      if (produitId && this.hubConnection.state === signalR.HubConnectionState.Connected) {
        this.hubConnection.invoke('LeaveProductChat', produitId).catch(() => {});
      }
      this.hubConnection.stop().then(() => this.connectedSubject.next(false));
    }
  }

  // ── Handlers SignalR (Réception en temps réel) ────────────────────────

  private registerSignalRHandlers(currentUserId: string, produitNom: string): void {
    
    // 1. RÉCEPTION MESSAGE
    this.hubConnection.on('ReceiveMessage', (raw: any) => {
      const msg = this.normalizeMessage(raw);
      const current = this.messagesSubject.value;

      const pendingIndex = current.findIndex(
        m => m.isPending === true && m.contenu === msg.contenu
      );

      if (pendingIndex > -1) {
        const updated = [...current];
        updated[pendingIndex] = { ...msg, isPending: false };
        this.messagesSubject.next(updated);
      } else {
        if (current.some(m => m.id === msg.id)) return;
        this.messagesSubject.next([...current, msg]);
      }

      // ✅ LOGIQUE NOTIFICATION : Comparaison stricte des IDs
      // On s'assure que msg.auteurId (qui vient du backend) n'est pas le nôtre
      if (msg.auteurId && String(msg.auteurId) !== String(currentUserId)) {
        this.pushNotification(msg, produitNom);
      }
    });

    // 2. MODIFICATION
    this.hubConnection.on('MessageUpdated', (data: any) => {
      // Note: On vérifie 'data.id' et 'data.Id' pour être sûr
      const targetId = data.id ?? data.Id;
      const updated = this.messagesSubject.value.map(m =>
        m.id === targetId ? { ...m, contenu: data.contenu ?? data.Contenu, estModifie: true } : m
      );
      this.messagesSubject.next(updated);
    });

    // 3. SUPPRESSION
    this.hubConnection.on('MessageDeleted', (messageId: number) => {
      this.messagesSubject.next(this.messagesSubject.value.filter(m => m.id !== messageId));
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  NORMALISATION
  // ════════════════════════════════════════════════════════════════════

  private normalizeMessage(raw: any): ForumMessage {
    if (!raw) return {} as ForumMessage;
    return {
      id:         raw.id ?? raw.Id ?? 0,
      // On mappe UtilisateurId qui vient de ton MessageAffichageDto backend
      auteurId:   String(raw.utilisateurId ?? raw.UtilisateurId ?? raw.auteurId ?? ''),
      auteurNom:  raw.nomAuteur ?? raw.NomAuteur ?? 'Utilisateur',
      auteurRole: raw.role ?? raw.Role ?? 'User',
      contenu:    raw.contenu ?? raw.Contenu ?? '',
      dateEnvoi:  raw.datePublication ?? raw.DatePublication ?? new Date().toISOString(),
      estModifie: raw.estModifie ?? raw.EstModifie ?? false,
      isPending:  false
    };
  }

  // ════════════════════════════════════════════════════════════════════
  //  API HTTP
  // ════════════════════════════════════════════════════════════════════

  loadMessages(produitId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/historique/${produitId}`).pipe(
      tap(rawMessages => {
        this.messagesSubject.next(rawMessages.map(m => this.normalizeMessage(m)));
      })
    );
  }

  sendMessage(produitId: number, contenu: string, optimisticMsg: ForumMessage): Observable<any> {
    const current = this.messagesSubject.value;
    this.messagesSubject.next([...current, { ...optimisticMsg, isPending: true }]);

    return this.http.post<any>(`${this.base}/envoyer/${produitId}`, { contenu }).pipe(
      tap({
        next: (response) => {
          // Fallback si SignalR est off
          if (this.hubConnection.state !== signalR.HubConnectionState.Connected) {
            const savedMsg = this.normalizeMessage(response);
            const updated = this.messagesSubject.value.map(m =>
              (m.isPending && m.contenu === contenu) ? { ...savedMsg, isPending: false } : m
            );
            this.messagesSubject.next(updated);
          }
        },
        error: () => this.removeOptimisticMessage(optimisticMsg)
      })
    );
  }

  removeOptimisticMessage(optimisticMsg: ForumMessage): void {
    this.messagesSubject.next(this.messagesSubject.value.filter(m => 
      !(m.isPending && m.contenu === optimisticMsg.contenu)
    ));
  }

  editMessage(messageId: number, produitId: number, nouveauContenu: string): Observable<void> {
    return this.http.put<void>(
      `${this.base}/modifier/${messageId}/${produitId}`,
      JSON.stringify(nouveauContenu),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  deleteMessage(messageId: number, produitId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/supprimer/${messageId}/${produitId}`);
  }

  // ════════════════════════════════════════════════════════════════════
  //  NOTIFICATIONS & NAVBAR
  // ════════════════════════════════════════════════════════════════════

  private pushNotification(msg: ForumMessage, produitNom: string): void {
    const notif: ForumNotification = {
      messageId:   String(msg.id),
      productId:   0, 
      productName: produitNom,
      authorName:  msg.auteurNom,
      preview:     msg.contenu.slice(0, 60),
      createdAt:   new Date().toISOString(),
      isRead:      false
    };
    const all = [notif, ...this.notificationsSubject.value].slice(0, 50);
    this.updateNotifications(all);
  }

  /** Appelé par GlobalNotificationService pour les notifs hors forum */
  pushGlobalNotification(raw: any, produitNom: string): void {
    const productId = raw.produitId ?? raw.ProduitId ?? 0;
    const notif: ForumNotification = {
      messageId:   String(raw.id ?? raw.Id ?? Date.now()),
      productId,
      productName: produitNom,
      authorName:  raw.nomAuteur ?? raw.NomAuteur ?? raw.auteurNom ?? 'Utilisateur',
      preview:     (raw.contenu ?? raw.Contenu ?? '').slice(0, 60),
      createdAt:   new Date().toISOString(),
      isRead:      false
    };
    // Éviter les doublons
    const exists = this.notificationsSubject.value.some(n => n.messageId === notif.messageId);
    if (exists) return;
    const all = [notif, ...this.notificationsSubject.value].slice(0, 50);
    this.updateNotifications(all);
  }

  private loadNotifications(): ForumNotification[] {
    try { return JSON.parse(localStorage.getItem(this.NOTIF_KEY) ?? '[]'); }
    catch { return []; }
  }

  private updateNotifications(notifs: ForumNotification[]): void {
    localStorage.setItem(this.NOTIF_KEY, JSON.stringify(notifs));
    this.notificationsSubject.next(notifs);
  }

  markAsRead(messageId: string): void {
    const updated = this.notificationsSubject.value.map(n =>
      n.messageId === messageId ? { ...n, isRead: true } : n
    );
    this.updateNotifications(updated);
  }

  markAllAsRead(): void {
    const updated = this.notificationsSubject.value.map(n => ({ ...n, isRead: true }));
    this.updateNotifications(updated);
  }

  clearNotifications(): void {
    this.updateNotifications([]);
  }

  get unreadCount$(): Observable<number> {
    return new Observable(observer => {
      const sub = this.notifications$.subscribe(notifs => {
        observer.next(notifs.filter(n => !n.isRead).length);
      });
      return () => sub.unsubscribe();
    });
  }
}