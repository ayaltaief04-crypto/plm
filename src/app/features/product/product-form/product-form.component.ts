// product-form.component.ts
import { Component, OnInit, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { PrintReportService } from '../../../core/services/print-report.service';
import { AuthService } from '../../../core/services/auth.service';

type SectionKey = 'styliste' | 'marketing' | 'nomenclature' | 'qualite' | 'checklist';

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss']
})
export class ProductFormComponent implements OnInit {

  userRole: string = '';
  isLocked = true;
  isLoading = false;
  activeSection: SectionKey = 'styliste';

  product: any = this.createEmptyProduct();
  selectedVersion: any = null;
  historique: any[] = [];

  selectedImageIndex = 0;
  draggedImageIndex: number | null = null;
  currentColor = '#000000';

  lightboxOpen = false;
  lightboxUrl: string | null = null;

  readonly SAISONS  = ['Hiver', 'Été', 'Automne', 'Printemps'];
  readonly SECTIONS = ['Femme', 'Homme', 'Enfant'];
  readonly MAX_IMAGES = 10;
  readonly MAX_FILES  = 5;

  constructor(
    private api: ProductService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private printReportService: PrintReportService,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.userRole = this.authService.getRole();
    this.route.paramMap.subscribe(params => {
      const idStr = params.get('id');
      if (idStr) {
        this.loadProduct(Number(idStr));
      } else {
        this.resetNewProduct();
      }
    });
  }

  private createEmptyProduct(): any {
    return {
      idProduct:           null,
      statut:              '',
      numVersion:          '',
      designation:         '',
      reference:           '',
      description:         '',
      categorie:           '',
      collection:          '',
      saison:              '',
      section:             '',
      silhouette:          '',
      typeFermeture:       '',
      finitions:           '',
      matierePrincipale:   '',
      matiereSecondaire:   '',
      composition:         '',
      accessoires:         '',
      typeFil:             '',
      complexiteMontage:   '',
      grilleTailles:       '',
      typeCoupage:         '',
      paletteCouleurs:     [],
      detailsEtiquette:    '',
      theme:               '',
      inspirations:        '',
      fichePdf:            null,
      images:              [],
      fichiers:            [],
      versions:            [],
      isArchived:          false,
      _imageFiles:         [],
      _newImageFiles:      [],
      _imageIdsASupprimer: [],
      _pdfFile:            null
    };
  }

  private resetNewProduct() {
    this.selectedVersion = null;
    this.historique      = [];
    this.isLocked        = false;
    this.product         = this.createEmptyProduct();
    this.activeSection   = 'styliste';
  }

  private loadProduct(id: number) {
    this.isLoading = true;
    this.api.getProductById(id).subscribe({
      next: (data) => {
        if (!data) { this.isLoading = false; return; }
        this.product         = { ...this.createEmptyProduct(), ...data };
        this.selectedVersion = null;
        this.isLocked        = true;
        this.activeSection   = this.defaultSectionForRole();
        this.loadHistorique(id);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement produit', err);
        alert('Impossible de charger le produit.');
        this.isLoading = false;
      }
    });
  }

  private loadHistorique(id: number) {
    this.api.getHistorique(id).subscribe({
      next: (list) => {
        this.historique = list || [];
        const statut = this.normalizeStr(this.product.statut ?? '');
        if (this.historique.length > 0 && statut !== 'BROUILLON') {
          const match = this.historique.find(v => v.idProduct === this.product.idProduct);
          this.selectedVersion = match ?? this.historique[this.historique.length - 1];
        } else {
          this.selectedVersion = null;
        }
      },
      error: (err) => console.warn('Historique non disponible', err)
    });
  }

  selectVersion(v: any) {
    this.selectedVersion = v;
    if (v?.idProduct) {
      this.api.getProductById(v.idProduct).subscribe({
        next: (data) => {
          if (data) {
            this.product = { ...this.product, ...data };
            this.selectedImageIndex = 0;
          }
        },
        error: (err) => console.error('Erreur chargement version', err)
      });
    }
  }

