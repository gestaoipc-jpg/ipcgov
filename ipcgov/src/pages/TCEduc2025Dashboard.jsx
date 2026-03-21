import { useState } from "react";

const MUNICIPIOS_2025 = [
  {"viagem":1,"data":"2025-02-11","municipio":"PORTEIRAS","insc_licit":80,"pres_licit":62,"insc_cons":41,"pres_cons":36,"insc_ouv":25,"pres_ouv":21},
  {"viagem":1,"data":"2025-02-11","municipio":"PENAFORTE","insc_licit":31,"pres_licit":25,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":1,"data":"2025-02-11","municipio":"JATI","insc_licit":47,"pres_licit":24,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":1,"data":"2025-02-12","municipio":"BREJO SANTO","insc_licit":42,"pres_licit":24,"insc_cons":17,"pres_cons":14,"insc_ouv":8,"pres_ouv":5},
  {"viagem":1,"data":"2025-02-12","municipio":"MILAGRES","insc_licit":78,"pres_licit":62,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":1,"data":"2025-02-12","municipio":"ABAIARA","insc_licit":45,"pres_licit":32,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":1,"data":"2025-02-12","municipio":"BARRO","insc_licit":75,"pres_licit":32,"insc_cons":69,"pres_cons":39,"insc_ouv":51,"pres_ouv":18},
  {"viagem":1,"data":"2025-02-12","municipio":"AURORA","insc_licit":96,"pres_licit":83,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":1,"data":"2025-02-12","municipio":"MAURITI","insc_licit":137,"pres_licit":109,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":2,"data":"2025-02-18","municipio":"CRATEÚS","insc_licit":123,"pres_licit":77,"insc_cons":71,"pres_cons":32,"insc_ouv":33,"pres_ouv":10},
  {"viagem":2,"data":"2025-02-18","municipio":"INDEPENDÊNCIA","insc_licit":81,"pres_licit":45,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":2,"data":"2025-02-18","municipio":"NOVO ORIENTE","insc_licit":62,"pres_licit":40,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":2,"data":"2025-02-19","municipio":"PORANGA","insc_licit":56,"pres_licit":34,"insc_cons":47,"pres_cons":25,"insc_ouv":10,"pres_ouv":5},
  {"viagem":2,"data":"2025-02-19","municipio":"IPAPORANGA","insc_licit":89,"pres_licit":72,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":2,"data":"2025-02-19","municipio":"ARARENDÁ","insc_licit":105,"pres_licit":96,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":2,"data":"2025-02-20","municipio":"TAMBORIL","insc_licit":62,"pres_licit":42,"insc_cons":24,"pres_cons":5,"insc_ouv":6,"pres_ouv":2},
  {"viagem":2,"data":"2025-02-20","municipio":"CATUNDA","insc_licit":39,"pres_licit":31,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":2,"data":"2025-02-20","municipio":"MONSENHOR TABOSA","insc_licit":53,"pres_licit":45,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":3,"data":"2025-02-25","municipio":"MARACANAÚ","insc_licit":142,"pres_licit":111,"insc_cons":20,"pres_cons":14,"insc_ouv":23,"pres_ouv":12},
  {"viagem":3,"data":"2025-02-25","municipio":"PACATUBA","insc_licit":82,"pres_licit":54,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":3,"data":"2025-02-25","municipio":"GUAIÚBA","insc_licit":71,"pres_licit":57,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":3,"data":"2025-02-27","municipio":"REDENÇÃO","insc_licit":77,"pres_licit":67,"insc_cons":48,"pres_cons":41,"insc_ouv":21,"pres_ouv":16},
  {"viagem":3,"data":"2025-02-27","municipio":"ACARAPE","insc_licit":67,"pres_licit":48,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":3,"data":"2025-02-27","municipio":"BARREIRA","insc_licit":42,"pres_licit":32,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":4,"data":"2025-03-11","municipio":"ASSARÉ","insc_licit":41,"pres_licit":33,"insc_cons":15,"pres_cons":14,"insc_ouv":8,"pres_ouv":7},
  {"viagem":4,"data":"2025-03-11","municipio":"ARARIPE","insc_licit":60,"pres_licit":52,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":4,"data":"2025-03-11","municipio":"POTENGI","insc_licit":39,"pres_licit":31,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":4,"data":"2025-03-12","municipio":"CARIÚS","insc_licit":41,"pres_licit":38,"insc_cons":37,"pres_cons":32,"insc_ouv":12,"pres_ouv":9},
  {"viagem":4,"data":"2025-03-12","municipio":"JUCÁS","insc_licit":72,"pres_licit":62,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":4,"data":"2025-03-12","municipio":"TARRAFAS","insc_licit":62,"pres_licit":54,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":4,"data":"2025-03-13","municipio":"VÁRZEA ALEGRE","insc_licit":91,"pres_licit":67,"insc_cons":81,"pres_cons":66,"insc_ouv":36,"pres_ouv":30},
  {"viagem":4,"data":"2025-03-13","municipio":"FARIAS BRITO","insc_licit":61,"pres_licit":56,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":4,"data":"2025-03-13","municipio":"GRANJEIRO","insc_licit":64,"pres_licit":53,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":5,"data":"2025-03-18","municipio":"PACAJUS","insc_licit":53,"pres_licit":39,"insc_cons":29,"pres_cons":24,"insc_ouv":8,"pres_ouv":5},
  {"viagem":5,"data":"2025-03-18","municipio":"OCARA","insc_licit":62,"pres_licit":56,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":5,"data":"2025-03-18","municipio":"CHOROZINHO","insc_licit":64,"pres_licit":61,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":5,"data":"2025-03-20","municipio":"HORIZONTE","insc_licit":50,"pres_licit":30,"insc_cons":68,"pres_cons":55,"insc_ouv":11,"pres_ouv":6},
  {"viagem":5,"data":"2025-03-20","municipio":"EUSÉBIO","insc_licit":128,"pres_licit":109,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":5,"data":"2025-03-20","municipio":"ITAITINGA","insc_licit":114,"pres_licit":92,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":6,"data":"2025-03-26","municipio":"AQUIRAZ","insc_licit":85,"pres_licit":64,"insc_cons":41,"pres_cons":30,"insc_ouv":27,"pres_ouv":18},
  {"viagem":6,"data":"2025-03-26","municipio":"CASCAVEL","insc_licit":106,"pres_licit":93,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":6,"data":"2025-03-26","municipio":"PINDORETAMA","insc_licit":44,"pres_licit":42,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":6,"data":"2025-03-27","municipio":"MARANGUAPE","insc_licit":114,"pres_licit":85,"insc_cons":15,"pres_cons":6,"insc_ouv":4,"pres_ouv":2},
  {"viagem":6,"data":"2025-03-27","municipio":"CAUCAIA","insc_licit":175,"pres_licit":131,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":7,"data":"2025-04-08","municipio":"GUARAMIRANGA","insc_licit":21,"pres_licit":18,"insc_cons":32,"pres_cons":19,"insc_ouv":5,"pres_ouv":2},
  {"viagem":7,"data":"2025-04-08","municipio":"PACOTI","insc_licit":48,"pres_licit":43,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":7,"data":"2025-04-08","municipio":"PALMÁCIA","insc_licit":40,"pres_licit":30,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":7,"data":"2025-04-09","municipio":"BATURITÉ","insc_licit":52,"pres_licit":38,"insc_cons":66,"pres_cons":58,"insc_ouv":31,"pres_ouv":15},
  {"viagem":7,"data":"2025-04-09","municipio":"MULUNGU","insc_licit":62,"pres_licit":53,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":7,"data":"2025-04-09","municipio":"ARATUBA","insc_licit":38,"pres_licit":28,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":7,"data":"2025-04-10","municipio":"ARACOIABA","insc_licit":39,"pres_licit":27,"insc_cons":38,"pres_cons":27,"insc_ouv":16,"pres_ouv":9},
  {"viagem":7,"data":"2025-04-10","municipio":"CAPISTRANO","insc_licit":68,"pres_licit":56,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":7,"data":"2025-04-10","municipio":"ITAPIÚNA","insc_licit":41,"pres_licit":36,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":8,"data":"2025-05-06","municipio":"GENERAL SAMPAIO","insc_licit":46,"pres_licit":34,"insc_cons":31,"pres_cons":23,"insc_ouv":31,"pres_ouv":22},
  {"viagem":8,"data":"2025-05-06","municipio":"TEJUÇUOCA","insc_licit":53,"pres_licit":45,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":8,"data":"2025-05-07","municipio":"PENTECOSTE","insc_licit":112,"pres_licit":76,"insc_cons":38,"pres_cons":32,"insc_ouv":19,"pres_ouv":14},
  {"viagem":8,"data":"2025-05-07","municipio":"APUIARÉS","insc_licit":78,"pres_licit":68,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":8,"data":"2025-05-08","municipio":"SÃO GONÇALO DO AMARANTE","insc_licit":111,"pres_licit":82,"insc_cons":30,"pres_cons":22,"insc_ouv":35,"pres_ouv":15},
  {"viagem":8,"data":"2025-05-08","municipio":"SÃO LUÍS DO CURU","insc_licit":62,"pres_licit":53,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":9,"data":"2025-05-20","municipio":"JAGUARIBE","insc_licit":103,"pres_licit":96,"insc_cons":32,"pres_cons":22,"insc_ouv":15,"pres_ouv":12},
  {"viagem":9,"data":"2025-05-20","municipio":"PEREIRO","insc_licit":82,"pres_licit":82,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":9,"data":"2025-05-21","municipio":"IRACEMA","insc_licit":51,"pres_licit":45,"insc_cons":23,"pres_cons":10,"insc_ouv":20,"pres_ouv":12},
  {"viagem":9,"data":"2025-05-21","municipio":"ERERÉ","insc_licit":41,"pres_licit":35,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":9,"data":"2025-05-22","municipio":"ALTO SANTO","insc_licit":131,"pres_licit":107,"insc_cons":17,"pres_cons":13,"insc_ouv":25,"pres_ouv":17},
  {"viagem":9,"data":"2025-05-22","municipio":"POTIRETAMA","insc_licit":52,"pres_licit":34,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":10,"data":"2025-06-03","municipio":"NOVA RUSSAS","insc_licit":69,"pres_licit":53,"insc_cons":29,"pres_cons":22,"insc_ouv":23,"pres_ouv":12},
  {"viagem":10,"data":"2025-06-03","municipio":"IPUEIRAS","insc_licit":67,"pres_licit":48,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":10,"data":"2025-06-04","municipio":"IPU","insc_licit":61,"pres_licit":59,"insc_cons":20,"pres_cons":14,"insc_ouv":15,"pres_ouv":10},
  {"viagem":10,"data":"2025-06-04","municipio":"PIRES FERREIRA","insc_licit":85,"pres_licit":70,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":10,"data":"2025-06-05","municipio":"SANTA QUITÉRIA","insc_licit":117,"pres_licit":74,"insc_cons":22,"pres_cons":15,"insc_ouv":18,"pres_ouv":10},
  {"viagem":10,"data":"2025-06-05","municipio":"HIDROLÂNDIA","insc_licit":52,"pres_licit":45,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":11,"data":"2025-07-22","municipio":"QUIXERAMOBIM","insc_licit":164,"pres_licit":129,"insc_cons":35,"pres_cons":30,"insc_ouv":10,"pres_ouv":6},
  {"viagem":11,"data":"2025-07-22","municipio":"BANABUIÚ","insc_licit":91,"pres_licit":65,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":11,"data":"2025-07-23","municipio":"QUIXADÁ","insc_licit":136,"pres_licit":115,"insc_cons":22,"pres_cons":19,"insc_ouv":18,"pres_ouv":15},
  {"viagem":11,"data":"2025-07-23","municipio":"IBICUITINGA","insc_licit":53,"pres_licit":29,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":11,"data":"2025-07-24","municipio":"IBARETAMA","insc_licit":57,"pres_licit":47,"insc_cons":54,"pres_cons":33,"insc_ouv":19,"pres_ouv":5},
  {"viagem":11,"data":"2025-07-24","municipio":"CHORÓ","insc_licit":75,"pres_licit":50,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":12,"data":"2025-08-19","municipio":"JAGUARIBARA","insc_licit":66,"pres_licit":50,"insc_cons":22,"pres_cons":14,"insc_ouv":7,"pres_ouv":4},
  {"viagem":12,"data":"2025-08-19","municipio":"JAGUARETAMA","insc_licit":58,"pres_licit":22,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":12,"data":"2025-08-20","municipio":"TABULEIRO DO NORTE","insc_licit":52,"pres_licit":43,"insc_cons":37,"pres_cons":32,"insc_ouv":4,"pres_ouv":4},
  {"viagem":12,"data":"2025-08-20","municipio":"SÃO JOÃO DO JAGUARIBE","insc_licit":59,"pres_licit":40,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":12,"data":"2025-08-21","municipio":"LIMOEIRO DO NORTE","insc_licit":108,"pres_licit":89,"insc_cons":47,"pres_cons":35,"insc_ouv":15,"pres_ouv":10},
  {"viagem":12,"data":"2025-08-21","municipio":"MORADA NOVA","insc_licit":116,"pres_licit":97,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":13,"data":"2025-09-02","municipio":"SÃO BENEDITO","insc_licit":71,"pres_licit":64,"insc_cons":63,"pres_cons":49,"insc_ouv":10,"pres_ouv":6},
  {"viagem":13,"data":"2025-09-02","municipio":"CARNAUBAL","insc_licit":70,"pres_licit":51,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":13,"data":"2025-09-03","municipio":"IBIAPINA","insc_licit":75,"pres_licit":63,"insc_cons":40,"pres_cons":32,"insc_ouv":15,"pres_ouv":8},
  {"viagem":13,"data":"2025-09-03","municipio":"UBAJARA","insc_licit":61,"pres_licit":56,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":13,"data":"2025-09-04","municipio":"TIANGUÁ","insc_licit":79,"pres_licit":60,"insc_cons":38,"pres_cons":24,"insc_ouv":23,"pres_ouv":13},
  {"viagem":13,"data":"2025-09-04","municipio":"VIÇOSA DO CEARÁ","insc_licit":66,"pres_licit":59,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":14,"data":"2025-09-16","municipio":"URUOCA","insc_licit":50,"pres_licit":32,"insc_cons":32,"pres_cons":22,"insc_ouv":8,"pres_ouv":4},
  {"viagem":14,"data":"2025-09-16","municipio":"SENADOR SÁ","insc_licit":33,"pres_licit":29,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":14,"data":"2025-09-17","municipio":"MASSAPÊ","insc_licit":70,"pres_licit":51,"insc_cons":46,"pres_cons":29,"insc_ouv":18,"pres_ouv":15},
  {"viagem":14,"data":"2025-09-17","municipio":"SANTANA DO ACARAÚ","insc_licit":101,"pres_licit":74,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":15,"data":"2025-10-07","municipio":"FRECHEIRINHA","insc_licit":81,"pres_licit":65,"insc_cons":34,"pres_cons":27,"insc_ouv":19,"pres_ouv":16},
  {"viagem":15,"data":"2025-10-07","municipio":"MUCAMBO","insc_licit":100,"pres_licit":87,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":15,"data":"2025-10-08","municipio":"COREAÚ","insc_licit":91,"pres_licit":74,"insc_cons":56,"pres_cons":43,"insc_ouv":23,"pres_ouv":17},
  {"viagem":15,"data":"2025-10-08","municipio":"MORAÚJO","insc_licit":72,"pres_licit":60,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":15,"data":"2025-10-09","municipio":"GRANJA","insc_licit":68,"pres_licit":50,"insc_cons":79,"pres_cons":67,"insc_ouv":31,"pres_ouv":22},
  {"viagem":15,"data":"2025-10-09","municipio":"MARTINÓPOLE","insc_licit":59,"pres_licit":53,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":16,"data":"2025-10-21","municipio":"GUARACIABA DO NORTE","insc_licit":33,"pres_licit":28,"insc_cons":19,"pres_cons":17,"insc_ouv":12,"pres_ouv":11},
  {"viagem":16,"data":"2025-10-21","municipio":"CROATÁ","insc_licit":85,"pres_licit":78,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":16,"data":"2025-10-22","municipio":"GRAÇA","insc_licit":51,"pres_licit":44,"insc_cons":31,"pres_cons":23,"insc_ouv":16,"pres_ouv":14},
  {"viagem":16,"data":"2025-10-22","municipio":"PACUJÁ","insc_licit":63,"pres_licit":51,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":16,"data":"2025-10-23","municipio":"RERIUTABA","insc_licit":50,"pres_licit":39,"insc_cons":24,"pres_cons":15,"insc_ouv":8,"pres_ouv":6},
  {"viagem":16,"data":"2025-10-23","municipio":"VARJOTA","insc_licit":63,"pres_licit":54,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":17,"data":"2025-11-04","municipio":"BOA VIAGEM","insc_licit":58,"pres_licit":22,"insc_cons":25,"pres_cons":19,"insc_ouv":1,"pres_ouv":1},
  {"viagem":17,"data":"2025-11-04","municipio":"MADALENA","insc_licit":90,"pres_licit":80,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":17,"data":"2025-11-05","municipio":"CANINDÉ","insc_licit":108,"pres_licit":92,"insc_cons":31,"pres_cons":22,"insc_ouv":11,"pres_ouv":10},
  {"viagem":17,"data":"2025-11-05","municipio":"ITATIRA","insc_licit":50,"pres_licit":47,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":17,"data":"2025-11-06","municipio":"CARIDADE","insc_licit":49,"pres_licit":42,"insc_cons":17,"pres_cons":11,"insc_ouv":11,"pres_ouv":9},
  {"viagem":17,"data":"2025-11-06","municipio":"PARAMOTI","insc_licit":80,"pres_licit":77,"insc_cons":0,"pres_cons":0,"insc_ouv":0,"pres_ouv":0},
  {"viagem":18,"data":"2025-11-17","municipio":"FORTALEZA","insc_licit":160,"pres_licit":111,"insc_cons":52,"pres_cons":20,"insc_ouv":42,"pres_ouv":18}
];

const CUSTOS_2025 = [
  {viagem:1,custo_transp:2041.43,custo_instrutoria:8986.55,custo_diarias:14378.50,total_part:586,custo_aluno:43.36},
  {viagem:2,custo_transp:1542.73,custo_instrutoria:6446.88,custo_diarias:11254.20,total_part:561,custo_aluno:34.30},
  {viagem:3,custo_transp:702.25,custo_instrutoria:7814.34,custo_diarias:2280.00,total_part:452,custo_aluno:23.89},
  {viagem:4,custo_transp:2061.24,custo_instrutoria:11252.68,custo_diarias:11778.50,total_part:604,custo_aluno:41.54},
  {viagem:5,custo_transp:1017.09,custo_instrutoria:8283.26,custo_diarias:1920.00,total_part:477,custo_aluno:23.52},
  {viagem:6,custo_transp:1870.30,custo_instrutoria:6915.74,custo_diarias:1800.00,total_part:471,custo_aluno:22.48},
  {viagem:7,custo_transp:2074.49,custo_instrutoria:12423.69,custo_diarias:8400.00,total_part:459,custo_aluno:49.89},
  {viagem:8,custo_transp:842.51,custo_instrutoria:8908.41,custo_diarias:8728.20,total_part:486,custo_aluno:38.02},
  {viagem:9,custo_transp:2103.70,custo_instrutoria:9494.49,custo_diarias:8457.50,total_part:485,custo_aluno:41.35},
  {viagem:10,custo_transp:1210.02,custo_instrutoria:8908.41,custo_diarias:8728.20,total_part:432,custo_aluno:43.63},
  {viagem:11,custo_transp:1104.58,custo_instrutoria:9494.49,custo_diarias:8837.60,total_part:543,custo_aluno:35.79},
  {viagem:12,custo_transp:709.00,custo_instrutoria:9494.49,custo_diarias:8837.60,total_part:440,custo_aluno:43.28},
  {viagem:13,custo_transp:1657.20,custo_instrutoria:9493.69,custo_diarias:10515.00,total_part:485,custo_aluno:44.67},
  {viagem:14,custo_transp:886.08,custo_instrutoria:5548.22,custo_diarias:4451.34,total_part:256,custo_aluno:42.52},
  {viagem:15,custo_transp:1425.90,custo_instrutoria:9493.69,custo_diarias:9251.34,total_part:581,custo_aluno:34.72},
  {viagem:16,custo_transp:1033.80,custo_instrutoria:9493.69,custo_diarias:8618.90,total_part:380,custo_aluno:50.39},
  {viagem:17,custo_transp:1142.44,custo_instrutoria:9493.69,custo_diarias:9818.90,total_part:432,custo_aluno:47.35},
  {viagem:18,custo_transp:0,custo_instrutoria:2227.10,custo_diarias:0,total_part:149,custo_aluno:14.95},
  {viagem:19,custo_transp:2122.59,custo_instrutoria:8791.19,custo_diarias:15347.10,total_part:572,custo_aluno:45.91},
];

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmtNum(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1).replace('.',',') + 'M';
  if (n >= 1000) return n.toLocaleString('pt-BR');
  return String(n);
}
function fmtBRL(n) {
  return 'R$ ' + n.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
}

export default function TCEduc2025Dashboard({ onBack }) {
  const [filtroMes, setFiltroMes] = useState("todos");
  const [filtroMunicipio, setFiltroMunicipio] = useState("todos");
  const [filtroViagem, setFiltroViagem] = useState("todos");

  // Apply filters
  const dadosFiltrados = MUNICIPIOS_2025.filter(r => {
    if (filtroViagem !== "todos" && r.viagem !== parseInt(filtroViagem)) return false;
    if (filtroMunicipio !== "todos" && r.municipio !== filtroMunicipio) return false;
    if (filtroMes !== "todos") {
      const mes = parseInt(r.data.split("-")[1]);
      if (mes !== parseInt(filtroMes)) return false;
    }
    return true;
  });

  // Aggregate stats
  const totalInscritos = dadosFiltrados.reduce((s,r) => s + r.insc_licit + r.insc_cons + r.insc_ouv, 0);
  const totalPresentes = dadosFiltrados.reduce((s,r) => s + r.pres_licit + r.pres_cons + r.pres_ouv, 0);
  const ausenciaAcum = totalInscritos > 0 ? Math.round((totalInscritos - totalPresentes) / totalInscritos * 100) : 0;

  const nllPresentes = dadosFiltrados.reduce((s,r) => s + r.pres_licit, 0);
  const consPresentes = dadosFiltrados.reduce((s,r) => s + r.pres_cons, 0);
  const ouvPresentes = dadosFiltrados.reduce((s,r) => s + r.pres_ouv, 0);

  const nllInscritos = dadosFiltrados.reduce((s,r) => s + r.insc_licit, 0);
  const consInscritos = dadosFiltrados.reduce((s,r) => s + r.insc_cons, 0);
  const ouvInscritos = dadosFiltrados.reduce((s,r) => s + r.insc_ouv, 0);

  const municipiosVisitados = new Set(dadosFiltrados.map(r => r.municipio)).size;

  // Costs - filter by viagem
  // Custos: filtrar pelas viagens que aparecem nos dados filtrados
  const viagensNaSelecao = new Set(dadosFiltrados.map(r => r.viagem));
  const viagensFiltradas = CUSTOS_2025.filter(c => {
    if (filtroViagem !== "todos" && c.viagem !== parseInt(filtroViagem)) return false;
    if (filtroMes !== "todos" && !viagensNaSelecao.has(c.viagem)) return false;
    return true;
  });
  const custoTotal = viagensFiltradas.reduce((s,c) => s + c.custo_transp + c.custo_instrutoria + c.custo_diarias, 0);
  const totalPartCusto = viagensFiltradas.reduce((s,c) => s + c.total_part, 0);
  const custoPorAluno = totalPartCusto > 0 ? custoTotal / totalPartCusto : 0;

  // NLL media por municipio
  const nllMediaMun = municipiosVisitados > 0 ? (nllPresentes / municipiosVisitados).toFixed(2) : "0";
  // Conselhos/Ouvidoria media por regional (viagens)
  const viagensCount = new Set(dadosFiltrados.map(r => r.viagem)).size || 1;
  const consMediaReg = (consPresentes / viagensCount).toFixed(2);
  const ouvMediaReg = (ouvPresentes / viagensCount).toFixed(2);

  // Municipios list for filter
  const todosMunic = [...new Set(MUNICIPIOS_2025.map(r => r.municipio))].sort();
  const todasViagens = [...new Set(MUNICIPIOS_2025.map(r => r.viagem))].sort((a,b) => a-b);

  // Meses disponíveis
  const mesesDisponiveis = [...new Set(MUNICIPIOS_2025.map(r => parseInt(r.data.split("-")[1])))].sort((a,b) => a-b);

  const s = { fontFamily:"'Montserrat',sans-serif" };

  const cardStyle = (bg, border) => ({
    background: bg || "#fff",
    borderRadius: 16,
    padding: "20px 22px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
    border: border ? `1px solid ${border}` : "none",
  });

  const bigNum = (color) => ({
    fontWeight: 900,
    fontSize: 36,
    color: color || "#1B3F7A",
    lineHeight: 1,
    marginBottom: 6,
  });

  const label = (color) => ({
    fontSize: 13,
    color: color || "#555",
    fontWeight: 600,
  });

  return (
    <div style={{ minHeight:"100vh", background:"#f0f2f5", ...s }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* HEADER */}
      <div style={{ background:"#1a6b78", padding:"0 0 0 0" }}>
        <div style={{ background:"#1a6b78", padding:"12px 24px 0" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div onClick={onBack} style={{ width:36, height:36, background:"rgba(255,255,255,0.15)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:18 }}>←</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22, letterSpacing:2 }}>TCEDUC</div>
            </div>
            <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12, fontWeight:600 }}>Ano: 2025</div>
          </div>

          {/* FILTROS */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", paddingBottom:12 }}>
            {/* Mês */}
            <select value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}
              style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:8, padding:"6px 12px", color:"#fff", fontSize:12, fontWeight:600, outline:"none", cursor:"pointer" }}>
              <option value="todos" style={{ color:"#1B3F7A", background:"#fff" }}>Mês ▼</option>
              {mesesDisponiveis.map(m => <option key={m} value={m} style={{ color:"#1B3F7A", background:"#fff" }}>{MESES[m-1]}</option>)}
            </select>

            {/* Município */}
            <select value={filtroMunicipio} onChange={e=>setFiltroMunicipio(e.target.value)}
              style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:8, padding:"6px 12px", color:"#fff", fontSize:12, fontWeight:600, outline:"none", cursor:"pointer" }}>
              <option value="todos" style={{ color:"#1B3F7A", background:"#fff" }}>Município ▼</option>
              {todosMunic.map(m => <option key={m} value={m} style={{ color:"#1B3F7A", background:"#fff" }}>{m}</option>)}
            </select>

            {/* Viagem */}
            <select value={filtroViagem} onChange={e=>setFiltroViagem(e.target.value)}
              style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:8, padding:"6px 12px", color:"#fff", fontSize:12, fontWeight:600, outline:"none", cursor:"pointer" }}>
              <option value="todos" style={{ color:"#1B3F7A", background:"#fff" }}>Viagem ▼</option>
              {todasViagens.map(v => <option key={v} value={v} style={{ color:"#1B3F7A", background:"#fff" }}>Viagem {v}</option>)}
            </select>

            {(filtroMes!=="todos"||filtroMunicipio!=="todos"||filtroViagem!=="todos") && (
              <div onClick={() => { setFiltroMes("todos"); setFiltroMunicipio("todos"); setFiltroViagem("todos"); }}
                style={{ background:"rgba(255,255,255,0.2)", border:"1px solid rgba(255,255,255,0.4)", borderRadius:8, padding:"6px 12px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                ✕ Limpar
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding:"20px 20px 60px", maxWidth:1200, margin:"0 auto" }}>

        {/* LAYOUT PRINCIPAL: sidebar + grade de KPIs */}
        <div style={{ display:"flex", gap:14, marginBottom:14, alignItems:"flex-start" }}>

          {/* RESULTADOS CHAVE sidebar */}
          <div style={{ width:180, flexShrink:0, background:"#fff", borderRadius:16, padding:16, boxShadow:"0 2px 12px rgba(0,0,0,0.07)", display:"flex", flexDirection:"column", gap:8 }}>
            <div style={{ fontWeight:800, fontSize:13, color:"#1B3F7A", marginBottom:4, textAlign:"center" }}>Resultados<br/>Chave</div>
            <div style={{ background:"#7c3aed", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
              <div style={{ fontWeight:900, fontSize:26, color:"#fff" }}>{fmtNum(municipiosVisitados)}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.85)", fontWeight:600 }}>Municípios</div>
            </div>
            <div style={{ background:"#0891b2", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
              <div style={{ fontWeight:900, fontSize:26, color:"#fff" }}>{fmtNum(totalPresentes)}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.85)", fontWeight:600 }}>Pessoas<br/>Capacitadas</div>
            </div>
            <div style={{ background:"#059669", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
              <div style={{ fontWeight:900, fontSize:26, color:"#fff" }}>90%</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.85)", fontWeight:600 }}>Satisfação</div>
            </div>
            <div style={{ background:"#ec4899", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
              <div style={{ fontWeight:900, fontSize:16, color:"#fff" }}>{fmtBRL(custoTotal)}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.85)", fontWeight:600 }}>Custo Total</div>
            </div>
          </div>

          {/* GRADE DE KPIs — 3 colunas × 3 linhas */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
            {/* Linha 1: KPIs principais */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              <div style={cardStyle()}>
                <div style={bigNum("#222")}>{fmtNum(municipiosVisitados)}</div>
                <div style={label("#888")}>Municípios visitados</div>
              </div>
              <div style={cardStyle()}>
                <div style={bigNum("#222")}>{fmtNum(totalPresentes)}</div>
                <div style={label("#888")}>Participantes capacitados</div>
              </div>
              <div style={cardStyle()}>
                <div style={{ fontWeight:900, fontSize:24, color:"#222", lineHeight:1, marginBottom:6 }}>{fmtBRL(custoTotal)}</div>
                <div style={label("#888")}>Custo total</div>
              </div>
            </div>

            {/* Linha 2: KPIs secundários */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              <div style={cardStyle()}>
                <div style={bigNum("#222")}>{fmtNum(totalInscritos)}</div>
                <div style={label("#888")}>Participantes inscritos</div>
              </div>
              <div style={cardStyle()}>
                <div style={bigNum("#222")}>{ausenciaAcum}%</div>
                <div style={label("#888")}>Ausência acumulada</div>
              </div>
              <div style={cardStyle()}>
                <div style={{ fontWeight:900, fontSize:26, color:"#222", lineHeight:1, marginBottom:6 }}>{fmtBRL(custoPorAluno)}</div>
                <div style={label("#888")}>Custo por participante capacitado</div>
              </div>
            </div>

            {/* Linha 3: NLL / Conselhos / Ouvidoria */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              <div style={{ ...cardStyle("#e8f4ff"), border:"none" }}>
                <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:10, borderBottom:"2px solid #1B3F7A", paddingBottom:6 }}>NLL</div>
                <div style={{ fontWeight:700, fontSize:11, color:"#888", marginBottom:4 }}>Participantes</div>
                <div style={bigNum("#1B3F7A")}>{fmtNum(nllPresentes)}</div>
                <div style={{ marginTop:10, fontWeight:700, fontSize:11, color:"#888" }}>Média por município</div>
                <div style={{ fontWeight:900, fontSize:24, color:"#1B3F7A" }}>{nllMediaMun}</div>
              </div>
              <div style={{ ...cardStyle("#fce4ec"), border:"none" }}>
                <div style={{ fontWeight:800, fontSize:15, color:"#c2185b", marginBottom:10, borderBottom:"2px solid #c2185b", paddingBottom:6 }}>Conselhos</div>
                <div style={{ fontWeight:700, fontSize:11, color:"#888", marginBottom:4 }}>Participantes</div>
                <div style={{ fontWeight:900, fontSize:32, color:"#c2185b", lineHeight:1, marginBottom:4 }}>{fmtNum(consPresentes)}</div>
                <div style={{ marginTop:10, fontWeight:700, fontSize:11, color:"#888" }}>Média por regional</div>
                <div style={{ fontWeight:900, fontSize:24, color:"#c2185b" }}>{consMediaReg}</div>
              </div>
              <div style={{ ...cardStyle("#e8f5e9"), border:"none" }}>
                <div style={{ fontWeight:800, fontSize:15, color:"#2e7d32", marginBottom:10, borderBottom:"2px solid #2e7d32", paddingBottom:6 }}>Ouvidoria</div>
                <div style={{ fontWeight:700, fontSize:11, color:"#888", marginBottom:4 }}>Participantes</div>
                <div style={{ fontWeight:900, fontSize:32, color:"#2e7d32", lineHeight:1, marginBottom:4 }}>{fmtNum(ouvPresentes)}</div>
                <div style={{ marginTop:10, fontWeight:700, fontSize:11, color:"#888" }}>Média por regional</div>
                <div style={{ fontWeight:900, fontSize:24, color:"#2e7d32" }}>{ouvMediaReg}</div>
              </div>
            </div>
          </div>
        </div>

        {/* TABELA DE VIAGENS */}
        <div style={{ background:"#fff", borderRadius:16, padding:"20px 24px", boxShadow:"0 2px 12px rgba(0,0,0,0.07)", marginBottom:14, overflowX:"auto" }}>
          <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:14 }}>📋 Detalhe por Município</div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:"#1a6b78", color:"#fff" }}>
                <th style={{ padding:"8px 10px", textAlign:"left", borderRadius:"0", fontWeight:700 }}>Viagem</th>
                <th style={{ padding:"8px 10px", textAlign:"left", fontWeight:700 }}>Data</th>
                <th style={{ padding:"8px 10px", textAlign:"left", fontWeight:700 }}>Município</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>NLL Insc.</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>NLL Pres.</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Cons. Insc.</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Cons. Pres.</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Ouv. Insc.</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Ouv. Pres.</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Total Pres.</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Evasão</th>
              </tr>
            </thead>
            <tbody>
              {dadosFiltrados.map((r,i) => {
                const totalInscM = r.insc_licit + r.insc_cons + r.insc_ouv;
                const totalPresM = r.pres_licit + r.pres_cons + r.pres_ouv;
                const evasaoM = totalInscM > 0 ? ((totalInscM - totalPresM) / totalInscM * 100).toFixed(1) : "—";
                return (
                  <tr key={i} style={{ background: i%2===0 ? "#fff" : "#f8f9fb", borderBottom:"1px solid #e8edf2" }}>
                    <td style={{ padding:"7px 10px", fontWeight:700, color:"#1B3F7A" }}>{r.viagem}</td>
                    <td style={{ padding:"7px 10px", color:"#555" }}>{r.data.split("-").reverse().join("/")}</td>
                    <td style={{ padding:"7px 10px", fontWeight:600 }}>{r.municipio}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right" }}>{r.insc_licit}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:700, color:"#1B3F7A" }}>{r.pres_licit}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right" }}>{r.insc_cons||"—"}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:700, color:"#c2185b" }}>{r.pres_cons||"—"}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right" }}>{r.insc_ouv||"—"}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:700, color:"#2e7d32" }}>{r.pres_ouv||"—"}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:700 }}>{totalPresM}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", color: parseFloat(evasaoM) > 30 ? "#dc2626" : "#059669", fontWeight:700 }}>{evasaoM !== "—" ? evasaoM+"%" : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* CUSTOS POR VIAGEM */}
        <div style={{ background:"#fff", borderRadius:16, padding:"20px 24px", boxShadow:"0 2px 12px rgba(0,0,0,0.07)", overflowX:"auto" }}>
          <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:14 }}>💰 Custos por Viagem</div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:"#1a6b78", color:"#fff" }}>
                <th style={{ padding:"8px 10px", textAlign:"left", fontWeight:700 }}>Viagem</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Transporte</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Instrutoria</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Diárias</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Total Part.</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Total</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Custo/Aluno</th>
              </tr>
            </thead>
            <tbody>
              {(filtroViagem !== "todos" ? CUSTOS_2025.filter(c => c.viagem === parseInt(filtroViagem)) : CUSTOS_2025).map((c,i) => (
                <tr key={i} style={{ background: i%2===0 ? "#fff" : "#f8f9fb", borderBottom:"1px solid #e8edf2" }}>
                  <td style={{ padding:"7px 10px", fontWeight:700, color:"#1B3F7A" }}>Viagem {c.viagem}</td>
                  <td style={{ padding:"7px 10px", textAlign:"right" }}>{c.custo_transp > 0 ? fmtBRL(c.custo_transp) : "—"}</td>
                  <td style={{ padding:"7px 10px", textAlign:"right" }}>{fmtBRL(c.custo_instrutoria)}</td>
                  <td style={{ padding:"7px 10px", textAlign:"right" }}>{c.custo_diarias > 0 ? fmtBRL(c.custo_diarias) : "—"}</td>
                  <td style={{ padding:"7px 10px", textAlign:"right" }}>{c.total_part}</td>
                  <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:700 }}>{fmtBRL(c.custo_transp + c.custo_instrutoria + c.custo_diarias)}</td>
                  <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:700, color:"#E8730A" }}>{fmtBRL(c.custo_aluno)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
