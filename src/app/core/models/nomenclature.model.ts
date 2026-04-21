

// Payload pour les infos techniques (NomonclatureDto côté back)
export interface TechniquePayload {
  MatieresPrincipales: string;
  Composition: string;
  ProcedesFab: string;
  TechniquesSpecifiques: string;
  TolerancesDim: string;
  TestsRequis: string;
}

// Payload pour un composant (ComposantDto côté back)
export interface ComposantPayload {
  Designation: string;
  Reference: string;
  Couleur: string;
  Position: string;
  Quantite: number;
  Unite: string;
}

// Payload pour la partie achat (ComposantAchatUpdateDto côté back)
export interface AchatPayload {
  NomFournisseur: string;
  PrixUnitaire: number;
  Remplacement: string;
}