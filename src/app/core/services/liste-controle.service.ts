import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ModeleListeControle } from '../models/liste-controle.model';

export const ROLE_TO_LISTE: { [key: string]: string } = {
  'Styliste': 'Design',
  'ResponsableMarketing': 'Marketing',
  'Ingenieurtextile': 'Ingénierie',
  'ResponsableAchat': 'Achat',
  'ResponsableQualite': 'Qualité'
};

@Injectable({
  providedIn: 'root'
})
export class ListeControleService {
  private apiUrl = 'http://localhost:5027/api/ListeControle';
  private _refreshNeeded$ = new BehaviorSubject<void>(undefined);

  constructor(private http: HttpClient) {}

  get refreshNeeded$() {
    return this._refreshNeeded$;
  }

  // --- GESTION DES MODÈLES (ADMIN) ---

  getAllModeles(): Observable<ModeleListeControle[]> {
    return this.http.get<ModeleListeControle[]>(this.apiUrl);
  }

  getModeleByRole(role: string): Observable<ModeleListeControle> {
    return this.http.get<ModeleListeControle>(`${this.apiUrl}/role/${role}`);
  }

  saveModele(modele: ModeleListeControle): Observable<any> {
    return this.http.post(this.apiUrl, modele).pipe(
      tap(() => this._refreshNeeded$.next())
    );
  }

  // --- GESTION DES VERSIONS (ACTEURS) ---

  /**
   * AJUSTÉ : Reçoit maintenant les 4 arguments envoyés par le composant
   */
  getChecklistVersion(productId: number, versionId: number, versionName: string, nomListe: string): Observable<any> {
    // On construit l'URL avec les paramètres attendus par ton Backend
    return this.http.get<any>(`${this.apiUrl}/version/${productId}/${versionId}`, {
      params: {
        versionName: versionName,
        nomListe: nomListe
      }
    });
  }

  /**
   * Sauvegarde les réponses d'un acteur
   */
  saveChecklistVersion(checklist: any, role: string): Observable<any> {
    const payload = {
      ...checklist,
      roleCible: role,
      dateDerniereModif: new Date()
    };

    return this.http.post(`${this.apiUrl}/version`, payload).pipe(
      tap(() => this._refreshNeeded$.next())
    );
  }
}