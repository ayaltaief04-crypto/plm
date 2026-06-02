import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { NomenclatureService } from '@app/core/services/nomenclature.service';
import { ComposantPayload } from '@app/core/models/nomenclature.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-textile-management',
  templateUrl: './textile-management.component.html',
  styleUrls: ['./textile-management.component.scss']
})
export class TextileManagementComponent implements OnInit {
  textileForm!: FormGroup;
  composants: any[] = [];
  filteredComposants: any[] = [];
  searchQuery: string = '';

  showForm      = false;
  isEditMode    = false;
  selectedTextile: any = null;
  editingId: number | null = null;

  isLoading  = false;
  isSaving   = false;
  errorMsg   = '';
  successMsg = '';

  imageFile: File | null = null;
  imagePreview: string   = '';

  unites = ['pcs', 'm', 'kg', 'm²', 'bobine', 'lot'];

  constructor(
    private fb: FormBuilder,
    private nomService: NomenclatureService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadComposants();
  }

  // ── Formulaire ─────────────────────────────────────────────────────────────
  initForm(): void {
    this.textileForm = this.fb.group({
      designation: ['', Validators.required],
      reference:   [''],
      couleur:     [''],
      position:    [''],
      unite:       ['m'],
      remplacement:['']
    });
  }

  // ── Chargement liste ───────────────────────────────────────────────────────
  loadComposants(): void {
    this.isLoading = true;
    this.nomService.getAllComposants().pipe(
      finalize(() => (this.isLoading = false))
    ).subscribe({
      next: (data) => {
        this.composants = data.map((c: any) => this.resolveImageUrl(c));
        this.applyFilter();
      },
      error: () => (this.errorMsg = 'Erreur lors du chargement des composants.')
    });
  }

  // ── Résolution URL image ───────────────────────────────────────────────────
  private resolveImageUrl(composant: any): any {
    const img = composant.Image ?? composant.image ?? null;
    if (img && !img.startsWith('http')) {
      composant.Image = `${environment.baseUrl}${img}`;
      composant.image = composant.Image;
    }
    return composant;
  }

  // ── Recherche ──────────────────────────────────────────────────────────────
  onSearch(): void {
    this.applyFilter();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilter();
  }

  private applyFilter(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredComposants = [...this.composants];
      return;
    }
    this.filteredComposants = this.composants.filter(c => {
      const designation = (c.Designation ?? c.designation ?? '').toLowerCase();
      const reference   = (c.Reference   ?? c.reference   ?? '').toLowerCase();
      return designation.includes(q) || reference.includes(q);
    });
  }

  // ── Image ──────────────────────────────────────────────────────────────────
  onImageUpload(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;
    this.imageFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => (this.imagePreview = e.target.result);
    reader.readAsDataURL(file);
  }

  // ── Ouvrir / fermer formulaire ────────────────────────────────────────────
  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) this.cancelEdit();
  }

  openDetail(textile: any): void { this.selectedTextile = textile; }
  closeDetail(): void            { this.selectedTextile = null; }

  // ── Édition ────────────────────────────────────────────────────────────────
  onEdit(event: Event, textile: any): void {
    event.stopPropagation();
    this.isEditMode   = true;
    this.showForm     = true;
    this.editingId    = textile.id ?? textile.Id ?? null;
    this.imagePreview = textile.Image ?? textile.image ?? '';
    this.imageFile    = null;

    this.textileForm.patchValue({
      designation:  textile.Designation  ?? textile.designation  ?? '',
      reference:    textile.Reference    ?? textile.reference    ?? '',
      couleur:      textile.Couleur      ?? textile.couleur      ?? '',
      position:     textile.Position     ?? textile.position     ?? '',
      unite:        textile.Unite        ?? textile.unite        ?? 'm',
      remplacement: textile.Remplacement ?? textile.remplacement ?? ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Suppression ────────────────────────────────────────────────────────────
  onDelete(event: Event, textile: any): void {
    event.stopPropagation();
    const id = textile.id ?? textile.Id;
    if (!id) return;
    if (!confirm(`Supprimer « ${textile.Designation ?? textile.designation} » ?`)) return;

    this.nomService.deleteComposant(id).subscribe({
      next: () => {
        this.composants = this.composants.filter(c => (c.id ?? c.Id) !== id);
        this.applyFilter();
        this.showSuccess('Composant supprimé.');
        if (this.selectedTextile === textile) this.selectedTextile = null;
      },
      error: (err) => {
        this.errorMsg = err?.error?.message ?? 'Erreur lors de la suppression.';
      }
    });
  }

  // ── Annuler ────────────────────────────────────────────────────────────────
  cancelEdit(): void {
    this.isEditMode   = false;
    this.showForm     = false;
    this.editingId    = null;
    this.imageFile    = null;
    this.imagePreview = '';
    this.textileForm.reset({ unite: 'm' });
  }

  // ── Soumettre (créer ou modifier) ─────────────────────────────────────────
  onSubmit(): void {
    if (!this.textileForm.valid) return;
    this.isSaving = true;
    this.errorMsg = '';

    const formVal = this.textileForm.value;
    const payload: ComposantPayload = {
      Designation:  formVal.designation,
      Reference:    formVal.reference    || undefined,
      Couleur:      formVal.couleur      || undefined,
      Position:     formVal.position     || undefined,
      Unite:        formVal.unite        || undefined,
      Remplacement: formVal.remplacement || undefined
    };

    if (this.isEditMode && this.editingId !== null) {
      // ── PUT /nomenclature/composants/{id} ─────────────────────────────
      this.nomService.updateComposantTechnique(
        this.editingId, payload, this.imageFile ?? undefined
      ).pipe(finalize(() => (this.isSaving = false))).subscribe({
        next: (updated) => {
          const resolved = this.resolveImageUrl(updated);
          const idx = this.composants.findIndex(
            c => (c.id ?? c.Id) === this.editingId
          );
          if (idx !== -1) this.composants[idx] = resolved;
          this.applyFilter();
          this.showSuccess('Composant mis à jour.');
          this.cancelEdit();
          this.loadComposants();
        },
        error: (err) => {
          if (err.status === 403) {
            this.errorMsg = 'Accès refusé — Seul l\'Ingénieur Textile peut modifier.';
          } else {
            this.errorMsg = err?.error?.message ?? 'Erreur lors de la mise à jour.';
          }
        }
      });
    } else {
      // ── POST /nomenclature/composants ─────────────────────────────────
      this.nomService.addComposant(payload, this.imageFile ?? undefined)
        .pipe(finalize(() => (this.isSaving = false))).subscribe({
          next: (created) => {
            const resolved = this.resolveImageUrl(created);
            this.composants.unshift(resolved);
            this.applyFilter();
            this.showSuccess('Composant créé.');
            this.cancelEdit();
            this.loadComposants();
          },
          error: (err) => {
            if (err.status === 403) {
              this.errorMsg = 'Accès refusé — Seul l\'Ingénieur Textile peut créer des composants.';
            } else {
              this.errorMsg = err?.error?.message ?? 'Erreur lors de la création.';
            }
          }
        });
    }
  }

  // ── Utilitaire ─────────────────────────────────────────────────────────────
  private showSuccess(msg: string): void {
    this.successMsg = msg;
    setTimeout(() => (this.successMsg = ''), 3500);
  }
}