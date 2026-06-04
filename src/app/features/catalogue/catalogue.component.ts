// catalogue.component.ts
import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { ProductService } from '../../core/services/product.service';
import { AuthService } from '../../core/services/auth.service';
import { Product } from '../../core/models/product.model';
import { Router } from '@angular/router';
import { Subscription, Observable } from 'rxjs';

@Component({
  selector: 'app-catalogue',
  templateUrl: './catalogue.component.html',
  styleUrls: ['./catalogue.component.scss']
})
export class CatalogueComponent implements OnInit, OnDestroy {

  userRole: string = '';
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  filteredArchives: Product[] = [];

  private updateSub!: Subscription;

  activeTab: 'actif' | 'archives' = 'actif';

  searchTerm: string = '';
  statusFilter: string = 'tous';
  archiveFilter: string = 'tous';

  filterDropdownOpen = false;
  archFilterDropdownOpen = false;

  selectedProduct: Product | null = null;

  readonly STATUS_FILTERS = [
    { value: 'tous',      label: 'Tous les modèles', dot: '#94a3b8' },
    { value: 'publie',    label: 'Publié',            dot: '#16a34a' },
    { value: 'valide',    label: 'Validé',            dot: '#7c3aed' },
    { value: 'en cours',  label: 'En cours',          dot: '#d97706' },
    { value: 'brouillon', label: 'Brouillon',         dot: '#2563eb' },
    { value: 'cloture',   label: 'Clôturé',           dot: '#64748b' },
  ];

  constructor(
    private productService: ProductService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRole();
    this.loadProducts();
  }

  ngOnDestroy(): void {
    if (this.updateSub) this.updateSub.unsubscribe();
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    this.loadProducts();
  }

  loadProducts(): void {
  this.productService.getCatalogue().subscribe({
    next: (data) => {
      console.log('DEBUG RAW (brut de l\'API):', data);   // 👈 ajoute cette ligne
      this.allProducts = data.map((p: any) => this.productService.mapFromApi(p));
      console.log('DEBUG mappé:', this.allProducts.map(p => ({ ref: p.reference, isArchived: p.isArchived })));
      // ... reste inchangé

      if (this.selectedProduct) {
        // ... le reste inchangé
          const fresh = this.allProducts.find(
            p => p.idProduct === this.selectedProduct?.idProduct
          );
          if (fresh) {
            this.loadVersionsForProduct(fresh.idProduct).subscribe(versions => {
              fresh.versions = versions;
              this.selectedProduct = { ...fresh };
              this.applyFilters();
            });
          } else {
            this.selectedProduct = null;
            this.applyFilters();
          }
        } else {
          this.applyFilters();
        }
      },
      error: (err) => console.error('Erreur chargement catalogue', err)
    });
  }

  private loadVersionsForProduct(productId: number): Observable<any[]> {
    return this.productService.getHistorique(productId);
  }

  // ─── NAVIGATION & ONGLETS ─────────────────────────────────────────────────

  switchTab(tab: 'actif' | 'archives'): void {
    this.activeTab = tab;
    this.closeFilterDropdown();
    this.closeArchFilterDropdown();
  }

  // ─── RECHERCHE & FILTRES ──────────────────────────────────────────────────

  onGlobalSearch(event: any): void {
    this.searchTerm = event.target.value;
    this.applyFilters();
  }

  applyFilters(): void {
    let actifs = this.allProducts.filter(p => !p.isArchived);

    // Les non-Styliste/Admin ne voient pas les brouillons
    if (this.userRole !== 'Styliste' && this.userRole !== 'Admin') {
      actifs = actifs.filter(p => {
        const s = this.getEffectiveStatus(p).toLowerCase();
        return !s.includes('brouillon');
      });
    }

    if (this.statusFilter !== 'tous') {
      actifs = actifs.filter(p =>
        this.getEffectiveStatus(p).toLowerCase().includes(this.statusFilter.toLowerCase())
      );
    }

    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      actifs = actifs.filter(p =>
        p.reference?.toLowerCase().includes(t) ||
        p.designation?.toLowerCase().includes(t)
      );
    }
    this.filteredProducts = actifs;

