package shx.cotacaodolar.service;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import shx.cotacaodolar.model.Moeda;
import shx.cotacaodolar.model.Periodo;

@Service
public class MoedaService {

    private static final DateTimeFormatter BCB_DATE_FORMATTER = DateTimeFormatter.ofPattern("MM-dd-yyyy");
    private static final SimpleDateFormat API_DATETIME_FORMAT_MS = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS");
    private static final SimpleDateFormat API_DATETIME_FORMAT_SEC = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    private static final SimpleDateFormat MOEDA_DATE_FORMAT = new SimpleDateFormat("dd/MM/yyyy");
    private static final SimpleDateFormat MOEDA_TIME_FORMAT = new SimpleDateFormat("HH:mm:ss");
    private static final SimpleDateFormat MOEDA_DATETIME_FORMAT = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss");

    public List<Moeda> getCotacoesPeriodo(String startDate, String endDate) throws IOException, MalformedURLException, ParseException{

        Periodo periodo = new Periodo(startDate, endDate);
        long diasEntre = periodo.getDiasEntreAsDatasMaisUm();

        String urlString = "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?%40dataInicial='"
                           + periodo.getDataInicial() + "'&%40dataFinalCotacao='" + periodo.getDataFinal() + "'&%24format=json";

        URL url = new URL(urlString);
        HttpURLConnection request = (HttpURLConnection)url.openConnection();
        request.connect();

        int responseCode = request.getResponseCode();
        if (responseCode != HttpURLConnection.HTTP_OK) {

            throw new IOException("Falha ao conectar na API do BCB. Código: " + responseCode);
        }

        JsonElement response = JsonParser.parseReader(new InputStreamReader((InputStream)request.getContent()));
        JsonObject rootObj = response.getAsJsonObject();
        JsonArray cotacoesArray = rootObj.getAsJsonArray("value");

        List<Moeda> moedasLista = new ArrayList<>();

        if (cotacoesArray == null || cotacoesArray.size() == 0) {
   
             return moedasLista;
        }

        for(JsonElement objElement : cotacoesArray){
            JsonObject obj = objElement.getAsJsonObject();
            Moeda moedaRef = new Moeda();
            try {
                String dataHoraStr = obj.get("dataHoraCotacao").getAsString();
                Date dataHoraDate = parseApiDateTime(dataHoraStr);

                if (dataHoraDate != null) {
                    moedaRef.preco = obj.get("cotacaoCompra").getAsDouble();
                    moedaRef.data = MOEDA_DATE_FORMAT.format(dataHoraDate);
                    moedaRef.hora = MOEDA_TIME_FORMAT.format(dataHoraDate);
                    moedasLista.add(moedaRef);            
                }

            } catch (Exception e) {

            }
        }
        return moedasLista;
    }

    private Date parseApiDateTime(String dateTimeString) {
        try {
             return API_DATETIME_FORMAT_MS.parse(dateTimeString);
        } catch (ParseException e1) {
             try {
                 return API_DATETIME_FORMAT_SEC.parse(dateTimeString);
             } catch (ParseException e2) {
                 return null;
             }
        }
    }

    public Optional<Moeda> getCotacaoAtual() throws IOException, MalformedURLException, ParseException {
        LocalDate dataBusca = LocalDate.now();

        for (int i = 0; i < 7; i++) { 
            String dataFormatada = dataBusca.format(BCB_DATE_FORMATTER);

            List<Moeda> cotacoesDoDia = getCotacoesPeriodo(dataFormatada, dataFormatada);

            if (!cotacoesDoDia.isEmpty()) {

                Optional<Moeda> maisRecenteDoDia = cotacoesDoDia.stream()
                    .max(Comparator.comparing(m -> {
                        try {
                            return MOEDA_DATETIME_FORMAT.parse(m.data + " " + m.hora);
                        } catch (ParseException e) {
                            
                            return new Date(0); 
                        }
                    }));

                if(maisRecenteDoDia.isPresent()){
                     
                     return maisRecenteDoDia;
                }  
            }
            dataBusca = dataBusca.minusDays(1);
        }
        return Optional.empty();
    }

    public List<Moeda> getCotacoesMenoresQueAtual(String startDate, String endDate) throws IOException, MalformedURLException, ParseException {

        Optional<Moeda> cotacaoReferenciaOpt = getCotacaoAtual();

        if (!cotacaoReferenciaOpt.isPresent()) {

            return new ArrayList<>();
        }

        Moeda cotacaoReferencia = cotacaoReferenciaOpt.get();
        double precoReferencia = cotacaoReferencia.preco;


        List<Moeda> cotacoesPeriodo = getCotacoesPeriodo(startDate, endDate);

        List<Moeda> cotacoesFiltradas = cotacoesPeriodo.stream()
                .filter(moeda -> moeda.preco < precoReferencia)
                .collect(Collectors.toList());

        return cotacoesFiltradas;
    }
}