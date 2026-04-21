// src/app/features/nomenclature/nomenclature-view/nomenclature-view.component.ts
import {
  Component, OnChanges, Input, Output, EventEmitter, SimpleChanges
} from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { NomenclatureService } from '@app/core/services/nomenclature.service';
import { TechniquePayload, ComposantPayload, AchatPayload } from '@app/core/models/nomenclature.model';
import { Fournisseur } from '@app/core/models/fournisseur.model';

@Component({
  selector: 'app-nomenclature-view',
  templateUrl: './nomenclature-view.component.html',
  styleUrls: ['./nomenclature-view.component.scss']
})
export class NomenclatureViewComponent implements OnChanges {

  @Input() product!: any;
  @Input() isLocked: boolean = false;
  @Input() userRole: string = '';
  @Output() onSave = new EventEmitter<any>();

  nomForm!: FormGroup;
  unites = ['pcs', 'm', 'kg', 'm²', 'bobine', 'lot'];

  isLoading   = false;
  isSaving    = false;
  errorMsg    = '';
  successMsg  = '';
  nomenclatureId: number | null = null;

  editingRowIndex: number | null = null;
  achatEditingRowIndex: number | null = null;

  showFournisseurModal = false;
  fournisseursList: Fournisseur[] = [];
  currentFournisseurIndex: number | null = null;
  fournisseurSearchTerm = '';
  filteredFournisseurs: Fournisseur[] = [];

  get isIngenieur(): boolean {
    return (this.userRole ?? '').toLowerCase() === 'ingenieurtextile';
  }
  get isAchat(): boolean {
    return (this.userRole ?? '').toLowerCase() === 'responsableachat';
  }

