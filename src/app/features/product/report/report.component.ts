import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ReportService } from '../../../core/services/report.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-product-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss']
})
export class ReportComponent implements OnInit {
  rapport: any;
  loading = true;
  errorMessage: string = '';
  baseUrl = environment.baseUrl + '/';

  // ─────────────────────────────────────────────
  // OPTION 2 : on déclare les champs UNE seule fois ici,
  // le HTML les affiche ensuite avec un simple *ngFor.
  // 'suffix' est optionnel (utilisé pour les prix en DT).
  // ─────────────────────────────────────────────
  marketingFields: { key: string; label: string; suffix?: string }[] = [
    { key: 'PublicCible', label: 'Public Cible' },
    { key: 'TrancheAge', label: "Tranche d'Âge" },
    { key: 'StyleDeVie', label: 'Style de Vie' },
    { key: 'OccasionPortee', label: 'Occasion de Port' },
    { key: 'NiveauGamme', label: 'Niveau de Gamme' },
    { key: 'NoteAttractiviteVisuelle', label: 'Note Attractivité Visuelle' },
    { key: 'PrixVenteEstime', label: 'Prix de Vente Estimé', suffix: 'DT' },
    { key: 'PrixPsychologique', label: 'Prix Psychologique', suffix: 'DT' },
    { key: 'QuantiteEstimee', label: 'Quantité Estimée' },
    { key: 'IndiceCompetitivite', label: 'Indice Compétitivité' },
    { key: 'MargeCible', label: 'Marge Cible' },
    { key: 'USP_ArgumentUnique', label: 'Argument Unique (USP)' },
    { key: 'ReferenceBestSeller', label: 'Référence Best-Seller' },
    { key: 'NomCommercial', label: 'Nom Commercial' },
    { key: 'CanalDistribution', label: 'Canal de Distribution' },
    { key: 'ArgumentSecondeVie', label: 'Argument Seconde Vie' },
    { key: 'ScoreEcoConception', label: 'Score Éco-Conception' },
    { key: 'Forces', label: 'Forces' },
    { key: 'Faiblesses', label: 'Faiblesses' },
    { key: 'Opportunites', label: 'Opportunités' },
    { key: 'Menaces', label: 'Menaces' },
  ];

  qualiteFields: { key: string; label: string; suffix?: string }[] = [
    { key: 'QualiteTissu', label: 'Qualité du Tissu' },
    { key: 'PoidsEstime', label: 'Poids Estimé' },
    { key: 'ResistanceTraction', label: 'Résistance Traction' },
    { key: 'Elasticite', label: 'Élasticité' },
    { key: 'SoliditeCouleurs', label: 'Solidité des Couleurs' },
    { key: 'StabiliteDimensionnelle', label: 'Stabilité Dimensionnelle' },
    { key: 'Degorgement', label: 'Dégorgement' },
    { key: 'Boulochage', label: 'Boulochage' },
    { key: 'TypeCoutures', label: 'Type de Coutures' },
    { key: 'CompatibiliteFil', label: 'Compatibilité du Fil' },
    { key: 'CertificationsRequises', label: 'Certifications Requises' },
    { key: 'Inflammabilite', label: 'Inflammabilité' },
    { key: 'SecuriteEnfant', label: 'Sécurité Enfant' },
    { key: 'Reparabilite', label: 'Réparabilité' },
    { key: 'CycleDeVie', label: 'Cycle de Vie' },
    { key: 'FermeturesZips', label: 'Fermetures / Zips' },
    { key: 'Boutons', label: 'Boutons' },
    { key: 'RespectNormesISO', label: 'Respect Normes ISO' },
  ];

  constructor(
    private route: ActivatedRoute,
    private reportService: ReportService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];

    if (!id || id === 'undefined') {
      this.errorMessage = 'ID du produit manquant.';
      this.loading = false;
      return;
    }

    this.reportService.getCompleteReport(+id).subscribe({
      next: (data) => {
        this.rapport = data;
        console.log('PALETTE BRUTE 👉', data?.Styliste?.Formulaire?.PalettesDeCouleur);
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur API:', err);
        this.errorMessage = 'Impossible de charger les données.';
        this.loading = false;
      }
    });
  }

  printReport(): void {
    window.print();
  }

  // Petit helper pour l'affichage générique des champs (gère le 'Vide' et le suffixe DT)
  displayField(obj: any, key: string, suffix?: string): string {
  const value = obj?.[key];
  if (value === null || value === undefined || value === '') return 'Vide';
  return suffix ? `${value} ${suffix}` : `${value}`;
}

  // ─────────────────────────────────────────────
  // getPalette() BLINDÉ : accepte à peu près n'importe quel format
  //  - chaîne JSON : '[{"hex":"#fff"}]' ou '["#fff","#000"]'
  //  - chaîne simple : "#fff,#000" ou "#fff;#000"
  //  - tableau d'objets avec clés variées (hex/Hex/code/couleur/valeur/color...)
  //  - tableau de chaînes
  //  - objet { c1:"#fff", c2:"#000" }
  // ─────────────────────────────────────────────
  getPalette(): { hex: string }[] {
    const f = this.rapport?.Styliste?.Formulaire;
    let raw: any =
      f?.PalettesDeCouleur ?? f?.PaletteDeCouleurs ?? f?.Couleurs ?? f?.Palette;
    if (raw === null || raw === undefined) return [];

    // 1) Si c'est une chaîne : tenter JSON, sinon découper sur , ; ou espace
    if (typeof raw === 'string') {
      const s = raw.trim();
      if (!s) return [];
      try {
        raw = JSON.parse(s);
      } catch {
        raw = s.split(/[,;\s]+/).filter(Boolean);
      }
    }

    // 2) Normaliser en tableau de valeurs
    let items: any[];
    if (Array.isArray(raw)) {
      items = raw;
    } else if (raw && typeof raw === 'object') {
      items = Object.values(raw);
    } else {
      items = [raw];
    }

    const hexLike = /#?[0-9a-fA-F]{3,8}\b/;
    const result: { hex: string }[] = [];

    for (const item of items) {
      let val: any;

      if (typeof item === 'string') {
        val = item;
      } else if (item && typeof item === 'object') {
        // essaie les clés les plus courantes
        val =
          item.hex ?? item.Hex ?? item.code ?? item.Code ??
          item.couleur ?? item.Couleur ?? item.valeur ?? item.Valeur ??
          item.value ?? item.color ?? item.Color;
        // sinon, on cherche n'importe quelle valeur qui ressemble à une couleur
        if (!val) {
          val = Object.values(item).find(
            (v) => typeof v === 'string' && hexLike.test(v)
          );
        }
      }

      if (!val) continue;
      let hex = String(val).trim();
      // ajoute le '#' s'il manque (ex: "ffffff" -> "#ffffff")
      if (/^[0-9a-fA-F]{3,8}$/.test(hex)) hex = '#' + hex;
      result.push({ hex });
    }

    return result;
  }

  getTotalBom(): number {
    const composants = this.rapport?.Nomenclature?.Composants ?? [];
    return composants.reduce((sum: number, c: any) => sum + (c.CoutTotal ?? 0), 0);
  }
}