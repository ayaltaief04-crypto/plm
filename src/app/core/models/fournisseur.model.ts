

// Modèle pour l’affichage (camelCase pour le composant)
export interface Fournisseur {
  id: number;
  nomSociete: string;
  nomContact: string;
  prenomContact: string;
  email: string;
  telephone: string;
  adresse: string;
  typeProduit: string;
}

// Payload pour l’envoi (PascalCase, conforme aux DTO .NET)
export interface FournisseurPayload {
  NomSociete: string;
  NomContact: string;
  PrenomContact: string;
  Email: string;
  Telephone: string;
  Adresse: string;
  TypeProduit: string;
}