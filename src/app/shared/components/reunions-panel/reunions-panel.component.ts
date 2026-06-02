import { Component, Input, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReunionService, Reunion } from '../../../core/services/reunion.service';
import { AuthService } from '../../../core/services/auth.service';

export const ALL_ACTEURS = [
  { value: 'tous',                 label: 'Tous les acteurs',  icon: 'groups'        },
  { value: 'ResponsableMarketing', label: 'Resp. Marketing',   icon: 'trending_up'   },
  { value: 'Ingenieurtextile',     label: 'Ingénieur Textile', icon: 'engineering'   },
  { value: 'ResponsableAchat',     label: 'Resp. Achats',      icon: 'shopping_cart' },
  { value: 'ResponsableQualite',   label: 'Resp. Qualité',     icon: 'verified_user' },
];

@Component({
  selector:    'app-reunions-panel',
  templateUrl: './reunions-panel.component.html',
  styleUrls:  ['./reunions-panel.component.scss']
})
export class ReunionsPanelComponent implements OnInit, OnDestroy {

  @Input() produitId!:  number;
  @Input() nomProduit:  string = '';
  @Input() isInProductTab: boolean = false;

  form!: FormGroup;
  saving = false;
  saved  = false;

  // Formulaire toujours visible mais disabled par défaut
  // true = champs actifs (après clic Planifier)
  enEdition = false;

  selectedDest: string[] = [];
  allActeurs = ALL_ACTEURS;

  today         = new Date();
  calYear       = this.today.getFullYear();
  calMonth      = this.today.getMonth();
  calDays:      (Date | null)[] = [];
  selectedDate: Date | null = null;

  reunions: Reunion[] = [];
  private sub?: Subscription;

  editingId: string | null = null;

  showDeleteModal     = false;
  reunionToDeleteId:  string | null = null;
  reunionToDeleteName = '';

  readonly MONTH_NAMES = [
    'Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
  ];
  readonly DAY_NAMES = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

  userRoleRaw = '';
  canSchedule = false;

