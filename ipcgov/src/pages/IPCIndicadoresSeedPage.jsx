import { useState } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

const SEED_DATA = [
  {
    "numero": "1",
    "titulo": "1 - Quantidade de participantes dos conselhos de políticas públicas do Ceará em eventos dirigidos para a formação continuada em controle social das contas públicas.",
    "detalhamento": "Aferir o número de participantes dos conselhos de políticas públicas do Ceará em eventos de formação continuada em controle social das contas públicas.",
    "tipo": "Finalístico",
    "origem": "TCE / Governança",
    "formula": "Contagem de participantes dos conselhos inscritos e certificados em eventos.",
    "unidade": "Número",
    "polaridade": "Quanto maior, melhor",
    "abrangencia": "Institucional",
    "periodicidade": "Semestral",
    "fonte": "Inscrições no SIGED, auferida por meio de relatório de eventos realizados para o público-alvo.",
    "setor": "INSTITUTO PLÁCIDO CASTELO - IPC",
    "metas": {
      "2023": "400",
      "2024": "500",
      "2025": "600"
    },
    "medicoes": {
      "2024-S1": {
        "dataAfericao": "",
        "periodoAferido": "01/01 a 30/06/2024",
        "valorApurado": "695",
        "percentualMeta": "173,75%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-S2": {
        "dataAfericao": "",
        "periodoAferido": "01/07 a 31/12/2024",
        "valorApurado": "169",
        "percentualMeta": "42,25%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2025-S1": {
        "dataAfericao": "",
        "periodoAferido": "01/01 a 30/06/2025",
        "valorApurado": "711",
        "percentualMeta": "142,2%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      }
    },
    "alertaDias": 7,
    "criadoEm": "2025-04-01T00:00:00.000Z",
    "criadoPor": "sistema",
    "atualizadoEm": "2025-04-01T00:00:00.000Z"
  },
  {
    "numero": "13",
    "titulo": "13 - Percentual de municípios alcançados com capacitação",
    "detalhamento": "Avaliar o percentual de municípios do estado do Ceará alcançados com ações de capacitação pelo IPC.",
    "tipo": "Finalístico",
    "origem": "TCE / Governança",
    "formula": "(Municípios alcançados / Total municípios do Ceará) * 100",
    "unidade": "Percentual (%)",
    "polaridade": "Quanto maior, melhor",
    "abrangencia": "Institucional",
    "periodicidade": "Quadrimestral",
    "fonte": "SIGED (Relatório de ações educacionais) e contabilização manual.",
    "setor": "INSTITUTO PLÁCIDO CASTELO - IPC",
    "metas": {
      "2023": "100%",
      "2024": "100%",
      "2025": "100%",
      "2026": "100%"
    },
    "medicoes": {
      "2023-Q1": {
        "dataAfericao": "22/05/2023",
        "periodoAferido": "01/01 a 30/04/2023",
        "valorApurado": "17,5%",
        "percentualMeta": "17,5%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2023-Q2": {
        "dataAfericao": "31/08/2023",
        "periodoAferido": "01/01 a 31/08/2023",
        "valorApurado": "63,5%",
        "percentualMeta": "63,5%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2023-Q3": {
        "dataAfericao": "08/01/2024",
        "periodoAferido": "01/09/2023 a 19/12/2023",
        "valorApurado": "19%",
        "percentualMeta": "19%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2023-A1": {
        "dataAfericao": "10/01/2024",
        "periodoAferido": "01/01/2023 a 31/12/2023",
        "valorApurado": "100%",
        "percentualMeta": "100%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q1": {
        "dataAfericao": "01/05/2024",
        "periodoAferido": "01/01/2024 a 30/04/2024",
        "valorApurado": "50%",
        "percentualMeta": "50%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q2": {
        "dataAfericao": "01/09/2024",
        "periodoAferido": "01/05/2024 a 31/08/2024",
        "valorApurado": "60,4%",
        "percentualMeta": "60,4%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q3": {
        "dataAfericao": "01/01/2025",
        "periodoAferido": "01/09/2024 a 31/12/2024",
        "valorApurado": "26,4%",
        "percentualMeta": "26,4%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-A1": {
        "dataAfericao": "01/04/2025",
        "periodoAferido": "01/01/2024 a 31/12/2024",
        "valorApurado": "100%",
        "percentualMeta": "100%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      }
    },
    "alertaDias": 7,
    "criadoEm": "2025-04-01T00:00:00.000Z",
    "criadoPor": "sistema",
    "atualizadoEm": "2025-04-01T00:00:00.000Z"
  },
  {
    "numero": "14",
    "titulo": "14 - Quantidade de pessoas capacitadas",
    "detalhamento": "Avaliar o número de participantes dos eventos de capacitação, seja público interno ou externo (jurisdicionados e sociedade).",
    "tipo": "Finalístico",
    "origem": "SEPLAG / PPA",
    "formula": "Quantitativo de pessoas capacitadas nas ações educacionais e cursos ofertados pela Escola de Contas - IPC.",
    "unidade": "Número",
    "polaridade": "Quanto maior, melhor",
    "abrangencia": "Institucional",
    "periodicidade": "Quadrimestral",
    "fonte": "SIGED",
    "setor": "INSTITUTO PLÁCIDO CASTELO - IPC",
    "metas": {
      "2022": "12.000",
      "2023": "16.500",
      "2024": "5.500",
      "2025": "7.500",
      "2026": "7.000"
    },
    "medicoes": {
      "hist_01": {
        "dataAfericao": "Janeiro/2022",
        "periodoAferido": "2021",
        "valorApurado": "10.894",
        "percentualMeta": "66%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "hist_02": {
        "dataAfericao": "Janeiro/2023",
        "periodoAferido": "2022",
        "valorApurado": "17.371",
        "percentualMeta": "145%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2023-Q1": {
        "dataAfericao": "23/05/2023",
        "periodoAferido": "01/01 a 30/04/2023",
        "valorApurado": "3.145",
        "percentualMeta": "19%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2023-Q2": {
        "dataAfericao": "31/08/2023",
        "periodoAferido": "01/01 a 31/08/2023",
        "valorApurado": "11.463",
        "percentualMeta": "69,5%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2023-A1": {
        "dataAfericao": "09/01/2024",
        "periodoAferido": "01/01 a 31/12/2023",
        "valorApurado": "17.586",
        "percentualMeta": "106,58%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q1": {
        "dataAfericao": "01/05/2024",
        "periodoAferido": "01/01 a 30/04/2024",
        "valorApurado": "4.639",
        "percentualMeta": "84,29%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q2": {
        "dataAfericao": "01/09/2024",
        "periodoAferido": "01/05 a 31/08/2024",
        "valorApurado": "8.093",
        "percentualMeta": "147,14%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q3": {
        "dataAfericao": "01/01/2025",
        "periodoAferido": "01/09 a 31/12/2024",
        "valorApurado": "5.296",
        "percentualMeta": "96,29%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-A1": {
        "dataAfericao": "01/04/2025",
        "periodoAferido": "01/01 a 31/12/2024",
        "valorApurado": "18.028",
        "percentualMeta": "327,78%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      }
    },
    "alertaDias": 7,
    "criadoEm": "2025-04-01T00:00:00.000Z",
    "criadoPor": "sistema",
    "atualizadoEm": "2025-04-01T00:00:00.000Z"
  },
  {
    "numero": "21",
    "titulo": "21 - Percentual de servidores / membros capacitados na temática comportamental",
    "detalhamento": "Percentual de servidores e membros capacitados em cursos de temática comportamental.",
    "tipo": "Condutor",
    "origem": "TCE / Governança",
    "formula": "(Qtd servidores/membros capacitados na temática comportamental / Total servidores/membros) * 100",
    "unidade": "Percentual (%)",
    "polaridade": "Quanto maior, melhor",
    "abrangencia": "Institucional",
    "periodicidade": "Quadrimestral",
    "fonte": "SIGED (Relatório de eventos) e contabilização manual",
    "setor": "INSTITUTO PLÁCIDO CASTELO - IPC",
    "metas": {
      "2022": "3%",
      "2023": "3%",
      "2024": "3%",
      "2025": "3%",
      "2026": "3%"
    },
    "medicoes": {
      "hist_01": {
        "dataAfericao": "10/01/2023",
        "periodoAferido": "01 a 31/12/2022",
        "valorApurado": "11,89%",
        "percentualMeta": "396,40%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2023-Q1": {
        "dataAfericao": "02/10/2023",
        "periodoAferido": "01/01/2023 a 30/04/2023",
        "valorApurado": "18,40%",
        "percentualMeta": "--",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2023-Q2": {
        "dataAfericao": "02/10/2023",
        "periodoAferido": "01/05/2023 a 31/08/2023",
        "valorApurado": "20,31%",
        "percentualMeta": "--",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2023-Q3": {
        "dataAfericao": "09/01/2024",
        "periodoAferido": "01/09/2023 a 31/12/2023",
        "valorApurado": "6,17%",
        "percentualMeta": "--",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q1": {
        "dataAfericao": "01/05/2024",
        "periodoAferido": "01/01/2024 a 30/04/2024",
        "valorApurado": "7,91%",
        "percentualMeta": "263,67%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q2": {
        "dataAfericao": "01/09/2024",
        "periodoAferido": "01/05/2024 a 31/08/2024",
        "valorApurado": "11,90%",
        "percentualMeta": "396,67%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q3": {
        "dataAfericao": "01/01/2025",
        "periodoAferido": "01/09/2024 a 31/12/2024",
        "valorApurado": "7,05%",
        "percentualMeta": "235%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-A1": {
        "dataAfericao": "01/04/2025",
        "periodoAferido": "01/01/2024 a 31/12/2024",
        "valorApurado": "27,41%",
        "percentualMeta": "913,67%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      }
    },
    "alertaDias": 7,
    "criadoEm": "2025-04-01T00:00:00.000Z",
    "criadoPor": "sistema",
    "atualizadoEm": "2025-04-01T00:00:00.000Z"
  },
  {
    "numero": "22",
    "titulo": "22 - Percentual de servidores / membros capacitados na temática gerencial",
    "detalhamento": "Percentual de servidores e membros capacitados em cursos de temática gerencial.",
    "tipo": "Condutor",
    "origem": "TCE / Governança",
    "formula": "(Qtd servidores/membros capacitados na temática gerencial / Total servidores/membros) * 100",
    "unidade": "Percentual (%)",
    "polaridade": "Quanto maior, melhor",
    "abrangencia": "Institucional",
    "periodicidade": "Quadrimestral",
    "fonte": "SIGED (Relatório de eventos) e contabilização manual",
    "setor": "INSTITUTO PLÁCIDO CASTELO - IPC",
    "metas": {
      "2022": "20%",
      "2023": "20%",
      "2024": "20%",
      "2025": "20%",
      "2026": "20%"
    },
    "medicoes": {
      "hist_01": {
        "dataAfericao": "10/01/2023",
        "periodoAferido": "01 a 31/12/2022",
        "valorApurado": "13,43%",
        "percentualMeta": "67,15%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2023-Q1": {
        "dataAfericao": "02/10/2023",
        "periodoAferido": "01/01/2023 a 30/04/2023",
        "valorApurado": "24,53%",
        "percentualMeta": "--",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2023-Q2": {
        "dataAfericao": "02/10/2023",
        "periodoAferido": "01/05/2023 a 31/08/2023",
        "valorApurado": "21,43%",
        "percentualMeta": "--",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2023-Q3": {
        "dataAfericao": "09/01/2024",
        "periodoAferido": "01/09/2023 a 31/12/2023",
        "valorApurado": "6,17%",
        "percentualMeta": "--",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q1": {
        "dataAfericao": "01/05/2024",
        "periodoAferido": "01/01/2024 a 30/04/2024",
        "valorApurado": "11,18%",
        "percentualMeta": "55,9%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q2": {
        "dataAfericao": "01/09/2024",
        "periodoAferido": "01/05/2024 a 31/08/2024",
        "valorApurado": "14,79%",
        "percentualMeta": "73,95%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q3": {
        "dataAfericao": "01/01/2025",
        "periodoAferido": "01/09/2024 a 31/12/2024",
        "valorApurado": "4,94%",
        "percentualMeta": "24,7%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-A1": {
        "dataAfericao": "01/04/2025",
        "periodoAferido": "01/01/2024 a 31/12/2024",
        "valorApurado": "31,53%",
        "percentualMeta": "157,65%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      }
    },
    "alertaDias": 7,
    "criadoEm": "2025-04-01T00:00:00.000Z",
    "criadoPor": "sistema",
    "atualizadoEm": "2025-04-01T00:00:00.000Z"
  },
  {
    "numero": "23",
    "titulo": "23 - Percentual de servidores / membros capacitados na temática técnica",
    "detalhamento": "Percentual de servidores e membros capacitados em cursos de temática técnica.",
    "tipo": "Condutor",
    "origem": "TCE / Governança",
    "formula": "(Qtd servidores/membros capacitados na temática técnica / Total servidores/membros) * 100",
    "unidade": "Percentual (%)",
    "polaridade": "Quanto maior, melhor",
    "abrangencia": "Institucional",
    "periodicidade": "Quadrimestral",
    "fonte": "SIGED (Relatório de eventos) e contabilização manual",
    "setor": "INSTITUTO PLÁCIDO CASTELO - IPC",
    "metas": {
      "2022": "77%",
      "2023": "77%",
      "2024": "77%",
      "2025": "77%",
      "2026": "77%"
    },
    "medicoes": {
      "hist_01": {
        "dataAfericao": "10/01/2023",
        "periodoAferido": "01 a 31/12/2022",
        "valorApurado": "74,68%",
        "percentualMeta": "97%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2023-Q1": {
        "dataAfericao": "02/10/2023",
        "periodoAferido": "01/01/2023 a 30/04/2023",
        "valorApurado": "45,19%",
        "percentualMeta": "--",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2023-Q2": {
        "dataAfericao": "02/10/2023",
        "periodoAferido": "01/05/2023 a 31/08/2023",
        "valorApurado": "46,53%",
        "percentualMeta": "--",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2023-Q3": {
        "dataAfericao": "09/01/2024",
        "periodoAferido": "01/09/2023 a 31/12/2023",
        "valorApurado": "84,12%",
        "percentualMeta": "--",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q1": {
        "dataAfericao": "01/05/2024",
        "periodoAferido": "01/01/2024 a 30/04/2024",
        "valorApurado": "56,55%",
        "percentualMeta": "73,44%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q2": {
        "dataAfericao": "01/09/2024",
        "periodoAferido": "01/05/2024 a 31/08/2024",
        "valorApurado": "77,90%",
        "percentualMeta": "101,17%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q3": {
        "dataAfericao": "01/01/2025",
        "periodoAferido": "01/09/2024 a 31/12/2024",
        "valorApurado": "74,08%",
        "percentualMeta": "96,21%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-A1": {
        "dataAfericao": "01/04/2025",
        "periodoAferido": "01/01/2024 a 31/12/2024",
        "valorApurado": "89,07%",
        "percentualMeta": "115,68%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      }
    },
    "alertaDias": 7,
    "criadoEm": "2025-04-01T00:00:00.000Z",
    "criadoPor": "sistema",
    "atualizadoEm": "2025-04-01T00:00:00.000Z"
  },
  {
    "numero": "24",
    "titulo": "24 - Índice de pessoas capacitadas em inovação",
    "detalhamento": "Percentual de servidores e membros capacitados em cursos de temática inovação.",
    "tipo": "Condutor",
    "origem": "TCE / Governança",
    "formula": "(Qtd servidores/membros capacitados em inovação / Total servidores/membros) * 100",
    "unidade": "Percentual (%)",
    "polaridade": "Quanto maior, melhor",
    "abrangencia": "Institucional",
    "periodicidade": "Quadrimestral",
    "fonte": "SIGED (Relatório de eventos) e contabilização manual",
    "setor": "INSTITUTO PLÁCIDO CASTELO - IPC",
    "metas": {
      "2022": "10%",
      "2023": "10%",
      "2024": "10%",
      "2025": "10%"
    },
    "medicoes": {
      "2023-Q1": {
        "dataAfericao": "02/10/2023",
        "periodoAferido": "01/01/2023 a 30/04/2023",
        "valorApurado": "30,16%",
        "percentualMeta": "302%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2023-Q2": {
        "dataAfericao": "02/10/2023",
        "periodoAferido": "01/05/2023 a 31/08/2023",
        "valorApurado": "34,43%",
        "percentualMeta": "344%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q1": {
        "dataAfericao": "01/05/2024",
        "periodoAferido": "01/01/2024 a 30/04/2024",
        "valorApurado": "7,40%",
        "percentualMeta": "74%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q2": {
        "dataAfericao": "01/09/2024",
        "periodoAferido": "01/05/2024 a 31/08/2024",
        "valorApurado": "4,42%",
        "percentualMeta": "44,2%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q3": {
        "dataAfericao": "01/01/2025",
        "periodoAferido": "01/09/2024 a 31/12/2024",
        "valorApurado": "1,20%",
        "percentualMeta": "12%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-A1": {
        "dataAfericao": "01/04/2025",
        "periodoAferido": "01/01/2024 a 31/12/2024",
        "valorApurado": "13,55%",
        "percentualMeta": "135,5%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      }
    },
    "alertaDias": 7,
    "criadoEm": "2025-04-01T00:00:00.000Z",
    "criadoPor": "sistema",
    "atualizadoEm": "2025-04-01T00:00:00.000Z"
  },
  {
    "numero": "32",
    "titulo": "32 - Percentual de servidores / membros capacitados em tecnologia da informação",
    "detalhamento": "Percentual de servidores e membros capacitados em cursos de tecnologia da informação.",
    "tipo": "Condutor",
    "origem": "TCE / Governança",
    "formula": "(Qtd servidores/membros capacitados em TI / Total servidores/membros) * 100",
    "unidade": "Percentual (%)",
    "polaridade": "Quanto maior, melhor",
    "abrangencia": "Institucional",
    "periodicidade": "Quadrimestral",
    "fonte": "SIGED (Relatório de ações educacionais) e contabilização manual.",
    "setor": "INSTITUTO PLÁCIDO CASTELO - IPC",
    "metas": {
      "2022": "5%",
      "2023": "5%",
      "2024": "5%",
      "2025": "5%",
      "2026": "5%"
    },
    "medicoes": {
      "hist_01": {
        "dataAfericao": "10/01/2023",
        "periodoAferido": "01 a 31/12/2022",
        "valorApurado": "14,68%",
        "percentualMeta": "293,56%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2023-Q1": {
        "dataAfericao": "02/10/2023",
        "periodoAferido": "01/01/2023 a 30/04/2023",
        "valorApurado": "9,81%",
        "percentualMeta": "--",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2023-Q2": {
        "dataAfericao": "02/10/2023",
        "periodoAferido": "01/05/2023 a 31/08/2023",
        "valorApurado": "11,71%",
        "percentualMeta": "--",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2023-Q3": {
        "dataAfericao": "09/01/2024",
        "periodoAferido": "01/09/2023 a 31/12/2023",
        "valorApurado": "0,92%",
        "percentualMeta": "--",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q1": {
        "dataAfericao": "01/05/2024",
        "periodoAferido": "01/01/2024 a 30/04/2024",
        "valorApurado": "8,86%",
        "percentualMeta": "177,2%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q2": {
        "dataAfericao": "01/09/2024",
        "periodoAferido": "01/05/2024 a 31/08/2024",
        "valorApurado": "9,79%",
        "percentualMeta": "195,8%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-Q3": {
        "dataAfericao": "01/01/2025",
        "periodoAferido": "01/09/2024 a 31/12/2024",
        "valorApurado": "1,33%",
        "percentualMeta": "26,6%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      },
      "2024-A1": {
        "dataAfericao": "01/04/2025",
        "periodoAferido": "01/01/2024 a 31/12/2024",
        "valorApurado": "20,86%",
        "percentualMeta": "417,2%",
        "status": "Concluído",
        "lancadoPor": "sistema",
        "lancadoEm": "2025-04-01T00:00:00.000Z",
        "historico": true
      }
    },
    "alertaDias": 7,
    "criadoEm": "2025-04-01T00:00:00.000Z",
    "criadoPor": "sistema",
    "atualizadoEm": "2025-04-01T00:00:00.000Z"
  }
];

export default function IPCIndicadoresSeedPage({ onBack }) {
  const [status, setStatus] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const executarSeed = async () => {
    if (!window.confirm("Cadastrar os 8 indicadores no Firebase? Isso apagará indicadores existentes com mesmo número.")) return;
    setLoading(true);
    setStatus("Iniciando...");
    try {
      // Check and remove existing
      const snap = await getDocs(collection(db, "ipc_indicadores"));
      const existentes = snap.docs.map(d => ({id:d.id,...d.data()}));
      
      await SEED_DATA.reduce(async (promise, ind) => {
        await promise;
        setStatus("Cadastrando: " + ind.titulo.substring(0,50) + "...");
        const dup = existentes.find(e => e.numero === ind.numero);
        if (dup) {
          await deleteDoc(doc(db, "ipc_indicadores", dup.id));
          setStatus("Substituindo: " + ind.titulo.substring(0,50) + "...");
        }
        await addDoc(collection(db, "ipc_indicadores"), ind);
      }, Promise.resolve());
      setStatus("✅ " + SEED_DATA.length + " indicadores cadastrados com sucesso!");
      setDone(true);
    } catch(e) {
      setStatus("❌ Erro: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#fff", borderRadius:24, padding:40, maxWidth:600, width:"100%", boxShadow:"0 4px 32px rgba(27,63,122,0.12)" }}>
        <div style={{ fontWeight:900, fontSize:22, color:"#1B3F7A", marginBottom:8 }}>📊 Seed — IPC Indicadores</div>
        <div style={{ color:"#888", fontSize:14, marginBottom:24 }}>Cadastra os 8 indicadores com histórico completo no Firebase.</div>
        
        <div style={{ marginBottom:20 }}>
          {SEED_DATA.map((ind, i) => (
            <div key={i} style={{ display:"flex", gap:10, alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f0f0f0" }}>
              <span style={{ background:"#f0f4ff", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700, color:"#1B3F7A", minWidth:28, textAlign:"center" }}>{ind.numero}</span>
              <span style={{ fontSize:13, color:"#333", flex:1 }}>{ind.titulo.substring(0,60)}</span>
              <span style={{ fontSize:11, color:"#888" }}>{Object.keys(ind.medicoes).length} med.</span>
            </div>
          ))}
        </div>

        {status && (
          <div style={{ background: done?"#f0fdf4":"#f0f4ff", borderRadius:12, padding:"12px 16px", marginBottom:16, fontSize:13, color: done?"#059669":"#1B3F7A", fontWeight:600 }}>
            {status}
          </div>
        )}

        <div style={{ display:"flex", gap:10 }}>
          <div onClick={onBack} style={{ flex:1, background:"#f0f4ff", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:14, color:"#1B3F7A", cursor:"pointer" }}>← Voltar</div>
          {!done && (
            <div onClick={loading?undefined:executarSeed}
              style={{ flex:2, background:loading?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:14, color:"#fff", cursor:loading?"not-allowed":"pointer" }}>
              {loading ? "Cadastrando..." : "🚀 Executar Seed"}
            </div>
          )}
          {done && (
            <div onClick={onBack} style={{ flex:2, background:"#059669", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:14, color:"#fff", cursor:"pointer" }}>
              ✅ Ir para Indicadores
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
