import { Component, OnInit } from '@angular/core';
import { ListeControleService } from 'src/app/core/services/liste-controle.service';
import { ModeleListeControle, ElementModeleDto, ElementCreationDto } from 'src/app/core/models/liste-controle.model';
import { SyncListeService } from 'src/app/core/services/sync-liste.service';

interface ServiceMeta {
  nomListe:   string;
  serviceKey: string;
  icon:       string;
  couleur:    string;
}

@Component({
  selector:    'app-gestion-listes',
  templateUrl: './gestion-listes.component.html',
  styleUrls:  ['./gestion-listes.component.scss']
})
export class GestionListesComponent implements OnInit {

  readonly SERVICES: ServiceMeta[] = [
    { nomListe: 'Design',    serviceKey: 'Design',    icon: 'brush',         couleur: '#a78bfa' },
    { nomListe: 'Marketing', serviceKey: 'Marketing', icon: 'trending_up',   couleur: '#34d399' },
    { nomListe: 'Textile',   serviceKey: 'Textile',   icon: 'engineering',   couleur: '#60a5fa' },
    { nomListe: 'Achat',     serviceKey: 'Achat',     icon: 'shopping_cart', couleur: '#fbbf24' },
    { nomListe: 'Qualité',   serviceKey: 'Qualite',   icon: 'verified_user', couleur: '#f87171' }
  ];

  serviceActif: ServiceMeta = this.SERVICES[0];
  private modeles: Map<string, ModeleListeControle> = new Map();
  loading = false;
  savedOk = false;
  savedErr = false;
  errMsg = '';

  // ✅ Message champ vide
  champVideErr = false;

  // ✅ Modal suppression
  showDeleteModal      = false;
  elementASupprimer:   ElementModeleDto | null = null;
  elementADesReponses  = false;

  get modeleActuel(): ModeleListeControle {
    return this.modeles.get(this.serviceActif.serviceKey)!;
  }

  constructor(
    private svc:  ListeControleService,
    private sync: SyncListeService
  ) {}

  ngOnInit(): void {
    this.SERVICES.forEach(s => {
      this.modeles.set(s.serviceKey, {
        idModeleListe:      0,
        nomListe:           s.nomListe,
        serviceResponsable: s.serviceKey,
        elements:           []
      });
    });
    this.chargerTousLesModeles();
  }

