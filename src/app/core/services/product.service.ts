import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ─────────────────────────────────────────────────────────────────────────────
// MAPPING DÉCLARATIF  front (camelCase) ↔ backend (PascalCase/accents)
// ─────────────────────────────────────────────────────────────────────────────
const FIELD_MAP: [string, string][] = [
  ['designation',       'Désignation'],
  ['categorie',         'Categorie'],
  ['description',       'Description'],
  ['saison',            'Saison'],
  ['section',           'Section'],
  ['collection',        'Collection'],
  ['silhouette',        'Silhouette'],
  ['typeFermeture',     'TypeFermeture'],
  ['finitions',         'Finitions'],
  ['matierePrincipale', 'MatieresPrincipale'],
  ['matiereSecondaire', 'MatiereSecondaire'],
  ['composition',       'Composition'],
  ['accessoires',       'Accessoires'],
  ['typeFil',           'TypeDeFil'],
  ['grilleTailles',     'GrilleTailles'],
  ['typeCoupage',       'TypeCoupage'],
  ['detailsEtiquette',  'DetailsEtiquette'],
  ['theme',             'Theme'],
  ['inspirations',      'Inspiration'],
  // ← 'statut' absent du FIELD_MAP — géré manuellement dans toFormData()
];

const BACK_TO_FRONT = Object.fromEntries(FIELD_MAP.map(([f, b]) => [b, f]));

@Injectable({ providedIn: 'root' })
export class ProductService {
  private base = `${environment.apiUrl}/Produit`;

  constructor(private http: HttpClient) {}

  // ── Lecture ────────────────────────────────────────────────────────────────

  getCatalogue(statut?: string): Observable<any[]> {
    let params = new HttpParams();
    if (statut) params = params.set('statut', statut);
    return this.http.get<any[]>(`${this.base}/catalogue`, { params });
  }

