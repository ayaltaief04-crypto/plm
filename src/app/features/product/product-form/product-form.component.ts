// product-form.component.ts
import { Component, OnInit, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { ReportService } from '../../../core/services/report.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReunionService } from '../../../core/services/reunion.service';

type SectionKey = 'styliste' | 'marketing' | 'nomenclature' | 'qualite' | 'checklist' | 'forum' | 'reunion';

type ViewMode = 'view' | 'version';

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
  viewMode: ViewMode = 'view';
  product: any = this.createEmptyProduct();
  selectedVersion: any = null;
  historique: any[] = [];
  newVersionProduct: any = null;
  newVersionType: 'mineure' | 'majeure' = 'mineure';
  newVersionNum: string = '';
  sourceVersionNum: string = '';
  sourceVersionStatut: string = '';
  selectedImageIndex = 0;
  draggedImageIndex: number | null = null;
  currentColor = '#000000';
  lightboxOpen = false;
  lightboxUrl: string | null = null;
  modeValidation: 'brouillon' | 'soumettre' | '' = '';

  readonly SAISONS  = ['Hiver', 'Été', 'Automne', 'Printemps'];
  readonly SECTIONS = ['Femme', 'Homme', 'Enfant'];
  readonly MAX_IMAGES = 10;
  readonly MAX_FILES  = 5;

  // ── CONFIRM MODAL ─────────────────────────────────────────────────────────

  confirmModal = {
    open: false,
    type: '',
    icon: '',
    title: '',
    message: '',
    btnLabel: '',
    btnClass: '',
    action: () => {}
  };

  ouvrirConfirmCloture() {
    this.confirmModal = {
      open: true,
      type: 'danger',
      icon: 'lock',
      title: 'Clôturer la version',
      message: `Êtes-vous sûr de vouloir clôturer la version ${this.product.numVersion} ? Elle passera en lecture seule définitivement.`,
      btnLabel: 'Clôturer',
      btnClass: 'tp-btn--warning',
      action: () => { this.confirmModal.open = false; this.cloturerVersion(); }
    };
  }

  ouvrirConfirmValider() {
    this.confirmModal = {
      open: true,
      type: 'success',
      icon: 'verified',
      title: 'Valider le Tech Pack',
      message: `Confirmer la validation définitive de la version ${this.product.numVersion} ?`,
      btnLabel: 'Valider',
      btnClass: 'tp-btn--success',
      action: () => { this.confirmModal.open = false; this.validerVersion(); }
    };
  }

  ouvrirConfirmNouvelleVersion(forceType?: 'mineure' | 'majeure') {
    const estMajeure = forceType === 'majeure' || this.viewedVersionStatutUpper === 'VALIDE';
    this.confirmModal = {
      open: true,
      type: 'accent',
      icon: estMajeure ? 'upgrade' : 'add_circle',
      title: estMajeure ? 'Générer une nouvelle version majeure' : 'Générer une nouvelle version',
      message: `Voulez-vous créer une nouvelle version ${estMajeure ? 'majeure ' : ''}à partir de ${this.product.numVersion} ?`,
      btnLabel: 'Générer',
      btnClass: 'tp-btn--accent',
      action: () => { this.confirmModal.open = false; this.ouvrirFormulaireNouvelleVersion(forceType); }
    };
  }

  // ── VALIDATION ────────────────────────────────────────────────────────────

  missingFields: string[] = [];

  private readonly REQUIRED_BROUILLON: { key: string; label: string }[] = [
    { key: 'designation', label: 'Désignation' },
  ];

  private readonly REQUIRED_PUBLICATION: { key: string; label: string }[] = [
    { key: 'designation',       label: 'Désignation' },
    { key: 'description',       label: 'Description' },
    { key: 'categorie',         label: 'Catégorie' },
    { key: 'collection',        label: 'Collection' },
    { key: 'saison',            label: 'Saison' },
    { key: 'section',           label: 'Section' },
    { key: 'silhouette',        label: 'Silhouette' },
    { key: 'typeFermeture',     label: 'Type de Fermeture' },
    { key: 'finitions',         label: 'Finitions' },
    { key: 'accessoires',       label: 'Accessoires' },
    { key: 'detailsEtiquette',  label: "Détails de l'Étiquette" },
    { key: 'matierePrincipale', label: 'Matière Principale' },
    { key: 'matiereSecondaire', label: 'Matière Secondaire' },
    { key: 'composition',       label: 'Composition' },
    { key: 'typeFil',           label: 'Type de Fil' },
    { key: 'complexiteMontage', label: 'Complexité Montage' },
    { key: 'grilleTailles',     label: 'Grille de Tailles' },
    { key: 'typeCoupage',       label: 'Type de Coupage' },
    { key: 'theme',             label: 'Thème' },
    { key: 'inspirations',      label: 'Inspirations' },
  ];

  private valider(liste: { key: string; label: string }[]): boolean {
    this.missingFields = liste
      .filter(f => !this.product[f.key]?.toString().trim())
      .map(f => f.label);
    return this.missingFields.length === 0;
  }

  isInvalid(label: string): boolean {
    return this.missingFields.includes(label);
  }

  // ─────────────────────────────────────────────────────────────────────────

  constructor(
    private api: ProductService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private reportService: ReportService,
    private ngZone: NgZone,
    public reunionService: ReunionService
  ) {}

  get reunionProductName(): string {
    return this.product?.designation || this.product?.reference || 'Produit sans nom';
  }

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

    this.route.queryParamMap.subscribe(qp => {
      const section = qp.get('section');
      if (section === 'forum') {
        this.activeSection = 'forum';
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
      _pdfFiles:           [],
      _pdfFile:            null,
    };
  }

  private resetNewProduct() {
    this.selectedVersion   = null;
    this.historique        = [];
    this.isLocked          = false;
    this.viewMode          = 'view';
    this.newVersionProduct = null;
    this.product           = this.createEmptyProduct();
    this.activeSection     = 'styliste';
  }

  private loadProduct(id: number) {
    this.isLoading = true;
    this.api.getProductById(id).subscribe({
      next: (data) => {
        if (!data) { this.isLoading = false; return; }
        this.product           = { ...this.createEmptyProduct(), ...data };
        this.product.images    = (data.images ?? []).map((img: any) => ({ ...img, isRemote: true })); // ← AJOUTER
        this.selectedVersion   = null;
        this.isLocked          = true;
        this.viewMode          = 'view';
        this.newVersionProduct = null;
        this.activeSection     = this.defaultSectionForRole();
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
      next: (list) => { this.historique = list || []; },
      error: (err) => console.warn('Historique non disponible', err)
    });
  }

  selectVersion(v: any) {
    this.selectedVersion   = v;
    this.viewMode          = 'view';
    this.newVersionProduct = null;

    if (v?.idProduct) {
      this.api.getProductById(v.idProduct).subscribe({
        next: (data) => {
          if (data) {
            this.product            = { ...this.createEmptyProduct(), ...data };
            this.selectedImageIndex = 0;
            this.isLocked           = true;
          }
        },
        error: (err) => console.error('Erreur chargement version', err)
      });
    } else {
      const rootId = this.product.idProduct;
      if (rootId) {
        this.api.getProductById(rootId).subscribe({
          next: (data) => {
            if (data) {
              this.product            = { ...this.createEmptyProduct(), ...data };
              this.selectedImageIndex = 0;
              this.isLocked           = true;
            }
          }
        });
      }
    }
  }

  private normalizeStr(s: string): string {
    return (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  }

  // ── RÔLES ─────────────────────────────────────────────────────────────────

  get isStyliste(): boolean             { return this.userRole === 'Styliste'; }
  get isAdmin(): boolean                { return this.userRole === 'Admin'; }
  get isResponsableMarketing(): boolean { return this.userRole === 'ResponsableMarketing'; }
  get isResponsableQualite(): boolean   { return this.userRole === 'ResponsableQualite'; }
  get isIngenieurTextile(): boolean     { return this.userRole === 'Ingenieurtextile'; }
  get isResponsableAchat(): boolean     { return this.userRole === 'ResponsableAchat'; }

  /** Version verrouillée définitivement : plus aucune édition possible, tous acteurs confondus. */
  get isVersionVerrouillee(): boolean {
    return this.viewedVersionStatutUpper === 'CLOTURE' || this.viewedVersionStatutUpper === 'VALIDE';
  }

  get canEditMarketing(): boolean    { return (this.isResponsableMarketing || this.isAdmin) && !this.isVersionVerrouillee; }
  get canEditQualite(): boolean      { return (this.isResponsableQualite   || this.isAdmin) && !this.isVersionVerrouillee; }
  get canEditNomenclature(): boolean { return (this.isIngenieurTextile || this.isResponsableAchat || this.isAdmin) && !this.isVersionVerrouillee; }

  get marketingReadOnly(): boolean    { return !this.canEditMarketing; }
  get qualiteReadOnly(): boolean      { return !this.canEditQualite; }
  get nomenclatureReadOnly(): boolean { return !this.canEditNomenclature; }

  // ── STATUTS ───────────────────────────────────────────────────────────────

  get currentStatus(): string {
    if (this.viewMode === 'version') return 'EN COURS';
    return this.selectedVersion?.statut ?? this.product.statut ?? '';
  }

  get currentStatusUpper(): string   { return this.normalizeStr(this.currentStatus); }
  get productStatutUpper(): string   { return this.normalizeStr(this.product.statut ?? ''); }

  get viewedVersionStatutUpper(): string {
    if (this.selectedVersion) return this.normalizeStr(this.selectedVersion.statut ?? '');
    return this.productStatutUpper;
  }

  get isNewProduct(): boolean { return !this.product.idProduct; }

  get isBrouillonExistant(): boolean {
    return !!this.product.idProduct && this.productStatutUpper === 'BROUILLON';
  }

  // ── DÉTECTION VERSION MINEURE DESCENDANTE ─────────────────────────────────

  private parseVersion(num: string): { major: number; minor: number } | null {
    const m = (num ?? '').match(/^V?(\d+)\.(\d+)$/i);
    if (!m) return null;
    return { major: parseInt(m[1], 10), minor: parseInt(m[2], 10) };
  }

  /** true si la version consultée possède déjà une mineure (même majeure, mineure supérieure) */
  get hasMinorDescendant(): boolean {
    const cur = this.parseVersion(this.selectedVersion?.numVersion || this.product?.numVersion || '');
    if (!cur) return false;
    return this.historique.some(v => {
      const ver = this.parseVersion(v?.numVersion);
      return !!ver && ver.major === cur.major && ver.minor > cur.minor;
    });
  }

  /** PUBLIÉE ayant déjà engendré une mineure → seule la version majeure est permise */
  get isPublieAvecMineure(): boolean {
    return this.viewedVersionStatutUpper === 'PUBLIE' && this.hasMinorDescendant;
  }

  // ── VISIBILITÉ BARRES WORKFLOW ────────────────────────────────────────────

  get showContinuerEdition(): boolean {
    return this.isStyliste && this.isBrouillonExistant && this.isLocked && this.viewMode === 'view';
  }

  get showBrouillonActions(): boolean {
    return this.isStyliste && this.isBrouillonExistant && !this.isLocked && this.viewMode === 'view';
  }

  get showWorkflowBar(): boolean {
    if (!this.isStyliste && !this.isAdmin) return false;
    if (!this.product.idProduct) return false;
    if (this.productStatutUpper === 'BROUILLON' || this.productStatutUpper === '') return false;
    if (this.viewMode === 'version') return false;
    if (['checklist', 'forum', 'reunion'].includes(this.activeSection)) return false;
    return true;
  }

  get isReadOnlyViewer(): boolean {
    return !this.isStyliste && !this.isAdmin &&
      !!this.product.idProduct &&
      this.productStatutUpper !== 'BROUILLON' &&
      this.productStatutUpper !== '' &&
      this.viewMode !== 'version';
  }

  get canEdit(): boolean {
    if (!this.isStyliste && !this.isAdmin) return false;
    if (this.isNewProduct) return !this.isLocked;
    return this.activeSection === 'styliste' && !this.isLocked && this.viewMode === 'view';
  }

  get canEditVersionForm(): boolean  { return this.viewMode === 'version'; }
  get canEditStyleSection(): boolean { return this.canEdit; }
  get hasHistorique(): boolean       { return this.historique.length > 0; }

  get isViewingHistoriqueVersion(): boolean { return !!this.selectedVersion; }

  // ── GÉNÉRATION DE VERSION ──────────────────────────────────────────────────

  ouvrirFormulaireNouvelleVersion(forceType?: 'mineure' | 'majeure') {
    const statutSource = this.viewedVersionStatutUpper;

    if (statutSource !== 'PUBLIE' && statutSource !== 'EN COURS' && statutSource !== 'VALIDE') {
      alert('La génération de version n\'est possible que depuis une version PUBLIÉE, EN COURS ou VALIDÉE.');
      return;
    }

    const sourceNum = this.product.numVersion || this.selectedVersion?.numVersion || 'V1.0';

    const forcerMajeure = forceType === 'majeure' || statutSource === 'VALIDE';
    if (forcerMajeure) {
      this.newVersionType = 'majeure';
      this.newVersionNum  = this.calculerVersionMajeure(sourceNum);
    } else {
      this.newVersionType = 'mineure';
      this.newVersionNum  = this.calculerVersionMineure(sourceNum);
    }

    this.sourceVersionNum    = sourceNum;
    this.sourceVersionStatut = statutSource;

    const imagesCopied   = (this.product.images   ?? []).map((img: any) => ({ ...img }));
    const fichiersCopied = (this.product.fichiers  ?? []).map((f: any)   => ({ ...f   }));

    this.newVersionProduct = {
      ...this.createEmptyProduct(),
      designation:       this.product.designation,
      categorie:         this.product.categorie,
      description:       this.product.description,
      saison:            this.product.saison,
      section:           this.product.section,
      collection:        this.product.collection,
      silhouette:        this.product.silhouette,
      typeFermeture:     this.product.typeFermeture,
      finitions:         this.product.finitions,
      matierePrincipale: this.product.matierePrincipale,
      matiereSecondaire: this.product.matiereSecondaire,
      composition:       this.product.composition,
      accessoires:       this.product.accessoires,
      typeFil:           this.product.typeFil,
      complexiteMontage: this.product.complexiteMontage,
      grilleTailles:     this.product.grilleTailles,
      typeCoupage:       this.product.typeCoupage,
      detailsEtiquette:  this.product.detailsEtiquette,
      theme:             this.product.theme,
      inspirations:      this.product.inspirations,
      paletteCouleurs:   this.product.paletteCouleurs ? [...this.product.paletteCouleurs] : [],
      images:            imagesCopied,
      fichiers:          fichiersCopied,
      statut:            'EN COURS',
      numVersion:        this.newVersionNum,
      idProduct:         null,
      reference:         '',
      _imageFiles:       [],
      _newImageFiles:    [],
      _imageIdsASupprimer: [],
      _pdfFiles:         [],
      _pdfFile:          null,
    };

    this.selectedImageIndex = 0;
    this.viewMode = 'version';
  }

  annulerNouvelleVersion() {
    this.viewMode           = 'view';
    this.newVersionProduct  = null;
    this.newVersionNum      = '';
    this.sourceVersionNum   = '';
    this.selectedImageIndex = 0;
  }

  confirmerNouvelleVersion() {
    if (!this.newVersionProduct) return;

    const statutSource       = this.sourceVersionStatut;
    const sourceNum          = this.sourceVersionNum;
    const nextNum            = this.newVersionNum;
    const rootId             = this.product.idProduct;
    const productAVersionner = { ...this.newVersionProduct, statut: 'EN COURS' };

    // La version PUBLIÉE reste PUBLIÉE lors d'une mineure ; seule une EN COURS est clôturée.
    const cloturerSource = statutSource === 'EN COURS';

    this.isLoading = true;

    this.api.versionner(rootId, productAVersionner, cloturerSource).subscribe({
      next: () => {
        this.isLoading = false;
        let message = `✅ Nouvelle version ${nextNum} créée avec statut EN COURS.\n`;
        if (statutSource === 'EN COURS') {
          message += `La version ${sourceNum} a été clôturée automatiquement.\n`;
        } else if (statutSource === 'PUBLIE') {
          message += `La version ${sourceNum} reste PUBLIÉE.\n`;
        } else if (statutSource === 'VALIDE') {
          message += `La version ${sourceNum} reste VALIDÉE.\n`;
        }
        alert(message);
        this.router.navigate(['/products/catalogue']);
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        alert('Erreur lors de la création de la nouvelle version.');
      }
    });
  }

  // ── ACTIONS WORKFLOW ──────────────────────────────────────────────────────

  enregistrerBrouillon() {
    if (!this.valider(this.REQUIRED_BROUILLON)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    this.missingFields = [];
    const productAEnregistrer = { ...this.product, statut: 'BROUILLON' };

    if (!this.product.idProduct) {
      this.api.creerProduit(productAEnregistrer, false).subscribe({
        next: () => {
          alert('Brouillon enregistré !');
          this.router.navigate(['/products/catalogue']);
        },
        error: (err) => { console.error(err); alert('Erreur lors de la sauvegarde du brouillon.'); }
      });
    } else {
      this.api.modifierProduit(this.product.idProduct, productAEnregistrer, false).subscribe({
        next: () => {
          alert('Brouillon mis à jour !');
          this.router.navigate(['/products/catalogue']);
        },
        error: (err) => { console.error(err); alert('Erreur lors de la mise à jour du brouillon.'); }
      });
    }
  }

  supprimerBrouillon() {
    this.confirmModal = {
      open: true,
      type: 'danger',
      icon: 'delete',
      title: 'Supprimer le brouillon',
      message: 'Êtes-vous sûr de vouloir supprimer ce brouillon définitivement ? Cette action est irréversible.',
      btnLabel: 'Supprimer',
      btnClass: 'tp-btn--danger',
      action: () => {
        this.confirmModal.open = false;
        this.api.supprimer(this.product.idProduct).subscribe({
          next: () => this.retour(),
          error: (err) => { console.error(err); alert('Erreur lors de la suppression.'); }
        });
      }
    };
  }

  soumettreIdee() {
    // 1. Valider tous les champs ensemble
    this.valider(this.REQUIRED_PUBLICATION);

    if (!this.product.images || this.product.images.length === 0) {
      this.missingFields.push('Au moins une image est requise');
    }

    if (!this.product.paletteCouleurs || this.product.paletteCouleurs.length === 0) {
      this.missingFields.push('Au moins une couleur est requise');
    }

    // 2. Bloquer si erreurs
    if (this.missingFields.length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 3. Ouvrir le modal de confirmation
    this.confirmModal = {
      open: true,
      type: 'success',
      icon: 'rocket_launch',
      title: 'Publier le produit',
      message: `Voulez-vous publier "${this.product.designation}" ? Il sera visible dans le catalogue en V1.0 et ne pourra plus être supprimé.`,
      btnLabel: 'Publier',
      btnClass: 'tp-btn--success',
      action: () => {
        this.confirmModal.open = false;
        this._executerSoumission();
      }
    };
  }

  private _executerSoumission() {
    const productAPublier = { ...this.product, statut: 'PUBLIE' };
    const action$ = this.product.idProduct
      ? this.api.modifierProduit(this.product.idProduct, productAPublier, true)
      : this.api.creerProduit(productAPublier, true);

    action$.subscribe({
      next: () => {
        alert('Produit soumis avec succès en V1.0 !');
        this.router.navigate(['/products/catalogue']);
      },
      error: (err) => { console.error(err); alert('Erreur lors de la soumission.'); }
    });
  }

  enregistrerModifications() {
    if (!this.product?.idProduct) { alert('Produit non chargé.'); return; }

    this.isLoading = true;
    this.api.modifierProduit(this.product.idProduct, this.product, false).subscribe({
      next: () => {
        this.api.getProductById(this.product.idProduct).subscribe({
          next: (data) => {
            this.isLoading = false;
            if (data) {
              this.product = { ...this.createEmptyProduct(), ...data };
            }
            this.isLocked = true;
            alert('Modifications enregistrées !');
          },
          error: () => {
            this.isLoading = false;
            this.product._newImageFiles      = [];
            this.product._imageIdsASupprimer = [];
            this.product._pdfFiles           = [];
            this.product._pdfFile            = null;
            this.isLocked = true;
            alert('Modifications enregistrées !');
          }
        });
      },
      error: (err) => {
        this.isLoading = false;
        console.error(err);
        alert('Erreur lors de l\'enregistrement.');
      }
    });
  }

  validerVersion() {
    if (!confirm(
      'Valider définitivement ce Tech Pack ?\n' +
      'Le produit et cette version passeront au statut VALIDÉ.\n' +
      'Pour modifier, il faudra générer une nouvelle version majeure.'
    )) return;
    const productAValider = { ...this.product, statut: 'VALIDE' };
    this.api.modifierProduit(this.product.idProduct, productAValider, true).subscribe({
      next: () => {
        alert('Version validée avec succès.\nLe produit passe au statut VALIDÉ.');
        this.router.navigate(['/products/catalogue']);
      },
      error: (err) => { console.error(err); alert('Erreur lors de la validation.'); }
    });
  }

  cloturerVersion() {
    if (!confirm(
      'Clôturer cette version ?\n' +
      'Elle sera en lecture seule définitive.\n' +
      'Le produit passera au statut CLÔTURÉ.'
    )) return;
    const productACloture = { ...this.product, statut: 'CLOTURE' };
    this.api.modifierProduit(this.product.idProduct, productACloture, false).subscribe({
      next: () => {
        alert('Version clôturée.\nLe produit est maintenant CLÔTURÉ.');
        this.router.navigate(['/products/catalogue']);
      },
      error: (err) => { console.error(err); alert('Erreur lors de la clôture.'); }
    });
  }

  archiverProduit() {
    if (!confirm('Archiver ce produit ? Il sera masqué du catalogue principal.')) return;
    const productArchive = { ...this.product, isArchived: true, statut: 'ARCHIVE' };
    this.api.modifierProduit(this.product.idProduct, productArchive, false).subscribe({
      next: () => {
        alert('Produit archivé.');
        this.router.navigate(['/products/catalogue']);
      },
      error: (err) => { console.error(err); alert('Erreur lors de l\'archivage.'); }
    });
  }

  // ── CALCUL NUMÉROS DE VERSION ─────────────────────────────────────────────

  private calculerVersionMineure(numVersion: string): string {
    const match = (numVersion ?? '').match(/^V?(\d+)\.(\d+)$/i);
    if (!match) return 'V1.1';
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    return `V${major}.${minor + 1}`;
  }

  private calculerVersionMajeure(numVersion: string): string {
    const match = (numVersion ?? '').match(/^V?(\d+)\.(\d+)$/i);
    if (!match) return 'V2.0';
    const major = parseInt(match[1], 10);
    return `V${major + 1}.0`;
  }

  getNextMajorHint(numVersion: string): string {
    const match = (numVersion ?? '').match(/^V?(\d+)\.(\d+)$/i);
    if (!match) return '2';
    return String(parseInt(match[1], 10) + 1);
  }

  getNextMinorHint(numVersion: string): string { return this.calculerVersionMineure(numVersion); }

  public calculerVersionMineurePublic(n: string): string { return this.calculerVersionMineure(n); }
  public calculerVersionMajeurePublic(n: string): string { return this.calculerVersionMajeure(n); }

  // ── LIGHTBOX ──────────────────────────────────────────────────────────────

  openLightbox(url: string | null) {
    if (!url) return;
    this.lightboxUrl  = url;
    this.lightboxOpen = true;
  }

  closeLightbox() {
    this.lightboxOpen = false;
    this.lightboxUrl  = null;
  }

  // ── IMAGES ────────────────────────────────────────────────────────────────

  get selectedImageUrl(): string | null {
    const source = this.viewMode === 'version' ? this.newVersionProduct : this.product;
    return source?.images?.[this.selectedImageIndex]?.cheminImage ?? null;
  }

  selectImage(index: number) { this.selectedImageIndex = index; }

  /** Ouvre la modale de confirmation avant suppression d'une image. */
  confirmerSuppressionImage(index: number) {
    const source = this.viewMode === 'version' ? this.newVersionProduct : this.product;
    if (!source?.images?.length || index < 0 || index >= source.images.length) return;
    this.confirmModal = {
      open: true,
      type: 'danger',
      icon: 'delete',
      title: 'Supprimer le visuel',
      message: 'Êtes-vous sûr de vouloir supprimer cette image ? Cette action sera appliquée à l\'enregistrement.',
      btnLabel: 'Supprimer',
      btnClass: 'tp-btn--danger',
      action: () => { this.confirmModal.open = false; this.removeImage(index); }
    };
  }

  removeImage(index: number) {
    const source = this.viewMode === 'version' ? this.newVersionProduct : this.product;
    if (!source?.images || index < 0 || index >= source.images.length) return;

    const img = source.images[index];

    if (img?.isRemote && img.id && this.viewMode !== 'version') {
      // Image distante en édition normale → marquer pour suppression côté backend
      if (!source._imageIdsASupprimer) source._imageIdsASupprimer = [];
      source._imageIdsASupprimer.push(img.id);
    } else if (!img?.isRemote) {
      // Image locale → retirer aussi le File correspondant (recherche par nom)
      const removeByName = (arr: File[] | undefined) =>
        (arr ?? []).filter((f: File) => f.name !== img?.nom);
      source._imageFiles    = removeByName(source._imageFiles);
      source._newImageFiles = removeByName(source._newImageFiles);
    }

    source.images.splice(index, 1);
    source.images.forEach((im: any, i: number) => im.ordre = i);

    if (this.selectedImageIndex >= source.images.length) {
      this.selectedImageIndex = Math.max(0, source.images.length - 1);
    }
  }

  addImages(event: any) {
    const files: FileList = event.target.files;
    if (!files) return;
    const source    = this.viewMode === 'version' ? this.newVersionProduct : this.product;
    if (!source.images) source.images = [];
    const remaining = this.MAX_IMAGES - source.images.length;

    Array.from(files).slice(0, remaining).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.ngZone.run(() => {
          source.images.push({
            cheminImage: e.target.result,
            nom:         file.name,
            ordre:       source.images.length,
            isRemote:    false,
            remoteUrl:   null,
          });
          if (this.viewMode === 'version') {
            if (!source._imageFiles) source._imageFiles = [];
            source._imageFiles.push(file);
          } else if (source.idProduct) {
            if (!source._newImageFiles) source._newImageFiles = [];
            source._newImageFiles.push(file);
          } else {
            if (!source._imageFiles) source._imageFiles = [];
            source._imageFiles.push(file);
          }
        });
      };
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  }

  onImageDragStart(index: number) {
    const editable = this.viewMode === 'version' ? true : this.canEdit;
    if (!editable) return;
    this.draggedImageIndex = index;
  }

  onImageDragOver(event: DragEvent) {
    const editable = this.viewMode === 'version' ? true : this.canEdit;
    if (!editable) return;
    event.preventDefault();
  }

  onImageDrop(event: DragEvent, dropIndex: number) {
    const editable = this.viewMode === 'version' ? true : this.canEdit;
    if (!editable) return;
    event.preventDefault();
    if (this.draggedImageIndex === null || this.draggedImageIndex === dropIndex) return;
    const source = this.viewMode === 'version' ? this.newVersionProduct : this.product;
    const imgs   = source.images || [];
    const moved  = imgs.splice(this.draggedImageIndex, 1)[0];
    imgs.splice(dropIndex, 0, moved);
    imgs.forEach((img: any, i: number) => img.ordre = i);
    this.selectedImageIndex = dropIndex;
    this.draggedImageIndex  = null;
  }

  onImageDragEnd() { this.draggedImageIndex = null; }

  // ── FICHIERS ──────────────────────────────────────────────────────────────

  addFichiers(event: any) {
    const files: FileList = event.target.files;
    if (!files?.length) return;
    const source = this.viewMode === 'version' ? this.newVersionProduct : this.product;
    if (!source.fichiers) source.fichiers = [];
    if (!source._pdfFiles) source._pdfFiles = [];

    Array.from(files).forEach((file: File) => {
      if (source.fichiers.length >= this.MAX_FILES) return;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.ngZone.run(() => {
          source.fichiers.push({
            nom:    file.name,
            type:   file.type,
            taille: file.size,
            data:   e.target.result,
            url:    null,
            isRemote: false,
          });
          source._pdfFiles.push(file);
          source._pdfFile = file;
        });
      };
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  }

  removeFichier(index: number) {
    const source  = this.viewMode === 'version' ? this.newVersionProduct : this.product;
    const fichier = source.fichiers[index];

    // Si fichier distant → marquer pour suppression côté backend
    if (fichier?.isRemote) {
      if (!source._fichiersASupprimer) source._fichiersASupprimer = [];
      source._fichiersASupprimer.push(fichier.url ?? fichier.cheminFichier);
    } else {
      // Fichier local → retirer aussi de _pdfFiles en cherchant par nom
      if (source._pdfFiles?.length) {
        source._pdfFiles = (source._pdfFiles as File[]).filter(
          (f: File) => f.name !== fichier.nom
        );
      }
    }

    source.fichiers.splice(index, 1);
    source._pdfFile = source._pdfFiles?.[0] ?? null;
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
    if (fichier.url)           { window.open(fichier.url, '_blank'); return; }
    if (fichier.cheminFichier) { window.open(fichier.cheminFichier, '_blank'); return; }
    if (this.product.fichePdf) { window.open(this.product.fichePdf, '_blank'); }
  }

  // ── COULEURS ──────────────────────────────────────────────────────────────

  ajouterCouleur() {
    const source = this.viewMode === 'version' ? this.newVersionProduct : this.product;
    if (!source.paletteCouleurs) source.paletteCouleurs = [];
    const exists = source.paletteCouleurs.some((c: any) => c.hex === this.currentColor);
    if (!exists) source.paletteCouleurs.push({ hex: this.currentColor });
  }

  supprimerCouleur(index: number) {
    const source = this.viewMode === 'version' ? this.newVersionProduct : this.product;
    source.paletteCouleurs.splice(index, 1);
  }

  // ── DIVERS ────────────────────────────────────────────────────────────────

  defaultSectionForRole(): SectionKey {
    switch (this.userRole) {
      case 'ResponsableMarketing': return 'marketing';
      case 'ResponsableQualite':   return 'qualite';
      case 'Ingenieurtextile':
      case 'ResponsableAchat':     return 'nomenclature';
      default:                     return 'styliste';
    }
  }

  setSection(section: SectionKey)  { this.activeSection = section; }
  activerModification()            { this.isLocked = false; }
  continuerEdition()               { this.isLocked = false; }
  retour()                         { this.router.navigate(['/products/catalogue']); }

  trackByIndex(index: number): number { return index; }

  getVersionIdPublic(v: any): number { return v?.idProduct ?? v?.Id ?? 0; }

  onPrintReport(): void {
    const id = this.product.idProduct;
    if (!id) return;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = `/produit/rapport/${id}`;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
      }, 1500);
    };
  }
}