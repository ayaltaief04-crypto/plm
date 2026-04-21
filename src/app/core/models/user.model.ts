export interface User {
  IdUtilisateur?: number;
  Nom: string;
  Email: string;
  MotDePasse?: string;
  Role: string;
  Actif: boolean;
  DateCreation?: Date | string;
}