  getProductById(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/${id}`).pipe(
      map(p => this.mapFromApi(p))
    );
  }

  getHistorique(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/historique/${id}`).pipe(
      map((list: any[]) => (list || []).map(p => this.mapFromApi(p)))
    );
  }

  // ── Écriture ───────────────────────────────────────────────────────────────

  /**
   * Créer un produit.
   * estValidationFinale = true  → backend met PUBLIE
   * estValidationFinale = false → backend met BROUILLON
   */
  creerProduit(product: any, estValidationFinale = false): Observable<any> {
    const fd = this.toFormData(product, {
      EstValidationFinale: String(estValidationFinale),
      ...this.pickFiles(product, 'create'),
    });
    return this.http.post<any>(`${this.base}/creer`, fd);
  }

  /**
   * Modifier un produit existant.
   * estValidationFinale = true  → soumission / validation finale
   * estValidationFinale = false → mise à jour simple
   */
  modifierProduit(id: number, product: any, estValidationFinale = false): Observable<any> {
    const fd = this.toFormData(product, {
      EstValidationFinale: String(estValidationFinale),
      ...this.pickFiles(product, 'update'),
    });
    return this.http.put<any>(`${this.base}/modifier/${id}`, fd);
  }

  versionner(id: number, product: any, estValidationFinale = false): Observable<any> {
    const fd = this.toFormData(product, {
      EstValidationFinale: String(estValidationFinale),
      ...this.pickFiles(product, 'create'),
    });
    return this.http.post<any>(`${this.base}/versionner/${id}`, fd);
  }

  supprimer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/supprimer/${id}`);
  }

  // ── Mapping API → Front ────────────────────────────────────────────────────

  mapFromApi(p: any): any {
    if (!p) return null;

    const scalars: any = {};
    for (const [backKey, frontKey] of Object.entries(BACK_TO_FRONT)) {
      scalars[frontKey] = p[backKey] ?? '';
    }

    return {
      ...scalars,
      idProduct:           p.Id ?? p.id ?? null,
      reference:           p.Reference ?? '',
      numVersion:          p.NumVersion ?? '',
      statut:              this.normalizeStatut(p.Statut ?? ''),
      isArchived:          this.normalizeStatut(p.Statut ?? '') === 'ARCHIVE',
      complexiteMontage:   p.ComplexiteMontage != null ? String(p.ComplexiteMontage) : '',
      paletteCouleurs:     this.parsePalette(p.PalettesDeCouleur),
      fichePdf:            p.FichePdf ?? null,
      images: (p.ImagePaths ?? []).map((url: string, i: number) => ({
        cheminImage: url && (url.startsWith('http://') || url.startsWith('https://'))
          ? url
          : `${environment.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`,
        nom:         url.split('/').pop() ?? `image_${i}`,
        ordre:       i,
        isRemote:    true,
      })),
      fichiers:            [],
      versions:            [],
      _imageFiles:         [],
      _newImageFiles:      [],
      _imageIdsASupprimer: [],
      _pdfFile:            null,
    };
  }

  // ── Helpers privés ─────────────────────────────────────────────────────────

  /**
   * Construit un FormData :
   * 1. Champs scalaires via FIELD_MAP
   * 2. ComplexiteMontage + PalettesDeCouleur
   * 3. Statut — envoyé pour PUBLIE, VALIDE, CLOTURE
   *    (PUBLIE : soumission brouillon avec EstValidationFinale:true)
   *    (VALIDE / CLOTURE : cascade backend)
   *    (BROUILLON : EstValidationFinale:false suffit, Statut non envoyé)
   * 4. Extras (EstValidationFinale, fichiers…)
   */
  private toFormData(
    product: any,
    extras: Record<string, string | File | (string | File)[]> = {}
  ): FormData {
    const fd = new FormData();

    // 1 — Champs scalaires
    for (const [frontKey, backKey] of FIELD_MAP) {
      fd.append(backKey, product[frontKey] ?? '');
    }

    // 2 — Champs spéciaux
    fd.append('ComplexiteMontage', String(Number(product.complexiteMontage) || 0));
    fd.append('PalettesDeCouleur', JSON.stringify(product.paletteCouleurs ?? []));

    // 3 — Statut : envoyé pour PUBLIE, VALIDE, CLOTURE
    const statutUpper = (product.statut ?? '').toUpperCase().trim();
    if (statutUpper === 'PUBLIE' || statutUpper === 'VALIDE' || statutUpper === 'CLOTURE') {
      fd.append('Statut', statutUpper);
    }

    // 4 — Extras
    for (const [key, value] of Object.entries(extras)) {
      if (Array.isArray(value)) {
        value.forEach(v => fd.append(key, v as any));
      } else {
        fd.append(key, value as any);
      }
    }

    return fd;
  }

  private pickFiles(
    product: any,
    mode: 'create' | 'update'
  ): Record<string, File | File[] | string[]> {
    const files: Record<string, any> = {};

    if (mode === 'create') {
      if (product._imageFiles?.length)      files['Images']       = product._imageFiles;
      if (product._pdfFile instanceof File) files['FichePdfFile'] = product._pdfFile;
    } else {
      if (product._newImageFiles?.length)      files['NouvellesImages']    = product._newImageFiles;
      if (product._imageIdsASupprimer?.length) files['ImageIdsASupprimer'] = product._imageIdsASupprimer.map(String);
      if (product._pdfFile instanceof File)    files['NouvelleFichePdf']   = product._pdfFile;
    }

    return files;
  }

  /**
   * Normalise un statut : supprime les accents, met en majuscule.
   * Ex: "Publié" → "PUBLIE", "Clôturé" → "CLOTURE", "Brouillon" → "BROUILLON"
   */
  private normalizeStatut(statut: string): string {
    return statut
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // supprime les diacritiques
      .toUpperCase()
      .trim();
  }

  private parsePalette(raw: any): any[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw) ?? []; } catch { return []; }
  }
}