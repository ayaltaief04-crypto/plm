import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import {
  ChecklistAffichageDto,
  EnregistrerReponseResponseDto,
  ModeleListeControle,
  ElementCreationDto
} from '../models/liste-controle.model';
import { environment } from '../../../environments/environment';

export const ROLE_TO_SERVICE: Record<string, string> = {
  'Styliste':             'Design',
  'ResponsableMarketing': 'Marketing',
  'Ingenieurtextile':     'Textile',
  'ResponsableAchat':     'Achat',
  'ResponsableQualite':   'Qualite',
};

@Injectable({ providedIn: 'root' })
export class ListeControleService {

  private base = `${environment.apiUrl}/ListeControle`;

  constructor(private http: HttpClient) {}

  // ── ACTEUR ──────────────────────────────────────────────────

  ouvrirChecklist(produitId: number, serviceNom: string): Observable<ChecklistAffichageDto> {
    return this.http.get<any>(
      `${this.base}/ouvrir/${produitId}/${serviceNom}`
    ).pipe(
      map(res => ({
        idListeControle: res.idListeControle ?? res.IdListeControle ?? 0,
        estFinalisee:    res.estFinalisee    ?? res.EstFinalisee    ?? false,
        noteFinale:      res.noteFinale      ?? res.NoteFinale      ?? 0,
        elements: (res.elements ?? res.Elements ?? []).map((el: any) => ({
          idElement:   el.idElement   ?? el.IdElement   ?? 0,
          question:    el.question    ?? el.Question    ?? '',
          estCoche:    el.estCoche    ?? el.EstCoche    ?? false,
          commentaire: el.commentaire ?? el.Commentaire ?? null,
        }))
      }))
    );
  }

  enregistrerReponse(
    produitId: number,
    idElement: number,
    payload: { estCoche: boolean; commentaire: string | null }
  ): Observable<EnregistrerReponseResponseDto> {
    return this.http.post<any>(
      `${this.base}/enregistrer-reponse/${produitId}/${idElement}`,
      { EstCoche: payload.estCoche, Commentaire: payload.commentaire }
    ).pipe(
      map(res => ({
        message:         res.message         ?? res.Message         ?? '',
        note:            res.note            ?? res.Note            ?? 0,
        idListeControle: res.idListeControle ?? res.IdListeControle ?? 0,
      }))
    );
  }

  terminerListe(
    produitId: number,
    idListeControle: number
  ): Observable<{ message: string; note: number; idListeControle: number }> {
    return this.http.post<any>(
      `${this.base}/terminer/${produitId}/${idListeControle}`,
      {}
    ).pipe(
      map(res => ({
        message:         res.message         ?? res.Message         ?? '',
        note:            res.note            ?? res.Note            ?? 0,
        idListeControle: res.idListeControle ?? res.IdListeControle ?? idListeControle,
      }))
    );
  }

  // ── ADMIN ───────────────────────────────────────────────────

  getAllModeles(): Observable<ModeleListeControle[]> {
    const services = ['Design', 'Marketing', 'Textile', 'Achat', 'Qualite'];

    return forkJoin(
      services.map(serviceNom =>
        this.http.get<any[]>(`${this.base}/tous-les-elements/${serviceNom}`).pipe(
          map(elements => ({
            idModeleListe:      0,
            nomListe:           serviceNom,
            serviceResponsable: serviceNom,
            elements: (elements || []).map((el: any) => ({
              idElement:      el.idElement      ?? el.IdElement      ?? 0,
              contenu:        el.contenu        ?? el.Contenu        ?? '',
              ordreAffichage: el.ordreAffichage ?? el.OrdreAffichage ?? 0,
              enEdition:      false
            }))
          }))
        )
      )
    );
  }

  ajouterElement(serviceNom: string, dto: ElementCreationDto): Observable<any> {
    return this.http.post(
      `${this.base}/ajouter-element/${serviceNom}`,
      { Contenu: dto.contenu, OrdreAffichage: dto.ordreAffichage }
    );
  }

  modifierElement(id: number, dto: ElementCreationDto): Observable<any> {
    return this.http.put(
      `${this.base}/modifier-element/${id}`,
      { Contenu: dto.contenu, OrdreAffichage: dto.ordreAffichage }
    );
  }

  supprimerElement(id: number): Observable<any> {
    return this.http.delete(`${this.base}/supprimer-element/${id}`);
  }

  elementADesReponses(idElement: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.base}/element/${idElement}/has-reponses`);
  }
}