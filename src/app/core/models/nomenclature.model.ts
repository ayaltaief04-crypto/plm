// src/app/core/models/nomenclature.model.ts

export interface TechniquePayload {
  MatieresPrincipales:   string | null;
  Composition:           string | null;
  ProcedesFab:           string | null;
  TechniquesSpecifiques: string | null;
  TolerancesDim:         string | null;
  TestsRequis:           string | null;
}

/** POST /composants  et  PUT /composants/{id} */
export interface ComposantPayload {
  Designation:   string;
  Reference?:    string;
  Couleur?:      string;
  Position?:     string;
  Unite?:        string;
  Remplacement?: string;   // ← ajouté
}

/** PATCH /composants/{id}/achat */
export interface AchatPayload {
  NomFournisseur?: string;
  PrixUnitaire?:   number;   // ← optionnel (pas de Remplacement ici)
}

/** PATCH /{nomenclatureId}/composants/quantite */
export interface QuantitePayload {   // ← ajouté
  NomComposant: string;
  Quantite:     number;
}