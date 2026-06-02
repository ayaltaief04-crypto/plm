import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SyncListeService {
  private refreshNeeded = new Subject<string>();
  refresh$ = this.refreshNeeded.asObservable();

  triggerRefresh(serviceKey: string): void {
    this.refreshNeeded.next(serviceKey);
  }
}