
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Cotacao } from './cotacao';
import { DatePipe } from '@angular/common'; 

@Injectable({ providedIn: 'root' })
export class CotacaoDolarService {
  private apiServerUrl = 'http://localhost:8080';


  constructor(private http: HttpClient, private datePipe: DatePipe) {}


  private formatarDataBackend(data: string): string | null {

    try {
       const dateObj = new Date(data + 'T00:00:00'); 
       return this.datePipe.transform(dateObj, 'MM-dd-yyyy');
    } catch(e) {
       console.error("Erro ao formatar data para backend:", e);
       return null; 
    }
  }

  public getCotacaoAtual(): Observable<Moeda> { 
   
    return this.http.get<Moeda>(`${this.apiServerUrl}/moeda/atual`);
  }

  public getCotacaoPorPeriodoFront(
    dataInicial: string, 
    dataFinal: string   
  ): Observable<Cotacao[]> {
    const dataInicialFormatada = this.formatarDataBackend(dataInicial);
    const dataFinalFormatada = this.formatarDataBackend(dataFinal);

    if (!dataInicialFormatada || !dataFinalFormatada) {
   
        return new Observable<Cotacao[]>(observer => observer.error('Formato de data inválido'));
    }

 
    return this.http.get<Cotacao[]>(`${this.apiServerUrl}/moeda/${dataInicialFormatada}&${dataFinalFormatada}`);
  }

  public getCotacaoMenorQueAtual(
    dataInicial: string, 
    dataFinal: string   
  ): Observable<Cotacao[]> {
     const dataInicialFormatada = this.formatarDataBackend(dataInicial);
     const dataFinalFormatada = this.formatarDataBackend(dataFinal);

     if (!dataInicialFormatada || !dataFinalFormatada) {
         return new Observable<Cotacao[]>(observer => observer.error('Formato de data inválido'));
     }
  
    return this.http.get<Cotacao[]>(`${this.apiServerUrl}/moeda/menor-atual/${dataInicialFormatada}&${dataFinalFormatada}`);
  }
}

export interface Moeda {
  preco: number; 
  data: string;
  hora: string;
}