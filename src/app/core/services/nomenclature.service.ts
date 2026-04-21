// src/app/core/services/nomenclature.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TechniquePayload, ComposantPayload, AchatPayload } from '@app/core/models/nomenclature.model';

@Injectable({ providedIn: 'root' })
export class NomenclatureService {
  private base = `${environment.apiUrl}/nomenclature`;

  constructor(private http: HttpClient) {}

  // --- Nomenclature ----------------------------------------------------------
  getNomenclature(produitId: number): Observable<any> {
    return this.http.get(`${this.base}/produit/${produitId}`);
  }

  initialiser(produitId: number, payload: TechniquePayload): Observable<any> {
    return this.http.post(`${this.base}/initialiser/${produitId}`, payload);
  }

  updateTechnique(produitId: number, payload: TechniquePayload): Observable<any> {
    return this.http.put(`${this.base}/produit/${produitId}/technique`, payload);
  }

  // --- Composants ------------------------------------------------------------
  addComposant(nomenclatureId: number, payload: ComposantPayload): Observable<any> {
    return this.http.post(`${this.base}/${nomenclatureId}/composants`, payload);
  }

  updateComposantTechnique(id: number, payload: ComposantPayload): Observable<any> {
    return this.http.patch(`${this.base}/composants/${id}/technique`, payload);
  }

  updateComposantAchat(id: number, payload: AchatPayload): Observable<any> {
    return this.http.patch(`${this.base}/composants/${id}/achat`, payload);
  }

  deleteComposant(id: number): Observable<any> {
    return this.http.delete(`${this.base}/composants/${id}`);
  }

  // --- Fournisseurs (optionnel) ----------------------------------------------
  getAllFournisseurs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/fournisseurs`);
  }
}