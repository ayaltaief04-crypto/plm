import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PrintReportService {

  /**
   * Génère et imprime le rapport complet d'un produit/version
   * Collecte les données de tous les formulaires et gère le temps réel
   */
  printReport(product: any, selectedVersion: any, userRole: string): void {
    const versionName = selectedVersion?.versionName || (product?.statut === 'Brouillon' ? 'Brouillon' : 'V1.0');
    const printDate = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    // ── COLLECTE DES DONNÉES (Gestion Temps Réel & Versions) ───────
    // On priorise la version sélectionnée, sinon on prend le produit (temps réel)
    const s = product || {};
    const vData = selectedVersion?.productData || s;
    const m = s.marketingData || s; // Données Marketing
    const q = s.qualityData || s;   // Données Qualité
    const nomItems: any[] = s.nomenclatureItems || [];

    // Palette couleurs
    const paletteHtml = (vData.paletteCouleurs || s.paletteCouleurs || [])
      .map((c: any) => `<span class="color-swatch" style="background:${c.hex}" title="${c.hex}"></span>`)
      .join('');

    // Tableau nomenclature
    const nomRowsHtml = nomItems.length > 0
      ? nomItems.map((item: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${item.designation || '—'}</strong></td>
          <td>${item.reference || '—'}</td>
          <td>${item.taille || '—'}</td>
          <td>${item.couleur || '—'}</td>
          <td>${item.position || '—'}</td>
          <td class="center">${item.quantite ?? '—'}</td>
          <td>${item.unite || 'pcs'}</td>
          <td>${item.fournisseur || '—'}</td>
          <td class="right">${item.prixUnitaire ? Number(item.prixUnitaire).toFixed(2) + ' TND' : '—'}</td>
          <td class="right"><strong>${item.quantite && item.prixUnitaire ? (item.quantite * item.prixUnitaire).toFixed(2) + ' TND' : '—'}</strong></td>
        </tr>`).join('')
      : '<tr><td colspan="11" class="empty-row">Aucun composant enregistré</td></tr>';

    const nomTotal = nomItems.reduce((acc: number, i: any) =>
      acc + ((i.quantite || 0) * (i.prixUnitaire || 0)), 0);

    // Image principale
    const mainImage = (s.images?.[0]?.cheminImage || s.imageUrls?.[0] || '');
    const imageHtml = mainImage
      ? `<img src="${mainImage}" class="product-photo" alt="Visuel produit">`
      : `<div class="no-photo"><span>Aucun visuel</span></div>`;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1e293b; background: #fff; line-height: 1.5; }
  @page { size: A4 portrait; margin: 18mm 16mm 18mm 16mm; }
  .page-break { page-break-before: always; }
  .avoid-break { page-break-inside: avoid; }
  .center { text-align: center; } .right { text-align: right; }
  .cover { min-height: 260mm; display: flex; flex-direction: column; justify-content: space-between; padding: 20mm 0 10mm; }
  .cover-header { display: flex; align-items: center; gap: 14px; margin-bottom: 40px; padding-bottom: 18px; border-bottom: 2px solid #0b3d6e; }
  .cover-logo { width: 48px; height: 48px; background: #0b3d6e; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 18px; font-weight: 900; }
  .cover-brand strong { display: block; font-size: 16pt; font-weight: 800; color: #0b3d6e; }
  .cover-body { display: flex; gap: 32px; align-items: flex-start; }
  .product-photo { width: 210px; height: 280px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; }
  .no-photo { width: 210px; height: 280px; border: 1px dashed #cbd5e1; border-radius: 10px; background: #f8fafc; display: flex; align-items: center; justify-content: center; color: #94a3b8; }
  .cover-title { font-size: 22pt; font-weight: 900; color: #0b3d6e; margin-bottom: 6px; }
  .cover-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; }
  .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
  .meta-box__label { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; color: #94a3b8; display: block; }
  .status-pill { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 8pt; font-weight: 800; text-transform: uppercase; }
  .status-publie { background: #d1fae5; color: #047857; }
  .status-valide { background: #ede9fe; color: #6d28d9; }
  .status-encours { background: #fef3c7; color: #b45309; }
  .status-brouillon { background: #dbeafe; color: #1d4ed8; }
  .color-swatch { display: inline-block; width: 22px; height: 22px; border-radius: 50%; border: 2px solid rgba(0,0,0,.1); }
  .section-title { display: flex; align-items: center; gap: 10px; margin: 0 0 16px; padding-bottom: 10px; border-bottom: 2px solid #0b3d6e; }
  .section-title h2 { font-size: 13pt; font-weight: 800; color: #0b3d6e; }
  .data-grid { display: grid; gap: 8px 16px; margin-bottom: 16px; }
  .data-grid-2 { grid-template-columns: 1fr 1fr; }
  .data-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .data-grid-4 { grid-template-columns: repeat(4, 1fr); }
  .data-field__label { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; color: #94a3b8; display: block; }
  .data-field__value { font-size: 9.5pt; color: #1e293b; font-weight: 500; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; min-height: 18px; }
  .bloc { border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 14px; overflow: hidden; }
  .bloc__head { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 8px 14px; font-size: 8.5pt; font-weight: 800; text-transform: uppercase; color: #475569; }
  .bloc__body { padding: 12px 14px; }
  .swot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .swot-box { border-radius: 8px; padding: 10px 12px; }
  .swot-s { background: #f0fdf4; color: #047857; } .swot-w { background: #fff1f2; color: #be123c; }
  .nom-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  .nom-table thead { background: #0b3d6e; color: #fff; }
  .nom-table th, .nom-table td { padding: 6px 8px; border: 1px solid #f1f5f9; }
  .score-bar-track { height: 6px; background: #e2e8f0; border-radius: 10px; margin-top: 4px; }
  .score-bar-fill { height: 100%; background: #0b3d6e; border-radius: 10px; }
  .page-footer { position: fixed; bottom: 0; left: 0; right: 0; height: 10mm; display: flex; align-items: center; justify-content: space-between; padding: 0 16mm; font-size: 7.5pt; color: #94a3b8; border-top: 1px solid #e2e8f0; }
</style>
</head>
<body>
<div class="cover avoid-break">
  <div>
    <div class="cover-header">
      <div class="cover-logo">TF</div>
      <div><div class="cover-brand"><strong>TextileFlow PLM</strong>Système de Gestion Produit</div></div>
    </div>
    <div class="cover-body">
      ${imageHtml}
      <div class="cover-info">
        <div class="cover-title">${s.designation || 'Produit sans nom'}</div>
        <div class="cover-ref">Réf. ${s.reference || '—'} · ${versionName}</div>
        <div style="margin-bottom:16px">
          <span class="status-pill ${this.getStatusClass(selectedVersion?.statut || s.statut)}">${selectedVersion?.statut || s.statut || 'Brouillon'}</span>
        </div>
        <div class="cover-meta-grid">
          <div class="meta-box"><span class="meta-box__label">Collection</span><span class="meta-box__value">${vData.collection || '—'}</span></div>
          <div class="meta-box"><span class="meta-box__label">Saison</span><span class="meta-box__value">${vData.saison || '—'}</span></div>
        </div>
        <div class="meta-box" style="margin-top:10px">
          <span class="meta-box__label">Description</span>
          <span class="meta-box__value">${vData.description || '—'}</span>
        </div>
      </div>
    </div>
  </div>
  <div class="cover-footer"><span>Généré le ${printDate}</span><span>Usage Confidentiel</span><span>${userRole}</span></div>
</div>

<div class="page-break">
  <div class="section-title"><h2>Données Techniques Styliste</h2></div>
  <div class="bloc">
    <div class="bloc__head">📋 Classification & Matières</div>
    <div class="bloc__body">
      <div class="data-grid data-grid-4">
        ${this.field('Catégorie', vData.categorie)}
        ${this.field('Saison', vData.saison)}
        ${this.field('Matière', vData.matierePrincipale)}
        ${this.field('Composition', vData.composition)}
      </div>
    </div>
  </div>
  <div class="bloc">
    <div class="bloc__head">⚙️ Montage</div>
    <div class="bloc__body">
      <div class="data-grid data-grid-3">
        ${this.field('Finitions', vData.finitions)}
        ${this.field('Complexité', vData.complexiteMontage)}
        ${this.field('Type de Fil', vData.typeFil)}
      </div>
    </div>
  </div>
</div>

<div class="page-break">
  <div class="section-title"><h2>Analyse Marketing</h2></div>
  <div class="bloc">
    <div class="bloc__head">🎯 ADN Commercial</div>
    <div class="bloc__body">
      <div class="data-grid data-grid-3">
        ${this.field('Nom Commercial', m.nomCommercial)}
        ${this.field('Public Cible', m.publicCible)}
        ${this.field('Prix Vente (TND)', m.prixVenteEstime)}
      </div>
      <div style="margin-top:10px">${this.field('USP', m.usp, true)}</div>
    </div>
  </div>
  <div class="swot-grid">
    <div class="swot-box swot-s"><strong>Forces:</strong> <p>${m.forces || '—'}</p></div>
    <div class="swot-box swot-w"><strong>Faiblesses:</strong> <p>${m.faiblesses || '—'}</p></div>
  </div>
</div>

<div class="page-break">
  <div class="section-title"><h2>Nomenclature (BOM)</h2></div>
  <table class="nom-table">
    <thead><tr><th>#</th><th>Désignation</th><th>Réf.</th><th>Position</th><th>Qté</th><th>P.U</th><th>Total</th></tr></thead>
    <tbody>
      ${nomRowsHtml}
      <tr style="background:#f1f5f9; font-weight:bold;"><td colspan="6" class="right">TOTAL</td><td class="right">${nomTotal.toFixed(2)} TND</td></tr>
    </tbody>
  </table>
</div>

<div class="page-footer"><span>TextileFlow PLM</span><span>${s.designation || ''}</span><span>Page 1/1</span></div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
      };
    }
  }

  // ── HELPERS INTERNES (Pour éviter les erreurs TS2304) ──────────────────

  private field(label: string, value: any, fullWidth = false): string {
    const display = value ? String(value) : '—';
    const style = fullWidth ? 'grid-column: 1 / -1;' : '';
    return `<div class="data-field" style="${style}">
      <span class="data-field__label">${label}</span>
      <div class="data-field__value">${display}</div>
    </div>`;
  }

  private getStatusClass(statut: string): string {
    const s = (statut || '').toLowerCase();
    if (s.includes('publi')) return 'status-publie';
    if (s.includes('valid')) return 'status-valide';
    if (s.includes('cours')) return 'status-encours';
    return 'status-brouillon';
  }
}