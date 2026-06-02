export interface ChecklistResponseDto {
  idElement:   number;
  question:    string;
  estCoche:    boolean;
  commentaire: string | null;
}

export interface ChecklistAffichageDto {
  idListeControle: number;        // plus optionnel
  estFinalisee:    boolean;       // plus optionnel
  noteFinale:      number;
  elements:        ChecklistResponseDto[];
}

// Réponse de enregistrerReponse — ajout idListeControle
export interface EnregistrerReponseResponseDto {
  message:         string;
  note:            number;
  idListeControle: number;        // ← nouveau
}

export interface ReponseSaisieDto {
  estCoche:    boolean;
  commentaire: string | null;
}

export interface ElementModeleDto {
  idElement:      number;
  contenu:        string;
  ordreAffichage: number;
  enEdition?:     boolean;
}

export interface ModeleListeControle {
  idModeleListe:      number;
  nomListe:           string;
  serviceResponsable: string;
  elements:           ElementModeleDto[];
}

export interface ElementCreationDto {
  contenu:        string;
  ordreAffichage: number;
}