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

  menorCotacaoDaLista: Cotacao | null = null;
  menorCotacaoTextoCompleto: string | null = null;

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
          try {
            this.cotacaoAtual = moedaVindaDoBackend.preco;
            const precoFormatado = this.formatPrice(moedaVindaDoBackend.preco);

            let dataFormatada: string | null = null;
            if (moedaVindaDoBackend.data && typeof moedaVindaDoBackend.data === 'string') {
                let parts = moedaVindaDoBackend.data.split('/');
                let dateObject: Date | null = null;
                if (parts.length === 3) {
                    dateObject = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                } else {
                    parts = moedaVindaDoBackend.data.split('-');
                     if (parts.length === 3) {
                         dateObject = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
                     }
                }

                if (dateObject && !isNaN(dateObject.getTime())) {
                     dataFormatada = this.datePipe.transform(dateObject, 'dd/MM/yyyy');
                } else {
                     console.warn("Formato de data não reconhecido:", moedaVindaDoBackend.data);
                     dataFormatada = moedaVindaDoBackend.data;
                }
            }

            if (dataFormatada) {
               this.cotacaoAtualTexto = `${precoFormatado} (Última cotação: ${dataFormatada} - ${moedaVindaDoBackend.hora})`;
            } else {
               this.cotacaoAtualTexto = `${precoFormatado} (hora: ${moedaVindaDoBackend.hora})`;
               console.error("Não foi possível formatar a data da cotação atual.");
            }

            this.recalculateListDifferences();
          } catch (formatError) {
             console.error("Erro durante o processamento da cotação atual:", formatError);
             this.cotacaoAtualTexto = 'Erro ao exibir dados.';
             this.cotacaoAtual = moedaVindaDoBackend.preco;
             this.recalculateListDifferences();
          }
        },
        (error) => {
          console.error('Erro HTTP ao buscar cotação atual:', error);
          this.cotacaoAtual = null;
          this.cotacaoAtualTexto = 'Erro ao carregar';
          this.showError('Falha ao buscar cotação atual.');
          this.recalculateListDifferences();
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
    if (dtInicial > dtFinal) {
      this.showError('Data inicial não pode ser maior que a data final.');
      return false;
    }
    return true;
  }

  getDiferencaClasses(diferenca: string | null | undefined): { [key: string]: boolean } {
    if (!diferenca) { return {}; }
    return {
      'positive-diff': diferenca.startsWith('+'),
      'negative-diff': diferenca.startsWith('-')
    };
  }


  getCotacaoPorPeriodo(): void {
    if (!this.validateInputs()) {
      this.cotacaoPorPeriodoLista = [];
      this.menorCotacaoDaLista = null;
      this.menorCotacaoTextoCompleto = null;
      return;
    }
    this.isLoading = true;
    this.cotacaoPorPeriodoLista = [];
    this.menorCotacaoDaLista = null;
    this.menorCotacaoTextoCompleto = null;

    const serviceCall = this.mostrarMenores
      ? this.cotacaoService.getCotacaoMenorQueAtual(this.dataInicial, this.dataFinal)
      : this.cotacaoService.getCotacaoPorPeriodoFront(this.dataInicial, this.dataFinal);

    serviceCall
      .pipe(finalize(() => this.isLoading = false))
      .subscribe(
        (cotacoes: Cotacao[]) => {
          let menorTemp: Cotacao | null = null;

          this.cotacaoPorPeriodoLista = cotacoes.map((itemRecebido: any) => {
             let novaCotacao = new Cotacao(itemRecebido.preco, itemRecebido.data, itemRecebido.hora);
            if (this.cotacaoAtual !== null && novaCotacao.preco !== null && novaCotacao.preco !== undefined) {
               const diff = novaCotacao.preco - this.cotacaoAtual;
               novaCotacao.diferenca = `${diff >= 0 ? '+' : ''}${diff.toFixed(4)}`;
            } else {
               novaCotacao.diferenca = 'N/A';
            }
             novaCotacao.dataTexto = novaCotacao.data;

             if (novaCotacao.preco !== null && novaCotacao.preco !== undefined) {
                 if (menorTemp === null || novaCotacao.preco < menorTemp.preco!) {
                    menorTemp = novaCotacao;
                 }
             }
            return novaCotacao;
          });

          this.cotacaoPorPeriodoLista.sort((a, b) => {
            const parseDate = (dateString: string): Date | null => {
                if (!dateString || typeof dateString !== 'string') return null;
                const parts = dateString.split('/');
                if (parts.length === 3) {
                    const day = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1;
                    const year = parseInt(parts[2]);
                    const dateObj = new Date(year, month, day);
                    return !isNaN(dateObj.getTime()) ? dateObj : null;
                }

                console.warn("Formato de data não reconhecido para ordenação:", dateString);
                return null;
            };

            const dateA = parseDate(a.data);
            const dateB = parseDate(b.data);

            if (!dateA || !dateB) return 0;

            return dateB.getTime() - dateA.getTime();
          });

          this.menorCotacaoDaLista = menorTemp;

          if (this.menorCotacaoDaLista) {
            const menorCotacaoRef = this.menorCotacaoDaLista;
            try {
                const precoMenorFormatado = this.formatPrice((menorCotacaoRef as Cotacao).preco);
                let dataMenorFormatada: string | null = null;

                if ((menorCotacaoRef as Cotacao).data && typeof (menorCotacaoRef as Cotacao).data === 'string') {
                    let parts = (menorCotacaoRef as Cotacao).data.split('/');
                    let dateObject : Date | null = null;
                     if (parts.length === 3) {
                        dateObject = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                     } else {
                        parts = (menorCotacaoRef as Cotacao).data.split('-');
                        if (parts.length === 3) {
                            dateObject = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
                        }
                     }

                     if (dateObject && !isNaN(dateObject.getTime())) {
                         dataMenorFormatada = this.datePipe.transform(dateObject, 'dd/MM/yyyy');
                     } else {
                         console.warn("Formato data menor cotação inválido:", (menorCotacaoRef as Cotacao).data);
                         dataMenorFormatada = (menorCotacaoRef as Cotacao).data;
                     }
                }


                if(dataMenorFormatada){
                   this.menorCotacaoTextoCompleto = `${precoMenorFormatado} (Menor cotação: ${dataMenorFormatada} - ${(menorCotacaoRef as Cotacao).hora})`;
                } else {
                   this.menorCotacaoTextoCompleto = `${precoMenorFormatado} (Hora: ${(menorCotacaoRef as Cotacao).hora})`;
                   console.error("Não foi possível formatar a data da menor cotação.");
                }
            } catch(formatError) {
                console.error("Erro durante o processamento da menor cotação:", formatError);
                this.menorCotacaoTextoCompleto = 'Erro ao exibir dados.';
            }
          } else {
            this.menorCotacaoTextoCompleto = null;
          }

          if(this.cotacaoPorPeriodoLista.length === 0 && !this.isLoading){
            this.showInfo('Nenhuma cotação encontrada para o período selecionado.');
          }
        },
        (error) => {
           console.error('Erro ao buscar cotações por período:', error);
           const errorMsg = error?.error?.message || error?.message || 'Falha ao buscar histórico de cotações.';
           this.showError(errorMsg);
           this.cotacaoPorPeriodoLista = [];
           this.menorCotacaoDaLista = null;
           this.menorCotacaoTextoCompleto = null;
        }
      );
  }

  recalculateListDifferences(): void {
    if (!this.cotacaoPorPeriodoLista || this.cotacaoPorPeriodoLista.length === 0) { return; }
    this.cotacaoPorPeriodoLista = this.cotacaoPorPeriodoLista.map(cotacao => {
        if (this.cotacaoAtual !== null && cotacao.preco !== null && cotacao.preco !== undefined) {
            const diff = cotacao.preco - this.cotacaoAtual;
            cotacao.diferenca = `${diff >= 0 ? '+' : ''}${diff.toFixed(4)}`;
        } else {
            cotacao.diferenca = 'N/A';
        }
        return cotacao;
    });
  }

  formatPrice(price: number | null): string {
      if (price === null || price === undefined) return 'N/A';
      return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Fechar', { duration: 5000, panelClass: ['error-snackbar'] });
  }

  showInfo(message: string): void {
    this.snackBar.open(message, 'Fechar', { duration: 3000 });
  }
}