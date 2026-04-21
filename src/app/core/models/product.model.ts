export interface StyleVersion {
  idVersion: number;
  versionName: string;
  dateCreation: string;
  statut: string;
  productData: any;
}

export interface Product {

  idProduct: number;
  idParent: number | null;
  idRacine: number | null;
  numVersion: number;

  designation: string;
  reference: string;
  stylisteId: string;

  dateCreationRef: Date | string;
  dateVersion: Date | string;

  statut: string;

  categorie: string;
  description?: string;
  saison: string;
  section: string;

  matiere?: string;
  palettesDeCouleur?: any[];
  inspiration?: string;
  fichePdf?: string;

  // --- FRONT ---
  versions: StyleVersion[];

  images?: any[];
  fichiers?: any[];

  imageUrls?: any;

  isArchived?: boolean;
}