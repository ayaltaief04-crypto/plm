// ============================================================
//  liste-controle.model.ts
// ============================================================

export interface ElementListeControle {
  idElement: number;
  contenu: string;
  ordre: number;
  estBloquant: boolean;
  enEdition?: boolean;
}

export interface ModeleListeControle {
  idModeleListe: number;
  nomListe: string;
  roleCible: string;
  elements: ElementListeControle[];
}

export interface ReponseChecklist {
  idElement: number;
  contenu: string;
  estBloquant: boolean;
  coche: boolean;
  note: number | null;   // 0–10, null = non noté
}

export interface ChecklistVersion {
  idVersion: number;
  idProduct: number;
  nomListe: string;
  reponses: ReponseChecklist[];
  dateEnregistrement?: string;
}
