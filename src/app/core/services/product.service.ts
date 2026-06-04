// product.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ─────────────────────────────────────────────────────────────────────────────
// MAPPING DÉCLARATIF  front (camelCase) ↔ backend (PascalCase)
// ─────────────────────────────────────────────────────────────────────────────
const FIELD_MAP: [string, string][] = [
 ['designation', 'Désignation'],  // ← le é avec accent
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

  /**
   * Retourne l'historique des versions d'un produit.
   */
  getHistorique(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/${id}/historique`).pipe(
      map((list: any[]) => (list || []).map(p => this.mapHistoriqueItem(p)))
    );
  }

  // ── Écriture ───────────────────────────────────────────────────────────────

  creerProduit(product: any, estValidationFinale = false): Observable<any> {
    const fd = this.toFormData(product, estValidationFinale, 'create');
    return this.http.post<any>(`${this.base}/creer`, fd);
  }

  modifierProduit(id: number, product: any, estValidationFinale = false): Observable<any> {
  const fd = this.toFormData(product, estValidationFinale, 'update');
  return this.http.put<any>(`${this.base}/${id}`, fd);  // ← supprime "modifier/"
}

  versionner(id: number, product: any, estValidationFinale = false): Observable<any> {
    const fd = this.toFormData(product, estValidationFinale, 'version');
    return this.http.post<any>(`${this.base}/versionner/${id}`, fd);
  }

  supprimer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/supprimer/${id}`);
  }

  // ── Mapping API historique → Front ────────────────────────────────────────

  mapHistoriqueItem(p: any): any {
    if (!p) return null;
    return {
      idProduct:        p.Id ?? p.id ?? null,
      numVersion:       p.NumVersion ?? p.numVersion ?? '',
      statut:           this.normalizeStatut(p.Statut ?? p.statut ?? ''),
      designation:      p.Designation ?? p.designation ?? '',
      categorie:        p.Categorie   ?? p.categorie   ?? '',
      saison:           p.Saison      ?? p.saison      ?? '',
      section:          p.Section     ?? p.section     ?? '',
      dateCreationRef:  p.DateCreationRef ?? p.dateCreationRef ?? null,
      dateVersion:      p.DateVersion     ?? p.dateVersion     ?? null,
      dateModification: p.DateVersion ?? p.DateCreationRef ?? null,
      updatedAt:        p.DateVersion ?? p.DateCreationRef ?? null,
      fichePdf:         p.FichePdf ?? null,
      images: (p.ImagePaths ?? []).map((url: string, i: number) => ({
        cheminImage: this.resolveUrl(url),
        nom:         url.split('/').pop() ?? `image_${i}`,
        ordre:       i,
        isRemote:    true,
        remoteUrl:   this.resolveUrl(url),
      })),
      reference:           '',
      description:         '',
      collection:          '',
      silhouette:          '',
      typeFermeture:       '',
      finitions:           '',
      matierePrincipale:   p.Matiere ?? '',
      matiereSecondaire:   '',
      composition:         '',
      accessoires:         '',
      typeFil:             '',
      complexiteMontage:   '',
      grilleTailles:       '',
      typeCoupage:         '',
      detailsEtiquette:    '',
      theme:               '',
      inspirations:        '',
      paletteCouleurs:     [],
      fichiers:            [],
      versions:            [],
      isArchived:          false,
      _imageFiles:         [],
      _newImageFiles:      [],
      _imageIdsASupprimer: [],
      _pdfFiles:           [],
      _pdfFile:            null,
    };
  }

  // ── Mapping API produit → Front ────────────────────────────────────────────

  mapFromApi(p: any): any {
    if (!p) return null;

    const scalars: any = {};
    for (const [backKey, frontKey] of Object.entries(BACK_TO_FRONT)) {
      scalars[frontKey] = p[backKey] ?? '';
    }

    const fichiers: any[] = [];
    if (p.FichePdf) {
      const url = this.resolveUrl(p.FichePdf);
      fichiers.push({
        nom:           p.FichePdf.split('/').pop() ?? 'fiche.pdf',
        type:          'application/pdf',
        taille:        0,
        url:           url,
        cheminFichier: url,
        isRemote:      true,
      });
    }
    if (p.FichiersPaths?.length) {
      p.FichiersPaths.forEach((fp: string) => {
        const url = this.resolveUrl(fp);
        fichiers.push({
          nom:           fp.split('/').pop() ?? 'fichier',
          type:          fp.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
          taille:        0,
          url:           url,
          cheminFichier: url,
          isRemote:      true,
        });
      });
    }

    return {
      ...scalars,
      idProduct:           p.Id ?? p.id ?? null,
      reference:           p.Reference ?? '',
      numVersion:          p.NumVersion ?? '',
      statut:              this.normalizeStatut(p.Statut ?? ''),
      // ← Lit le vrai champ renvoyé par l'API : EstArchive (PascalCase).
      //    Fallbacks conservés au cas où la casse JSON changerait.
      isArchived:          !!(p.EstArchive ?? p.estArchive ?? p.IsArchived ?? p.isArchived ?? false),
      complexiteMontage:   p.ComplexiteMontage != null ? String(p.ComplexiteMontage) : '',
      paletteCouleurs:     this.parsePalette(p.PalettesDeCouleur),
      fichePdf:            p.FichePdf ?? null,
      dateModification:    p.DateVersion ?? p.DateCreationRef ?? null,
      updatedAt:           p.DateVersion ?? p.DateCreationRef ?? null,
      images: (p.Images?.length ? p.Images : (p.ImagePaths ?? []).map((url: string) => ({ Id: 0, CheminImage: url })))
        .map((img: any, i: number) => ({
          id:          img.Id ?? img.id ?? 0,
          cheminImage: this.resolveUrl(img.CheminImage ?? img.cheminImage ?? ''),
          nom:         (img.CheminImage ?? img.cheminImage ?? '').split('/').pop() ?? `image_${i}`,
          ordre:       i,
          isRemote:    true,
          remoteUrl:   this.resolveUrl(img.CheminImage ?? img.cheminImage ?? ''),
        })),
      fichiers:            fichiers,
      versions:            [],
      _imageFiles:         [],
      _newImageFiles:      [],
      _imageIdsASupprimer: [],
      _pdfFiles:           [],
      _pdfFile:            null,
    };
  }

  // ── Helpers privés ─────────────────────────────────────────────────────────

  private toFormData(
    product: any,
    estValidationFinale: boolean,
    mode: 'create' | 'update' | 'version'
  ): FormData {
    const fd = new FormData();

   
    if (mode === 'update') {
  const s = (product.statut ?? '').toUpperCase().trim();
  if (s && s !== 'BROUILLON') {
    fd.append('ForceUpdate', 'true');
  }
}

    // 1. Champs scalaires du FIELD_MAP
    for (const [frontKey, backKey] of FIELD_MAP) {
      fd.append(backKey, product[frontKey] ?? '');
    }

    fd.append('ComplexiteMontage', String(Number(product.complexiteMontage) || 0));
    fd.append('PalettesDeCouleur', JSON.stringify(product.paletteCouleurs ?? []));
    fd.append('EstValidationFinale', String(estValidationFinale));

    // 2. Statut
    const statutFinal = (product.statut ?? '').toUpperCase().trim() || 'BROUILLON';
    fd.append('Statut', statutFinal);

    // 3. isArchived envoyé comme entier (0 ou 1)
    fd.append('IsArchived', product.isArchived ? '1' : '0');

    // 4. Gestion des fichiers selon le mode
    if (mode === 'create') {
      if (product._imageFiles?.length) {
        product._imageFiles.forEach((f: File) => fd.append('Images', f));
      }
      const pdfs: File[] = product._pdfFiles?.length
        ? product._pdfFiles
        : product._pdfFile instanceof File ? [product._pdfFile] : [];
      pdfs.forEach(f => fd.append('FichePdfFile', f));

    } else if (mode === 'update') {
      if (product._newImageFiles?.length) {
        product._newImageFiles.forEach((f: File) => fd.append('NouvellesImages', f));
      }
      if (product._imageIdsASupprimer?.length) {
        product._imageIdsASupprimer.forEach((id: number) => fd.append('ImageIdsASupprimer', String(id)));
      }
      const pdfs: File[] = product._pdfFiles?.length
        ? product._pdfFiles
        : product._pdfFile instanceof File ? [product._pdfFile] : [];
      pdfs.forEach(f => fd.append('NouvelleFichePdf', f));

    } else if (mode === 'version') {
      const remoteUrls: string[] = (product.images ?? [])
        .filter((img: any) => img.isRemote && (img.remoteUrl || img.cheminImage))
        .map((img: any) => img.remoteUrl ?? img.cheminImage);
      if (remoteUrls.length) {
        remoteUrls.forEach(url => fd.append('ImageUrlsExistantes', url));
      }
      if (product._imageFiles?.length) {
        product._imageFiles.forEach((f: File) => fd.append('Images', f));
      }
      const pdfs: File[] = product._pdfFiles?.length
        ? product._pdfFiles
        : product._pdfFile instanceof File ? [product._pdfFile] : [];
      pdfs.forEach(f => fd.append('FichePdfFile', f));
      const remotePdfs: string[] = (product.fichiers ?? [])
        .filter((f: any) => f.isRemote && (f.url || f.cheminFichier))
        .map((f: any) => f.url ?? f.cheminFichier);
      remotePdfs.forEach(url => fd.append('FichierUrlsExistantes', url));
    }

    return fd;
  }

  private resolveUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${environment.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  normalizeStatut(statut: string): string {
    return statut
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
  }

  private parsePalette(raw: any): any[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw) ?? []; } catch { return []; }
  }

  basculerArchivage(id: number): Observable<any> {
    return this.http.put<any>(`${this.base}/${id}/basculer-archivage`, {});
  }
}