// src/app/core/services/marketing.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MarketingPayload } from '../models/marketing.model';

@Injectable({ providedIn: 'root' })
export class MarketingService {
  private base = `${environment.apiUrl}/Analyse/marketing`;

  constructor(private http: HttpClient) {}

  getMarketing(produitId: number): Observable<any> {
    return this.http.get<any>(`${this.base}/${produitId}`);
  }

  saveMarketing(produitId: number, data: MarketingPayload): Observable<any> {
    return this.http.post<any>(`${this.base}/${produitId}`, data);
  }

  // ── Helpers de conversion (statiques) ──────────────────────────────────

  private static toInt(v: any): number {
    if (v === null || v === undefined || String(v).trim() === '') return 0;
    const n = parseInt(String(v), 10);
    return isNaN(n) ? 0 : n;
  }

  private static toNumber(v: any): number {
    if (v === null || v === undefined || String(v).trim() === '') return 0;
    const n = Number(String(v).replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }

  /**
   * Normalise les données brutes du formulaire pour correspondre au payload attendu.
   * @param raw Valeurs brutes (getRawValue())
   */
  static normalizePayload(raw: any): MarketingPayload {
    return {
      PublicCible: raw.PublicCible?.trim() || '',
      TrancheAge: raw.TrancheAge?.trim() || '',
      StyleDeVie: raw.StyleDeVie?.trim() || '',
      OccasionPortee: raw.OccasionPortee?.trim() || '',
      NiveauGamme: this.toInt(raw.NiveauGamme),
      NoteAttractiviteVisuelle: this.toNumber(raw.NoteAttractiviteVisuelle),
      PrixVenteEstime: this.toNumber(raw.PrixVenteEstime),
      PrixPsychologique: this.toNumber(raw.PrixPsychologique),
      QuantiteEstimee: this.toInt(raw.QuantiteEstimee),
      IndiceCompetitivite: this.toNumber(raw.IndiceCompetitivite),
      MargeCible: this.toNumber(raw.MargeCible),
      USP_ArgumentUnique: raw.USP_ArgumentUnique?.trim() || '',
      ReferenceBestSeller: raw.ReferenceBestSeller?.trim() || '',
      NomCommercial: raw.NomCommercial?.trim() || '',
      CanalDistribution: raw.CanalDistribution || '',
      ArgumentSecondeVie: raw.ArgumentSecondeVie?.trim() || '',
      ScoreEcoConception: raw.ScoreEcoConception?.trim() || '',
      Forces: raw.Forces?.trim() || '',
      Faiblesses: raw.Faiblesses?.trim() || '',
      Opportunites: raw.Opportunites?.trim() || '',
      Menaces: raw.Menaces?.trim() || '',
    };
  }
}