  private normalizeStr(s: string): string {
    return (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  }

  get isStyliste(): boolean             { return this.userRole === 'Styliste'; }
  get isAdmin(): boolean                { return this.userRole === 'Admin'; }
  get isResponsableMarketing(): boolean { return this.userRole === 'ResponsableMarketing'; }
  get isResponsableQualite(): boolean   { return this.userRole === 'ResponsableQualite'; }
  get isIngenieurTextile(): boolean     { return this.userRole === 'Ingenieurtextile'; }
  get isResponsableAchat(): boolean     { return this.userRole === 'ResponsableAchat'; }

  get canEditMarketing(): boolean    { return this.isResponsableMarketing || this.isAdmin; }
  get canEditQualite(): boolean      { return this.isResponsableQualite   || this.isAdmin; }
  get canEditNomenclature(): boolean { return this.isIngenieurTextile || this.isResponsableAchat || this.isAdmin; }

  get marketingReadOnly(): boolean    { return !this.canEditMarketing; }
  get qualiteReadOnly(): boolean      { return !this.canEditQualite; }
  get nomenclatureReadOnly(): boolean { return !this.canEditNomenclature; }

  get currentStatus(): string {
    return this.selectedVersion?.statut ?? this.product.statut ?? '';
  }

  get currentStatusUpper(): string {
    return this.normalizeStr(this.currentStatus);
  }

  get productStatutUpper(): string {
    return this.normalizeStr(this.product.statut ?? '');
  }

  get viewedVersionStatutUpper(): string {
    if (this.selectedVersion) {
      return this.normalizeStr(this.selectedVersion.statut ?? '');
    }
    return this.productStatutUpper;
  }

  get isNewProduct(): boolean { return !this.product.idProduct; }

  get isBrouillonExistant(): boolean {
    return !!this.product.idProduct && this.productStatutUpper === 'BROUILLON';
  }

  get showContinuerEdition(): boolean {
    return this.isStyliste && this.isBrouillonExistant && this.isLocked;
  }

  get showBrouillonActions(): boolean {
    return this.isStyliste && this.isBrouillonExistant && !this.isLocked;
  }

  get showWorkflowBar(): boolean {
    if (!this.isStyliste && !this.isAdmin) return false;
    if (!this.product.idProduct) return false;
    if (this.productStatutUpper === 'BROUILLON' || this.productStatutUpper === '') return false;
    return true;
  }

  get isReadOnlyViewer(): boolean {
    return !this.isStyliste && !this.isAdmin &&
      !!this.product.idProduct &&
      this.productStatutUpper !== 'BROUILLON' &&
      this.productStatutUpper !== '';
  }

  get canEdit(): boolean {
    if (!this.isStyliste && !this.isAdmin) return false;
    if (this.isNewProduct) return !this.isLocked;
    return this.activeSection === 'styliste' && !this.isLocked;
  }

  get canEditStyleSection(): boolean { return this.canEdit; }
  get hasHistorique(): boolean { return this.historique.length > 1; }

  defaultSectionForRole(): SectionKey {
    switch (this.userRole) {
      case 'ResponsableMarketing': return 'marketing';
      case 'ResponsableQualite':   return 'qualite';
      case 'Ingenieurtextile':
      case 'ResponsableAchat':     return 'nomenclature';
      default:                     return 'styliste';
    }
  }

  setSection(section: SectionKey) { this.activeSection = section; }
  activerModification()           { this.isLocked = false; }
  continuerEdition()              { this.isLocked = false; }
  retour()                        { this.router.navigate(['/products/catalogue']); }

  enregistrerBrouillon() {
    if (!this.product.idProduct) {
      this.api.creerProduit(this.product, false).subscribe({
        next: () => { alert('Brouillon enregistré !'); this.router.navigate(['/products/catalogue']); },
        error: (err) => { console.error(err); alert('Erreur lors de la sauvegarde du brouillon.'); }
      });
    } else {
      this.api.modifierProduit(this.product.idProduct, this.product, false).subscribe({
        next: () => { alert('Brouillon mis à jour !'); this.router.navigate(['/products/catalogue']); },
        error: (err) => { console.error(err); alert('Erreur lors de la mise à jour du brouillon.'); }
      });
    }
  }

  supprimerBrouillon() {
    if (!confirm('Supprimer ce brouillon définitivement ?')) return;
    this.api.supprimer(this.product.idProduct).subscribe({
      next: () => this.retour(),
      error: (err) => { console.error(err); alert('Erreur lors de la suppression.'); }
    });
  }

  soumettreIdee() {
    if (!confirm('Soumettre cette idée ? Elle sera publiée en V1.0.')) return;
    const productAPublier = { ...this.product, statut: 'PUBLIE' };
    const action$ = this.product.idProduct
      ? this.api.modifierProduit(this.product.idProduct, productAPublier, true)
      : this.api.creerProduit(productAPublier, true);

    action$.subscribe({
      next: () => { alert('Produit soumis avec succès en V1.0 !'); this.router.navigate(['/products/catalogue']); },
      error: (err) => { console.error(err); alert('Erreur lors de la soumission.'); }
    });
  }

  enregistrerModifications() {
    if (!this.product?.idProduct) { alert('Produit non chargé.'); return; }
    this.api.modifierProduit(this.product.idProduct, this.product, false).subscribe({
      next: () => {
        this.isLocked = true;
        this.product._newImageFiles      = [];
        this.product._imageIdsASupprimer = [];
        this.product._pdfFile            = null;
        alert('Modifications enregistrées !');
      },
      error: (err) => { console.error(err); alert('Erreur lors de l\'enregistrement.'); }
    });
  }

  validerVersion() {
    if (!confirm('Valider définitivement ce Tech Pack ?\nLe statut VALIDÉ sera conservé définitivement.')) return;
    const productAValider = { ...this.product, statut: 'VALIDE' };
    this.api.modifierProduit(this.product.idProduct, productAValider, true).subscribe({
      next: () => {
        alert('Version validée avec succès.');
        this.router.navigate(['/products/catalogue']);
      },
      error: (err) => { console.error(err); alert('Erreur lors de la validation.'); }
    });
  }

  cloturerVersion() {
    if (!confirm('Clôturer cette version ?\nElle sera en lecture seule définitive.')) return;
    const productACloture = { ...this.product, statut: 'CLOTURE' };
    this.api.modifierProduit(this.product.idProduct, productACloture, false).subscribe({
      next: () => {
        alert('Version clôturée avec succès.');
        this.router.navigate(['/products/catalogue']);
      },
      error: (err) => { console.error(err); alert('Erreur lors de la clôture.'); }
    });
  }

  genererVersionMineure() {
    const statutActuel = this.viewedVersionStatutUpper;
    if (statutActuel !== 'PUBLIE' && statutActuel !== 'EN COURS') {
      alert('La génération de version mineure est uniquement possible depuis une version PUBLIÉE ou EN COURS.');
      return;
    }

    const currentNum = this.product.numVersion || this.selectedVersion?.numVersion || 'V1.0';
    const nextNum    = this.calculerVersionMineure(currentNum);

    if (!confirm(
      `Générer une nouvelle version mineure ?\n` +
      `${currentNum} → ${nextNum}\n\n` +
      `• La version actuelle (${currentNum}) reste ${statutActuel}\n` +
      `• La nouvelle version (${nextNum}) aura le statut EN COURS\n` +
      `• Le produit passera EN COURS`
    )) return;

    const productEnCours = { ...this.product, statut: 'EN COURS' };
    this.api.versionner(this.product.idProduct, productEnCours, false).subscribe({
      next: () => {
        alert(`Nouvelle version mineure ${nextNum} créée avec statut EN COURS.\nLe produit est maintenant EN COURS.`);
        this.router.navigate(['/products/catalogue']);
      },
      error: (err) => { console.error(err); alert('Erreur lors de la création de la version mineure.'); }
    });
  }

  genererVersionMajeure() {
    const statutActuel = this.viewedVersionStatutUpper;
    if (statutActuel !== 'VALIDE') {
      alert('La génération de version majeure est uniquement possible depuis une version VALIDÉE.');
      return;
    }

    const currentNum = this.product.numVersion || this.selectedVersion?.numVersion || 'V1.0';
    const nextNum    = this.calculerVersionMajeure(currentNum);

    if (!confirm(
      `Générer une nouvelle version majeure ?\n` +
      `${currentNum} → ${nextNum}\n\n` +
      `• La version validée (${currentNum}) reste VALIDÉE\n` +
      `• La nouvelle version (${nextNum}) aura le statut EN COURS\n` +
      `• Le produit passera EN COURS`
    )) return;

    const productEnCours = { ...this.product, statut: 'EN COURS' };
    this.api.versionner(this.product.idProduct, productEnCours, false).subscribe({
      next: () => {
        alert(`Version ${currentNum} conservée avec statut VALIDÉ.\nNouvelle version majeure ${nextNum} créée avec statut EN COURS.\nLe produit est maintenant EN COURS.`);
        this.router.navigate(['/products/catalogue']);
      },
      error: (err) => { console.error(err); alert('Erreur lors de la création de la version majeure.'); }
    });
  }

  private calculerVersionMineure(numVersion: string): string {
    const match = (numVersion ?? '').match(/^V(\d+)\.(\d+)$/i);
    if (!match) return 'V1.1';
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    return `V${major}.${minor + 1}`;
  }

  private calculerVersionMajeure(numVersion: string): string {
    const match = (numVersion ?? '').match(/^V(\d+)\.(\d+)$/i);
    if (!match) return 'V2.0';
    const major = parseInt(match[1], 10);
    return `V${major + 1}.0`;
  }

  openLightbox(url: string | null) {
    if (!url) return;
    this.lightboxUrl = url;
    this.lightboxOpen = true;
  }

  closeLightbox() {
    this.lightboxOpen = false;
    this.lightboxUrl  = null;
  }

  get selectedImageUrl(): string | null {
    return this.product.images?.[this.selectedImageIndex]?.cheminImage ?? null;
  }

  selectImage(index: number) { this.selectedImageIndex = index; }

  removeImage(index: number) {
    const img = this.product.images[index];
    if (img?.isRemote && img.id) {
      if (!this.product._imageIdsASupprimer) this.product._imageIdsASupprimer = [];
      this.product._imageIdsASupprimer.push(img.id);
    }
    this.product.images.splice(index, 1);
    this.selectedImageIndex = Math.max(0, this.selectedImageIndex - 1);
  }

  addImages(event: any) {
    const files: FileList = event.target.files;
    if (!files) return;
    if (!this.product.images) this.product.images = [];
    const remaining = this.MAX_IMAGES - this.product.images.length;
    Array.from(files).slice(0, remaining).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.ngZone.run(() => {
          this.product.images.push({
            cheminImage: e.target.result,
            nom:         file.name,
            ordre:       this.product.images.length,
            isRemote:    false
          });
          if (this.product.idProduct) {
            if (!this.product._newImageFiles) this.product._newImageFiles = [];
            this.product._newImageFiles.push(file);
          } else {
            if (!this.product._imageFiles) this.product._imageFiles = [];
            this.product._imageFiles.push(file);
          }
        });
      };
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  }

