// src/app/features/achat/Gestion-fournisseurs/gestion-fournisseurs.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FournisseurService } from '@app/core/services/fournisseur.service';
import { Fournisseur, FournisseurPayload } from '@app/core/models/fournisseur.model';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-gestion-fournisseurs',
  templateUrl: './gestion-fournisseurs.component.html',
  styleUrls: ['./gestion-fournisseurs.component.scss']
})
export class GestionFournisseursComponent implements OnInit, OnDestroy {

  fournisseurs: Fournisseur[] = [];
  private sub?: Subscription;

  showModal        = false;
  isEditing        = false;
  editingId: number | null = null;
  searchTerm       = '';
  confirmDeleteId: number | null = null;
  errorMsg: string = '';
  successMsg: string = '';

  readonly typesProduit = [
    'Tissu', 'Fil', 'Accessoires', 'Boutons', 'Fermetures', 'Doublure',
    'Broderie', 'Impression', 'Emballage', 'Autre'
  ];

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private fournisseurSvc: FournisseurService,
    private authService: AuthService
  ) {
    this.form = this.fb.group({
      nomSociete:    ['', [Validators.required, Validators.minLength(2)]],
      nomContact:    ['', Validators.required],
      prenomContact: ['', Validators.required],
      email:         ['', [Validators.required, Validators.email]],
      telephone:     ['', Validators.required],
      adresse:       ['', Validators.required],
      typeProduit:   ['', Validators.required]
    });
  }

  get canEdit(): boolean {
    const role = (this.authService.getRole() ?? '').toLowerCase();
    return role === 'responsableachat' || role === 'admin';
  }

  ngOnInit(): void {
    this.sub = this.fournisseurSvc.fournisseurs$.subscribe(
      f => (this.fournisseurs = f)
    );
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get filtered(): Fournisseur[] {
    const t = this.searchTerm.toLowerCase().trim();
    if (!t) return this.fournisseurs;
    return this.fournisseurs.filter(f =>
      f.nomSociete.toLowerCase().includes(t)    ||
      f.nomContact.toLowerCase().includes(t)    ||
      f.prenomContact.toLowerCase().includes(t) ||
      f.email.toLowerCase().includes(t)         ||
      f.typeProduit.toLowerCase().includes(t)
    );
  }

  openAdd(): void {
    if (!this.canEdit) return;
    this.isEditing = false;
    this.editingId = null;
    this.form.reset();
    this.errorMsg = '';
    this.successMsg = '';
    this.showModal = true;
  }

  openEdit(f: Fournisseur): void {
    if (!this.canEdit) return;
    this.isEditing = true;
    this.editingId = f.id;
    this.form.patchValue(f);
    this.errorMsg = '';
    this.successMsg = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.form.reset();
    setTimeout(() => {
      this.errorMsg = '';
      this.successMsg = '';
    }, 2000);
  }

  submit(): void {
    if (!this.canEdit || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;
    const payload: FournisseurPayload = {
      NomSociete: raw.nomSociete,
      NomContact: raw.nomContact,
      PrenomContact: raw.prenomContact,
      Email: raw.email,
      Telephone: raw.telephone,
      Adresse: raw.adresse,
      TypeProduit: raw.typeProduit
    };

    if (this.isEditing && this.editingId !== null) {
      this.fournisseurSvc.update(this.editingId, payload).subscribe({
        next: () => {
          this.successMsg = 'Fournisseur modifié avec succès.';
          this.closeModal();
        },
        error: (err) => {
          console.error('Erreur modification', err);
          this.errorMsg = `Erreur ${err.status} : ${err.statusText}`;
        }
      });
    } else {
      this.fournisseurSvc.add(payload).subscribe({
        next: () => {
          this.successMsg = 'Fournisseur ajouté avec succès.';
          this.closeModal();
        },
        error: (err) => {
          console.error('Erreur ajout', err);
          this.errorMsg = `Erreur ${err.status} : ${err.statusText}`;
        }
      });
    }
  }

  askDelete(id: number): void {
    if (!this.canEdit) return;
    this.confirmDeleteId = id;
  }

  confirmDelete(): void {
    if (this.confirmDeleteId !== null && this.canEdit) {
      const idToDelete = this.confirmDeleteId;
      this.fournisseurSvc.delete(idToDelete).subscribe({
        next: () => this.onSupprime(idToDelete),
        error: (err) => {
          // Un 404 = le fournisseur n'existe déjà plus côté serveur → c'est le
          // résultat voulu : on le retire de la liste comme un succès.
          if (err?.status === 404) {
            this.onSupprime(idToDelete);
          } else {
            console.error('Erreur suppression', err);
            this.errorMsg = `Erreur ${err.status} : ${err.statusText}`;
            this.confirmDeleteId = null;
          }
        }
      });
    }
  }

  /** Retire le fournisseur de l'affichage et confirme la suppression. */
  private onSupprime(idToDelete: number): void {
    // Retrait local immédiat (l'UI ne dépend plus du re-fetch ni du flux).
    this.fournisseurs = this.fournisseurs.filter(f => Number(f.id) !== Number(idToDelete));
    this.successMsg = 'Fournisseur supprimé avec succès.';
    this.errorMsg = '';
    this.confirmDeleteId = null;
    setTimeout(() => this.successMsg = '', 2000);
  }

  cancelDelete(): void {
    this.confirmDeleteId = null;
  }

  getInitiales(f: Fournisseur): string {
    return (f.nomSociete || '?').charAt(0).toUpperCase();
  }
}