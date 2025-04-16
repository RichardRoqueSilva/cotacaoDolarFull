package shx.cotacaodolar.model;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.concurrent.TimeUnit;

public class Periodo {
    private Date dataInicial;
    private Date dataFinal;
    private Long diasEntreAsDatas;
    private static final SimpleDateFormat dateFormat = new SimpleDateFormat("MM-dd-yyyy");

    public Periodo(String dataInicialStr, String dataFinalStr) throws ParseException{
        this.dataInicial = dateFormat.parse(dataInicialStr);
        this.dataFinal = dateFormat.parse(dataFinalStr);
        this.diasEntreAsDatas = this.dataFinal.getTime() - this.dataInicial.getTime();
    }

    public long getDiasEntreAsDatasMaisUm(){
        long numberOfDays = TimeUnit.DAYS.convert(this.diasEntreAsDatas, TimeUnit.MILLISECONDS);
        return numberOfDays + 1;
    }

    public String getDataInicial(){
        return dateFormat.format(this.dataInicial);
    }

    public String getDataFinal(){
        return dateFormat.format(this.dataFinal);
    }

}