  private chargerTousLesModeles(): void {
    this.loading = true;
    this.svc.getAllModeles().subscribe({
      next: (modeles) => {
        modeles.forEach(m => {
          const key = this.SERVICES.find(s =>
            s.serviceKey.toLowerCase() === (m.serviceResponsable || m.nomListe).toLowerCase()
          )?.serviceKey;

          if (!key) return;

          const local = this.modeles.get(key);
          if (local) {
            local.idModeleListe = m.idModeleListe;
            local.elements = (m.elements || []).map(el => ({
              ...el,
              enEdition: false
            }));
          }
        });
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  afficherService(service: ServiceMeta): void {
    this.serviceActif  = service;
    this.savedOk       = false;
    this.savedErr      = false;
    this.champVideErr  = false;
    this.errMsg        = '';
  }

  ajouterElement(): void {
    const m = this.modeleActuel;
    if (!m) return;
    // Masquer les messages précédents
    this.champVideErr = false;
    this.savedErr     = false;
    m.elements.push({
      idElement:      -Date.now(),
      contenu:        '',
      ordreAffichage: m.elements.length + 1,
      enEdition:      true
    });
  }

  validerElement(el: ElementModeleDto): void {
    const m = this.modeleActuel;
    if (!m) return;

    // ✅ Champ vide → message d'erreur, ne pas enregistrer
    if (!el.contenu.trim()) {
      this.champVideErr = true;
      setTimeout(() => (this.champVideErr = false), 4000);
      return;
    }

    this.champVideErr = false;

    const dto: ElementCreationDto = {
      contenu:        el.contenu.trim(),
      ordreAffichage: el.ordreAffichage
    };

    if (el.idElement < 0) {
      this.svc.ajouterElement(this.serviceActif.serviceKey, dto).subscribe({
        next: () => {
          this.savedErr = false;
          this.rechargerModeleActif();
          this.sync.triggerRefresh(this.serviceActif.serviceKey);
        },
        error: err => {
          this.errMsg   = err?.error?.message || "Erreur lors de l'ajout.";
          this.savedErr = true;
          this.savedOk  = false;
          m.elements = m.elements.filter(e => e.idElement !== el.idElement);
          this.reordre();
        }
      });
    } else {
      this.svc.modifierElement(el.idElement, dto).subscribe({
        next: () => {
          this.savedErr = false;
          this.rechargerModeleActif();
          this.sync.triggerRefresh(this.serviceActif.serviceKey);
        },
        error: err => {
          this.errMsg   = err?.error?.message || 'Erreur lors de la modification.';
          this.savedErr = true;
          this.savedOk  = false;
        }
      });
    }
  }

  // ✅ Ouvre la modal de confirmation avant suppression
  demanderSuppression(el: ElementModeleDto): void {
    const m = this.modeleActuel;
    if (!m) return;

    // Élément local non encore sauvegardé → suppression directe sans modal
    if (el.idElement < 0) {
      m.elements = m.elements.filter(e => e.idElement !== el.idElement);
      this.reordre();
      return;
    }

    this.elementASupprimer  = el;
    this.elementADesReponses = false;

    // ✅ Vérifier si l'élément a des réponses via l'API
    this.svc.elementADesReponses(el.idElement).subscribe({
      next: (aDesReponses: boolean) => {
        this.elementADesReponses = aDesReponses;
        this.showDeleteModal     = true;
      },
      error: () => {
        // En cas d'erreur de vérification, on ouvre quand même la modal sans warning
        this.elementADesReponses = false;
        this.showDeleteModal     = true;
      }
    });
  }

  // ✅ Confirme la suppression depuis la modal
  confirmerSuppression(): void {
    const el = this.elementASupprimer;
    if (!el) return;

    this.showDeleteModal = false;

    this.svc.supprimerElement(el.idElement).subscribe({
      next: () => {
        this.elementASupprimer = null;
        this.rechargerModeleActif();
        this.sync.triggerRefresh(this.serviceActif.serviceKey);
      },
      error: err => {
        this.errMsg            = err?.error?.message || 'Erreur lors de la suppression.';
        this.savedErr          = true;
        this.elementASupprimer = null;
      }
    });
  }

  // Gardée pour compatibilité (utilisée si on appelle directement)
  supprimerElement(el: ElementModeleDto): void {
    this.demanderSuppression(el);
  }

  annulerEdition(el: ElementModeleDto): void {
    const m = this.modeleActuel;
    if (!m) return;
    if (el.idElement < 0) {
      m.elements = m.elements.filter(e => e.idElement !== el.idElement);
    } else {
      el.enEdition = false;
    }
    this.champVideErr = false;
  }

  private reordre(): void {
    this.modeleActuel?.elements.forEach((el, i) => el.ordreAffichage = i + 1);
  }

  private rechargerModeleActif(afficherSucces = true): void {
    this.svc.getAllModeles().subscribe({
      next: (modeles) => {
        const m = modeles.find(m =>
          (m.serviceResponsable || m.nomListe).toLowerCase() ===
          this.serviceActif.serviceKey.toLowerCase()
        );

        if (m) {
          const local = this.modeles.get(this.serviceActif.serviceKey);
          if (local) {
            local.idModeleListe = m.idModeleListe;
            local.elements = (m.elements || []).map(el => ({
              ...el,
              enEdition: false
            }));
          }
        }

        if (afficherSucces) {
          this.savedOk = true;
          setTimeout(() => (this.savedOk = false), 3000);
        }
      },
      error: () => {
        if (afficherSucces) {
          this.savedOk = true;
          setTimeout(() => (this.savedOk = false), 3000);
        }
      }
    });
  }
}