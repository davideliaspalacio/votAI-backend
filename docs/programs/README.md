# Programas de Gobierno - Candidatos Presidenciales Colombia 2026

## PDFs descargados

| Archivo | Candidato | Fuente |
|---------|-----------|--------|
| c1-ivan-cepeda-pacto-historico.pdf | Ivan Cepeda (Pacto Historico) | movimientopactohistorico.co |
| c2-abelardo-espriella-propuestas.pdf | Abelardo de la Espriella (Defensores de la Patria) | defensoresdelapatria.com |
| c3-paloma-valencia-plan-integrado.pdf | Paloma Valencia (Centro Democratico / Gran Coalicion) | palomavalencia.com |
| c4-claudia-lopez-programa.pdf | Claudia Lopez (Con Claudia, imparables) | claudia-lopez.com |
| analisis-comparativo-llyc.pdf | Analisis comparativo LLYC (Cepeda, De la Espriella, Fajardo, Valencia) | llyc.global |

## Candidatos sin PDF oficial disponible

- **Sergio Fajardo** - Propuestas en: sergiofajardo.com/propuestas
- **Roy Barreras** - Propuestas en notas de prensa
- **Miguel Uribe Londono** - Propuestas en: migueluribe.com
- **Luis Gilberto Murillo** - Propuestas en notas de prensa

## Uso

Estos PDFs se procesan con el pipeline de ingesta:

```bash
npx nest start -- ingest:candidate --id=c1 --pdf=programs/c1-ivan-cepeda-pacto-historico.pdf
```
