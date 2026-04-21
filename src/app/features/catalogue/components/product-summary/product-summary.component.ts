import { Component, OnInit, Input, Output, EventEmitter, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ProductService } from '../../../../core/services/product.service';

@Component({
  selector: 'app-product-summary',
  templateUrl: './product-summary.component.html',
  styleUrls: ['./product-summary.component.scss']
})
export class ProductSummaryComponent implements OnInit {

  @Input()  product: any;
  @Output() onArchived = new EventEmitter<void>();
  @Output() onUpdate   = new EventEmitter<void>();

  userRole: string  = '';
  isStyliste: boolean = false;
  showVersions: boolean = true;   // ← ouvert par défaut
  activeImageIndex: number = 0;
  archiving: boolean = false;

  constructor(
    private authService: AuthService,
    private productService: ProductService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.userRole   = this.authService.getRole();
    this.isStyliste = this.userRole === 'Styliste';
    this.activeImageIndex = 0;
  }

  // ─── IMAGES ────────────────────────────────────────────────────────────────

  get productImages(): string[] {
    if (this.product?.images?.length > 0) {
      return this.product.images.map((img: any) => img.cheminImage || img);
    }
    if (this.product?.imageUrls?.length > 0) return this.product.imageUrls;
    return [];
  }

  get currentImageUrl(): string {
    return this.productImages[this.activeImageIndex] || 'assets/placeholder.png';
  }

  setActiveImage(index: number): void { this.activeImageIndex = index; }

  prevImage(event: Event): void {
    event.stopPropagation();
    if (this.activeImageIndex > 0) this.activeImageIndex--;
  }

  nextImage(event: Event): void {
    event.stopPropagation();
    if (this.activeImageIndex < this.productImages.length - 1) this.activeImageIndex++;
  }

  // ─── STATUT ET VERSION ─────────────────────────────────────────────────────

  get effectiveStatus(): string {
    if (this.product?.versions?.length > 0) {
      const last = this.product.versions[this.product.versions.length - 1];
      return last.statut || this.product.statut || 'Brouillon';
    }
    return this.product?.statut || 'Brouillon';
  }

  get effectiveStatusClass(): string {
    const s = this.effectiveStatus.toLowerCase();
    if (s.includes('publi'))                           return 'publie';
    if (s.includes('valid'))                           return 'valide';
    if (s.includes('clôtur') || s.includes('clotur')) return 'cloture';
    if (s.includes('en cours'))                        return 'en-cours';
    if (s.includes('archiv'))                          return 'archive';
    return 'brouillon';
  }

  /**
   * Retourne la liste des versions, en insérant V1.0 en premier si elle est absente.
   * Cela garantit que tous les acteurs voient toujours au moins V1.0 dans l'historique.
   */
  get versionsWithV1(): any[] {
    const versions = this.product?.versions ?? [];
    if (!versions.length) {
      // Produit sans versions connues : afficher une V1.0 synthétique
      return [{
        numVersion: '1.0',
        statut: this.product?.statut || 'Publié',
        dateModification: this.product?.dateModification || this.product?.updatedAt || null,
        idProduct: this.product?.idProduct,
        _synthetic: true
      }];
    }
    // Vérifier si V1 est déjà présente
    const hasV1 = versions.some((v: any) => {
      const num = (v.numVersion || v.versionName || '').replace(/^V/i, '');
      return num === '1' || num === '1.0';
    });
    if (hasV1) return versions;
    // Insérer une V1.0 synthétique au début
    const v1: any = {
      numVersion: '1.0',
      statut: versions[0]?.statut || this.product?.statut || 'Publié',
      dateModification: versions[0]?.dateModification || null,
      idProduct: this.product?.idProduct,
      _synthetic: true
    };
    return [v1, ...versions];
  }


  get latestVersionName(): string {
    if (!this.product?.versions?.length) return 'V1.0';
    const last = this.product.versions[this.product.versions.length - 1];
    return this.formatVersionNumber(last);
  }

  /**
   * Formate le numéro de version à partir d'un objet version.
   * Supporte les champs possibles : numVersion (ex: "1.0"), versionName (ex: "V1.0"), ou index.
   */
  formatVersionNumber(version: any, index?: number): string {
    if (version.numVersion) {
      // Si numVersion est déjà "1.0", on s'assure du préfixe V
      return version.numVersion.startsWith('V') ? version.numVersion : `V${version.numVersion}`;
    }
    if (version.versionName) {
      return version.versionName.startsWith('V') ? version.versionName : `V${version.versionName}`;
    }
    // Fallback sur l'index
    const v = (index !== undefined ? index + 1 : 1);
    return `V${v}.0`;
  }

  /**
   * Pour l'affichage dans la liste des versions (php-row__num)
   */
  getVersionNumber(version: any, index: number): string {
    return this.formatVersionNumber(version, index);
  }

  getVersionStatusClass(statut: string): string {
    if (!statut) return 'brouillon';
    const s = statut.toLowerCase();
    if (s.includes('publi'))                           return 'publie';
    if (s.includes('valid'))                           return 'valide';
    if (s.includes('clôtur') || s.includes('clotur')) return 'cloture';
    if (s === 'en cours')                              return 'en-cours';
    if (s.includes('archiv'))                          return 'archive';
    return 'brouillon';
  }

  // ─── ACTIONS ───────────────────────────────────────────────────────────────

  onViewHistory(): void { this.showVersions = !this.showVersions; }

  /**
   * Clic sur une ligne d'historique → navigue vers le formulaire de cette version
   */
  onSelectVersion(v: any): void {
    // Pour la V1.0 synthétique, on utilise l'idProduct du produit courant
    const vId = v?.idProduct ?? v?.Id ?? v?.id ?? this.product?.idProduct;
    if (vId) {
      this.router.navigate(['/products/product-form', vId]);
    }
  }

  onArchiveClick(): void {
    const id = this.product?.idProduct ?? this.product?.id;
    if (!id) return;
    if (!confirm('Voulez-vous vraiment archiver ce modèle ?')) return;

    this.archiving = true;
    const archived = { ...this.product, statut: 'Archivé', isArchived: true };

    this.productService.modifierProduit(id, archived, false).subscribe({
      next: () => {
        this.archiving = false;
        this.onArchived.emit();
        this.ngZone.run(() => {
          this.router.navigateByUrl('/products/catalogue').then(ok => {
            if (!ok) this.router.navigate(['/products/catalogue']);
          });
        });
      },
      error: (err) => {
        this.archiving = false;
        console.error('Erreur archivage:', err);
        this.router.navigate(['/products/catalogue']);
      }
    });
  }

}