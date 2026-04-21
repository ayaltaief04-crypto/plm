// ============================================================
//  gestion-listes.component.ts
//  L'admin configure les éléments de chaque liste.
//  Chaque liste est liée à un rôle métier précis.
// ============================================================
import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ListeControleService } from 'src/app/core/services/liste-controle.service';
import { ModeleListeControle, ElementListeControle } from 'src/app/core/models/liste-controle.model';

interface ServiceMeta {
  nomListe: string;
  roleCible: string;
  icon: string;
  couleur: string;
}

@Component({
  selector: 'app-gestion-listes',
  templateUrl: './gestion-listes.component.html',
  styleUrls: ['./gestion-listes.component.scss']
})
export class GestionListesComponent implements OnInit {

  // Définition des services avec leur rôle cible
  readonly SERVICES: ServiceMeta[] = [
    { nomListe: 'Design',     roleCible: 'Styliste',             icon: 'brush',         couleur: '#a78bfa' },
    { nomListe: 'Marketing',  roleCible: 'ResponsableMarketing', icon: 'trending_up',   couleur: '#34d399' },
    { nomListe: 'Ingénierie', roleCible: 'Ingenieurtextile',     icon: 'engineering',   couleur: '#60a5fa' },
    { nomListe: 'Achat',      roleCible: 'ResponsableAchat',     icon: 'shopping_cart', couleur: '#fbbf24' },
    { nomListe: 'Qualité',    roleCible: 'ResponsableQualite',   icon: 'verified_user', couleur: '#f87171' },
  ];

  serviceActif: ServiceMeta = this.SERVICES[0];
  modeleActuel?: ModeleListeControle;
  tousModeles: ModeleListeControle[] = [];

  savedOk  = false;
  savedErr = false;

  constructor(private listeService: ListeControleService) {}

  ngOnInit(): void {
    this.listeService.getAllModeles().subscribe(modeles => {
      this.tousModeles = modeles;
      this.afficherService(this.SERVICES[0]);
    });
  }

  afficherService(service: ServiceMeta): void {
    this.serviceActif = service;
    this.savedOk  = false;
    this.savedErr = false;
    this.modeleActuel = this.tousModeles.find(m => m.nomListe === service.nomListe);
    if (!this.modeleActuel) {
      // Créer un modèle vide pour ce service
      this.modeleActuel = {
        idModeleListe: Date.now(),
        nomListe:   service.nomListe,
        roleCible:  service.roleCible,
        elements:   []
      };
      this.tousModeles.push(this.modeleActuel);
    }
  }

  ajouterElement(): void {
    if (!this.modeleActuel) return;
    this.modeleActuel.elements.push({
      idElement:   Date.now(),
      contenu:     '',
      ordre:       this.modeleActuel.elements.length + 1,
      estBloquant: false,
      enEdition:   true
    });
  }

  validerElement(element: ElementListeControle): void {
    if (!element.contenu.trim()) return;
    element.enEdition = false;
  }

  supprimerElement(id: number): void {
    if (!this.modeleActuel || !confirm('Supprimer cet élément ?')) return;
    this.modeleActuel.elements = this.modeleActuel.elements.filter(e => e.idElement !== id);
    this.reordreElements();
  }

  toggleBloquant(element: ElementListeControle): void {
    element.estBloquant = !element.estBloquant;
  }

  drop(event: CdkDragDrop<ElementListeControle[]>): void {
    if (!this.modeleActuel) return;
    moveItemInArray(this.modeleActuel.elements, event.previousIndex, event.currentIndex);
    this.reordreElements();
  }

  
    sauvegarder(): void {
  if (!this.modeleActuel) return;

  // Validation : on enlève les éléments vides
  this.modeleActuel.elements = this.modeleActuel.elements.filter(el => el.contenu.trim() !== '');
  
  // Fermeture des modes édition
  this.modeleActuel.elements.forEach(el => el.enEdition = false);

  this.listeService.saveModele(this.modeleActuel).subscribe({
    next: () => {
      this.savedOk = true;
      // Optionnel : Forcer un rechargement global pour être sûr
      this.ngOnInit(); 
      setTimeout(() => this.savedOk = false, 3000);
    },
    error: () => this.savedErr = true
  });
}

  private reordreElements(): void {
    this.modeleActuel?.elements.forEach((el, i) => el.ordre = i + 1);
  }
}