    let archives = this.allProducts.filter(p => p.isArchived === true);
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      archives = archives.filter(p =>
        p.reference?.toLowerCase().includes(t) ||
        p.designation?.toLowerCase().includes(t)
      );
    }
    this.filteredArchives = archives;
  }

  // ─── DROPDOWNS ────────────────────────────────────────────────────────────

  toggleFilterDropdown(): void {
    this.filterDropdownOpen = !this.filterDropdownOpen;
    this.archFilterDropdownOpen = false;
  }

  toggleArchFilterDropdown(): void {
    this.archFilterDropdownOpen = !this.archFilterDropdownOpen;
    this.filterDropdownOpen = false;
  }

  closeFilterDropdown(): void     { this.filterDropdownOpen = false; }
  closeArchFilterDropdown(): void { this.archFilterDropdownOpen = false; }

  onStatusFilter(val: string): void {
    this.statusFilter = val;
    this.filterDropdownOpen = false;
    this.applyFilters();
  }

  onArchiveFilter(val: string): void {
    this.archiveFilter = val;
    this.archFilterDropdownOpen = false;
    this.applyFilters();
  }

  // ─── GETTERS ──────────────────────────────────────────────────────────────

  get currentFilterLabel(): string {
    const f = this.STATUS_FILTERS.find(x => x.value === this.statusFilter);
    return f ? f.label : 'Tous les modèles';
  }

  get currentArchFilterLabel(): string {
    return this.archiveFilter === 'tous' ? 'Filtrer les archives' : this.archiveFilter;
  }

  getStatusDotColor(val: string): string {
    const f = this.STATUS_FILTERS.find(x => x.value === val);
    return f ? f.dot : '#94a3b8';
  }

  get showArchiveTab(): boolean {
    return this.userRole === 'Styliste' || this.userRole === 'Admin';
  }

  get visibleStatusFilters() {
    if (this.userRole === 'Styliste' || this.userRole === 'Admin') return this.STATUS_FILTERS;
    return this.STATUS_FILTERS.filter(f =>
      ['tous', 'publie', 'valide', 'cloture', 'en cours'].includes(f.value)
    );
  }

  // ─── STATUT EFFECTIF ──────────────────────────────────────────────────────

  /**
   * Statut effectif d'un produit dans le catalogue.
   * - Si archivé → Archivé
   * - Si statut propre = VALIDE → Validé
   * - Si statut propre = CLOTURE → Clôturé
   * - Sinon (PUBLIE, EN COURS, vide) → Publié
   *   (V1.0 reste toujours PUBLIÉ dans le catalogue)
   */
  getEffectiveStatus(product: Product): string {
  if (product.isArchived) return 'Archivé';

  const normalize = (s: string) =>
    (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

  const productStatut = normalize(product.statut ?? '');

  if (productStatut === 'BROUILLON') return 'Brouillon'; // ✅ Ajout
  if (productStatut === 'EN COURS')  return 'En cours';  // ✅ Ajout
  if (productStatut === 'VALIDE')    return 'Validé';
  if (productStatut === 'CLOTURE')   return 'Clôturé';

  return 'Publié'; // uniquement PUBLIE reste ici
}

  getStatusClass(product: Product): string {
  const s = this.getEffectiveStatus(product).toLowerCase();
  if (s.includes('brouillon')) return 'brouillon';  // ✅ monter en premier
  if (s.includes('en cours'))  return 'en-cours';   // ✅ monter en second
  if (s.includes('publi'))     return 'publie';
  if (s.includes('valid'))     return 'valide';
  if (s.includes('clôtur') || s.includes('clotur')) return 'cloture';
  return 'brouillon';
}

  getProductImageUrl(product: Product): string | null {
  if (product.images && product.images.length > 0) {
    const img = product.images[0];
    const url = typeof img === 'string' ? img : (img as any).cheminImage;
    return url || null; // retourne null si url est vide ou undefined
  }
  return null;
}

handleImageError(event: any): void {
  event.target.style.display = 'none';
  const noImg = event.target.nextElementSibling;
  if (noImg) noImg.style.display = 'flex';
}
  // ─── ACTIONS ──────────────────────────────────────────────────────────────

  /**
   * Clic sur une carte produit :
   * - BROUILLON (Styliste) → formulaire product-form/:id
   * - Tous les autres statuts → Summary avec historique des versions
   */
  onSelectProduct(p: Product): void {
    if (!p) return;
    const status = this.getEffectiveStatus(p).toLowerCase().trim();

    if (this.userRole === 'Styliste' && status.includes('brouillon')) {
      this.router.navigate(['/products/product-form', p.idProduct]);
    } else {
      // Charger l'historique des versions avant d'ouvrir le summary
      this.productService.getHistorique(p.idProduct).subscribe({
        next: (versions) => {
          this.selectedProduct = { ...p, versions };
        },
        error: (err) => {
          console.warn('Erreur chargement historique, ouverture sans versions', err);
          this.selectedProduct = { ...p, versions: [] };
        }
      });
    }
  }

  closeSummary(): void {
    this.selectedProduct = null;
    this.loadProducts();
  }

  onUnarchive(id: number, event: Event): void {
  event.stopPropagation();
  this.productService.basculerArchivage(id).subscribe({
    next: () => this.loadProducts(),
    error: (err) => console.error('Erreur désarchivage', err)
  });
}

  onProductArchived(): void {
    this.selectedProduct = null;
    this.loadProducts();
    this.switchTab('archives');
  }

  allerAuFormulaire(): void {
    this.router.navigate(['/products/creer-produit']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target.closest('.filter-wrap')) {
      this.filterDropdownOpen = false;
      this.archFilterDropdownOpen = false;
    }
  }
}