  constructor(private fb: FormBuilder, private nomService: NomenclatureService) {
    this.buildForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product'] && this.product) {
      const id = this.getProductId();
      if (id) this.loadFromApi(id);
    }
    if (changes['userRole'] && this.nomForm) {
      this.applyPermissions();
    }
  }

  private getProductId(): number | null {
    return this.product?.idProduct ?? this.product?.id ?? null;
  }

  buildForm(): void {
    this.nomForm = this.fb.group({
      designationProduit:    [{ value: '', disabled: true }],
      reference:             [{ value: '', disabled: true }],
      compositionDetaillee:  [''],
      tolerancesDim:         [''],
      testsRequis:           [''],
      procederFabrication:   [''],
      techniquesSpecifiques: [''],
      items: this.fb.array([])
    });
  }

  get items(): FormArray {
    return this.nomForm.get('items') as FormArray;
  }

  loadFromApi(produitId: number): void {
    this.isLoading = true;
    this.errorMsg  = '';
    this.nomService.getNomenclature(produitId).pipe(
      finalize(() => (this.isLoading = false))
    ).subscribe({
      next:  (data) => this.patchFromApi(data),
      error: (err)  => {
        if (err.status === 404) {
          this.initCreationMode();
        } else {
          this.errorMsg = 'Erreur lors du chargement de la nomenclature.';
          console.error(err);
        }
      }
    });
  }

  // ✅ FIX PRINCIPAL : on pousse tous les items avec leurs valeurs AVANT applyPermissions()
  patchFromApi(data: any): void {
    this.nomenclatureId = data.id ?? data.Id;

    // 1. Activer tout le formulaire pour pouvoir patcher librement
    this.nomForm.enable();

    this.nomForm.patchValue({
      designationProduit:    this.product?.designation ?? '',
      reference:             this.product?.reference   ?? '',
      compositionDetaillee:  data.MatieresPrincipales ?? data.composition ?? '',
      tolerancesDim:         data.TolerancesDim ?? '',
      testsRequis:           data.TestsRequis ?? '',
      procederFabrication:   data.ProcedesFab ?? '',
      techniquesSpecifiques: data.TechniquesSpecifiques ?? ''
    });

    this.items.clear();
    const composants: any[] = data.Composants ?? [];

    // 2. Construire chaque FormGroup avec toutes les valeurs, sans toucher aux permissions
    composants.forEach((c: any) => {
      const backendId = c?.id ?? c?.Id ?? null;
      const g = this.fb.group({
        _backendId:          [backendId],
        imgUrl:              [c?.imgUrl ?? ''],
        designation:         [c?.Designation ?? '', Validators.required],
        reference:           [c?.Reference ?? ''],
        taille:              [c?.Taille ?? ''],
        couleur:             [c?.Couleur ?? ''],
        position:            [c?.Position ?? ''],
        quantite:            [c?.Quantite ?? 1, [Validators.required, Validators.min(0)]],
        unite:               [c?.Unite ?? 'pcs'],
        fournisseur:         [c?.NomFournisseur ?? ''],
        articleRemplacement: [c?.Remplacement ?? ''],
        prixUnitaire:        [c?.PrixUnitaire ?? 0]   // ✅ valeur correctement injectée
      });
      this.items.push(g);
    });

    // 3. Appliquer les permissions UNE SEULE FOIS après que toutes les valeurs sont en place
    this.applyPermissions();
  }

  initCreationMode(): void {
    this.nomenclatureId = null;
    this.nomForm.enable();
    this.nomForm.patchValue({
      designationProduit: this.product?.designation ?? '',
      reference:          this.product?.reference   ?? ''
    });
    this.items.clear();
    if (this.isIngenieur) {
      this.pushItem(null);
    }
    this.applyPermissions();
  }

  applyPermissions(): void {
    if (this.isIngenieur) {
      this.nomForm.enable();
      this.nomForm.get('designationProduit')?.disable();
      this.nomForm.get('reference')?.disable();
      this.items.controls.forEach((ctrl, idx) => {
        if (this.editingRowIndex !== idx) {
          ctrl.disable();
        } else {
          ctrl.enable();
          ctrl.get('fournisseur')?.disable();
          ctrl.get('prixUnitaire')?.disable();
        }
      });
      return;
    }

    if (this.isAchat) {
      this.nomForm.get('compositionDetaillee')?.disable();
      this.nomForm.get('tolerancesDim')?.disable();
      this.nomForm.get('testsRequis')?.disable();
      this.nomForm.get('procederFabrication')?.disable();
      this.nomForm.get('techniquesSpecifiques')?.disable();
      this.nomForm.get('designationProduit')?.disable();
      this.nomForm.get('reference')?.disable();
      this.items.controls.forEach((ctrl, idx) => {
        // ✅ On active d'abord pour que getRawValue() retourne bien les valeurs
        ctrl.enable();
        if (this.achatEditingRowIndex === idx) {
          ctrl.get('fournisseur')?.enable();
          ctrl.get('prixUnitaire')?.enable();
        } else {
          ctrl.get('fournisseur')?.disable();
          ctrl.get('prixUnitaire')?.disable();
        }
        // Champs techniques toujours désactivés pour achat
        ctrl.get('designation')?.disable();
        ctrl.get('reference')?.disable();
        ctrl.get('taille')?.disable();
        ctrl.get('couleur')?.disable();
        ctrl.get('position')?.disable();
        ctrl.get('quantite')?.disable();
        ctrl.get('unite')?.disable();
        ctrl.get('articleRemplacement')?.disable();
        ctrl.get('imgUrl')?.disable();
        ctrl.get('_backendId')?.disable();
      });
      return;
    }

    // Lecture seule
    this.nomForm.enable();
    this.items.controls.forEach(ctrl => ctrl.enable());
    this.nomForm.disable();
  }

  // ✅ pushItem utilisé uniquement pour addItem() (nouvelle ligne vide)
  // Ne pas appeler applyPermissionsOnCtrl ici pour éviter de désactiver avant patch
  pushItem(data: any): void {
    const backendId = data?.id ?? data?.Id ?? null;
    const g = this.fb.group({
      _backendId:          [backendId],
      imgUrl:              [data?.imgUrl ?? ''],
      designation:         [data?.Designation ?? '', Validators.required],
      reference:           [data?.Reference ?? ''],
      taille:              [data?.Taille ?? ''],
      couleur:             [data?.Couleur ?? ''],
      position:            [data?.Position ?? ''],
      quantite:            [data?.Quantite ?? 1, [Validators.required, Validators.min(0)]],
      unite:               [data?.Unite ?? 'pcs'],
      fournisseur:         [data?.NomFournisseur ?? ''],
      articleRemplacement: [data?.Remplacement ?? ''],
      prixUnitaire:        [data?.PrixUnitaire ?? 0]
    });
    this.items.push(g);
    // ✅ Pas d'applyPermissionsOnCtrl ici — applyPermissions() sera appelé après
  }

  // --- Édition pour ingénieur ------------------------------------------------
  editRow(index: number): void {
    if (!this.isIngenieur) return;
    if (this.editingRowIndex !== null && this.editingRowIndex !== index) {
      this.items.at(this.editingRowIndex).disable();
    }
    this.editingRowIndex = index;
    const ctrl = this.items.at(index);
    ctrl.enable();
    ctrl.get('fournisseur')?.disable();
    ctrl.get('prixUnitaire')?.disable();
  }

  cancelEditRow(): void {
    if (this.editingRowIndex !== null) {
      const productId = this.getProductId();
      if (productId) this.loadFromApi(productId);
      this.editingRowIndex = null;
    }
  }

  // --- Édition pour achat ----------------------------------------------------
  editAchatRow(index: number): void {
    if (!this.isAchat) return;
    if (this.achatEditingRowIndex !== null && this.achatEditingRowIndex !== index) {
      const prevCtrl = this.items.at(this.achatEditingRowIndex);
      prevCtrl.get('fournisseur')?.disable();
      prevCtrl.get('prixUnitaire')?.disable();
    }
    this.achatEditingRowIndex = index;
    const ctrl = this.items.at(index);
    ctrl.get('fournisseur')?.enable();
    ctrl.get('prixUnitaire')?.enable();
  }

  cancelEditAchatRow(): void {
    if (this.achatEditingRowIndex !== null) {
      const productId = this.getProductId();
      if (productId) this.loadFromApi(productId);
      this.achatEditingRowIndex = null;
    }
  }

  // --- Ajout / Suppression ---------------------------------------------------
  addItem(): void {
    if (this.isIngenieur) {
      this.pushItem(null);
      this.editingRowIndex = this.items.length - 1;
      this.applyPermissions();
    }
  }

  removeItem(index: number): void {
    const g = this.items.at(index) as FormGroup;
    const backendId = g.get('_backendId')?.value;
    if (backendId) {
      this.nomService.deleteComposant(backendId).subscribe({
        next: () => {
          this.items.removeAt(index);
          if (this.editingRowIndex === index) this.editingRowIndex = null;
          if (this.achatEditingRowIndex === index) this.achatEditingRowIndex = null;
          this.showSuccess('Composant supprimé.');
          const productId = this.getProductId();
          if (productId) this.loadFromApi(productId);
        },
        error: (err) => {
          console.error('Erreur suppression', err);
          this.errorMsg = "Erreur lors de la suppression côté serveur.";
        }
      });
    } else {
      this.items.removeAt(index);
      if (this.editingRowIndex === index) this.editingRowIndex = null;
      if (this.achatEditingRowIndex === index) this.achatEditingRowIndex = null;
    }
  }

  onImageUpload(event: any, index: number): void {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.items.at(index).get('imgUrl')?.setValue(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  calculateTotal(): number {
    return this.items.getRawValue().reduce(
      (acc, curr) => acc + (Number(curr.quantite) * Number(curr.prixUnitaire) || 0), 0
    );
  }

  // --- Popup fournisseur -----------------------------------------------------
  loadFournisseurs(): void {
    this.nomService.getAllFournisseurs().subscribe({
      next: (data) => {
        this.fournisseursList = data.map((item: any) => ({
          id: item.id ?? item.Id,
          nomSociete: item.NomSociete,
          nomContact: item.NomContact,
          prenomContact: item.PrenomContact,
          email: item.Email,
          telephone: item.Telephone,
          adresse: item.Adresse,
          typeProduit: item.TypeProduit
        }));
        this.filteredFournisseurs = [...this.fournisseursList];
      },
      error: (err) => console.error('Erreur chargement fournisseurs', err)
    });
  }

  filterFournisseurs(): void {
    const term = this.fournisseurSearchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredFournisseurs = [...this.fournisseursList];
    } else {
      this.filteredFournisseurs = this.fournisseursList.filter(f =>
        f.nomSociete.toLowerCase().includes(term) ||
        f.nomContact.toLowerCase().includes(term) ||
        f.prenomContact.toLowerCase().includes(term) ||
        f.email.toLowerCase().includes(term)
      );
    }
  }

  openFournisseurPopup(index: number): void {
    if (!this.isAchat) return;
    this.currentFournisseurIndex = index;
    if (this.fournisseursList.length === 0) {
      this.loadFournisseurs();
    } else {
      this.filteredFournisseurs = [...this.fournisseursList];
      this.fournisseurSearchTerm = '';
    }
    this.showFournisseurModal = true;
  }

  selectFournisseur(fournisseur: Fournisseur): void {
    if (this.currentFournisseurIndex !== null) {
      const control = this.items.at(this.currentFournisseurIndex).get('fournisseur');
      control?.setValue(fournisseur.nomSociete);
    }
    this.closeFournisseurModal();
  }

  closeFournisseurModal(): void {
    this.showFournisseurModal = false;
    this.currentFournisseurIndex = null;
    this.fournisseurSearchTerm = '';
  }

  // --- Sauvegardes -----------------------------------------------------------
  saveIngenieur(): void {
    const productId = this.getProductId();
    if (!productId) { this.errorMsg = "Produit non identifié."; return; }
    if (!this.nomForm.valid) return;

    this.isSaving = true;
    this.errorMsg = '';
    const rv = this.nomForm.getRawValue();
    const techniquePayload: TechniquePayload = {
      MatieresPrincipales:   rv.compositionDetaillee   ?? '',
      Composition:           rv.compositionDetaillee   ?? '',
      ProcedesFab:           rv.procederFabrication    ?? '',
      TechniquesSpecifiques: rv.techniquesSpecifiques  ?? '',
      TolerancesDim:         rv.tolerancesDim          ?? '',
      TestsRequis:           rv.testsRequis            ?? ''
    };

    if (!this.nomenclatureId) {
      this.nomService.initialiser(productId, techniquePayload).subscribe({
        next: (created) => {
          this.nomenclatureId = created?.id ?? created?.Id;
          this.saveComposantsTechnique(rv.items, productId);
        },
        error: (e) => {
          this.isSaving = false;
          this.errorMsg = "Erreur lors de l'initialisation.";
          console.error(e);
        }
      });
    } else {
      this.nomService.updateTechnique(productId, techniquePayload).pipe(
        finalize(() => this.saveComposantsTechnique(rv.items, productId))
      ).subscribe({
        error: (e) => { this.errorMsg = 'Erreur technique.'; console.error(e); }
      });
    }
  }

  private saveComposantsTechnique(itemsRaw: any[], productId: number): void {
    if (!this.nomenclatureId || itemsRaw.length === 0) {
      this.finalizeIngenieur(productId);
      return;
    }
    const calls = itemsRaw.map(item => {
      const techPayload: ComposantPayload = {
        Designation: item.designation ?? '',
        Reference:   item.reference   ?? '',
        Couleur:     item.couleur     ?? '',
        Position:    item.position    ?? '',
        Quantite:    Number(item.quantite) || 0,
        Unite:       item.unite       ?? 'pcs'
      };
      if (!item._backendId) {
        return this.nomService.addComposant(this.nomenclatureId!, techPayload);
      } else {
        return this.nomService.updateComposantTechnique(item._backendId, techPayload);
      }
    });
    forkJoin(calls).pipe(
      finalize(() => this.finalizeIngenieur(productId))
    ).subscribe({
      next: () => this.loadFromApi(productId),
      error: (e) => {
        this.errorMsg = 'Erreur lors de la sauvegarde des composants.';
        console.error(e);
      }
    });
  }

  private finalizeIngenieur(productId: number): void {
    this.isSaving = false;
    this.editingRowIndex = null;
    this.showSuccess('Nomenclature enregistrée.');
    this.onSave.emit(this.nomForm.getRawValue());
    this.loadFromApi(productId);
  }

  saveAchat(): void {
    const productId = this.getProductId();
    if (!productId) { this.errorMsg = "Produit non identifié."; return; }

    this.isSaving = true;
    this.errorMsg = '';
    const itemsRaw = this.nomForm.getRawValue().items as any[];
    const itemsToSave = itemsRaw.filter(item => !!item._backendId);
    if (itemsToSave.length === 0) {
      this.isSaving = false;
      this.showSuccess("Aucun composant à mettre à jour.");
      return;
    }
    const calls = itemsToSave.map((item: any) => {
      const achatPayload: AchatPayload = {
        NomFournisseur: item.fournisseur ?? '',
        PrixUnitaire:   Number(item.prixUnitaire) || 0,
        Remplacement:   item.articleRemplacement ?? ''
      };
      return this.nomService.updateComposantAchat(item._backendId, achatPayload);
    });
    forkJoin(calls).pipe(
      finalize(() => { this.isSaving = false; })
    ).subscribe({
      next: () => {
        this.achatEditingRowIndex = null;
        this.showSuccess('Données achat enregistrées.');
        this.onSave.emit(this.nomForm.getRawValue());
        this.loadFromApi(productId!);
      },
      error: (e) => {
        this.errorMsg = 'Erreur lors de la sauvegarde achat.';
        console.error(e);
      }
    });
  }

  private showSuccess(msg: string): void {
    this.successMsg = msg;
    setTimeout(() => (this.successMsg = ''), 3500);
  }
}