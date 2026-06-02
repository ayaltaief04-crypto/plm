import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { interval, Subscription, forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ListeControleService, ROLE_TO_SERVICE } from 'src/app/core/services/liste-controle.service';
import { SyncListeService } from 'src/app/core/services/sync-liste.service';
import { ChecklistAffichageDto, ChecklistResponseDto } from 'src/app/core/models/liste-controle.model';

interface ServiceMeta {
  nomListe:   string;
  serviceKey: string;
  icone:      string;
  couleur:    string;
}

const SERVICES_META: ServiceMeta[] = [
  { nomListe: 'Design',    serviceKey: 'Design',    icone: 'brush',         couleur: '#4f46e5' },
  { nomListe: 'Marketing', serviceKey: 'Marketing', icone: 'trending_up',   couleur: '#0891b2' },
  { nomListe: 'Textile',   serviceKey: 'Textile',   icone: 'engineering',   couleur: '#0369a1' },
  { nomListe: 'Achat',     serviceKey: 'Achat',     icone: 'shopping_cart', couleur: '#b45309' },
  { nomListe: 'Qualité',   serviceKey: 'Qualite',   icone: 'verified_user', couleur: '#15803d' },
];

interface OngletState {
  meta:        ServiceMeta;
  readOnly:    boolean;
  data:        ChecklistAffichageDto | null;
  loading:     boolean;
  savingId:    number | null;
  saving:      boolean;       // ← enregistrement global en cours
  saveOk:      boolean;       // ← feedback "Enregistré"
  saveErr:     boolean;       // ← feedback erreur d'enregistrement
  finalizing:  boolean;
  finalizeOk:  boolean;
  finalizeErr: boolean;
  errMsg:      string;
  enEdition:   boolean;
}

@Component({
  selector:    'app-checklist-version',
  templateUrl: './checklist-version.component.html',
  styleUrls:  ['./checklist-version.component.scss']
})
export class ChecklistVersionComponent implements OnChanges, OnDestroy {
  @Input() idProduct!:   number;
  @Input() idVersion!:   number;
  @Input() versionName!: string;
  @Input() userRole!:    string;
  /** Verrouille toute la checklist (ex: version CLÔTURÉE ou VALIDÉE) → lecture seule pour tous. */
  @Input() readOnly:     boolean = false;
  /** Raison du verrouillage version : 'CLOTURE' ou 'VALIDE' (vide sinon) → pilote le message. */
  @Input() lockReason:   string = '';

  onglets: OngletState[] = [];
  ongletActif!: OngletState;

  private pollSubs: Subscription[] = [];
  private syncSub!: Subscription;

