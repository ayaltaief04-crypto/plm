import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportService { // <--- Bien une CLASS
  private apiUrl = `${environment.apiUrl}/rapport`;

  constructor(private http: HttpClient) { }

  getCompleteReport(produitId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${produitId}`);
  }
}