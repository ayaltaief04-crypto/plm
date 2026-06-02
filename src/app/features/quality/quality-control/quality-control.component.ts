import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { QualiteService } from '@app/core/services/qualite.service';
import { QualitePayload } from '@app/core/models/quality.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-quality-control',
  templateUrl: './quality-control.component.html',
  styleUrls: ['./quality-control.component.scss']
})
export class QualityControlComponent implements OnInit, OnChanges {
  @Input() product: any = null;
  @Input() isLocked: boolean = true;
  @Input() readOnly: boolean = false;

  qualiteForm!: FormGroup;
  isEditing = false;
  isSaving = false;
  isLoading = false;
  saveSuccess = false;
  saveError = '';
  hasData = false;
  userRole: string = '';

  constructor(
    private fb: FormBuilder,
    private qualiteService: QualiteService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRole();
    this.buildForm();
    this.loadFromBackend();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product'] && !changes['product'].firstChange) {
      const prevId = changes['product'].previousValue?.idProduct ?? changes['product'].previousValue?.id;
      const currId = this.product?.idProduct ?? this.product?.id;
      if (currId && currId !== prevId) {
        this.loadFromBackend();
      }
    }
    if (this.qualiteForm) {
      this.syncLockState();
    }
  }

  get canEdit(): boolean {
    return this.userRole === 'ResponsableQualite' || this.userRole === 'Admin';
  }

  get isReadOnly(): boolean {
    return this.readOnly || !this.canEdit;
  }

  // ✅ Le bouton est actif seulement si le formulaire est valide ET non en cours de sauvegarde
  get canSubmit(): boolean {
    return this.qualiteForm?.valid && !this.isSaving;
  }

  private buildForm(): void {
    this.qualiteForm = this.fb.group({
      matierePremiere: this.fb.group({
        qualiteTissu: ['', Validators.required],
        poidsEstime: [null, [Validators.min(0)]],
        resistanceTraction: [null, [Validators.min(0)]],
        elasticite: [null, [Validators.min(0)]],
        soliditeCouleurs: [null, [Validators.min(1), Validators.max(5)]],
        stabiliteDimensionnelle: [null, [Validators.min(0)]],
        degorgement: [null, [Validators.min(0)]],
        boulochage: [null, [Validators.min(1), Validators.max(5)]]
      }),
      montage: this.fb.group({
        typeCoutures: [null],
        compatibiliteFil: [null]
      }),
      securiteRse: this.fb.group({
        certifications: [null],
        inflammabilite: [false],
        securiteEnfant: [false],
        reparabilite: [null, [Validators.min(1), Validators.max(10)]],
        cycleVie: [null, [Validators.min(0)]]
      }),
      accessoires: this.fb.group({
        fermeturesZip: [null],
        boutons: [null],
        respectNormesIso: [null]
      })
    });
    this.syncLockState();
  }

  private syncLockState(): void {
    if (!this.qualiteForm) return;
    const shouldDisable = this.isReadOnly || !this.isEditing;
    if (shouldDisable) {
      this.qualiteForm.disable({ emitEvent: false });
    } else {
      this.qualiteForm.enable({ emitEvent: false });
    }
  }

  private getProductId(): number | null {
    return this.product?.idProduct ?? this.product?.id ?? null;
  }

  private toIntOrZero(v: any): number {
    if (v === null || v === undefined || String(v).trim() === '') return 0;
    const n = Math.round(parseFloat(String(v).replace(',', '.')));
    return isNaN(n) ? 0 : n;
  }

  // ✅ Patch robuste : accepte indifféremment camelCase ou PascalCase
  private patchFromApi(data: any): void {
    if (!data) return;
    this.qualiteForm.patchValue({
      matierePremiere: {
        qualiteTissu: data.qualiteTissu ?? data.QualiteTissu ?? '',
        poidsEstime: data.poidsEstime ?? data.PoidsEstime ?? null,
        resistanceTraction: data.resistanceTraction ?? data.ResistanceTraction ?? null,
        elasticite: data.elasticite ?? data.Elasticite ?? null,
        soliditeCouleurs: data.soliditeCouleurs ?? data.SoliditeCouleurs ?? null,
        stabiliteDimensionnelle: data.stabiliteDimensionnelle ?? data.StabiliteDimensionnelle ?? null,
        degorgement: data.degorgement ?? data.Degorgement ?? null,
        boulochage: data.boulochage ?? data.Boulochage ?? null,
      },
      montage: {
        typeCoutures: data.typeCoutures ?? data.TypeCoutures ?? null,
        compatibiliteFil: data.compatibiliteFil ?? data.CompatibiliteFil ?? null,
      },
      securiteRse: {
        certifications: data.certifications ?? data.CertificationsRequises ?? null,
        inflammabilite: data.inflammabilite ?? data.Inflammabilite ?? false,
        securiteEnfant: data.securiteEnfant === 'Validé' || data.SecuriteEnfant === 'Validé',
        reparabilite: data.reparabilite ?? data.Reparabilite ?? null,
        cycleVie: data.cycleVie ?? data.CycleDeVie ?? null,
      },
      accessoires: {
        fermeturesZip: data.fermeturesZip ?? data.FermeturesZips ?? null,
        boutons: data.boutons ?? data.Boutons ?? null,
        respectNormesIso: data.respectNormesIso ?? data.RespectNormesISO ?? null,
      }
    });
  }

  loadFromBackend(): void {
    const id = this.getProductId();
    if (!id) return;

    this.isLoading = true;
    this.qualiteService.getQualite(id).subscribe({
      next: (data) => {
        this.isLoading = false;
        if (data && Object.keys(data).length > 0) {
          this.hasData = true;
          this.patchFromApi(data);
        } else {
          this.hasData = false;
        }
        this.syncLockState();
      },
      error: () => {
        this.isLoading = false;
        this.hasData = false;
        this.syncLockState();
      }
    });
  }

  activerEdition(): void {
    this.isEditing = true;
    this.saveSuccess = false;
    this.saveError = '';
    this.qualiteForm.enable({ emitEvent: false });
  }

  annuler(): void {
    this.isEditing = false;
    this.loadFromBackend();
  }

  onSubmit(): void {
    // ✅ Vérifier l'ID produit
    const id = this.getProductId();
    if (!id) {
      this.saveError = "Produit non identifié.";
      return;
    }

    // ✅ Vérifier la validité du formulaire
    if (this.qualiteForm.invalid) {
      this.qualiteForm.markAllAsTouched();
      this.saveError = "Veuillez corriger les erreurs dans le formulaire.";
      return;
    }

    this.isSaving = true;
    const raw = this.qualiteForm.getRawValue();

    // Construction du payload (PascalCase pour le backend .NET)
    const payload: QualitePayload = {
      QualiteTissu: raw.matierePremiere.qualiteTissu || null,
      PoidsEstime: this.toIntOrZero(raw.matierePremiere.poidsEstime),
      ResistanceTraction: this.toIntOrZero(raw.matierePremiere.resistanceTraction),
      Elasticite: this.toIntOrZero(raw.matierePremiere.elasticite),
      SoliditeCouleurs: this.toIntOrZero(raw.matierePremiere.soliditeCouleurs),
      StabiliteDimensionnelle: this.toIntOrZero(raw.matierePremiere.stabiliteDimensionnelle),
      Degorgement: this.toIntOrZero(raw.matierePremiere.degorgement),
      Boulochage: this.toIntOrZero(raw.matierePremiere.boulochage),
      TypeCoutures: raw.montage.typeCoutures || null,
      CompatibiliteFil: raw.montage.compatibiliteFil || null,
      CertificationsRequises: raw.securiteRse.certifications || null,
      Inflammabilite: !!raw.securiteRse.inflammabilite,
      SecuriteEnfant: raw.securiteRse.securiteEnfant ? 'Validé' : 'Non Validé',
      Reparabilite: this.toIntOrZero(raw.securiteRse.reparabilite),
      CycleDeVie: this.toIntOrZero(raw.securiteRse.cycleVie),
      FermeturesZips: raw.accessoires.fermeturesZip || null,
      Boutons: raw.accessoires.boutons || null,
      RespectNormesISO: raw.accessoires.respectNormesIso || null
    };

    this.qualiteService.saveQualite(id, payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.saveSuccess = true;
        this.isEditing = false;
        this.loadFromBackend();
      },
      error: () => {
        this.isSaving = false;
        this.saveError = "Erreur lors de l'enregistrement qualité.";
      }
    });
  }

  getFieldError(group: string, field: string): string {
    const control = this.qualiteForm.get(`${group}.${field}`);
    if (control?.hasError('required')) return 'Ce champ est obligatoire.';
    if (control?.hasError('min')) return `Valeur minimale : ${control.errors?.min.min}.`;
    if (control?.hasError('max')) return `Valeur maximale : ${control.errors?.max.max}.`;
    return '';
  }
}