  constructor(
    private fb:         FormBuilder,
    private reunionSvc: ReunionService,
    private authSvc:    AuthService,
    private cdr:        ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.userRoleRaw = (this.authSvc.getRole() || '').trim();
    this.canSchedule  = this.userRoleRaw === 'Styliste' || this.userRoleRaw === 'Admin';

    // Formulaire initialisé avec designation pré-remplie et DISABLED
    this.form = this.fb.group({
      designation: [{ value: this.nomProduit || '', disabled: true }, [Validators.required, Validators.minLength(2)]],
      sujet:       [{ value: '', disabled: true }, [Validators.required, Validators.minLength(2)]],
      date:        [{ value: '', disabled: true }, Validators.required],
      heure:       [{ value: '09:00', disabled: true }, Validators.required],
    });

    this.buildCalendar();

    this.sub = this.reunionSvc.reunions$.subscribe(() => {
      const toutes = this.reunionSvc.getReunionsPourRole(this.userRoleRaw);
      // Filtrer par produit si nomProduit disponible
      this.reunions = this.nomProduit
        ? toutes.filter(r => r.nomProduit?.toLowerCase() === this.nomProduit?.toLowerCase())
        : toutes;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  // ─── ACTIVER / DÉSACTIVER FORMULAIRE ────────────────────────
  activerEdition() {
    this.enEdition  = true;
    this.editingId  = null;
    this.form.enable();
    this.form.patchValue({ designation: this.nomProduit || '' });
    this.selectedDest  = [];
    this.selectedDate  = null;
    setTimeout(() => {
      document.querySelector('.rp-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  desactiverEdition() {
    this.enEdition  = false;
    this.editingId  = null;
    this.form.disable();
    this.form.reset({
      designation: this.nomProduit || '',
      heure:       '09:00'
    });
    this.selectedDest = [];
    this.selectedDate = null;
  }

  // ─── CALENDRIER ─────────────────────────────────────────────
  buildCalendar() {
    this.calDays = [];
    const first = new Date(this.calYear, this.calMonth, 1);
    let startDay = first.getDay() - 1;
    if (startDay < 0) startDay = 6;
    for (let i = 0; i < startDay; i++) this.calDays.push(null);
    const daysInMonth = new Date(this.calYear, this.calMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      this.calDays.push(new Date(this.calYear, this.calMonth, d));
    }
  }

  prevMonth() {
    if (this.calMonth === 0) { this.calMonth = 11; this.calYear--; }
    else this.calMonth--;
    this.buildCalendar();
  }

  nextMonth() {
    if (this.calMonth === 11) { this.calMonth = 0; this.calYear++; }
    else this.calMonth++;
    this.buildCalendar();
  }

  selectDay(day: Date | null) {
    if (!day || !this.enEdition) return;
    this.selectedDate = day;
    const yyyy = day.getFullYear();
    const mm   = String(day.getMonth() + 1).padStart(2, '0');
    const dd   = String(day.getDate()).padStart(2, '0');
    this.form.patchValue({ date: `${yyyy}-${mm}-${dd}` });
  }

  isToday(day: Date | null): boolean {
    if (!day) return false;
    const t = this.today;
    return day.getDate() === t.getDate() && day.getMonth() === t.getMonth() && day.getFullYear() === t.getFullYear();
  }

  isSelected(day: Date | null): boolean {
    if (!day || !this.selectedDate) return false;
    return day.getDate() === this.selectedDate.getDate() &&
           day.getMonth() === this.selectedDate.getMonth() &&
           day.getFullYear() === this.selectedDate.getFullYear();
  }

  isPast(day: Date | null): boolean {
    if (!day) return false;
    const d = new Date(day); d.setHours(0, 0, 0, 0);
    const t = new Date(this.today); t.setHours(0, 0, 0, 0);
    return d < t;
  }

  hasReunion(day: Date | null): boolean {
    if (!day) return false;
    return this.reunionSvc.hasReunionOnDay(day);
  }

  // ─── DESTINATAIRES ──────────────────────────────────────────
  toggleDest(value: string) {
    if (!this.enEdition) return;
    if (value === 'tous') {
      this.selectedDest = this.selectedDest.includes('tous') ? [] : ['tous'];
      return;
    }
    this.selectedDest = this.selectedDest.filter(d => d !== 'tous');
    if (this.selectedDest.includes(value)) {
      this.selectedDest = this.selectedDest.filter(d => d !== value);
    } else {
      this.selectedDest.push(value);
    }
  }

  isDestSelected(value: string): boolean {
    return this.selectedDest.includes(value);
  }

  // ─── ENREGISTRER / MODIFIER ─────────────────────────────────
  enregistrer() {
    if (!this.canSchedule || !this.enEdition) return;
    if (this.form.invalid || this.selectedDest.length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    const v     = this.form.getRawValue();
    const date  = String(v.date);
    const heure = String(v.heure);

    if (!this.editingId) {
      const dt = new Date(`${date}T${heure}:00`);
      if (dt.getTime() < new Date().getTime()) {
        alert('La date/heure est déjà passée. Choisis une heure future.');
        return;
      }
    }

    this.saving = true;

    const payload = {
      designation:   v.designation,
      sujet:         v.sujet,
      date:          date,
      heure:         heure,
      destinataires: [...this.selectedDest],
      organisateur:  this.authSvc.getUserName() || ''
    };

    const call$ = this.editingId
      ? this.reunionSvc.update(this.editingId, payload)
      : this.reunionSvc.add(this.produitId, payload);

    call$.subscribe({
      next: () => {
        this.saving = false;
        this.saved  = true;
        this.desactiverEdition();
        setTimeout(() => this.saved = false, 2500);
      },
      error: err => {
        this.saving = false;
        alert(err?.error?.message || 'Erreur lors de l\'enregistrement.');
      }
    });
  }

  annulerEdition() {
    this.desactiverEdition();
  }

  modifierReunion(r: Reunion, e: Event) {
    if (!this.canSchedule) return;
    e.stopPropagation();

    this.editingId = r.id;
    this.enEdition = true;
    this.form.enable();

    const parts     = r.date ? r.date.split('T') : ['', ''];
    const datePart  = parts[0] || '';
    const heurePart = parts[1] ? parts[1].substring(0, 5) : '09:00';

    this.form.patchValue({
      designation: r.designation,
      sujet:       r.sujet,
      date:        datePart,
      heure:       heurePart,
    });

    this.selectedDest = [...r.destinataires];

    if (datePart) {
      const [y, m, d] = datePart.split('-').map(Number);
      this.selectedDate = new Date(y, m - 1, d);
    }

    setTimeout(() => {
      document.querySelector('.rp-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  // ─── SUPPRESSION AVEC MODAL ─────────────────────────────────
  demanderSuppression(r: Reunion, e: Event) {
    if (!this.canSchedule) return;
    e.stopPropagation();
    this.reunionToDeleteId   = r.id;
    this.reunionToDeleteName = r.designation;
    this.showDeleteModal     = true;
  }

  confirmerSuppression() {
    if (!this.reunionToDeleteId) return;
    this.reunionSvc.delete(this.reunionToDeleteId).subscribe({
      next:  () => this.fermerModal(),
      error: () => this.fermerModal()
    });
  }

  fermerModal() {
    this.showDeleteModal     = false;
    this.reunionToDeleteId   = null;
    this.reunionToDeleteName = '';
  }

  // ─── LISTES ─────────────────────────────────────────────────
  get upcoming(): Reunion[] {
    const now = new Date();
    return this.reunions
      .filter(r => r.date && new Date(r.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  get past(): Reunion[] {
    const now = new Date();
    return this.reunions
      .filter(r => r.date && new Date(r.date) < now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  destLabel(dest: string[]): string {
    if (!dest || dest.length === 0) return '—';
    if (dest.includes('tous')) return 'Tous les acteurs';
    return dest.map(d => this.allActeurs.find(a => a.value === d)?.label || d).join(', ');
  }

  get formTitle(): string {
    return this.editingId ? 'Modifier la réunion' : 'Nouvelle réunion';
  }

  get btnLabel(): string {
    return this.editingId ? 'Enregistrer les modifications' : 'Planifier la réunion';
  }
}