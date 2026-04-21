import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Fournisseur, FournisseurPayload } from '../models/fournisseur.model';

@Injectable({ providedIn: 'root' })
export class FournisseurService {
  private base = `${environment.apiUrl}/nomenclature/fournisseurs`;

  private fournisseursSubject = new BehaviorSubject<Fournisseur[]>([]);
  public fournisseurs$ = this.fournisseursSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadAll();
  }

  private loadAll(): void {
    this.getAll().subscribe({
      next: (data) => this.fournisseursSubject.next(data),
      error: (err) => console.error('Erreur chargement fournisseurs', err)
    });
  }

  getAll(): Observable<Fournisseur[]> {
    console.log('GET all fournisseurs →', this.base);
    return this.http.get<any[]>(this.base).pipe(
      map(data => data.map(item => this.mapFromApi(item)))
    );
  }

  add(payload: FournisseurPayload): Observable<Fournisseur> {
    console.log('POST fournisseur →', this.base, payload);
    return this.http.post<any>(this.base, payload).pipe(
      tap(() => this.loadAll()),
      map(res => this.mapFromApi(res))
    );
  }

  update(id: number, payload: FournisseurPayload): Observable<Fournisseur> {
    if (!id) throw new Error('ID fournisseur manquant pour la modification');
    const url = `${this.base}/${id}`;
    console.log('PUT →', url, payload);
    return this.http.put<any>(url, payload).pipe(
      tap(() => this.loadAll()),
      map(res => this.mapFromApi(res))
    );
  }

  delete(id: number): Observable<any> {
    if (!id) throw new Error('ID fournisseur manquant pour la suppression');
    const url = `${this.base}/${id}`;
    console.log('DELETE →', url);
    return this.http.delete(url).pipe(
      tap(() => this.loadAll())
    );
  }

 
  private mapFromApi(item: any): Fournisseur {
    const id = item.id ?? item.Id; // ← prend en charge les deux formats
    if (!id) {
      console.warn('ID manquant dans la réponse API', item);
    }
    return {
      id: id,
      nomSociete: item.NomSociete,
      nomContact: item.NomContact,
      prenomContact: item.PrenomContact,
      email: item.Email,
      telephone: item.Telephone,
      adresse: item.Adresse,
      typeProduit: item.TypeProduit
    };
  }
}