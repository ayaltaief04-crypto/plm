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

  userRole: string     = '';
  isStyliste: boolean  = false;
  showVersions: boolean = false;
  activeImageIndex: number = 0;
  archiving: boolean   = false;

  constructor(
    private authService: AuthService,
    private productService: ProductService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
  this.userRole = this.authService.getRole() || '';
  // Convertit en minuscules avant de comparer pour éviter les pièges de casse
  this.isStyliste = this.userRole.toLowerCase().trim() === 'styliste';
  this.activeImageIndex = 0;
}

  // ─── HELPER TRI ────────────────────────────────────────────────────────────

  private parseVersionNum(v: any): number {
    const num = (v.numVersion || v.versionName || '0.0')
      .replace(/^V/i, '').trim();
    const [major, minor] = num.split('.').map(Number);
    return (major || 0) * 1000 + (minor || 0);
  }

  private sortVersions(versions: any[]): any[] {
    return [...versions].sort((a, b) => this.parseVersionNum(a) - this.parseVersionNum(b));
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
    if (this.product?.isArchived) return 'Archivé';

    const normalize = (s: string) =>
      (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

    const statut = normalize(this.product?.statut ?? '');

    if (statut === 'VALIDE')    return 'Validé';
    if (statut === 'CLOTURE')   return 'Clôturé';
    if (statut === 'EN COURS')  return 'En cours';
    if (statut === 'BROUILLON') return 'Brouillon';

    return 'Publié';
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

  // ─── VERSIONS ──────────────────────────────────────────────────────────────

  // V1 synthétique si absente dans la liste
  get v1Version(): any {
    const versions = this.product?.versions ?? [];
    const found = versions.find((v: any) => {
      const num = (v.numVersion || v.versionName || '').replace(/^V/i, '').trim();
      return num === '1.0' || num === '1';
    });
    return found ?? {
      numVersion:      this.product?.numVersion || '1.0',
      statut:          this.product?.statut || 'Publié',
      dateCreationRef: this.product?.dateCreationRef || null,
      dateVersion:     this.product?.dateVersion     || null,
      id:              this.product?.idProduct        || null,
      idProduct:       this.product?.idProduct        || null,
      _synthetic:      true
    };
  }

  // Toutes les versions triées V1.0 → dernière
  get allVersions(): any[] {
    const versions = this.product?.versions ?? [];
    if (!versions.length) return [this.v1Version];
    return this.sortVersions(versions);
  }

  // Toutes les versions = même liste (pour le compteur du badge)
  get versionsHistorique(): any[] {
    return this.allVersions;
  }

  // Nom de la dernière version (après tri)
  get latestVersionName(): string {
    const sorted = this.allVersions;
    if (!sorted.length) return this.product?.numVersion || 'V1.0';
    return this.formatVersionNumber(sorted[sorted.length - 1]);
  }

  formatVersionNumber(version: any, index?: number): string {
    if (version?.numVersion) {
      const v = version.numVersion.toString();
      return v.startsWith('V') ? v : `V${v}`;
    }
    if (version?.versionName) {
      const vn = version.versionName.toString();
      return vn.startsWith('V') ? vn : `V${vn}`;
    }
    const idx = (index !== undefined ? index + 1 : 1);
    return `V${idx}.0`;
  }

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

  onViewHistory(): void {
    this.showVersions = !this.showVersions;
  }

  isV1(v: any): boolean {
    const num = (v.numVersion || v.versionName || '').toString().replace(/^V/i, '').trim();
    return num === '1.0' || num === '1';
  }

  // Consulter la DERNIÈRE version (triée)
  onConsulterLatest(): void {
    const sorted = this.allVersions;
    if (sorted.length > 0) {
      const last = sorted[sorted.length - 1];
      const vId = last?.id ?? last?.idProduct ?? last?.Id;
      if (vId) {
        this.router.navigate(['/products/product-form', vId]);
        return;
      }
    }
    const rootId = this.product?.idProduct ?? this.product?.id;
    if (rootId) this.router.navigate(['/products/product-form', rootId]);
  }

  // Consulter la V1.0
  onConsulterV1(): void {
    const vId = this.v1Version?.id ?? this.v1Version?.idProduct ?? this.product?.idProduct;
    if (vId) this.router.navigate(['/products/product-form', vId]);
  }

  onSelectVersion(v: any): void {
    const vId = v?.id ?? v?.idProduct ?? v?.Id ?? this.product?.idProduct;
    if (vId) this.router.navigate(['/products/product-form', vId]);
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