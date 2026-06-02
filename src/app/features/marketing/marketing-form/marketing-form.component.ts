import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MarketingService } from '../../../core/services/marketing.service';
import { MarketingPayload } from '@app/core/models/marketing.model';

export const NIVEAUX_GAMME = [
  { value: 0, label: 'Entrée de gamme' },
  { value: 1, label: 'Milieu de gamme' },
  { value: 2, label: 'Premium' },
  { value: 3, label: 'Luxe' },
];

export const CANAUX_DISTRIBUTION = [
  { value: 'Boutique',    label: 'Boutique physique' },
  { value: 'E-commerce',  label: 'E-commerce' },
  { value: 'Retail',      label: 'Retail / Wholesale' },
  { value: 'Multi-canal', label: 'Multi-canal' },
];

@Component({
  selector: 'app-marketing-form',
  templateUrl: './marketing-form.component.html',
  styleUrls: ['./marketing-form.component.scss'],
})
export class MarketingFormComponent implements OnInit, OnChanges {
  @Input() product: any = null;
  @Input() isLocked: boolean = true;
  @Input() readOnly: boolean = false;

  marketingForm!: FormGroup;
  isEditing = false;
  isSaving = false;
  isLoading = false;
  saveSuccess = false;
  saveError = '';
  hasData = false;

  readonly NIVEAUX_GAMME = NIVEAUX_GAMME;
  readonly CANAUX_DISTRIBUTION = CANAUX_DISTRIBUTION;

  constructor(private fb: FormBuilder, private marketingService: MarketingService) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadFromBackend();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product'] && !changes['product'].firstChange) {
      const prevId = changes['product'].previousValue?.idProduct ?? changes['product'].previousValue?.id;
      const currId = changes['product'].currentValue?.idProduct ?? changes['product'].currentValue?.id;
      if (currId && currId !== prevId) {
        this.loadFromBackend();
      }
    }
    if (this.marketingForm) {
      this.syncLockState();
    }
  }

  get canInteract(): boolean { return !this.readOnly; }

  private buildForm(): void {
    this.marketingForm = this.fb.group({
      PublicCible: ['', Validators.required],
      TrancheAge: ['', Validators.required],
      StyleDeVie: [''],
      OccasionPortee: [''],
      NiveauGamme: [null],
      NoteAttractiviteVisuelle: [null, [Validators.min(0), Validators.max(10)]],
      PrixVenteEstime: [null, Validators.min(0)],
      PrixPsychologique: [null, Validators.min(0)],
      QuantiteEstimee: [null, Validators.min(0)],
      IndiceCompetitivite: [null, Validators.min(0)],
      MargeCible: [null, [Validators.min(0), Validators.max(100)]],
      USP_ArgumentUnique: [''],
      ReferenceBestSeller: [''],
      NomCommercial: [''],
      CanalDistribution: [''],
      ArgumentSecondeVie: [''],
      ScoreEcoConception: [''],
      Forces: [''],
      Faiblesses: [''],
      Opportunites: [''],
      Menaces: [''],
    });
    this.syncLockState();
  }

  private syncLockState(): void {
    if (!this.marketingForm) return;
    const shouldDisable = this.readOnly || (this.isLocked && !this.isEditing);
    if (shouldDisable) {
      this.marketingForm.disable({ emitEvent: false });
    } else {
      this.marketingForm.enable({ emitEvent: false });
    }
  }

  private getProductId(): number | null {
    return this.product?.idProduct ?? this.product?.id ?? null;
  }

  private patchFromApi(data: any): void {
    if (!data) return;
    const patch: any = {};
    for (const key of Object.keys(this.marketingForm.controls)) {
      const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
      patch[key] = data[key] ?? data[camelKey] ?? null;
    }
    this.marketingForm.patchValue(patch);
  }

  loadFromBackend(): void {
    const id = this.getProductId();
    if (!id) return;
    this.isLoading = true;
    this.marketingService.getMarketing(id).subscribe({
      next: (data) => {
        this.isLoading = false;
        if (data) {
          this.hasData = true;
          this.patchFromApi(data);
        }
        this.syncLockState();
      },
      error: () => {
        this.isLoading = false;
        this.syncLockState();
      }
    });
  }

  activerEdition(): void {
    this.isEditing = true;
    this.saveError = '';
    this.saveSuccess = false;
    this.marketingForm.enable({ emitEvent: false });
  }

  annuler(): void {
    this.isEditing = false;
    this.loadFromBackend();
  }

  onSubmit(): void {
    if (this.marketingForm.invalid) {
      this.marketingForm.markAllAsTouched();
      return;
    }
    const id = this.getProductId();
    if (!id) return;

    this.isSaving = true;
    this.saveError = '';
    this.saveSuccess = false;
    const raw = this.marketingForm.getRawValue();
    const payload = MarketingService.normalizePayload(raw);

    this.marketingService.saveMarketing(id, payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.saveSuccess = true;
        this.isEditing = false;
        this.loadFromBackend();
      },
      error: () => {
        this.isSaving = false;
        this.saveError = "Erreur serveur. Vérifiez les champs obligatoires.";
      }
    });
  }
}