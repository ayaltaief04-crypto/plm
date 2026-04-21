import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Reunion } from '../models/reunion.model ';

@Injectable({ providedIn: 'root' })
export class ReunionService {
  private storageKey = 'tf_reunions';
  private _reunions$ = new BehaviorSubject<Reunion[]>(this.load());
  reunions$ = this._reunions$.asObservable();

  private load(): Reunion[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private save(list: Reunion[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(list));
    this._reunions$.next(list);
  }

  getAll(): Reunion[] {
    return this._reunions$.getValue();
  }

  add(reunion: Omit<Reunion, 'id' | 'createdAt'>): Reunion {
    const newR: Reunion = {
      ...reunion,
      id: `r-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    const list = this.sortByDateAsc([newR, ...this.getAll()]);
    this.save(list);
    return newR;
  }

  delete(id: string): void {
    this.save(this.getAll().filter(r => r.id !== id));
  }

  getUpcoming(): Reunion[] {
    const now = new Date().getTime();
    return this.getAll()
      .filter(r => new Date(r.date).getTime() >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  getPast(): Reunion[] {
    const now = new Date().getTime();
    return this.getAll()
      .filter(r => new Date(r.date).getTime() < now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // ✅ pour afficher le point sur le calendrier
  hasReunionOnDay(day: Date): boolean {
    const y = day.getFullYear();
    const m = day.getMonth();
    const d = day.getDate();

    return this.getAll().some(r => {
      const rd = new Date(r.date);
      return rd.getFullYear() === y && rd.getMonth() === m && rd.getDate() === d;
    });
  }

  private sortByDateAsc(list: Reunion[]): Reunion[] {
    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
}
