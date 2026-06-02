// nomenclature-view.component.ts
import { environment } from '../../../../environments/environment';
import {
  Component, OnChanges, Input, Output, EventEmitter,
  SimpleChanges, ChangeDetectorRef
} from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { forkJoin, concat } from 'rxjs';
import { switchMap, finalize, toArray } from 'rxjs/operators';
import { NomenclatureService } from '@app/core/services/nomenclature.service';
import {
  TechniquePayload,
  ComposantPayload,
  AchatPayload,
  QuantitePayload
} from '@app/core/models/nomenclature.model';
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

  isLoading  = false;
  isSaving   = false;
  isEditMode = false;
  errorMsg   = '';
  successMsg = '';
  nomenclatureId: number | null = null;

  editingRowIndex: number | null = null;
  achatEditingRowIndex: number | null = null;

  // ── Fournisseur modal ──────────────────────────────────────────────────────
  showFournisseurModal     = false;
  fournisseursList: Fournisseur[] = [];
  currentFournisseurIndex: number | null = null;
  fournisseurSearchTerm   = '';
  filteredFournisseurs: Fournisseur[] = [];

  // ── Composant picker modal ─────────────────────────────────────────────────
  showComposantModal        = false;
  composantsCatalogue: any[] = [];
  filteredComposants: any[]  = [];
  composantSearchTerm        = '';
  isLoadingComposants        = false;

  // ── Images temporaires ────────────────────────────────────────────────────
  tempImageFiles: { [index: number]: File } = {};

  // ── Champs catalogue (verrouillés après sélection) ────────────────────────
  readonly CATALOGUE_FIELDS = [
    'designation', 'reference', 'taille', 'couleur',
    'position', 'unite', 'imgUrl'
  ];
  readonly EDITABLE_FIELDS = ['quantite', 'articleRemplacement'];

  get isIngenieur(): boolean {
    return (this.userRole ?? '').toLowerCase() === 'ingenieurtextile';
  }
  get isAchat(): boolean {
    return (this.userRole ?? '').toLowerCase() === 'responsableachat';
  }

  constructor(
    private fb: FormBuilder,
    private nomService: NomenclatureService,
    private cdr: ChangeDetectorRef
  ) {
    this.buildForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product'] && this.product) {
      const prevId = changes['product'].previousValue?.idProduct
                  ?? changes['product'].previousValue?.id;
      const currId = this.getProductId();
      if (currId && currId !== prevId) {
        this.isEditMode = false;
        this.loadFromApi(currId);
      }
    }
    if (changes['userRole'] && this.nomForm) {
      this.applyPermissions();
    }
    if (changes['isLocked'] && this.isLocked) {
      this.isEditMode = false;
      this.editingRowIndex = null;
      this.achatEditingRowIndex = null;
      if (this.nomForm) { this.applyPermissions(); }
    }
  }

  private getProductId(): number | null {
    return this.product?.idProduct ?? this.product?.id ?? null;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // FORM
  // ────────────────────────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────────────────────
  // LOAD
  // ────────────────────────────────────────────────────────────────────────────
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

  patchFromApi(data: any): void {
    this.nomenclatureId = data.Id ?? data.id;
    console.log('nomenclatureId chargé =', this.nomenclatureId, '| data =', data);

    this.nomForm.enable();
    this.nomForm.patchValue({
      designationProduit:    this.product?.designation ?? '',
      reference:             this.product?.reference   ?? '',
      compositionDetaillee:  data.MatieresPrincipales        ?? data.composition        ?? '',
      tolerancesDim:         data.TolerancesDim              ?? data.tolerancesDim       ?? '',
      testsRequis:           data.TestsRequis                ?? data.testsRequis         ?? '',
      procederFabrication:   data.ProcedesFab                ?? data.procedesFab         ?? '',
      techniquesSpecifiques: data.TechniquesSpecifiques      ?? data.techniquesSpecifiques ?? ''
    });

    while (this.items.length !== 0) {
      this.items.removeAt(0);
    }

    const composants: any[] = data.Composants ?? data.composants ?? [];
    composants.forEach((c: any) => {
      c._linked = true;
      this.pushItem(this.resolveComposantImage(c));
    });

    this.applyPermissions();
    this.cdr.detectChanges();
  }

  initCreationMode(): void {
    this.nomenclatureId = null;
    this.isEditMode     = !this.isLocked;
    this.nomForm.enable();
    this.nomForm.patchValue({
      designationProduit: this.product?.designation ?? '',
      reference:          this.product?.reference   ?? ''
    });

    while (this.items.length !== 0) {
      this.items.removeAt(0);
    }

    this.applyPermissions();
    this.cdr.detectChanges();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // MODE ÉDITION
  // ────────────────────────────────────────────────────────────────────────────
  enterEditMode(): void {
    if (this.isLocked) return;
    this.isEditMode = true;
    this.applyPermissions();
  }

  exitEditMode(): void {
    this.isEditMode           = false;
    this.editingRowIndex      = null;
    this.achatEditingRowIndex = null;
    const productId = this.getProductId();
    if (productId) this.loadFromApi(productId);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PERMISSIONS
  // ────────────────────────────────────────────────────────────────────────────
  applyPermissions(): void {
    if (this.isIngenieur) {
      if (this.isEditMode) {
        this.nomForm.enable();
        this.nomForm.get('designationProduit')?.disable();
        this.nomForm.get('reference')?.disable();
      } else {
        this.nomForm.disable();
      }

      this.items.controls.forEach((ctrl, idx) => {
        if (!this.isEditMode) {
          ctrl.disable();
        } else if (this.editingRowIndex === idx) {
          ctrl.enable();
          ctrl.get('fournisseur')?.disable();
          ctrl.get('prixUnitaire')?.disable();
          ctrl.get('coutTotal')?.disable();
          const hasBackendId  = !!ctrl.get('_backendId')?.value;
          const fromCatalogue = !!ctrl.get('_fromCatalogue')?.value;
          if (hasBackendId || fromCatalogue) {
            this.CATALOGUE_FIELDS.forEach(f => ctrl.get(f)?.disable());
          }
        } else {
          ctrl.disable();
        }
      });

      return;
    }

    if (this.isAchat) {
      ['compositionDetaillee', 'tolerancesDim', 'testsRequis',
       'procederFabrication', 'techniquesSpecifiques',
       'designationProduit', 'reference'].forEach(f =>
        this.nomForm.get(f)?.disable()
      );

      this.items.controls.forEach((ctrl, idx) => {
        const isEditing = this.isEditMode && this.achatEditingRowIndex === idx;
        ctrl.get('fournisseur')?.[isEditing ? 'enable' : 'disable']();
        ctrl.get('prixUnitaire')?.[isEditing ? 'enable' : 'disable']();
        ['designation', 'reference', 'taille', 'couleur', 'position',
         'quantite', 'unite', 'articleRemplacement', 'imgUrl', '_backendId', 'coutTotal']
          .forEach(f => ctrl.get(f)?.disable());
      });
      return;
    }

    this.nomForm.disable();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PUSH ITEM
  // ────────────────────────────────────────────────────────────────────────────
  pushItem(data: any): void {
    const g = this.fb.group({
      _backendId:          [data?.id          ?? data?.Id          ?? null],
      _fromCatalogue:      [!!data],
      _linked:             [data?._linked ?? false],
      imgUrl:              [data?.Image        ?? data?.image        ?? data?.imgUrl ?? ''],
      designation:         [data?.Designation  ?? data?.designation  ?? '', Validators.required],
      reference:           [data?.Reference    ?? data?.reference    ?? ''],
      taille:              [data?.Taille       ?? data?.taille       ?? ''],
      couleur:             [data?.Couleur      ?? data?.couleur      ?? ''],
      position:            [data?.Position     ?? data?.position     ?? ''],
      quantite:            [data?.Quantite     ?? data?.quantite     ?? 1,
                            [Validators.required, Validators.min(0.001)]],
      unite:               [data?.Unite        ?? data?.unite        ?? 'pcs'],
      fournisseur:         [data?.NomFournisseur ?? data?.nomFournisseur ?? ''],
      articleRemplacement: [data?.Remplacement  ?? data?.remplacement  ?? ''],
      prixUnitaire:        [data?.PrixUnitaire  ?? data?.prixUnitaire  ?? 0],
      coutTotal:           [data?.CoutTotal     ?? data?.coutTotal     ?? 0]
    });
    this.items.push(g);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // IMAGE RESOLVE
  // ────────────────────────────────────────────────────────────────────────────
  private resolveComposantImage(c: any): any {
    const img = c.Image ?? c.image ?? null;
    if (img && !img.startsWith('http') && !img.startsWith('data:')) {
      c.Image = `${environment.baseUrl}${img}`;
      c.image = c.Image;
    }
    return c;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // COMPOSANT PICKER
  // ────────────────────────────────────────────────────────────────────────────
  addItem(): void {
    if (!this.isIngenieur) return;
    this.openComposantPicker();
  }

  openComposantPicker(): void {
    this.showComposantModal  = true;
    this.composantSearchTerm = '';
    this.filteredComposants  = [...this.composantsCatalogue];
    if (this.composantsCatalogue.length === 0) {
      this.loadComposantsCatalogue();
    }
  }

  closeComposantModal(): void {
    this.showComposantModal  = false;
    this.composantSearchTerm = '';
  }

  loadComposantsCatalogue(): void {
    this.isLoadingComposants = true;
    this.nomService.getAllComposants().pipe(
      finalize(() => (this.isLoadingComposants = false))
    ).subscribe({
      next: (list: any[]) => {
        this.composantsCatalogue = list.map((c: any) => this.resolveComposantImage(c));
        this.filteredComposants  = [...this.composantsCatalogue];
      },
      error: (err) => {
        console.error('Erreur chargement catalogue composants', err);
        this.errorMsg = 'Impossible de charger le catalogue des composants.';
      }
    });
  }

  filterComposants(): void {
    const term = this.composantSearchTerm.toLowerCase().trim();
    this.filteredComposants = term
      ? this.composantsCatalogue.filter(c =>
          (c.Designation ?? c.designation ?? '').toLowerCase().includes(term) ||
          (c.Reference   ?? c.reference   ?? '').toLowerCase().includes(term) ||
          (c.Couleur     ?? c.couleur     ?? '').toLowerCase().includes(term)
        )
      : [...this.composantsCatalogue];
  }

  selectComposantFromCatalogue(composant: any): void {
    const newItemData = {
      id:             composant.id          ?? composant.Id          ?? null,
      _fromCatalogue: true,
      _linked:        false,
      Image:          composant.Image       ?? composant.image       ?? composant.imgUrl ?? '',
      Designation:    composant.Designation ?? composant.designation ?? '',
      Reference:      composant.Reference   ?? composant.reference   ?? '',
      Taille:         composant.Taille      ?? composant.taille      ?? '',
      Couleur:        composant.Couleur     ?? composant.couleur     ?? '',
      Position:       composant.Position    ?? composant.position    ?? '',
      Quantite:       1,
      Unite:          composant.Unite       ?? composant.unite       ?? 'pcs',
      NomFournisseur: '',
      Remplacement:   '',
      PrixUnitaire:   composant.PrixUnitaire ?? composant.prixUnitaire ?? 0
    };

    this.pushItem(newItemData);
    const newIndex = this.items.length - 1;
    this.editingRowIndex = newIndex;

    const ctrl = this.items.at(newIndex);
    ctrl.enable();
    this.CATALOGUE_FIELDS.forEach(f => ctrl.get(f)?.disable());
    ctrl.get('fournisseur')?.disable();
    ctrl.get('prixUnitaire')?.disable();
    ctrl.get('coutTotal')?.disable();

    this.closeComposantModal();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // EDIT ROW — INGÉNIEUR
  // ────────────────────────────────────────────────────────────────────────────
  editRow(index: number): void {
    if (!this.isIngenieur || !this.isEditMode) return;
    if (this.editingRowIndex !== null && this.editingRowIndex !== index) {
      this.items.at(this.editingRowIndex).disable();
    }
    this.editingRowIndex = index;
    const ctrl = this.items.at(index);
    ctrl.enable();
    ctrl.get('fournisseur')?.disable();
    ctrl.get('prixUnitaire')?.disable();
    ctrl.get('coutTotal')?.disable();
    const hasBackendId  = !!ctrl.get('_backendId')?.value;
    const fromCatalogue = !!ctrl.get('_fromCatalogue')?.value;
    if (hasBackendId || fromCatalogue) {
      this.CATALOGUE_FIELDS.forEach(f => ctrl.get(f)?.disable());
    }
  }

  cancelEditRow(): void {
    this.editingRowIndex = null;
    this.applyPermissions();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // EDIT ROW — ACHAT
  // ────────────────────────────────────────────────────────────────────────────
  editAchatRow(index: number): void {
    if (!this.isAchat || !this.isEditMode) return;
    if (this.achatEditingRowIndex !== null && this.achatEditingRowIndex !== index) {
      const prev = this.items.at(this.achatEditingRowIndex);
      prev.get('fournisseur')?.disable();
      prev.get('prixUnitaire')?.disable();
    }
    this.achatEditingRowIndex = index;
    const ctrl = this.items.at(index);
    ctrl.get('fournisseur')?.enable();
    ctrl.get('prixUnitaire')?.enable();
  }

  cancelEditAchatRow(): void {
    this.achatEditingRowIndex = null;
    this.applyPermissions();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // REMOVE
  // ────────────────────────────────────────────────────────────────────────────
  removeItem(index: number): void {
    const g = this.items.at(index) as FormGroup;
    const composantId = g.get('_backendId')?.value;

    if (composantId && this.nomenclatureId) {
      // Utilise le nouvel endpoint qui retire le composant de la nomenclature
      // sans toucher au catalogue global des composants.
      this.nomService.retirerComposant(this.nomenclatureId, composantId).subscribe({
        next: () => {
          this.items.removeAt(index);
          if (this.editingRowIndex === index)      this.editingRowIndex = null;
          if (this.achatEditingRowIndex === index) this.achatEditingRowIndex = null;
          this.showSuccess('Composant retiré de la nomenclature.');
          const productId = this.getProductId();
          if (productId) this.loadFromApi(productId);
        },
        error: (err) => {
          console.error('Erreur retrait composant', err);
          this.errorMsg = 'Erreur lors du retrait du composant.';
        }
      });
    } else {
      // Composant jamais sauvegardé côté serveur : suppression locale uniquement
      this.items.removeAt(index);
      if (this.editingRowIndex === index)      this.editingRowIndex = null;
      if (this.achatEditingRowIndex === index) this.achatEditingRowIndex = null;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // IMAGE UPLOAD
  // ────────────────────────────────────────────────────────────────────────────
  onImageUpload(event: any, index: number): void {
    const file = event.target.files[0];
    if (!file) return;
    this.tempImageFiles[index] = file;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.items.at(index).get('imgUrl')?.setValue(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CALCUL TOTAL BOM
  // ────────────────────────────────────────────────────────────────────────────
  calculateTotal(): number {
    return this.items.getRawValue().reduce(
      (acc, curr) => acc + (Number(curr.quantite) * Number(curr.prixUnitaire) || 0), 0
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // FOURNISSEURS
  // ────────────────────────────────────────────────────────────────────────────
  loadFournisseurs(): void {
    this.nomService.getAllFournisseurs().subscribe({
      next: (data) => {
        this.fournisseursList = data.map((item: any) => ({
          id:            item.id            ?? item.Id,
          nomSociete:    item.NomSociete    ?? item.nomSociete,
          nomContact:    item.NomContact    ?? item.nomContact,
          prenomContact: item.PrenomContact ?? item.prenomContact,
          email:         item.Email         ?? item.email,
          telephone:     item.Telephone     ?? item.telephone,
          adresse:       item.Adresse       ?? item.adresse,
          typeProduit:   item.TypeProduit   ?? item.typeProduit
        }));
        this.filteredFournisseurs = [...this.fournisseursList];
      },
      error: (err) => console.error('Erreur chargement fournisseurs', err)
    });
  }

  filterFournisseurs(): void {
    const term = this.fournisseurSearchTerm.toLowerCase().trim();
    this.filteredFournisseurs = term
      ? this.fournisseursList.filter(f =>
          (f.nomSociete    ?? '').toLowerCase().includes(term) ||
          (f.nomContact    ?? '').toLowerCase().includes(term) ||
          (f.prenomContact ?? '').toLowerCase().includes(term) ||
          (f.email         ?? '').toLowerCase().includes(term)
        )
      : [...this.fournisseursList];
  }

  openFournisseurPopup(index: number): void {
    if (!this.isAchat) return;
    this.currentFournisseurIndex = index;
    if (this.fournisseursList.length === 0) {
      this.loadFournisseurs();
    } else {
      this.filteredFournisseurs  = [...this.fournisseursList];
      this.fournisseurSearchTerm = '';
    }
    this.showFournisseurModal = true;
  }

  selectFournisseur(fournisseur: Fournisseur): void {
    if (this.currentFournisseurIndex !== null) {
      this.items.at(this.currentFournisseurIndex)
                .get('fournisseur')?.setValue(fournisseur.nomSociete);
    }
    this.closeFournisseurModal();
  }

  closeFournisseurModal(): void {
    this.showFournisseurModal    = false;
    this.currentFournisseurIndex = null;
    this.fournisseurSearchTerm   = '';
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SAUVEGARDE INGÉNIEUR
  // ────────────────────────────────────────────────────────────────────────────
  saveIngenieur(): void {
    const productId = this.getProductId();
    if (!productId) { this.errorMsg = 'Produit non identifié.'; return; }

    this.isSaving = true;
    this.errorMsg = '';

    const rv = this.nomForm.getRawValue();

    const techniquePayload: TechniquePayload = {
      MatieresPrincipales:   rv.compositionDetaillee  || null,
      Composition:           rv.compositionDetaillee  || null,
      ProcedesFab:           rv.procederFabrication   || null,
      TechniquesSpecifiques: rv.techniquesSpecifiques || null,
      TolerancesDim:         rv.tolerancesDim         || null,
      TestsRequis:           rv.testsRequis           || null
    };

    if (!this.nomenclatureId) {
      this.nomService.initialiser(productId, techniquePayload).subscribe({
        next: (created) => {
          this.nomenclatureId = created?.Id ?? created?.id;
          console.log('nomenclatureId après création =', this.nomenclatureId);
          this.saveComposantsTechnique(rv.items, productId);
        },
        error: (e) => {
          this.isSaving = false;
          this.errorMsg = "Erreur lors de l'initialisation.";
          console.error(e);
        }
      });
    } else {
      this.nomService.updateTechnique(this.nomenclatureId, techniquePayload).subscribe({
        next: (updated) => {
          this.nomenclatureId = updated?.Id ?? updated?.id ?? this.nomenclatureId;
          console.log('nomenclatureId après update =', this.nomenclatureId);
          this.saveComposantsTechnique(rv.items, productId);
        },
        error: (e) => {
          this.isSaving = false;
          this.errorMsg = 'Erreur lors de la mise à jour technique.';
          console.error(e);
        }
      });
    }
  }

  private saveComposantsTechnique(itemsRaw: any[], productId: number): void {
    console.log('saveComposantsTechnique — nomenclatureId =', this.nomenclatureId);

    if (!this.nomenclatureId || itemsRaw.length === 0) {
      this.finalizeIngenieur(productId);
      return;
    }

    const nomId = this.nomenclatureId;

    const calls = itemsRaw.map((item, idx) => {
      const imageFile   = this.tempImageFiles[idx] ?? null;
      const capturedIdx = idx;

      if (item._backendId && item._fromCatalogue && !item._linked) {
        console.log(`[CAS 1] lierComposant — composantId=${item._backendId}, qte=${item.quantite}`);
        return this.nomService.lierComposant(
          nomId,
          item._backendId,
          Number(item.quantite) || 1,
          item.designation ?? ''
        );
      }

      if (item._backendId && item._linked) {
        console.log(`[CAS 3] updateComposantTechnique + patchQuantite — composantId=${item._backendId}`);
        const cataloguePayload: ComposantPayload = {
          Designation:  item.designation         ?? '',
          Reference:    item.reference           ?? '',
          Couleur:      item.couleur             ?? '',
          Position:     item.position            ?? '',
          Unite:        item.unite               ?? 'pcs',
          Remplacement: item.articleRemplacement ?? ''
        };
        const quantitePayload: QuantitePayload = {
          NomComposant: item.designation ?? '',
          Quantite:     Number(item.quantite) || 1
        };
        return this.nomService
          .updateComposantTechnique(item._backendId, cataloguePayload, imageFile ?? undefined)
          .pipe(
            switchMap(() => this.nomService.patchQuantite(nomId, item._backendId, quantitePayload))
          );
      }

      console.log(`[CAS 2] addComposant + lierComposant — designation=${item.designation}`);
      const newPayload: ComposantPayload = {
        Designation:  item.designation         ?? '',
        Reference:    item.reference           ?? '',
        Couleur:      item.couleur             ?? '',
        Position:     item.position            ?? '',
        Unite:        item.unite               ?? 'pcs',
        Remplacement: item.articleRemplacement ?? ''
      };

      return this.nomService.addComposant(newPayload, imageFile ?? undefined).pipe(
        switchMap((created: any) => {
          const backendId: number = created?.Id ?? created?.id ?? null;
          const ctrl = this.items.at(capturedIdx);
          if (ctrl && backendId) {
            ctrl.get('_backendId')?.setValue(backendId);
            ctrl.get('_fromCatalogue')?.setValue(false);
            ctrl.get('_linked')?.setValue(true);
          }
          return this.nomService.lierComposant(
            nomId,
            backendId,
            Number(item.quantite) || 1,
            item.designation ?? ''
          );
        })
      );
    });

    concat(...calls).pipe(toArray()).subscribe({
      next: () => {
        this.tempImageFiles = {};
        this.finalizeIngenieur(productId);
      },
      error: (e) => {
        this.isSaving = false;
        this.errorMsg = 'Erreur lors de la sauvegarde des composants.';
        console.error('saveComposantsTechnique error:', e);
      }
    });
  }

  private finalizeIngenieur(productId: number): void {
    this.isSaving        = false;
    this.editingRowIndex = null;
    this.isEditMode      = false;
    this.tempImageFiles  = {};

    while (this.items.length !== 0) {
      this.items.removeAt(0);
    }
    this.cdr.detectChanges();

    this.showSuccess('Nomenclature enregistrée.');
    this.onSave.emit(this.nomForm.getRawValue());

    setTimeout(() => this.loadFromApi(productId), 400);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SAUVEGARDE ACHAT
  // ────────────────────────────────────────────────────────────────────────────
  saveAchat(): void {
    const productId = this.getProductId();
    if (!productId) { this.errorMsg = 'Produit non identifié.'; return; }

    this.isSaving = true;
    this.errorMsg = '';

    const itemsRaw    = this.nomForm.getRawValue().items as any[];
    const itemsToSave = itemsRaw.filter(item => !!item._backendId);

    if (itemsToSave.length === 0) {
      this.isSaving = false;
      this.showSuccess('Aucun composant à mettre à jour.');
      return;
    }

    const calls = itemsToSave.map((item: any) => {
      const achatPayload: AchatPayload = {
        NomFournisseur: item.fournisseur          || undefined,
        PrixUnitaire:   Number(item.prixUnitaire) || 0
      };
      return this.nomService.updateComposantAchat(item._backendId, achatPayload);
    });

    forkJoin(calls).pipe(
      finalize(() => { this.isSaving = false; })
    ).subscribe({
      next: () => {
        this.achatEditingRowIndex = null;
        this.isEditMode           = false;
        this.showSuccess('Données achat enregistrées.');
        this.onSave.emit(this.nomForm.getRawValue());
        this.loadFromApi(productId);
      },
      error: (e) => {
        this.errorMsg = 'Erreur lors de la sauvegarde achat.';
        console.error(e);
      }
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // UTILS
  // ────────────────────────────────────────────────────────────────────────────
  private showSuccess(msg: string): void {
    this.successMsg = msg;
    setTimeout(() => (this.successMsg = ''), 3500);
  }
}