import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { QualitePayload } from '../models/quality.model';

@Injectable({ providedIn: 'root' })
export class QualiteService {
  private base = `${environment.apiUrl}/Analyse/qualite`;

  constructor(private http: HttpClient) {}

  getQualite(produitId: number): Observable<any> {
    return this.http.get<any>(`${this.base}/${produitId}`);
  }

  saveQualite(produitId: number, data: QualitePayload): Observable<any> {
    return this.http.post<any>(`${this.base}/${produitId}`, data);
  }
}