  constructor(
    private svc:  ListeControleService,
    private sync: SyncListeService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (this.idProduct) {
      this.stopPolling();
      this.syncSub?.unsubscribe();
      this.init();
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.syncSub?.unsubscribe();
  }

  private stopPolling(): void {
    this.pollSubs.forEach(s => s.unsubscribe());
    this.pollSubs = [];
  }

  get monService(): string {
    return ROLE_TO_SERVICE[this.userRole] || '';
  }

  init(): void {
    this.onglets = SERVICES_META.map(meta => ({
      meta,
      readOnly:    this.readOnly || meta.serviceKey !== this.monService, // readOnly si version verrouillée OU autre service
      data:        null,
      loading:     true,
      savingId:    null,
      saving:      false,
      saveOk:      false,
      saveErr:     false,
      finalizing:  false,
      finalizeOk:  false,
      finalizeErr: false,
      errMsg:      '',
      enEdition:   false,
    }));

    // Ouvre toujours sur la liste du service de l'acteur (même si tout est en lecture
    // seule pour une version verrouillée) ; sinon premier onglet éditable, sinon le premier.
    this.ongletActif =
      this.onglets.find(o => o.meta.serviceKey === this.monService) ??
      this.onglets.find(o => !o.readOnly) ??
      this.onglets[0];

    // Charger TOUS les onglets, y compris readOnly
    this.onglets.forEach(o => this.startPolling(o));

    this.syncSub = this.sync.refresh$.subscribe(serviceKey => {
      const onglet = this.onglets.find(o => o.meta.serviceKey === serviceKey);
      // Ne pas recharger si l'utilisateur est en train d'éditer (modifs locales non enregistrées)
      if (onglet && !onglet.data?.estFinalisee && !onglet.enEdition) {
        this.rechargerChecklist(onglet);
      }
    });
  }

  private startPolling(o: OngletState): void {
    this.chargerInitial(o);

    // Poller tous les onglets, y compris readOnly
    const sub = interval(15000).pipe(
      switchMap(() => this.svc.ouvrirChecklist(this.idProduct, o.meta.serviceKey))
    ).subscribe({
      next:  data => this.mergeData(o, data),
      error: err  => {
        if (!o.data) {
          o.loading = false;
          // Onglet readOnly : erreur silencieuse, pas de message bloquant
          o.errMsg = o.readOnly ? '' : (err?.error?.message || 'Impossible de charger cette liste.');
        }
      }
    });
    this.pollSubs.push(sub);
  }

  private chargerInitial(o: OngletState): void {
    o.loading = true;
    o.errMsg  = '';
    this.svc.ouvrirChecklist(this.idProduct, o.meta.serviceKey).subscribe({
      next:  data => { o.data = data; o.loading = false; },
      error: err  => {
        o.loading = false;
        // Onglet readOnly : erreur silencieuse, pas de message bloquant
        o.errMsg = o.readOnly ? '' : (err?.error?.message || 'Impossible de charger cette liste.');
      }
    });
  }

  private rechargerChecklist(o: OngletState, callback?: () => void): void {
    this.svc.ouvrirChecklist(this.idProduct, o.meta.serviceKey).subscribe({
      next: fresh => {
        if (!o.data) {
          o.data    = fresh;
          o.loading = false;
        } else {
          const localMap = new Map<number, ChecklistResponseDto>(
            o.data.elements.map(el => [el.idElement, el])
          );
          o.data = {
            ...fresh,
            elements: fresh.elements.map(el => {
              const local = localMap.get(el.idElement);
              if (local && o.savingId === el.idElement) return local;
              return el;
            })
          };
          o.loading = false;
        }
        if (callback) callback();
      },
      error: err => {
        o.errMsg = err?.error?.message || 'Erreur de rechargement.';
        if (callback) callback();
      }
    });
  }

  private mergeData(o: OngletState, fresh: ChecklistAffichageDto): void {
    if (!o.data) {
      o.data    = fresh;
      o.loading = false;
      return;
    }

    // En mode édition (et pas finalisée), on NE touche PAS aux éléments :
    // les modifications locales non encore enregistrées doivent rester visibles.
    if (o.enEdition && !o.data.estFinalisee) {
      o.loading = false;
      return;
    }

    const localMap = new Map<number, ChecklistResponseDto>(
      o.data.elements.map(el => [el.idElement, el])
    );

    o.data = {
      ...fresh,
      elements: fresh.elements.map(el => {
        const local = localMap.get(el.idElement);
        if (!local) return el;
        if (o.savingId === el.idElement) return local;
        return { ...el, estCoche: local.estCoche, commentaire: local.commentaire };
      })
    };

    o.loading = false;
  }

  charger(o: OngletState): void {
    this.chargerInitial(o);
  }

  selectionner(o: OngletState): void {
    this.ongletActif = o;
  }

  activerEdition(o: OngletState): void {
    if (o.readOnly || o.data?.estFinalisee) return;
    o.enEdition = true;
  }

  // ── COCHER / DÉCOCHER : modification LOCALE uniquement ──────────────────────
  // L'enregistrement se fait via le bouton "Enregistrer".
  toggle(o: OngletState, el: ChecklistResponseDto): void {
    if (o.readOnly || o.data?.estFinalisee || !o.enEdition) return;

    el.estCoche = !el.estCoche;
    this.recalculerNote(o);
  }

  // ── COMMENTAIRE : modification LOCALE uniquement ───────────────────────────
  updateComment(o: OngletState, el: ChecklistResponseDto, value: string): void {
    el.commentaire = value;
  }

  // ── ENREGISTRER : persiste tous les éléments, reste en mode édition ────────
  enregistrer(o: OngletState): void {
    if (!o.data || o.readOnly || o.data.estFinalisee || o.saving) return;

    o.saving   = true;
    o.saveOk   = false;
    o.saveErr  = false;
    o.errMsg   = '';

    this.sauvegarderTout(o).subscribe({
      next: (results: any[]) => {
        this.appliquerResultats(o, results);
        o.saving    = false;
        o.saveOk    = true;
        o.enEdition = false;   // ← sort du mode édition → n'affiche plus que "Modifier"
        setTimeout(() => (o.saveOk = false), 4000);
      },
      error: err => {
        o.saving  = false;
        o.saveErr = true;
        o.errMsg  = err?.error?.message || 'Erreur lors de l\'enregistrement.';
        setTimeout(() => (o.saveErr = false), 5000);
      }
    });
  }

  // Envoie l'état de tous les éléments à l'API (utilisé par Enregistrer ET Finaliser)
  private sauvegarderTout(o: OngletState) {
    const calls = o.data!.elements.map(el =>
      this.svc.enregistrerReponse(this.idProduct, el.idElement, {
        estCoche:    el.estCoche,
        commentaire: el.commentaire ?? null
      })
    );
    return forkJoin(calls);
  }

  // Applique l'idListeControle et la note renvoyés par le serveur
  private appliquerResultats(o: OngletState, results: any[]): void {
    if (!o.data) return;
    // Le backend renvoie désormais idListeControle dans enregistrer-reponse.
    const withId = results.find(r => (r?.idListeControle ?? r?.IdListeControle ?? 0) > 0);
    if (withId) {
      o.data.idListeControle = withId.idListeControle ?? withId.IdListeControle;
    }

    const last = results[results.length - 1];
    if (last && last.note != null) {
      o.data.noteFinale = last.note;
    } else {
      this.recalculerNote(o);
    }
  }

  private recalculerNote(o: OngletState): void {
    if (!o.data) return;
    const coches = o.data.elements.filter(e => e.estCoche).length;
    const total  = o.data.elements.length;
    o.data.noteFinale = total > 0 ? (coches / total) * 10 : 0;
  }

  // ── FINALISER : enregistre, récupère l'idListeControle, puis verrouille ──
  finaliser(o: OngletState): void {
    if (!o.data || o.readOnly || o.finalizing || o.saving) return;

    if (!confirm('Finaliser cette liste ? Elle sera verrouillée définitivement.')) return;

    o.finalizing  = true;
    o.finalizeOk  = false;
    o.finalizeErr = false;
    o.errMsg      = '';

    // 1) Enregistrer l'état courant. Le backend renvoie l'idListeControle.
    this.sauvegarderTout(o).subscribe({
      next: (results: any[]) => {
        this.appliquerResultats(o, results);

        // 2a) Chemin rapide : on a l'id depuis la réponse d'enregistrement → on finalise.
        if (o.data?.idListeControle && o.data.idListeControle > 0) {
          this.doFinaliser(o);
          return;
        }

        // 2b) Repli : pas d'id dans la réponse → on relit la checklist pour l'obtenir.
        this.svc.ouvrirChecklist(this.idProduct, o.meta.serviceKey).subscribe({
          next: fresh => {
            if (o.data && fresh?.idListeControle) {
              o.data.idListeControle = fresh.idListeControle;
            }
            this.doFinaliser(o);
          },
          error: err => this.finalizeError(o, err, 'Erreur de récupération de la liste.')
        });
      },
      error: err => this.finalizeError(o, err, 'Erreur lors de l\'enregistrement avant finalisation.')
    });
  }

  private finalizeError(o: OngletState, err: any, fallback: string): void {
    o.finalizing  = false;
    o.finalizeErr = true;
    o.errMsg      = err?.error?.message || fallback;
    setTimeout(() => (o.finalizeErr = false), 5000);
  }

  // Appelle réellement l'API de finalisation (finalizing déjà à true, déjà confirmé)
  private doFinaliser(o: OngletState): void {
    if (!o.data?.idListeControle) {
      o.finalizing  = false;
      o.finalizeErr = true;
      o.errMsg      = 'Impossible de finaliser : enregistrement requis.';
      setTimeout(() => (o.finalizeErr = false), 5000);
      return;
    }

    this.svc.terminerListe(this.idProduct, o.data.idListeControle).subscribe({
      next: res => {
        if (o.data) {
          o.data.noteFinale   = res.note;
          o.data.estFinalisee = true;   // ← passe la liste en lecture seule
        }
        o.finalizing = false;
        o.finalizeOk = true;
        o.enEdition  = false;           // ← sort du mode édition
        setTimeout(() => (o.finalizeOk = false), 4000);
      },
      error: err => {
        o.finalizing  = false;
        o.finalizeErr = true;
        o.errMsg      = err?.error?.message || 'Erreur lors de la finalisation.';
        setTimeout(() => (o.finalizeErr = false), 5000);
      }
    });
  }

  nbCoches(o: OngletState): number {
    return o.data?.elements.filter(e => e.estCoche).length ?? 0;
  }

  total(o: OngletState): number {
    return o.data?.elements.length ?? 0;
  }

  pct(o: OngletState): number {
    const t = this.total(o);
    return t ? Math.round((this.nbCoches(o) / t) * 100) : 0;
  }

  couleurNote(note: number): string {
    if (note < 5)   return '#ef4444';
    if (note < 7.5) return '#f59e0b';
    return '#10b981';
  }

  labelNote(note: number): string {
    if (note === 0)  return 'Non démarré';
    if (note < 3.75) return 'Insuffisant';
    if (note < 6.25) return 'En cours';
    if (note < 8.75) return 'Avancé';
    return 'Complet';
  }

  // ── Tout cocher / décocher : LOCAL uniquement (persisté via Enregistrer) ───
  toutRemplir(o: OngletState): void {
    if (!o.data) return;
    o.data.elements.forEach(el => el.estCoche = true);
    this.recalculerNote(o);
  }

  toutEffacer(o: OngletState): void {
    if (!o.data) return;
    o.data.elements.forEach(el => el.estCoche = false);
    this.recalculerNote(o);
  }
}