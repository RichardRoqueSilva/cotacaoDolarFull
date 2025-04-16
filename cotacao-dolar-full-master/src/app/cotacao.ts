
export class Cotacao {
  preco: number;

  data: string;
  hora: String; 
  diferenca: string | null = null;
  dataTexto: string | null = null;
  precoTexto: string = '';

 
  constructor(preco: number, data: string, hora: string) { 
    this.preco = preco;
    this.data = data;
    this.hora = hora;

    this.diferenca = null;
    this.dataTexto = null; 
  }
}