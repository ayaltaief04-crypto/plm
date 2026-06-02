// src/app/core/services/nomenclature.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TechniquePayload,
  ComposantPayload,
  AchatPayload,
  QuantitePayload
} from '@app/core/models/nomenclature.model';

@Injectable({ providedIn: 'root' })
export class NomenclatureService {
  private base = `${environment.apiUrl}/nomenclature`;

  constructor(private http: HttpClient) {}

  // ── Nomenclature ────────────────────────────────────────────────────────────

  getNomenclature(produitId: number): Observable<any> {
    return this.http.get(`${this.base}/produit/${produitId}`);
  }

  initialiser(produitId: number, payload: TechniquePayload): Observable<any> {
    return this.http.post(`${this.base}/initialiser/${produitId}`, payload);
  }

  updateTechnique(nomenclatureId: number, payload: TechniquePayload): Observable<any> {
    return this.http.put(`${this.base}/${nomenclatureId}/technique`, payload);
  }

  // ── Catalogue composants ────────────────────────────────────────────────────

  getAllComposants(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/composants`);
  }

  getComposant(id: number): Observable<any> {
    return this.http.get(`${this.base}/composants/${id}`);
  }

  addComposant(payload: ComposantPayload, imageFile?: File): Observable<any> {
    const formData = new FormData();
    formData.append('Designation',  payload.Designation  ?? '');
    if (payload.Reference)    formData.append('Reference',    payload.Reference);
    if (payload.Couleur)      formData.append('Couleur',      payload.Couleur);
    if (payload.Position)     formData.append('Position',     payload.Position);
    if (payload.Unite)        formData.append('Unite',        payload.Unite);
    if (payload.Remplacement) formData.append('Remplacement', payload.Remplacement);
    if (imageFile)            formData.append('ImageFile',    imageFile, imageFile.name);
    return this.http.post(`${this.base}/composants`, formData);
  }

  updateComposantTechnique(id: number, payload: ComposantPayload, imageFile?: File): Observable<any> {
    const formData = new FormData();
    formData.append('Designation',  payload.Designation  ?? '');
    if (payload.Reference)    formData.append('Reference',    payload.Reference);
    if (payload.Couleur)      formData.append('Couleur',      payload.Couleur);
    if (payload.Position)     formData.append('Position',     payload.Position);
    if (payload.Unite)        formData.append('Unite',        payload.Unite);
    if (payload.Remplacement) formData.append('Remplacement', payload.Remplacement);
    if (imageFile)            formData.append('ImageFile',    imageFile, imageFile.name);
    return this.http.put(`${this.base}/composants/${id}`, formData);
  }

  updateComposantAchat(id: number, payload: AchatPayload): Observable<any> {
    const body: { NomFournisseur?: string; PrixUnitaire?: number } = {};
    if (payload.NomFournisseur) body.NomFournisseur = payload.NomFournisseur;
    if (payload.PrixUnitaire)   body.PrixUnitaire   = payload.PrixUnitaire;
    return this.http.patch(`${this.base}/composants/${id}/achat`, body);
  }

  lierComposant(
    nomenclatureId: number,
    composantId: number,
    quantite: number,
    nomComposant: string = ''
  ): Observable<any> {
    return this.http.patch(
      `${this.base}/${nomenclatureId}/composants/${composantId}/quantite`,
      { NomComposant: nomComposant, Quantite: quantite }
    );
  }

  patchQuantite(
    nomenclatureId: number,
    composantId: number,
    payload: QuantitePayload
  ): Observable<any> {
    return this.http.patch(
      `${this.base}/${nomenclatureId}/composants/${composantId}/quantite`,
      payload
    );
  }

  deleteComposant(id: number): Observable<any> {
    return this.http.delete(`${this.base}/composants/${id}`);
  }

  /**
   * Retire un composant d'une nomenclature sans le supprimer du catalogue.
   * DELETE /nomenclature/retirer-composant/{nomenclatureId}/{composantId}
   */
  retirerComposant(nomenclatureId: number, composantId: number): Observable<any> {
    return this.http.delete(`${this.base}/retirer-composant/${nomenclatureId}/${composantId}`);
  }

  // ── Fournisseurs ────────────────────────────────────────────────────────────

  getAllFournisseurs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/fournisseurs`);
  }
}