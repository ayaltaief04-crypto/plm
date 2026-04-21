export interface Reunion {
  id: string;
  designation: string;
  sujet: string;
  date: string;              // ISO string "YYYY-MM-DDTHH:mm"
  destinataires: string[];   // liste de rôles ou "tous"
  organisateur: string;
  createdAt: string;
}