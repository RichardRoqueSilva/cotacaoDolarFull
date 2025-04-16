// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CotacaoDolarService, Moeda } from './cotacaodolar.service';
import { Cotacao } from './cotacao';
import { finalize } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  cotacaoAtual: number | null = null;
  cotacaoAtualTexto: string = 'Carregando...';
  cotacaoPorPeriodoLista: Cotacao[] = [];
  dataInicial: string = '';
  dataFinal: string = '';
  hoje: Date = new Date();
  isLoading: boolean = false;
  isLoadingCurrent: boolean = false;
  mostrarMenores: boolean = false;

  displayedColumns: string[] = ['dataHora', 'preco', 'diferenca'];

  constructor(
    private cotacaoService: CotacaoDolarService,
    private datePipe: DatePipe,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.setDefaultDates();
    this.fetchCotacaoAtual();
  }

  setDefaultDates(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.dataInicial = firstDayOfMonth.toISOString().split('T')[0];
    this.dataFinal = today.toISOString().split('T')[0];
  }

  fetchCotacaoAtual(): void {
    this.isLoadingCurrent = true;
    this.cotacaoAtualTexto = 'Carregando...';
    this.cotacaoService.getCotacaoAtual()
      .pipe(finalize(() => this.isLoadingCurrent = false))
      .subscribe(
        (moedaVindaDoBackend: Moeda) => {
          this.cotacaoAtual = moedaVindaDoBackend.preco;
          const precoFormatado = this.formatPrice(moedaVindaDoBackend.preco);
          this.cotacaoAtualTexto = `${precoFormatado} (última cotação: ${moedaVindaDoBackend.data} - ${moedaVindaDoBackend.hora})`;
        },
        (error) => {
          console.error('Erro ao buscar cotação atual:', error);
          this.cotacaoAtual = null;
          this.cotacaoAtualTexto = 'Erro ao carregar';
          this.showError('Falha ao buscar cotação atual.');
        }
      );
  }

  validateInputs(): boolean {
    if (!this.dataInicial || !this.dataFinal) {
      this.showError('Data inicial e Data final são obrigatórias.');
      return false;
    }
    const dtInicial = new Date(this.dataInicial + 'T00:00:00');
    const dtFinal = new Date(this.dataFinal + 'T00:00:00');
    const dtHoje = new Date();
    dtHoje.setHours(0, 0, 0, 0);
    if (dtInicial > dtFinal) {
      this.showError('Data inicial não pode ser maior que a data final.');
      return false;
    }
    return true;
  }

  getDiferencaClasses(diferenca: string | null | undefined): { [key: string]: boolean } {
    if (!diferenca) {
      return {};
    }
    return {
      'positive-diff': diferenca.startsWith('+'),
      'negative-diff': diferenca.startsWith('-')
    };
  }

  getCotacaoPorPeriodo(): void {
    if (!this.validateInputs()) {
      this.cotacaoPorPeriodoLista = [];
      return;
    }
    this.isLoading = true;
    this.cotacaoPorPeriodoLista = [];
    const serviceCall = this.mostrarMenores
      ? this.cotacaoService.getCotacaoMenorQueAtual(this.dataInicial, this.dataFinal)
      : this.cotacaoService.getCotacaoPorPeriodoFront(this.dataInicial, this.dataFinal);

    serviceCall
      .pipe(finalize(() => this.isLoading = false))
      .subscribe(
        (cotacoes: Cotacao[]) => {
          this.cotacaoPorPeriodoLista = cotacoes.map((itemRecebido: any) => {
             let novaCotacao = new Cotacao(itemRecebido.preco, itemRecebido.data, itemRecebido.hora);
            if (this.cotacaoAtual !== null && novaCotacao.preco !== null && novaCotacao.preco !== undefined) {
               const diff = novaCotacao.preco - this.cotacaoAtual;
               novaCotacao.diferenca = `${diff >= 0 ? '+' : ''}${diff.toFixed(4)}`;
            } else {
               novaCotacao.diferenca = 'N/A';
            }
            novaCotacao.dataTexto = novaCotacao.data;
            return novaCotacao;
          });
          if(this.cotacaoPorPeriodoLista.length === 0){
            this.showInfo('Nenhuma cotação encontrada para o período selecionado.');
          }
        },
        (error) => {
           console.error('Erro ao buscar cotações por período:', error);
           const errorMsg = error?.error?.message || error?.message || 'Falha ao buscar histórico de cotações.';
           this.showError(errorMsg);
           this.cotacaoPorPeriodoLista = [];
        }
      );
  }

  formatPrice(price: number | null): string {
      if (price === null || price === undefined) return 'N/A';
      return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

   showInfo(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 3000,
    });
  }
}