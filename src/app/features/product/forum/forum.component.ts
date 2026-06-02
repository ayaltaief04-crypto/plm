import {
  Component, OnInit, OnDestroy, Input, OnChanges,
  SimpleChanges, ViewChild, ElementRef, AfterViewChecked
} from '@angular/core';
import { Subscription } from 'rxjs';
import { ForumService } from '../../../core/services/forum.service';
import { AuthService }  from '../../../core/services/auth.service';
import { ForumMessage } from '../../../core/models/forum-message.model';

@Component({
  selector:    'app-forum',
  templateUrl: './forum.component.html',
  styleUrls:   ['./forum.component.scss']
})
export class ForumComponent implements OnInit, OnDestroy, OnChanges, AfterViewChecked {

  @Input() productId!:    number;
  @Input() productName  = '';
  @Input() versionLabel = '';

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  @ViewChild('messageInput')    messageInput!: ElementRef;

  messages:    ForumMessage[] = [];
  newMessage   = '';
  editingId:   number | null  = null;
  editContent  = '';
  isLoading    = false;
  isSending    = false;
  errorMsg     = '';
  isConnected  = false;

  // ── Réactions ─────────────────────────────────────────────────────
  reactionsMap: Record<number, { emoji: string; users: string[]; count: number }[]> = {};
  emojiPickerMsgId: number | null = null;
  readonly availableEmojis = ['👍','❤️','😂','😮','😢','🔥','👏','🎉'];

  // ── Reply ─────────────────────────────────────────────────────────
  replyingTo: ForumMessage | null = null;
  replyMap: Record<number, number> = {};

  // ── Modal suppression ─────────────────────────────────────────────
  showDeleteModal    = false;
  deleteModalPreview = '';
  deleteModalAuthor  = '';
  private pendingDeleteMsg: ForumMessage | null = null;

  // ── Utilisateur courant ───────────────────────────────────────────
  currentUserId   = '';
  currentUserName = '';
  currentUserRole = '';

  private sub!: Subscription;
  private shouldScroll = false;

  constructor(
    private forumService: ForumService,
    private authService:  AuthService
  ) {}

  // ─────────────────────────────────────────────────────────────────
  //  LIFECYCLE
  // ─────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUserId   = String(user?.id   ?? '').trim();
    this.currentUserName = user?.name  ?? '';
    this.currentUserRole = user?.role  ?? '';

    this.sub = this.forumService.messages$.subscribe(msgs => {
      this.messages     = msgs;
      this.shouldScroll = true;
    });

    this.forumService.connected$.subscribe(connected => {
      this.isConnected = connected;
    });