  onImageDragStart(index: number) {
    if (!this.canEdit) return;
    this.draggedImageIndex = index;
  }

  onImageDragOver(event: DragEvent) {
    if (!this.canEdit) return;
    event.preventDefault();
  }

  onImageDrop(event: DragEvent, dropIndex: number) {
    if (!this.canEdit) return;
    event.preventDefault();
    if (this.draggedImageIndex === null || this.draggedImageIndex === dropIndex) return;
    const imgs  = this.product.images || [];
    const moved = imgs.splice(this.draggedImageIndex, 1)[0];
    imgs.splice(dropIndex, 0, moved);
    imgs.forEach((img: any, i: number) => img.ordre = i);
    this.selectedImageIndex = dropIndex;
    this.draggedImageIndex  = null;
  }

  onImageDragEnd() { this.draggedImageIndex = null; }

  addFichiers(event: any) {
    const files: FileList = event.target.files;
    if (!files?.length) return;
    const file = files[0];
    if (!this.product.fichiers) this.product.fichiers = [];
    if (this.product.fichiers.length >= this.MAX_FILES) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.ngZone.run(() => {
        this.product.fichiers.push({
          nom:    file.name,
          type:   file.type,
          taille: file.size,
          data:   e.target.result
        });
        this.product._pdfFile = file;
      });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  removeFichier(index: number) {
    this.product.fichiers.splice(index, 1);
    this.product._pdfFile = null;
  }

  getFichierIcon(type: string): string {
    if (!type) return 'insert_drive_file';
    if (type.includes('pdf'))   return 'picture_as_pdf';
    if (type.includes('image')) return 'image';
    return 'insert_drive_file';
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  visualiserFichier(fichier: any) {
    if (fichier.data) {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(
          `<!DOCTYPE html><html><head><title>${fichier.nom || 'Fichier'}</title>` +
          `<style>body{margin:0;padding:0;background:#1a1a2e;}</style></head><body>` +
          `<iframe src="${fichier.data}" style="width:100%;height:100vh;border:none;"></iframe>` +
          `</body></html>`
        );
        win.document.close();
      }
      return;
    }
    if (fichier.url) { window.open(fichier.url, '_blank'); return; }
    if (fichier.cheminFichier) { window.open(fichier.cheminFichier, '_blank'); }
  }

  ajouterCouleur() {
    if (!this.product.paletteCouleurs) this.product.paletteCouleurs = [];
    const exists = this.product.paletteCouleurs.some((c: any) => c.hex === this.currentColor);
    if (!exists) this.product.paletteCouleurs.push({ hex: this.currentColor });
  }

  supprimerCouleur(index: number) { this.product.paletteCouleurs.splice(index, 1); }

  onPrintReport(): void {
    this.printReportService.printReport(this.product, this.selectedVersion, this.userRole);
  }

  getVersionIdPublic(v: any): number { return v?.idProduct ?? v?.Id ?? 0; }
  trackByIndex(index: number): number { return index; }

  getNextMajorHint(numVersion: string): string {
    const match = (numVersion ?? '').match(/^V(\d+)\.(\d+)$/i);
    if (!match) return '2';
    return String(parseInt(match[1], 10) + 1);
  }

  getNextMinorHint(numVersion: string): string {
    return this.calculerVersionMineure(numVersion);
  }

  public calculerVersionMineurePublic(n: string): string { return this.calculerVersionMineure(n); }
  public calculerVersionMajeurePublic(n: string): string { return this.calculerVersionMajeure(n); }
}