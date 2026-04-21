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
        this.allProducts = data.map((p: any) => this.productService.mapFromApi(p));

        // Si un produit était sélectionné, on recharge ses versions
        if (this.selectedProduct) {
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

  /**
   * Charge l'historique (versions) d'un produit.
   * Retourne un Observable qui émet le tableau des versions.
   */
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

    // Les autres acteurs (non Styliste/Admin) voient tous les produits
    // sauf les brouillons (réservés au Styliste uniquement)
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

  // ─── ACTIONS ──────────────────────────────────────────────────────────────

  /**
   * Clic sur une carte produit :
   * - BROUILLON (Styliste)  → ouvre directement le formulaire product-form/:id
   * - Tout autre statut     → ouvre le Summary dans la même page
   *   → On charge d'abord l'historique (versions) du produit pour que le summary les affiche.
   */
  onSelectProduct(p: Product): void {
    if (!p) return;
    const status = this.getEffectiveStatus(p).toLowerCase().trim();

    if (this.userRole === 'Styliste' && status.includes('brouillon')) {
      // Brouillon → aller directement au formulaire d'édition
      this.router.navigate(['/products/product-form', p.idProduct]);
    } else {
      // Pour les autres statuts, charger les versions avant d'ouvrir le summary
      this.productService.getHistorique(p.idProduct).subscribe({
        next: (versions) => {
          const productWithVersions = { ...p, versions: versions };
          this.selectedProduct = productWithVersions;
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
    const product = this.allProducts.find(p => p.idProduct === id);
    if (!product) return;
    const updated = { ...product, statut: 'Publié', isArchived: false };
    this.productService.modifierProduit(id, updated, false).subscribe({
      next: () => this.loadProducts(),
      error: (err) => console.error('Erreur désarchivage', err)
    });
  }

  onProductArchived(): void {
    this.selectedProduct = null;
    this.loadProducts();
    this.switchTab('archives');
  }

  // ─── UTILITAIRES ──────────────────────────────────────────────────────────

  getEffectiveStatus(product: Product): string {
    if (product.isArchived) return 'Archivé';
    // Toujours le statut de la DERNIÈRE version
    if (product.versions && product.versions.length > 0) {
      const last = product.versions[product.versions.length - 1];
      return last.statut || product.statut || 'Brouillon';
    }
    return product.statut || 'Brouillon';
  }

  getStatusClass(product: Product): string {
    const s = this.getEffectiveStatus(product).toLowerCase();
    if (s.includes('publi'))                            return 'publie';
    if (s.includes('valid'))                            return 'valide';
    if (s.includes('clôtur') || s.includes('clotur'))  return 'cloture';
    if (s.includes('en cours'))                         return 'en-cours';
    return 'brouillon';
  }

  getProductImageUrl(product: Product): string {
    if (product.images && product.images.length > 0) {
      const img = product.images[0];
      return typeof img === 'string' ? img : (img as any).cheminImage;
    }
    return 'assets/placeholder.png';
  }

  handleImageError(event: any): void {
    event.target.src = 'assets/placeholder.png';
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