    this.initForum();
  }

  private async initForum(): Promise<void> {
    if (!this.productId) return;
    await this.loadMessages();
    await this.forumService.startSignalRConnection(
      this.productId,
      this.currentUserId,
      this.currentUserName,
      this.productName
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productId'] && !changes['productId'].firstChange) {
      this.forumService.stopSignalRConnection();
      this.initForum();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.forumService.stopSignalRConnection();
  }

  // ─────────────────────────────────────────────────────────────────
  //  CHARGEMENT
  // ─────────────────────────────────────────────────────────────────

  async loadMessages(): Promise<void> {
    if (!this.productId) return;
    this.isLoading = true;
    this.errorMsg  = '';
    try {
      await this.forumService.loadMessages(this.productId).toPromise();
    } catch {
      this.errorMsg = 'Erreur de chargement des messages.';
    } finally {
      this.isLoading    = false;
      this.shouldScroll = true;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  //  ENVOI OPTIMISTE
  // ─────────────────────────────────────────────────────────────────

  sendMessage(): void {
    const content = this.newMessage.trim();
    if (!content || this.isSending) return;

    this.isSending   = true;
    this.errorMsg    = '';
    this.newMessage  = '';

    const replyTargetId = this.replyingTo?.id ?? null;

    const optimisticMsg: ForumMessage = {
      id:           -Date.now(),
      auteurId:     this.currentUserId,
      auteurNom:    this.currentUserName,
      auteurRole:   this.currentUserRole,
      contenu:      content,
      dateEnvoi:    new Date().toISOString(),
      estModifie:   false,
      isPending:    true,
      replyToId:    replyTargetId
    } as any;

    if (replyTargetId !== null) {
      this.replyMap[optimisticMsg.id] = replyTargetId;
    }

    this.replyingTo = null;

    if (this.messageInput?.nativeElement) {
      this.messageInput.nativeElement.style.height = 'auto';
    }

    this.forumService.sendMessage(this.productId, content, optimisticMsg).subscribe({
      next: (savedMsg: ForumMessage) => {
        if (replyTargetId !== null && savedMsg?.id) {
          this.replyMap[savedMsg.id] = replyTargetId;
          delete this.replyMap[optimisticMsg.id];
        }
        this.isSending = false;
      },
      error: (err) => {
        this.errorMsg   = err?.status === 404
          ? 'Produit introuvable. Rechargez la page.'
          : "L'envoi a échoué. Réessayez.";
        this.isSending  = false;
        this.newMessage = content;
        this.forumService.removeOptimisticMessage(optimisticMsg);
        delete this.replyMap[optimisticMsg.id];
        this.shouldScroll = true;
      }
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
  }

  // ─────────────────────────────────────────────────────────────────
  //  REPLY
  // ─────────────────────────────────────────────────────────────────

  startReply(msg: ForumMessage): void {
    this.replyingTo = msg;
    setTimeout(() => this.messageInput?.nativeElement?.focus(), 50);
  }

  cancelReply(): void {
    this.replyingTo = null;
  }

  getReplyTarget(msg: ForumMessage): ForumMessage | null {
    const replyId = this.replyMap[msg.id] ?? (msg as any).replyToId ?? null;
    if (!replyId) return null;
    return this.messages.find(m => m.id === replyId) ?? null;
  }

  // ─────────────────────────────────────────────────────────────────
  //  ÉDITION
  // ─────────────────────────────────────────────────────────────────

  startEdit(msg: ForumMessage): void {
    this.editingId   = msg.id;
    this.editContent = msg.contenu;
  }

  cancelEdit(): void {
    this.editingId   = null;
    this.editContent = '';
  }

  confirmEdit(id: number): void {
    const content = this.editContent.trim();
    if (!content) return;
    this.forumService.editMessage(id, this.productId, content).subscribe({
      next:  () => this.cancelEdit(),
      error: () => this.errorMsg = 'Modification échouée.'
    });
  }

  onEditKeyDown(event: KeyboardEvent, id: number): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.confirmEdit(id);
    }
    if (event.key === 'Escape') this.cancelEdit();
  }

  // ─────────────────────────────────────────────────────────────────
  //  SUPPRESSION — avec modal de confirmation
  // ─────────────────────────────────────────────────────────────────

  /** Ouvre le modal et mémorise le message à supprimer */
  deleteMessage(msg: ForumMessage): void {
    this.pendingDeleteMsg  = msg;
    this.deleteModalAuthor = msg.auteurNom;
    // Aperçu tronqué à 80 caractères
    this.deleteModalPreview = msg.contenu.length > 80
      ? msg.contenu.slice(0, 80) + '…'
      : msg.contenu;
    this.showDeleteModal = true;
  }

  /** Appelé par (confirmed) du modal → suppression réelle */
  onDeleteConfirmed(): void {
    this.showDeleteModal = false;
    if (!this.pendingDeleteMsg) return;

    this.forumService.deleteMessage(this.pendingDeleteMsg.id, this.productId).subscribe({
      error: () => this.errorMsg = 'Suppression échouée.'
    });

    this.pendingDeleteMsg = null;
  }

  /** Appelé par (cancelled) du modal → on annule sans rien faire */
  onDeleteCancelled(): void {
    this.showDeleteModal  = false;
    this.pendingDeleteMsg = null;
  }

  // ─────────────────────────────────────────────────────────────────
  //  PERMISSIONS
  // ─────────────────────────────────────────────────────────────────

  isOwnMessage(msg: ForumMessage | any): boolean {
    if (!msg) return false;
    if (msg.isPending) return true;

    const auteurIdMessage = String(msg.auteurId ?? msg.auteurID ?? msg.UtilisateurId ?? '').trim();
    const monId = String(this.currentUserId ?? '').trim();

    if (!auteurIdMessage || !monId) return false;
    return auteurIdMessage === monId;
  }

  canModify(msg: ForumMessage): boolean {
    if (this.currentUserRole === 'Admin') return true;
    return this.isOwnMessage(msg);
  }

  // ─────────────────────────────────────────────────────────────────
  //  RÉACTIONS EMOJI
  // ─────────────────────────────────────────────────────────────────

  toggleEmojiPicker(msg: ForumMessage): void {
    this.emojiPickerMsgId = this.emojiPickerMsgId === msg.id ? null : msg.id;
  }

  closeEmojiPicker(): void {
    this.emojiPickerMsgId = null;
  }

  toggleReaction(msg: ForumMessage, emoji: string): void {
    if (!this.reactionsMap[msg.id]) this.reactionsMap[msg.id] = [];
    const reactions = this.reactionsMap[msg.id];
    const existing  = reactions.find(r => r.emoji === emoji);

    if (existing) {
      const idx = existing.users.indexOf(this.currentUserName);
      if (idx > -1) {
        existing.users.splice(idx, 1);
        existing.count--;
        if (existing.count === 0)
          this.reactionsMap[msg.id] = reactions.filter(r => r.emoji !== emoji);
      } else {
        existing.users.push(this.currentUserName);
        existing.count++;
      }
    } else {
      reactions.push({ emoji, users: [this.currentUserName], count: 1 });
    }
    this.reactionsMap = { ...this.reactionsMap };
  }

  getReactions(msg: ForumMessage): { emoji: string; users: string[]; count: number }[] {
    return this.reactionsMap[msg.id] ?? [];
  }

  hasReacted(msg: ForumMessage, emoji: string): boolean {
    return (this.reactionsMap[msg.id] ?? [])
      .some(r => r.emoji === emoji && r.users.includes(this.currentUserName));
  }

  // ─────────────────────────────────────────────────────────────────
  //  HELPERS UI
  // ─────────────────────────────────────────────────────────────────

  isEditing(msg: ForumMessage): boolean {
    return this.editingId === msg.id;
  }

  trackById(_: number, msg: ForumMessage): number {
    return msg.id;
  }

  getRoleIcon(role: string): string {
    const icons: Record<string, string> = {
      'Styliste':         'palette',
      'Admin':            'admin_panel_settings',
      'Ingenieurtextile': 'engineering',
      'Ing. Textile':     'engineering'
    };
    return icons[role] || 'person';
  }

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      'Styliste':         'Styliste',
      'Ingenieurtextile': 'Ing. Textile',
      'Admin':            'Admin'
    };
    return labels[role] || role;
  }

  getRoleClass(role: string): string {
    const classes: Record<string, string> = {
      'Styliste':         'role--styliste',
      'Admin':            'role--admin',
      'Ingenieurtextile': 'role--ingenieur',
      'Ing. Textile':     'role--ingenieur'
    };
    return classes[role] || 'role--default';
  }

  getAvatarInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);

    if (diffMin < 1)    return "À l'instant";
    if (diffMin < 60)   return `il y a ${diffMin} min`;
    if (diffMin < 1440) return `il y a ${Math.floor(diffMin / 60)}h`;

    return d.toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit'
    });
  }

  dismissError(): void {
    this.errorMsg = '';
  }

  private scrollToBottom(): void {
    try {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch { }
  }
}