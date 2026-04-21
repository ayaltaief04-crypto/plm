import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReunionService } from '../../../core/services/reunion.service';
import { AuthService } from '../../../core/services/auth.service';
import { Reunion } from '@app/core/models/reunion.model ';

export const ALL_ACTEURS = [
  { value: 'tous', label: 'Tous les acteurs', icon: 'groups' },
  { value: 'Styliste', label: 'Styliste', icon: 'brush' },
  { value: 'ResponsableMarketing', label: 'Resp. Marketing', icon: 'trending_up' },
  { value: 'Ingenieurtextile', label: 'Ingénieur Textile', icon: 'engineering' },
  { value: 'ResponsableAchat', label: 'Resp. Achats', icon: 'shopping_cart' },
  { value: 'ResponsableQualite', label: 'Resp. Qualité', icon: 'verified_user' },
  { value: 'Admin', label: 'Administrateur', icon: 'admin_panel_settings' },
];

@Component({
  selector: 'app-reunions-panel',
  templateUrl: './reunions-panel.component.html',
  styleUrls: ['./reunions-panel.component.scss']
})
export class ReunionsPanelComponent implements OnInit, OnDestroy {
  form!: FormGroup;

  saving = false;
  saved = false;

  selectedDest: string[] = [];
  allActeurs = ALL_ACTEURS;

  // calendrier
  today = new Date();
  calYear = this.today.getFullYear();
  calMonth = this.today.getMonth();
  calDays: (Date | null)[] = [];
  selectedDate: Date | null = null;

  reunions: Reunion[] = [];
  private sub?: Subscription;

  readonly MONTH_NAMES = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  readonly DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // ✅ droits
  userRoleRaw = '';
  canSchedule = false; // seul Styliste (et Admin si tu veux) peut programmer

  constructor(
    private fb: FormBuilder,
    private reunionSvc: ReunionService,
    private authSvc: AuthService
  ) {}

  ngOnInit() {
    this.userRoleRaw = (this.authSvc.getRole() || '').trim();
    this.canSchedule = this.userRoleRaw === 'Styliste' || this.userRoleRaw === 'Admin'; // si tu veux ADMIN aussi

    // formulaire seulement si autorisé (mais pas obligatoire)
    this.form = this.fb.group({
      designation: ['', [Validators.required, Validators.minLength(2)]],
      sujet: ['', [Validators.required, Validators.minLength(2)]],
      date: ['', Validators.required],
      heure: ['09:00', Validators.required],
    });

    this.buildCalendar();

    this.sub = this.reunionSvc.reunions$.subscribe(r => {
      this.reunions = r;
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  // ─── CALENDRIER ─────────────────────────────────────────────────────────────
  buildCalendar() {
    this.calDays = [];
    const first = new Date(this.calYear, this.calMonth, 1);

    // lundi = 0
    let startDay = first.getDay() - 1;
    if (startDay < 0) startDay = 6;

    for (let i = 0; i < startDay; i++) this.calDays.push(null);

    const daysInMonth = new Date(this.calYear, this.calMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      this.calDays.push(new Date(this.calYear, this.calMonth, d));
    }
  }

  prevMonth() {
    if (!this.canSchedule) return;
    if (this.calMonth === 0) { this.calMonth = 11; this.calYear--; }
    else this.calMonth--;
    this.buildCalendar();
  }

  nextMonth() {
    if (!this.canSchedule) return;
    if (this.calMonth === 11) { this.calMonth = 0; this.calYear++; }
    else this.calMonth++;
    this.buildCalendar();
  }

  selectDay(day: Date | null) {
    if (!this.canSchedule) return;
    if (!day) return;
    this.selectedDate = day;

    const yyyy = day.getFullYear();
    const mm = String(day.getMonth() + 1).padStart(2, '0');
    const dd = String(day.getDate()).padStart(2, '0');

    this.form.patchValue({ date: `${yyyy}-${mm}-${dd}` });
  }

  isToday(day: Date | null): boolean {
    if (!day) return false;
    const t = this.today;
    return day.getDate() === t.getDate() &&
      day.getMonth() === t.getMonth() &&
      day.getFullYear() === t.getFullYear();
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

  // ─── DESTINATAIRES ──────────────────────────────────────────────────────────
  toggleDest(value: string) {
    if (!this.canSchedule) return;

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

  // ─── ENREGISTRER ────────────────────────────────────────────────────────────
  enregistrer() {
    if (!this.canSchedule) return;

    if (this.form.invalid || this.selectedDest.length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    // ✅ (optionnel) empêcher passé
    const v = this.form.value;
    const date = String(v.date);
    const heure = String(v.heure);
    const selectedDateTime = new Date(`${date}T${heure}:00`);
    const now = new Date();

    if (selectedDateTime.getTime() < now.getTime()) {
      alert("La date/heure est déjà passée. Choisis une heure future.");
      return;
    }

    this.saving = true;
    this.saved = false;

    const datetime = `${date}T${heure}:00`;

    this.reunionSvc.add({
      designation: v.designation,
      sujet: v.sujet,
      date: datetime,
      destinataires: [...this.selectedDest],
      organisateur: this.authSvc.getUserName() || 'Utilisateur'
    });

    setTimeout(() => {
      this.saving = false;
      this.saved = true;
      this.form.reset({ heure: '09:00' });
      this.selectedDest = [];
      this.selectedDate = null;
      setTimeout(() => this.saved = false, 2500);
    }, 500);
  }

  deleteReunion(id: string, e: Event) {
    if (!this.canSchedule) return; // seul styliste/admin supprime
    e.stopPropagation();
    this.reunionSvc.delete(id);
  }

  // ─── LISTES ────────────────────────────────────────────────────────────────
  get upcoming(): Reunion[] { return this.reunionSvc.getUpcoming(); }
  get past(): Reunion[] { return this.reunionSvc.getPast(); }

  destLabel(dest: string[]): string {
    if (dest.includes('tous')) return 'Tous les acteurs';
    return dest.map(d => this.allActeurs.find(a => a.value === d)?.label || d).join(', ');
  }
}