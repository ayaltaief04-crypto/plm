import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ReunionReadDto {
  id:            number;
  sujet:         string | null;
  dateReunion:   string;
  heureReunion:  string;
  statut:        string | null;
  destinataires: string | null;
  nomProduit:    string | null;
}

export interface ReunionCreateDto {
  sujet:            string;
  dateReunion:      string;
  heureReunion:     string;
  acteursConcernes: string[];
}

export interface Reunion {
  id:            string;
  designation:   string;
  sujet:         string;
  date:          string;
  heure:         string;
  destinataires: string[];
  organisateur:  string;
  statut:        string;
  nomProduit:    string | null;
}

function fromDto(dto: any): Reunion {
  const dateRaw  = (dto.dateReunion  ?? dto.DateReunion  ?? '').toString();
  const heureRaw = (dto.heureReunion ?? dto.HeureReunion ?? '').toString();
  const datePart  = dateRaw.substring(0, 10);
  const heurePart = heureRaw.substring(0, 5);
  const dateISO   = (datePart && heurePart) ? `${datePart}T${heurePart}` : '';

  const destRaw = (dto.destinataires ?? dto.Destinataires ?? '');
  const destinataires = destRaw
    ? destRaw.split(',').map((x: string) => x.trim()).filter(Boolean)
    : [];

  return {
    id:            String(dto.id ?? dto.Id ?? 0),
    designation:   dto.sujet ?? dto.Sujet ?? '',
    sujet:         dto.sujet ?? dto.Sujet ?? '',
    date:          dateISO,
    heure:         heurePart,
    destinataires,
    organisateur:  '',
    statut:        dto.statut ?? dto.Statut ?? 'PLANIFIEE',
    nomProduit:    dto.nomProduit ?? dto.NomProduit ?? null,
  };
}

@Injectable({ providedIn: 'root' })
export class ReunionService {

  private base = `${environment.apiUrl}/Reunions`;

  private _reunions$ = new BehaviorSubject<Reunion[]>([]);
  reunions$ = this._reunions$.asObservable();

  constructor(private http: HttpClient) {
    this.chargerTout();
  }

  chargerTout(): void {
    this.http.get<any[]>(this.base).subscribe({
      next:  dtos => this._reunions$.next(dtos.map(fromDto)),
      error: err  => console.error('Erreur chargement réunions', err)
    });
  }

  /**
   * Filtre les réunions selon le rôle de l'acteur :
   * - Si destinataires contient 'tous' → visible par tous
   * - Sinon → visible seulement si son rôle est dans la liste
   * - Styliste et Admin voient tout
   */
  getReunionsPourRole(userRole: string): Reunion[] {
    const all = this._reunions$.getValue();
    if (userRole === 'Styliste' || userRole === 'Admin') return all;

    return all.filter(r => {
      if (!r.destinataires || r.destinataires.length === 0) return false;
      if (r.destinataires.includes('tous')) return true;
      return r.destinataires.includes(userRole);
    });
  }

  add(
    produitId: number,
    payload: { designation: string; sujet: string; date: string; heure: string; destinataires: string[] }
  ): Observable<Reunion> {
    const dto: ReunionCreateDto = {
      sujet:            payload.designation,
      dateReunion:      payload.date,
      heureReunion:     payload.heure,
      acteursConcernes: payload.destinataires,
    };

    return this.http.post<any>(`${this.base}/produit/${produitId}`, dto).pipe(
      map(fromDto),
      tap(() => this.chargerTout())
    );
  }

  update(
    id: string,
    payload: { designation?: string; sujet?: string; date?: string; heure?: string; destinataires?: string[] }
  ): Observable<Reunion> {
    const dto: ReunionCreateDto = {
      sujet:            payload.designation || payload.sujet || '',
      dateReunion:      payload.date  || '',
      heureReunion:     payload.heure || '',
      acteursConcernes: payload.destinataires || [],
    };

    return this.http.put<any>(`${this.base}/${id}`, dto).pipe(
      map(fromDto),
      tap(() => this.chargerTout())
    );
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.base}/${id}`).pipe(
      tap(() => this.chargerTout())
    );
  }

  getAll(): Reunion[] {
    return this._reunions$.getValue();
  }

  hasReunionOnDay(day: Date): boolean {
    const y = day.getFullYear();
    const m = day.getMonth();
    const d = day.getDate();
    return this.getAll().some(r => {
      if (!r.date) return false;
      const rd = new Date(r.date);
      return rd.getFullYear() === y && rd.getMonth() === m && rd.getDate() === d;
    });
  }
  getUpcoming(): Reunion[] {
  const now = new Date().getTime();
  return this.getAll()
    .filter(r => r.date && new Date(r.date).getTime() >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

getPast(): Reunion[] {
  const now = new Date().getTime();
  return this.getAll()
    .filter(r => r.date && new Date(r.date).getTime() < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
}