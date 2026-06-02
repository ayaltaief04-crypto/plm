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

  getPalette(): { hex: string }[] {
    const raw = this.rapport?.Styliste?.Formulaire?.PalettesDeCouleur;
    if (!raw) return [];
    try {
      return JSON.parse(raw) ?? [];
    } catch {
      return [];
    }
  }

  getTotalBom(): number {
    const composants = this.rapport?.Nomenclature?.Composants ?? [];
    return composants.reduce((sum: number, c: any) => sum + (c.CoutTotal ?? 0), 0);
  }
}