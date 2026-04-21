import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import {
  ListeControleService,
  ROLE_TO_LISTE
} from 'src/app/core/services/liste-controle.service';
import { ChecklistVersion, ReponseChecklist } from 'src/app/core/models/liste-controle.model';

interface OngletListe {
  nomListe:    string;
  icone:       string;
  couleur:     string;
  readOnly:    boolean;
  checklist:   ChecklistVersion | null;
  loading:     boolean;
  saveSuccess: boolean;
  saveError:   boolean;
}

const TOTAL_ELEMENTS = 8; // Nombre fixe d'éléments par liste

const LISTES_META: { nomListe: string; icone: string; couleur: string }[] = [
  { nomListe: 'Design',     icone: 'brush',         couleur: '#4f46e5' },
  { nomListe: 'Marketing',  icone: 'trending_up',   couleur: '#0891b2' },
  { nomListe: 'Ingénierie', icone: 'engineering',   couleur: '#0369a1' },
  { nomListe: 'Achat',      icone: 'shopping_cart', couleur: '#b45309' },
  { nomListe: 'Qualité',    icone: 'verified_user', couleur: '#15803d' },
];

@Component({
  selector: 'app-checklist-version',
  templateUrl: './checklist-version.component.html',
  styleUrls: ['./checklist-version.component.scss']
})
export class ChecklistVersionComponent implements OnChanges {
  @Input() idProduct!: number;
  @Input() idVersion!: number;
  @Input() versionName!: string;
  @Input() userRole!: string;

  onglets: OngletListe[] = [];
  ongletActif!: OngletListe;

  readonly TOTAL = TOTAL_ELEMENTS;

  constructor(private listeService: ListeControleService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (this.idProduct && this.idVersion) {
      this.initialiserOnglets();
    }
  }

  get nomListePropre(): string {
    return ROLE_TO_LISTE[this.userRole] || '';
  }

  initialiserOnglets(): void {
    this.onglets = LISTES_META.map(meta => ({
      nomListe:    meta.nomListe,
      icone:       meta.icone,
      couleur:     meta.couleur,
      readOnly:    meta.nomListe !== this.nomListePropre,
      checklist:   null,
      loading:     false,
      saveSuccess: false,
      saveError:   false,
    }));

    this.ongletActif = this.onglets.find(o => !o.readOnly) || this.onglets[0];
    this.onglets.forEach(o => this.chargerOnglet(o));
  }

  chargerOnglet(onglet: OngletListe): void {
    onglet.loading     = true;
    onglet.checklist   = null;
    onglet.saveSuccess = false;
    onglet.saveError   = false;

    this.listeService.getChecklistVersion(
      this.idProduct, this.idVersion, this.versionName, onglet.nomListe
    ).subscribe({
      next:  cl => { onglet.checklist = cl; onglet.loading = false; },
      error: ()  => { onglet.loading = false; }
    });
  }

  selectionnerOnglet(onglet: OngletListe): void {
    this.ongletActif = onglet;
  }

  // ─── Nombre d'éléments cochés ───────────────────────────────
  nbCoches(onglet: OngletListe): number {
    return onglet.checklist?.reponses.filter(r => r.coche).length || 0;
  }

  // ─── Note sur 10 = (cochés / 8) × 10 ───────────────────────
  noteCalculee(onglet: OngletListe): number {
    const score = (this.nbCoches(onglet) / TOTAL_ELEMENTS) * 10;
    return Math.round(score * 10) / 10; // Arrondi à 1 décimale
  }

  // ─── Progression en % ───────────────────────────────────────
  progressionPct(onglet: OngletListe): number {
    const pct = (this.nbCoches(onglet) / TOTAL_ELEMENTS) * 100;
    return Math.round(pct);
  }

  // ─── Couleur selon note ─────────────────────────────────────
  couleurNote(note: number): string {
    if (note < 5)  return '#ef4444'; // rouge pro (opaque)
    if (note < 7.5) return '#f59e0b'; // orange pro (opaque)
    return '#10b981';                // vert pro (opaque)
  }

  // ─── Label qualitatif ───────────────────────────────────────
  labelNote(note: number): string {
    if (note === 0)   return 'Non démarré';
    if (note < 3.75)  return 'Insuffisant';
    if (note < 6.25)  return 'En cours';
    if (note < 8.75)  return 'Avancé';
    return 'Complet';
  }

  blocquesNonCoches(onglet: OngletListe): ReponseChecklist[] {
    return onglet.checklist?.reponses.filter(r => r.estBloquant && !r.coche) || [];
  }

  toutComplete(onglet: OngletListe): boolean {
    return this.nbCoches(onglet) === TOTAL_ELEMENTS;
  }

  // ─── Actions ────────────────────────────────────────────────
  toggleReponse(onglet: OngletListe, reponse: ReponseChecklist): void {
    if (onglet.readOnly) return;
    reponse.coche = !reponse.coche;
    onglet.saveSuccess = false;
  }

  enregistrer(onglet: OngletListe): void {
    if (!onglet.checklist || onglet.readOnly) return;
    onglet.saveSuccess = false;
    onglet.saveError   = false;

    this.listeService.saveChecklistVersion(onglet.checklist, this.userRole).subscribe({
      next: saved => {
        onglet.checklist   = saved;
        onglet.saveSuccess = true;
        setTimeout(() => onglet.saveSuccess = false, 3500);
      },
      error: () => { onglet.saveError = true; }
    });
  }

  toutCocher(onglet: OngletListe): void {
    if (onglet.readOnly) return;
    onglet.checklist?.reponses.forEach(r => r.coche = true);
  }

  toutDecocher(onglet: OngletListe): void {
    if (onglet.readOnly) return;
    onglet.checklist?.reponses.forEach(r => r.coche = false);
  }
}