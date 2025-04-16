package shx.cotacaodolar.controller;

import java.io.IOException;
import java.text.ParseException;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import shx.cotacaodolar.model.Moeda;
import shx.cotacaodolar.service.MoedaService;

@RestController
@RequestMapping(value = "/")
public class MoedaController {

    @Autowired
    private MoedaService moedaService;

    @GetMapping("/moeda/{data1}&{data2}")
    public ResponseEntity<List<Moeda>> getCotacoesPeriodo(
            @PathVariable("data1") String startDate,
            @PathVariable("data2") String endDate) {
        try {
            List<Moeda> moedas = moedaService.getCotacoesPeriodo(startDate, endDate);
            return ResponseEntity.ok(moedas);
        } catch (IOException | ParseException e) {
             throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erro ao buscar ou processar dados de cotação", e);
        } catch (Exception e) {
             throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erro inesperado no servidor", e);
        }
    }

    @GetMapping("/moeda/atual")
    public ResponseEntity<Moeda> getCotacaoAtual() {
         try {
            Optional<Moeda> moedaOpt = moedaService.getCotacaoAtual();
            return moedaOpt.map(ResponseEntity::ok)
                           .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (IOException | ParseException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erro ao buscar ou processar cotação atual", e);
        } catch (Exception e) {
             throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erro inesperado no servidor", e);
        }
    }

    @GetMapping("/moeda/menor-atual/{data1}&{data2}")
    public ResponseEntity<List<Moeda>> getCotacoesMenoresQueAtual(
            @PathVariable("data1") String startDate,
            @PathVariable("data2") String endDate) {
        try {
            List<Moeda> moedas = moedaService.getCotacoesMenoresQueAtual(startDate, endDate);
            return ResponseEntity.ok(moedas);
        } catch (IOException | ParseException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erro ao buscar ou processar dados de cotação filtrados", e);
        } catch (Exception e) {
             throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erro inesperado no servidor", e);
        }
    }
}