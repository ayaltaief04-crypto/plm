
export interface QualitePayload {
  QualiteTissu: string | null;
  PoidsEstime: number | null;
  ResistanceTraction: number | null;
  Elasticite: number | null;
  SoliditeCouleurs: number | null;
  StabiliteDimensionnelle: number | null;
  Degorgement: number | null;
  Boulochage: number | null;
  TypeCoutures: string | null;
  CompatibiliteFil: string | null;
  CertificationsRequises: string | null;
  Inflammabilite: boolean;
  SecuriteEnfant: string | null;
  Reparabilite: number | null;
  CycleDeVie: number | null;
  FermeturesZips: string | null;
  Boutons: string | null;
  RespectNormesISO: string | null;
}