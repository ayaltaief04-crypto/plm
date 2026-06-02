// forum-message.model.ts

export interface ForumMessage {
  id: number;
  auteurId: string | number;
  auteurNom: string;
  auteurRole: string;
  contenu: string;
  dateEnvoi: string;
  estModifie: boolean;

  /** Flag local uniquement — message optimiste en attente de confirmation serveur */
  isPending?: boolean;

  /** Champ optionnel utilisé pour les notifications */
  productId?: number;
}

export interface ForumNotification {
  messageId: string;
  productId: number;
  productName: string;
  authorName: string;
  preview: string;
  createdAt: string;
  isRead: boolean;
}