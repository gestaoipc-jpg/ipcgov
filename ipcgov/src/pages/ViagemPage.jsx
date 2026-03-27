import { useState, useEffect } from "react";
import emailjs from "@emailjs/browser";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import QRCode from "qrcode";
import { db } from "../firebase/config";

const MUNICIPIOS_CEARA = [
  "ABAIARA","ACARAÚ","ACARAPE","ACOPIARA","AIUABA","ALCÂNTARAS","ALTANEIRA","ALTO SANTO",
  "AMONTADA","ANTONINA DO NORTE","APUIARÉS","AQUIRAZ","ARACATI","ARACOIABA","ARARENDÁ",
  "ARARIPE","ARATUBA","ARNEIROZ","ASSARÉ","AURORA","BAIXIO","BANABUIÚ","BARBALHA",
  "BARREIRA","BARRO","BARROQUINHA","BATURITÉ","BEBERIBE","BELA CRUZ","BOA VIAGEM",
  "BREJO SANTO","CAMOCIM","CAMPOS SALES","CANINDÉ","CAPISTRANO","CARIDADE","CARIRÉ",
  "CARIRIAÇU","CARIÚS","CARNAUBAL","CASCAVEL","CATARINA","CATUNDA","CAUCAIA","CEDRO",
  "CHAVAL","CHORÓ","CHOROZINHO","COREAÚ","CRATEÚS","CRATO","CROATÁ","CRUZ",
  "DEP. IRAPUÃ PINHEIRO","ERERÉ","EUSÉBIO","FARIAS BRITO","FORQUILHA","FORTALEZA",
  "FORTIM","FRECHEIRINHA","GENERAL SAMPAIO","GRAÇA","GRANJA","GRANJEIRO","GROAÍRAS",
  "GUAIÚBA","GUARACIABA DO NORTE","GUARAMIRANGA","HIDROLÂNDIA","HORIZONTE","IBARETAMA",
  "IBIAPINA","IBICUITINGA","ICAPUÍ","ICÓ","IGUATU","INDEPENDÊNCIA","IPAPORANGA",
  "IPAUMIRIM","IPU","IPUEIRAS","IRACEMA","IRAUÇUBA","ITAIÇABA","ITAITINGA","ITAPAJÉ",
  "ITAPIPOCA","ITAPIÚNA","ITAREMA","ITATIRA","JAGUARETAMA","JAGUARIBARA","JAGUARIBE",
  "JAGUARUANA","JARDIM","JATI","JIJOCA DE JERICOACOARA","JUAZEIRO DO NORTE","JUCÁS",
  "LAVRAS DA MANGABEIRA","LIMOEIRO DO NORTE","MADALENA","MARACANAÚ","MARANGUAPE",
  "MARCO","MARTINÓPOLE","MASSAPÊ","MAURITI","MERUOCA","MILAGRES","MILHÃ","MIRAÍMA","MISSÃO VELHA",
  "MOMBAÇA","MONSENHOR TABOSA","MORADA NOVA","MORAÚJO","MORRINHOS","MUCAMBO","MULUNGU",
  "NOVA OLINDA","NOVA RUSSAS","NOVO ORIENTE","OCARA","ORÓS","PACAJUS","PACATUBA",
  "PACOTI","PACUJÁ","PALHANO","PALMÁCIA","PARACURU","PARAIPABA","PARAMBU","PARAMOTI",
  "PEDRA BRANCA","PENAFORTE","PENTECOSTE","PEREIRO","PINDORETAMA","PIQUET CARNEIRO",
  "PIRES FERREIRA","PORANGA","PORTEIRAS","POTENGI","POTIRETAMA","QUITERIANÓPOLIS","QUIXADÁ",
  "QUIXELÔ","QUIXERAMOBIM","QUIXERÉ","REDENÇÃO","RERIUTABA","RUSSAS","SABOEIRO",
  "SALITRE","SANTA QUITÉRIA","SANTANA DO ACARAÚ","SANTANA DO CARIRI","SÃO BENEDITO",
  "SÃO GONÇALO DO AMARANTE","SÃO JOÃO DO JAGUARIBE","SÃO LUÍS DO CURU","SENADOR POMPEU",
  "SENADOR SÁ","SOBRAL","SOLONÓPOLE","TABULEIRO DO NORTE","TAMBORIL","TARRAFAS","TAUÁ",
  "TEJUÇUOCA","TIANGUÁ","TRAIRÍ","TURURU","UBAJARA","UMIRIM","URUBURETAMA","URUOCA",
  "VARJOTA","VÁRZEA ALEGRE","VIÇOSA DO CEARÁ"
].sort();


const EMAILJS_SERVICE = "service_m6wjek9";
const EMAILJS_TEMPLATE = "template_lglpt37";
const EMAILJS_PUBLIC_KEY = "j--nV6wNKs8Pqyxlo";

function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function calcStatus(dataInicio, dataFim) {
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const ini = dataInicio ? new Date(dataInicio) : null;
  const fim = dataFim ? new Date(dataFim) : null;
  if (!ini) return "Programada";
  if (hoje < ini) return "Programada";
  if (fim && hoje > fim) return "Concluída";
  return "Em Execução";
}
function gerarDatasNoPeriodo(dataInicio, dataFim) {
  if (!dataInicio) return [];
  const datas = [];
  const ini = new Date(dataInicio + "T00:00:00");
  const fim = dataFim ? new Date(dataFim + "T00:00:00") : ini;
  const cur = new Date(ini);
  while (cur <= fim) {
    datas.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return datas;
}
function fmtWhats(num) {
  const d = (num || "").replace(/\D/g, "");
  if (d.length >= 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`;
  return num;
}

const EQUIPAMENTOS_LISTA = [
  "Notebook","Projetor","Caixa de Som","Microfone","Webcam",
  "Kit Transmissão","Passador de Slides","Mesa de Som","Filmadora",
  "Tripé Câmera","Tripé Banner","Tablet","Monitor","Computador",
  "Mesa de Corte","Máquina Fotográfica","Suporte Tablet","Outro",
];

const CHECKLIST_VIAGEM_ITENS = [
  "Solicitar viagem",
  "Solicitar diária terceirizados",
  "Solicitar divulgação site/redes sociais",
  "Organizar material e equipamentos",
  "Reunião de alinhamento",
];
const STATUS_COR = { Programada: "#7c3aed", "Em Execução": "#E8730A", Concluída: "#059669" };

const inp = {
  width: "100%", background: "#f8f9fb", border: "1px solid #e8edf2",
  borderRadius: 12, padding: "10px 14px", fontSize: 14, color: "#1B3F7A",
  outline: "none", fontFamily: "'Montserrat', sans-serif",
};
const lbl = {
  display: "block", color: "#888", fontSize: 11, letterSpacing: 1,
  textTransform: "uppercase", marginBottom: 5, fontWeight: 600,
};
const cardItem = {
  background: "#f8f9fb", borderRadius: 14, padding: "14px 16px",
  marginBottom: 10, border: "1px solid #e8edf2",
};
const btnAdd = {
  background: "#1B3F7A", border: "none", borderRadius: 10, padding: "8px 16px",
  color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
  fontFamily: "'Montserrat', sans-serif", whiteSpace: "nowrap",
};
const btnDel = {
  background: "none", border: "none", color: "#dc2626", fontSize: 20,
  cursor: "pointer", padding: "0 4px", lineHeight: 1, flexShrink: 0,
};


function QRCodeImg({ url, size = 100 }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width: size * 2, margin: 1, color: { dark: "#1B3F7A", light: "#ffffff" } })
      .then(setSrc)
      .catch(() => {});
  }, [url, size]);
  if (!src) return null;
  return (
    <div style={{ textAlign: "center" }}>
      <img src={src} alt="QR Code" style={{ width: size, height: size, borderRadius: 8, border: "1px solid #e8edf2" }} />
      <div style={{ fontSize: 9, color: "#aaa", marginTop: 2 }}>QR Code</div>
    </div>
  );
}


// Helper de upload — usa FormData para arquivos >2MB, base64 para menores
async function uploadParaDrive(file, modulo, nomeArquivo, publico = true) {
  const LIMITE_BASE64 = 4 * 1024 * 1024; // 4MB — abaixo disso usa base64
  const tipoArquivo = file.type || "application/octet-stream";
  const nome = nomeArquivo || file.name;

  if (file.size > LIMITE_BASE64) {
    // Arquivo grande — stream direto via servidor sem carregar em memória
    const resp = await fetch("/api/upload-stream", {
      method: "POST",
      headers: {
        "Content-Type": tipoArquivo,
        "X-Nome-Arquivo": encodeURIComponent(nome),
        "X-Tipo-Arquivo": tipoArquivo,
        "X-Modulo": modulo,
        "X-Publico": publico ? "true" : "false",
      },
      body: file,
    });
    const texto = await resp.text();
    try { return JSON.parse(texto); }
    catch(e) { return { sucesso: false, erro: texto }; }

  } else {
    // Arquivo pequeno — base64 via /api/upload
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const resp = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomeArquivo: nome,
        tipoArquivo,
        tamanho: file.size,
        modulo,
        publico,
        conteudoBase64: base64,
      }),
    });
    return JSON.parse(await resp.text());
  }
}

export default function ViagemPage({ user, viagem, onBack, onSaved, onRelatorio, onVerEvento, eventos, usuarios, servidores, instrutores, motoristas, grupos, podeEditar }) {
  const [form, setForm] = useState({ titulo: "", dataInicio: "", dataFim: "", modalidade: "Municipal", municipiosIds: [], municipiosAtendidos: [], equipe: [] });
  const [checklist, setChecklist] = useState({});
  const [itensCustom, setItensCustom] = useState([]);
  const [novoItem, setNovoItem] = useState("");
  const [novoEq, setNovoEq] = useState({ tipo: "", tombo: "", descricao: "", outro: "" });
  const [itemAberto, setItemAberto] = useState(null);
  const [novaOcItem, setNovaOcItem] = useState("");
  // Logística de Viagem
  const [hospedagens, setHospedagens] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [contatos, setContatos] = useState([]);
  const [alimentacao, setAlimentacao] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [novaHosp, setNovaHosp] = useState({ municipio: "", nome: "", tipoQuarto: "", valorDiaria: "", qtdDiaria: "", infoPagamento: "" });
  const [novoHor, setNovoHor] = useState({ data: "", hora: "", origem: "", destino: "", extra: "" });
  const [novoContato, setNovoContato] = useState({ nome: "", whatsapp: "", extra: "" });
  const [novoAlim, setNovoAlim] = useState({ nome: "", endereco: "", whatsapp: "", extra: "" });
  const [novaAgenda, setNovaAgenda] = useState({ data: "", hora: "", descricao: "", destino: "", motorista: "", pessoas: [], extra: "" });
  const [subBloco, setSubBloco] = useState(null);
  // Ocorrências
  const [ocorrencias, setOcorrencias] = useState([]);
  const [novaOc, setNovaOc] = useState({ tipo: "transporte", descricao: "" });
  // Material Didático
  const [materialDidatico, setMaterialDidatico] = useState({}); // { [eventoId_acaoIdx]: { url, fileId, nome } }
  const [uploadandoMaterial, setUploadandoMaterial] = useState({}); // { [key]: bool }

  // Pós Viagem
  const [licoesAprendidas, setLicoesAprendidas] = useState("");
  const [autorizacaoInstrutoria, setAutorizacaoInstrutoria] = useState({ autorizado: false, observacao: "", autorizadoPor: "", autorizadoEm: "" });
  const [instutoriaPaga, setInstutoriaPaga] = useState(false);
  const [instutoriaPagaEm, setInstutoriaPagaEm] = useState("");
  const [custoTransporte, setCustoTransporte] = useState("");
  const [custoInstrutoria, setCustoInstrutoria] = useState("");
  const [custoDiarias, setCustoDiarias] = useState("");
  const [planoAcaoViagem, setPlanoAcaoViagem] = useState(null);
  const [buscaMunAtendido, setBuscaMunAtendido] = useState("");
  const [novaAcaoV, setNovaAcaoV] = useState({ titulo:"", descricao:"", prioridade:"Média", prazo:"", responsavelTipo:"servidor", responsavelId:"", responsavelNome:"", responsavelEmail:"", responsavelOutroNome:"", responsavelOutroEmail:"" });
  const [salvandoAcaoV, setSalvandoAcaoV] = useState(false);
  const [equipamentos, setEquipamentos] = useState([]); // lista de equipamentos a levar
  const [distancias, setDistancias] = useState([]); // [{ origem, destino, km }]
  const [novaDistancia, setNovaDistancia] = useState({ origem: "", origemCustom: "", destino: "", destinoCustom: "", km: "" });
  const [equipeMunicipio, setEquipeMunicipio] = useState({}); // { [eventoId]: { motoristas:[], apoios:[] } }
  const [expandedMun, setExpandedMun] = useState(null); // eventoId com painel aberto
  // Almoxarifado materiais na viagem
  const [materiaisAlmox, setMateriaisAlmox] = useState([]); // lista do almox para seleção
  const [solicitacoesViagem, setSolicitacoesViagem] = useState([]); // solicitações desta viagem
  const [novaMatSol, setNovaMatSol] = useState({ materialId:"", quantidade:1, justificativa:"" });
  const [enviandoMat, setEnviandoMat] = useState(false);
  const [devForm, setDevForm] = useState({}); // qtd devolução por materialId
  // UI
  const [blocoAtivo, setBlocoAtivo] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(!viagem);
  const [menuEvento, setMenuEvento] = useState(null);

  const isAdmin = ["gestaoipc@tce.ce.gov.br", "fabricio@tce.ce.gov.br"].includes(user?.email);

  const todosOsMembros = (() => {
    const mapa = {};
    (servidores || []).forEach(s => { if (s.email) mapa[s.email] = { id: s.id, nome: s.nome || s.email, email: s.email, tipo: "servidor" }; });
    (usuarios || []).forEach(u => { if (u.email && !mapa[u.email]) mapa[u.email] = { id: u.id, nome: u.nome || u.email, email: u.email, tipo: "usuario" }; });
    (instrutores || []).forEach(i => { const k = i.email || ("inst_" + i.id); if (!mapa[k]) mapa[k] = { id: i.id, nome: i.nome || i.email || "Instrutor", email: k, tipo: "instrutor" }; });
    (motoristas || []).forEach(m => { const k = m.email || ("mot_" + m.id); if (!mapa[k]) mapa[k] = { id: m.id, nome: m.nome || m.email || "Motorista", email: k, tipo: "motorista" }; });
    return Object.values(mapa).sort((a, b) => {
      const ord = { servidor: 0, usuario: 0, instrutor: 1, motorista: 2 };
      const d = (ord[a.tipo] || 0) - (ord[b.tipo] || 0);
      return d !== 0 ? d : (a.nome || "").localeCompare(b.nome || "");
    });
  })();
  const apenasMotoristas = todosOsMembros.filter(m => m.tipo === "motorista");
  const eventosDisponiveis = (eventos || []).filter(e => e.tipo === "Municipal" || e.tipo === "Regional");
  const datasNoPeriodo = gerarDatasNoPeriodo(form.dataInicio, form.dataFim);

  useEffect(() => {
    if (viagem) {
      setForm({ titulo: viagem.titulo || "", dataInicio: viagem.dataInicio || "", dataFim: viagem.dataFim || "", modalidade: viagem.modalidade || "Municipal", municipiosIds: viagem.municipiosIds || [], municipiosAtendidos: viagem.municipiosAtendidos || [], equipe: viagem.equipe || [] });
      setChecklist(viagem.checklist || {});
      setMaterialDidatico(viagem.materialDidatico || {});
      setItensCustom(viagem.itensCustom || []);
      setOcorrencias(viagem.ocorrencias || []);
      setHospedagens(viagem.hospedagens || []);
      setHorarios(viagem.horarios || []);
      setContatos(viagem.contatos || []);
      setAlimentacao(viagem.alimentacao || []);
      setAgenda(viagem.agenda || []);
      setLicoesAprendidas(viagem.licoesAprendidas || "");
      setAutorizacaoInstrutoria(viagem.autorizacaoInstrutoria || { autorizado: false, observacao: "", autorizadoPor: "", autorizadoEm: "" });
      setInstutoriaPaga(viagem.instutoriaPaga || false);
      setInstutoriaPagaEm(viagem.instutoriaPagaEm || "");
      setCustoTransporte(viagem.custoTransporte || "");
      setCustoInstrutoria(viagem.custoInstrutoria || "");
      setCustoDiarias(viagem.custoDiarias || "");
      setPlanoAcaoViagem(viagem.planoAcaoViagem || null);
      setEquipamentos(viagem.equipamentos || []);
      setDistancias(viagem.distancias || []);
      setEquipeMunicipio(viagem.equipeMunicipio || {});
      loadMateriaisAlmox();
      loadSolicitacoesViagem(viagem.id);
    }
  }, [viagem]);

  const loadMateriaisAlmox = async () => {
    try {
      const snap = await getDocs(collection(db, "almox_materiais"));
      setMateriaisAlmox(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.nome||"").localeCompare(b.nome||"")));
    } catch(e){ console.error(e); }
  };

  const loadSolicitacoesViagem = async (viagemId) => {
    if (!viagemId) return;
    try {
      const snap = await getDocs(collection(db, "almox_solicitacoes"));
      const todas = snap.docs.map(d=>({id:d.id,...d.data()}));
      setSolicitacoesViagem(todas.filter(s=>s.origemViagem===viagemId));
    } catch(e){ console.error(e); }
  };

  const solicitarMaterialAlmox = async () => {
    if (!novaMatSol.materialId) return;
    setEnviandoMat(true);
    try {
      const mat = materiaisAlmox.find(m=>m.id===novaMatSol.materialId);
      if (!mat) return;
      const qtd = parseInt(novaMatSol.quantidade)||1;
      if (qtd > (mat.estoqueAtual||0)) { alert("Estoque insuficiente!"); setEnviandoMat(false); return; }

      const precisaAutorizacao = !!mat.cargoAutorizadorId;
      const novoStatus = precisaAutorizacao ? "Aguardando Autorização" : "Aguardando Homologação";

      const dados = {
        itens: [{ materialId:mat.id, materialNome:mat.nome, quantidade:qtd, unidade:mat.unidade||"un." }],
        justificativa: novaMatSol.justificativa||"",
        setor: "TCEduc",
        origemViagem: viagem.id,
        origemViagemTitulo: viagem.titulo,
        status: novoStatus,
        solicitante: user?.email||"sistema",
        solicitanteNome: user?.displayName||user?.email,
        cargoAutorizadorId: mat.cargoAutorizadorId||null,
        cargoAutorizadorNome: mat.cargoAutorizadorNome||null,
        criadoEm: new Date().toISOString(),
        historico: [{ data:new Date().toISOString(), autor:user?.email, tipo:"criacao",
          texto:`📋 Solicitação criada via TCEduc (Viagem: ${viagem.titulo}) por ${user?.displayName||user?.email}. Status: ${novoStatus}` }],
      };
      const ref = await addDoc(collection(db,"almox_solicitacoes"), dados);
      const nova = { id:ref.id, ...dados };
      setSolicitacoesViagem(s=>[...s, nova]);

      // Alertas
      if (precisaAutorizacao) {
        await addDoc(collection(db,"almox_alertas"),{
          tipo:"autorizacao_necessaria", solicitacaoId:ref.id, lido:false,
          cargoDestinatario:mat.cargoAutorizadorId,
          mensagem:`🔐 Solicitação de ${mat.nome} via viagem "${viagem.titulo}" aguarda sua autorização. Solicitante: ${user?.displayName||user?.email}`,
          criadoEm:new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db,"almox_alertas"),{
          tipo:"homologacao_pendente", solicitacaoId:ref.id, lido:false,
          grupo:"Almoxarifado Administrativo",
          mensagem:`📦 Nova solicitação de materiais para viagem "${viagem.titulo}". Solicitante: ${user?.displayName||user?.email}`,
          criadoEm:new Date().toISOString(),
        });
      }

      setNovaMatSol({ materialId:"", quantidade:1, justificativa:"" });
    } catch(e){ console.error(e); alert("Erro ao solicitar material."); }
    setEnviandoMat(false);
  };

  const registrarDevolucao = async (sol) => {
    const itensDev = (sol.itensEntregues||sol.itens||[]).filter(it=>(devForm[it.materialId]||0)>0).map(it=>({
      materialId:it.materialId, materialNome:it.materialNome,
      qtdDevolvida:devForm[it.materialId]||0, unidade:it.unidade
    }));
    if (itensDev.length===0) { alert("Informe ao menos uma quantidade."); return; }
    setEnviandoMat(true);
    try {
      const textoHist = `↩️ Devolução solicitada por ${user?.displayName||user?.email}: ${itensDev.map(it=>`${it.materialNome} (${it.qtdDevolvida})`).join(", ")}`;
      const novoHist = [...(sol.historico||[]),{ data:new Date().toISOString(), autor:user?.email, tipo:"devolucao_solicitada", texto:textoHist }];
      await updateDoc(doc(db,"almox_solicitacoes",sol.id),{
        status:"Devolução Pendente", historico:novoHist, itensDevolucao:itensDev, atualizadoEm:new Date().toISOString()
      });
      await addDoc(collection(db,"almox_alertas"),{
        tipo:"devolucao_pendente", solicitacaoId:sol.id, lido:false,
        grupo:"Almoxarifado Administrativo",
        mensagem:`↩️ Devolução de materiais da viagem "${viagem.titulo}" aguardando homologação. Solicitante: ${user?.displayName||user?.email}`,
        criadoEm:new Date().toISOString(),
      });
      const atualizada = {...sol,status:"Devolução Pendente",historico:novoHist,itensDevolucao:itensDev};
      setSolicitacoesViagem(s=>s.map(x=>x.id===sol.id?atualizada:x));
      setDevForm({});
    } catch(e){ console.error(e); }
    setEnviandoMat(false);
  };

  const status = calcStatus(form.dataInicio, form.dataFim);
  const todosItens = [...CHECKLIST_VIAGEM_ITENS, ...itensCustom];
  const eventosVinculados = eventosDisponiveis.filter(e => form.municipiosIds.includes(e.id)).sort((a, b) => (a.data || "").localeCompare(b.data || ""));

  const toggleCheck = (item) => setChecklist(c => ({ ...c, [item]: { ...c[item], feito: !c[item]?.feito } }));

  const adicionarAcaoViagem = async () => {
    const n = novaAcaoV;
    if (!n.titulo.trim()) return;
    const responsavelNome  = n.responsavelTipo === "outro" ? n.responsavelOutroNome  : n.responsavelNome;
    const responsavelEmail = n.responsavelTipo === "outro" ? n.responsavelOutroEmail : n.responsavelEmail;
    if (!responsavelNome.trim() || !responsavelEmail.trim()) return;
    setSalvandoAcaoV(true);
    const novaAcao = {
      id: Date.now().toString(),
      titulo: n.titulo, descricao: n.descricao, prioridade: n.prioridade, prazo: n.prazo,
      responsavelId: n.responsavelId || "", responsavelNome, responsavelEmail,
      status: "Pendente",
      criadoPor: user?.displayName || user?.email || "—",
      criadoEm: new Date().toISOString(),
    };
    const planoAtual = planoAcaoViagem || { titulo: `Plano de Ação — ${viagem.titulo}`, viagemId: viagem.id, viagemNome: viagem.titulo, viagem: true, acoes: [], criadoEm: new Date().toISOString() };
    const novasAcoes = [...(planoAtual.acoes || []), novaAcao];
    const planoAtualizado = { ...planoAtual, acoes: novasAcoes, atualizadoEm: new Date().toISOString() };

    // Salva na coleção separada
    let planoId = planoAtual.id;
    if (!planoId) {
      const ref = await addDoc(collection(db, "tceduc_planos_acao"), planoAtualizado);
      planoId = ref.id;
      planoAtualizado.id = planoId;
    } else {
      await updateDoc(doc(db, "tceduc_planos_acao", planoId), planoAtualizado);
    }
    // Salva referência na viagem
    await updateDoc(doc(db, "tceduc_viagens", viagem.id), { planoAcaoViagem: planoAtualizado, atualizadoEm: new Date().toISOString() });
    setPlanoAcaoViagem(planoAtualizado);

    // Notificação por email
    try {
      const corpo_completo = `Olá, ${responsavelNome}!\n\nVocê tem uma nova ação delegada no Plano de Ação da Viagem TCEduc.\n\n✈️ Viagem: ${viagem.titulo}\n📋 Plano: ${planoAtualizado.titulo}\n🎯 Ação: ${novaAcao.titulo}\n${novaAcao.descricao ? "📝 Descrição: " + novaAcao.descricao + "\n" : ""}🔴 Prioridade: ${novaAcao.prioridade}\n${novaAcao.prazo ? "📅 Prazo: " + new Date(novaAcao.prazo + "T12:00:00").toLocaleDateString("pt-BR") + "\n" : ""}\nAcesse o sistema para visualizar e atualizar o andamento desta ação.\n\n---\nAtenciosamente,\nEquipe IPCgov — Instituto Plácido Castelo\n\n🔗 Acesse: https://ipcgov.vercel.app`;
      await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
        to_name: responsavelNome, to_email: responsavelEmail,
        subject: `📋 Nova ação delegada — Viagem TCEduc: ${viagem.titulo}`,
        corpo_completo,
      }, EMAILJS_PUBLIC_KEY);
    } catch(e) { console.warn("Email não enviado:", e); }

    setNovaAcaoV({ titulo:"", descricao:"", prioridade:"Média", prazo:"", responsavelTipo:"servidor", responsavelId:"", responsavelNome:"", responsavelEmail:"", responsavelOutroNome:"", responsavelOutroEmail:"" });
    setSalvandoAcaoV(false);
  };

  const removerAcaoViagem = async (acaoId) => {
    if (!planoAcaoViagem) return;
    const novasAcoes = (planoAcaoViagem.acoes || []).filter(a => a.id !== acaoId);
    const planoAtualizado = { ...planoAcaoViagem, acoes: novasAcoes, atualizadoEm: new Date().toISOString() };
    await updateDoc(doc(db, "tceduc_planos_acao", planoAcaoViagem.id), planoAtualizado);
    await updateDoc(doc(db, "tceduc_viagens", viagem.id), { planoAcaoViagem: planoAtualizado, atualizadoEm: new Date().toISOString() });
    setPlanoAcaoViagem(planoAtualizado);
  };
  const setItemResp = (item, v) => setChecklist(c => ({ ...c, [item]: { ...c[item], responsavel: v } }));
  const setItemData = (item, v) => setChecklist(c => ({ ...c, [item]: { ...c[item], dataLimite: v } }));
  const adicionarOcItem = (item) => {
    if (!novaOcItem.trim()) return;
    const ocs = checklist[item]?.ocorrencias || [];
    setChecklist(c => ({ ...c, [item]: { ...c[item], ocorrencias: [...ocs, { texto: novaOcItem.trim(), data: new Date().toISOString(), autor: user?.email || "sistema" }] } }));
    setNovaOcItem("");
  };

  const progChecklist = () => {
    const total = todosItens.length;
    if (!total) return { done: 0, total: 0, pct: 0 };
    const done = todosItens.filter(i => checklist[i]?.feito).length;
    return { done, total, pct: Math.round((done / total) * 100) };
  };
  const prog = progChecklist();

  const todosOsDados = () => ({ checklist,
    materialDidatico, itensCustom, ocorrencias, hospedagens, horarios, contatos, alimentacao, agenda, licoesAprendidas, planoAcaoViagem, equipamentos, equipeMunicipio, distancias, autorizacaoInstrutoria, custoTransporte, custoInstrutoria, custoDiarias, atualizadoEm: new Date().toISOString() });

  const salvarBloco = async () => {
    if (!viagem?.id) return;
    setSalvando(true);
    try {
      const dados = todosOsDados();
      await updateDoc(doc(db, "tceduc_viagens", viagem.id), dados);
      onSaved({ ...viagem, ...dados });
    } catch (e) { console.error(e); }
    setSalvando(false);
  };

  const salvar = async () => {
    if (!form.titulo.trim()) { alert("Informe o título da viagem."); return; }
    setSalvando(true);
    const dados = { titulo: form.titulo.trim(), dataInicio: form.dataInicio, dataFim: form.dataFim, modalidade: form.modalidade || "Municipal", municipiosIds: form.municipiosIds, municipiosAtendidos: form.modalidade === "Regional" ? form.municipiosAtendidos : [], equipe: form.equipe, status, ...todosOsDados() };
    try {
      let viagemId = viagem?.id;
      if (viagem?.id) {
        await updateDoc(doc(db, "tceduc_viagens", viagem.id), dados);
        onSaved({ ...viagem, ...dados });
      } else {
        dados.criadoEm = new Date().toISOString();
        dados.criadoPor = user?.email || "";
        const ref = await addDoc(collection(db, "tceduc_viagens"), dados);
        viagemId = ref.id;
        onSaved({ id: ref.id, ...dados });
      }
      setModoEdicao(false);

      // --- PROCESSOS FUTUROS: verificar ações com pagamento de instrutoria ---
      try {
        const eventosVinc = eventosDisponiveis.filter(e => dados.municipiosIds.includes(e.id));
        const acoesPagamento = [];
        eventosVinc.forEach(ev => {
          (ev.acoesEducacionais || []).forEach(acao => {
            if (acao.pagamentoInstrutoria) {
              const instrs = (acao.instrutores && acao.instrutores.length > 0)
                ? acao.instrutores.map(i => i.instrutorNome).filter(Boolean)
                : [acao.instrutorNome].filter(Boolean);
              acoesPagamento.push({
                municipio: ev.municipio || ev.regiao || "Município",
                curso: acao.acaoNome || acao.nome || "Curso",
                instrutores: instrs,
                valor: acao.valorInstrutoria || "",
                data: ev.data || "",
              });
            }
          });
        });

        if (acoesPagamento.length > 0) {
          // Verificar se já existe processo futuro para esta viagem (não duplicar)
          const pFutSnap = await getDocs(collection(db, "processos_futuros"));
          const jaExiste = pFutSnap.docs.some(d => d.data().viagemId === viagemId && !d.data().distribuido);
          if (!jaExiste) {
            // Montar objetivo
            const linhasObj = acoesPagamento.map(a => {
              const instr = a.instrutores.length > 0 ? a.instrutores.join(", ") : "—";
              const data = a.data ? new Date(a.data + "T12:00:00").toLocaleDateString("pt-BR") : "";
              const valorLinha = a.valor ? "\n  Valor: R$ " + a.valor : "";
              return "• " + a.municipio + (data ? " (" + data + ")" : "") + "\n  Curso: " + a.curso + "\n  Instrutor(es): " + instr + valorLinha;
            });
            const objetivo = "Pagamento de instrutoria referente às seguintes ações educacionais:\n\n" + linhasObj.join("\n\n");
            const dataEvento = acoesPagamento
              .map(a => a.data)
              .filter(Boolean)
              .sort()[0] || "";
            await addDoc(collection(db, "processos_futuros"), {
              titulo: dados.titulo,
              objetivo,
              status: "Aguardando",
              tipo_processo: "TCEduc",
              responsavel: "",
              viagemId,
              dataEvento,
              distribuido: false,
              criadoEm: new Date().toISOString(),
              criadoPor: user?.email || "sistema",
            });
          }
        }
      } catch(eProc) { console.warn("Erro ao criar processo futuro:", eProc); }
    } catch (e) { console.error(e); alert("Erro ao salvar."); }
    setSalvando(false);
  };

  const toggleMunicipio = (id) => setForm(f => ({ ...f, municipiosIds: f.municipiosIds.includes(id) ? f.municipiosIds.filter(x => x !== id) : [...f.municipiosIds, id] }));
  const toggleMembro = (email) => setForm(f => ({ ...f, equipe: f.equipe.includes(email) ? f.equipe.filter(x => x !== email) : [...f.equipe, email] }));
  const excluirOcorrencia = (id) => {
    const oc = ocorrencias.find(o => o.id === id);
    if (!oc || (!isAdmin && oc.autorEmail !== user?.email)) { alert("Sem permissão para excluir."); return; }
    if (!window.confirm("Excluir esta ocorrência?")) return;
    setOcorrencias(p => p.filter(o => o.id !== id));
  };
  const resolveMembro = (chave) => {
    if (!chave) return "—";
    if (chave.startsWith("inst_")) { const m = (instrutores||[]).find(x=>x.id===chave.replace("inst_","")); return m?.nome || chave; }
    if (chave.startsWith("mot_")) { const m = (motoristas||[]).find(x=>x.id===chave.replace("mot_","")); return m?.nome || chave; }
    return todosOsMembros.find(x => x.email === chave)?.nome || chave;
  };

  const TIPO_OC = { transporte: "🚌 Transporte", hotel: "🏨 Hotel/Hospedagem", alimentacao: "🍽️ Alimentação", outro: "📌 Outro" };

  const BtnSalvar = () => (
    <button onClick={salvarBloco} disabled={salvando} style={{ width: "100%", marginTop: 16, background: salvando ? "#ccc" : "linear-gradient(135deg,#1B3F7A,#2a5ba8)", border: "none", borderRadius: 12, padding: 13, color: "#fff", fontWeight: 700, fontSize: 14, cursor: salvando ? "not-allowed" : "pointer", fontFamily: "'Montserrat', sans-serif" }}>
      {salvando ? "Salvando..." : "💾 Salvar"}
    </button>
  );

  const renderCheckItem = (item, isCustom = false) => {
    const val = checklist[item] || {};
    const venceEm = val.dataLimite ? Math.ceil((new Date(val.dataLimite) - new Date()) / 86400000) : null;
    const atrasado = venceEm !== null && venceEm < 0 && !val.feito;
    const urgente = venceEm !== null && venceEm <= 2 && venceEm >= 0 && !val.feito;
    return (
      <div key={item} style={{ background: val.feito ? "#e8f5e9" : atrasado ? "#fee2e2" : urgente ? "#fff3e0" : "#f8f9fb", borderRadius: 14, marginBottom: 10, border: `1px solid ${val.feito ? "#c8e6c9" : atrasado ? "#fecaca" : urgente ? "#fed7aa" : "#e8edf2"}`, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }} onClick={() => toggleCheck(item)}>
          <div style={{ width: 24, height: 24, borderRadius: 8, background: val.feito ? "#059669" : "#fff", border: `2px solid ${val.feito ? "#059669" : "#ddd"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", flexShrink: 0 }}>{val.feito ? "✓" : ""}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14, color: val.feito ? "#059669" : "#333", fontWeight: val.feito ? 600 : 400, textDecoration: val.feito ? "line-through" : "none" }}>{item}</span>
              {isCustom && <span style={{ background: "#eff6ff", borderRadius: 5, padding: "1px 6px", fontSize: 10, color: "#1B3F7A", fontWeight: 700 }}>custom</span>}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
              {val.responsavel && <span style={{ fontSize: 11, color: "#888" }}>👤 {val.responsavel}</span>}
              {val.dataLimite && <span style={{ fontSize: 11, color: atrasado ? "#dc2626" : urgente ? "#E8730A" : "#888", fontWeight: atrasado || urgente ? 700 : 400 }}>📅 {formatDate(val.dataLimite)}{atrasado ? " ⚠️ ATRASADO" : urgente ? ` ⏰ ${venceEm === 0 ? "HOJE" : `${venceEm}d`}` : ""}</span>}
              {(val.ocorrencias || []).length > 0 && <span style={{ fontSize: 11, color: "#E8730A", fontWeight: 700 }}>⚠️ {val.ocorrencias.length} ocorrência{val.ocorrencias.length !== 1 ? "s" : ""}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {isCustom && <button style={{ ...btnDel, fontSize: 15 }} onClick={e => { e.stopPropagation(); setItensCustom(p => p.filter(x => x !== item)); setChecklist(c => { const n = { ...c }; delete n[item]; return n; }); }}>🗑</button>}
            <div onClick={e => { e.stopPropagation(); setItemAberto(itemAberto === item ? null : item); }} style={{ fontSize: 16, color: "#aaa", cursor: "pointer", padding: "4px 8px" }}>⋮</div>
          </div>
        </div>
        {itemAberto === item && (
          <div style={{ padding: "0 16px 14px", borderTop: "1px solid #e8edf2" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12, marginBottom: 12 }}>
              <div><label style={lbl}>Responsável</label><select value={val.responsavel || ""} onChange={e => setItemResp(item, e.target.value)} style={{ ...inp, padding: "8px 12px" }}><option value="">Selecione...</option>{todosOsMembros.map(m => <option key={m.email} value={m.email}>{m.nome}</option>)}</select></div>
              <div><label style={lbl}>Data Limite</label><input type="date" value={val.dataLimite || ""} onChange={e => setItemData(item, e.target.value)} style={{ ...inp, padding: "8px 12px" }} /></div>
            </div>
            <label style={lbl}>Ocorrências do item</label>
            {(val.ocorrencias || []).map((oc, j) => (<div key={j} style={{ background: "#fff3e0", borderRadius: 8, padding: "8px 12px", marginBottom: 6, fontSize: 12, color: "#333", borderLeft: "3px solid #E8730A" }}><div style={{ color: "#aaa", fontSize: 10, marginBottom: 2 }}>{new Date(oc.data).toLocaleString("pt-BR")} · {oc.autor}</div>{oc.texto}</div>))}
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <input value={novaOcItem} onChange={e => setNovaOcItem(e.target.value)} placeholder="Registrar ocorrência neste item..." style={{ ...inp, flex: 1, padding: "8px 12px" }} />
              <div onClick={() => adicionarOcItem(item)} style={{ background: "#E8730A", borderRadius: 10, padding: "8px 14px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>+ Add</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#E8EDF2", fontFamily: "'Montserrat', sans-serif" }} onClick={() => menuEvento && setMenuEvento(null)}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", padding: "20px 24px 28px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div onClick={onBack} style={{ width: 38, height: 38, background: "rgba(255,255,255,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 18 }}>←</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, letterSpacing: 3, textTransform: "uppercase" }}>TCEduc</div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>{viagem ? (form.titulo || "Viagem") : "Nova Viagem"}</div>
            </div>
            {viagem && <div style={{ background: STATUS_COR[status], borderRadius: 10, padding: "5px 14px", color: "#fff", fontWeight: 700, fontSize: 12 }}>{status}</div>}
          </div>
          {viagem && !modoEdicao && (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {form.dataInicio && <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>📅 {formatDate(form.dataInicio)}{form.dataFim ? " → " + formatDate(form.dataFim) : ""}</div>}
              {form.modalidade && <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 }}>{form.modalidade === "Regional" ? "🗺️ Regional" : "🏘️ Municipal"}</div>}
              <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>📍 {form.municipiosIds.length} município{form.municipiosIds.length !== 1 ? "s" : ""}</div>
              <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>👥 {form.equipe.length} membro{form.equipe.length !== 1 ? "s" : ""}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px 80px" }}>

        {/* ===== MODO EDIÇÃO ===== */}
        {modoEdicao && (
          <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 20, boxShadow: "0 2px 16px rgba(27,63,122,0.08)" }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#1B3F7A", marginBottom: 20 }}>✏️ {viagem ? "Editar Viagem" : "Criar Viagem"}</div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Título *</label><input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: TCEduc Municipal 1" style={inp} /></div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Modalidade</label>
              <div style={{ display: "flex", gap: 10 }}>
                {["Municipal","Regional"].map(mod => (
                  <div key={mod} onClick={() => setForm(f => ({ ...f, modalidade: mod }))}
                    style={{ flex: 1, border: "2px solid " + (form.modalidade === mod ? "#1B3F7A" : "#e8edf2"), borderRadius: 12, padding: "12px 0", textAlign: "center", cursor: "pointer",
                      background: form.modalidade === mod ? "#1B3F7A" : "#f8f9fb",
                      color: form.modalidade === mod ? "#fff" : "#888", fontWeight: 700, fontSize: 14 }}>
                    {mod === "Municipal" ? "🏘️ Municipal" : "🗺️ Regional"}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div><label style={lbl}>Início</label><input type="date" value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} style={inp} /></div>
              <div><label style={lbl}>Fim</label><input type="date" value={form.dataFim} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))} style={inp} /></div>
            </div>
            {form.dataInicio && <div style={{ marginBottom: 14 }}><span style={{ background: (STATUS_COR[status]||"#888")+"22", border:`1px solid ${STATUS_COR[status]||"#888"}`, borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: STATUS_COR[status]||"#888" }}>Status previsto: {status}</span></div>}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Equipe ({form.equipe.length} selecionados)</label>
              <div style={{ background: "#f8f9fb", borderRadius: 12, padding: 10, maxHeight: 180, overflowY: "auto", border: "1px solid #e8edf2" }}>
                {todosOsMembros.map(m => (
                  <div key={m.email} onClick={() => toggleMembro(m.email)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 8, cursor: "pointer", background: form.equipe.includes(m.email) ? "#eff6ff" : "transparent", marginBottom: 2 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: form.equipe.includes(m.email) ? "#1B3F7A" : "#fff", border: `2px solid ${form.equipe.includes(m.email) ? "#1B3F7A" : "#ddd"}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, flexShrink: 0 }}>{form.equipe.includes(m.email) ? "✓" : ""}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{m.nome}</span>
                        {m.tipo === "instrutor" && <span style={{ background: "#f3e8ff", borderRadius: 4, padding: "1px 5px", fontSize: 10, color: "#7c3aed", fontWeight: 700 }}>Instrutor</span>}
                        {m.tipo === "motorista" && <span style={{ background: "#e0f2fe", borderRadius: 4, padding: "1px 5px", fontSize: 10, color: "#0891b2", fontWeight: 700 }}>Motorista</span>}
                      </div>
                      {m.email && !m.email.startsWith("inst_") && !m.email.startsWith("mot_") && <div style={{ fontSize: 11, color: "#888" }}>{m.email}</div>}
                    </div>
                  </div>
                ))}
                {todosOsMembros.length === 0 && <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: 10 }}>Nenhum membro disponível</div>}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Municípios / Eventos ({form.municipiosIds.length} selecionados)</label>
              <div style={{ background: "#f8f9fb", borderRadius: 12, padding: 10, maxHeight: 200, overflowY: "auto", border: "1px solid #e8edf2" }}>
                {eventosDisponiveis.length === 0 && <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: 10 }}>Nenhum evento cadastrado</div>}
                {eventosDisponiveis.map(ev => (
                  <div key={ev.id} onClick={() => toggleMunicipio(ev.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 8, cursor: "pointer", background: form.municipiosIds.includes(ev.id) ? "#eff6ff" : "transparent", marginBottom: 2 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: form.municipiosIds.includes(ev.id) ? "#1B3F7A" : "#fff", border: `2px solid ${form.municipiosIds.includes(ev.id) ? "#1B3F7A" : "#ddd"}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, flexShrink: 0 }}>{form.municipiosIds.includes(ev.id) ? "✓" : ""}</div>
                    <div><div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{ev.tipo === "Municipal" ? ev.municipio : ev.regiao}</div><div style={{ fontSize: 11, color: "#888" }}>{ev.tipo} · {formatDate(ev.data)} · {ev.status}</div></div>
                  </div>
                ))}
              </div>
            </div>
            {/* MUNICÍPIOS ATENDIDOS — apenas para Regional */}
            {form.modalidade === "Regional" && (
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>🗺️ Municípios Atendidos pela Regional ({form.municipiosAtendidos.length} selecionados)</label>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>Selecione todos os municípios que esta regional cobre (além da sede)</div>
                <input
                  type="text"
                  placeholder="🔍 Buscar município..."
                  value={buscaMunAtendido}
                  onChange={e => setBuscaMunAtendido(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: "1px solid #e8edf2", fontSize: 13, marginBottom: 8, fontFamily: "'Montserrat',sans-serif", outline: "none" }}
                />
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <div onClick={() => setForm(f => ({ ...f, municipiosAtendidos: MUNICIPIOS_CEARA }))}
                    style={{ fontSize: 11, color: "#1B3F7A", fontWeight: 700, cursor: "pointer", background: "#eff6ff", borderRadius: 6, padding: "3px 10px" }}>
                    Selecionar todos
                  </div>
                  <div onClick={() => setForm(f => ({ ...f, municipiosAtendidos: [] }))}
                    style={{ fontSize: 11, color: "#dc2626", fontWeight: 700, cursor: "pointer", background: "#fee2e2", borderRadius: 6, padding: "3px 10px" }}>
                    Limpar
                  </div>
                </div>
                <div style={{ background: "#f8f9fb", borderRadius: 12, padding: 10, maxHeight: 220, overflowY: "auto", border: "1px solid #e8edf2" }}>
                  {MUNICIPIOS_CEARA.filter(m => m.toLowerCase().includes(buscaMunAtendido.toLowerCase())).map(mun => (
                    <div key={mun} onClick={() => setForm(f => ({
                        ...f,
                        municipiosAtendidos: f.municipiosAtendidos.includes(mun)
                          ? f.municipiosAtendidos.filter(x => x !== mun)
                          : [...f.municipiosAtendidos, mun]
                      }))}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                        background: form.municipiosAtendidos.includes(mun) ? "#eff6ff" : "transparent", marginBottom: 2 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        background: form.municipiosAtendidos.includes(mun) ? "#1B3F7A" : "#fff",
                        border: "2px solid " + (form.municipiosAtendidos.includes(mun) ? "#1B3F7A" : "#ddd"),
                        display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10 }}>
                        {form.municipiosAtendidos.includes(mun) ? "✓" : ""}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: form.municipiosAtendidos.includes(mun) ? 700 : 400,
                        color: form.municipiosAtendidos.includes(mun) ? "#1B3F7A" : "#333" }}>{mun}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={salvar} disabled={salvando || !form.titulo.trim()} style={{ flex: 1, background: salvando || !form.titulo.trim() ? "#ccc" : "linear-gradient(135deg,#1B3F7A,#2a5ba8)", border: "none", borderRadius: 12, padding: 14, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>{salvando ? "Salvando..." : "💾 Salvar Viagem"}</button>
              {viagem && <button onClick={() => setModoEdicao(false)} style={{ background: "#f0f4ff", border: "none", borderRadius: 12, padding: "14px 20px", color: "#1B3F7A", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>Cancelar</button>}
            </div>
          </div>
        )}

        {/* ===== MODO VISUALIZAÇÃO ===== */}
        {!modoEdicao && viagem && (
          <>
            {/* CARDS BLOCOS — grid 3+2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
              {[
                { id: "checklist", icon: "📋", label: "Logística Antes", sub: `${prog.done}/${prog.total} — ${prog.pct}%`, color: "#1B3F7A", prog: true },
                { id: "equipamentos", icon: "🎒", label: "Equipamentos", sub: `${equipamentos.length} item${equipamentos.length!==1?"s":""}`, color: "#7c3aed" },
                { id: "logviagem",  icon: "🗺️", label: "Logística de Viagem", sub: `${hospedagens.length + horarios.length + contatos.length + alimentacao.length + agenda.length} itens`, color: "#2a5ba8" },
                { id: "distancias", icon: "📏", label: "Distâncias", sub: `${distancias.length} trecho${distancias.length !== 1 ? "s" : ""}`, color: "#0891b2" },
                { id: "materiais", icon: "📦", label: "Materiais Almox.", sub: `${solicitacoesViagem.length} solicitaç${solicitacoesViagem.length!==1?"ões":"ão"}`, color: "#059669" },
                { id: "ocorrencias", icon: "⚠️", label: "Ocorrências", sub: `${ocorrencias.length} registradas`, color: "#E8730A" },
              ].map(b => (
                <div key={b.id} onClick={() => setBlocoAtivo(blocoAtivo === b.id ? null : b.id)} style={{ background: blocoAtivo === b.id ? "#fff" : "#f8f9fb", borderRadius: 16, padding: 14, cursor: "pointer", border: `2px solid ${blocoAtivo === b.id ? b.color : "transparent"}`, transition: "all .15s" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: b.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 7 }}>{b.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "#1B3F7A", marginBottom: 2 }}>{b.label}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{b.sub}</div>
                  {b.prog && <div style={{ marginTop: 7, height: 3, background: "#e8edf2", borderRadius: 3 }}><div style={{ height: 3, background: prog.pct === 100 ? "#059669" : b.color, borderRadius: 3, width: `${prog.pct}%` }} /></div>}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { id: "municipios", icon: "📍", label: "Municípios / Eventos", sub: `${eventosVinculados.length} vinculados`, color: "#059669" },
                { id: "posviagem", icon: "✅", label: "Pós Viagem", sub: licoesAprendidas ? "Lições registradas" : "Sem registros", color: "#059669" },
                { id: "material_didatico", icon: "📚", label: "Material Didático", sub: `${Object.keys(materialDidatico).length} apresentaç${Object.keys(materialDidatico).length !== 1 ? "ões" : "ão"}`, color: "#7c3aed" },
              ].map(b => (
                <div key={b.id} onClick={() => setBlocoAtivo(blocoAtivo === b.id ? null : b.id)} style={{ background: blocoAtivo === b.id ? "#fff" : "#f8f9fb", borderRadius: 16, padding: 14, cursor: "pointer", border: `2px solid ${blocoAtivo === b.id ? b.color : "transparent"}`, transition: "all .15s" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: b.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 7 }}>{b.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "#1B3F7A", marginBottom: 2 }}>{b.label}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{b.sub}</div>
                </div>
              ))}
            </div>

            {/* ===== BLOCO CHECKLIST ANTES ===== */}
            {blocoAtivo === "checklist" && (
              <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 16, boxShadow: "0 2px 16px rgba(27,63,122,0.08)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 4, height: 18, background: "#1B3F7A", borderRadius: 2 }} />📋 Logística Antes da Viagem</div>
                {todosItens.map(item => renderCheckItem(item, itensCustom.includes(item)))}
                <div style={{ marginTop: 14, background: "#f0f4ff", borderRadius: 12, padding: 14, border: "2px dashed #1B3F7A33" }}>
                  <label style={lbl}>Adicionar item personalizado</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={novoItem} onChange={e => setNovoItem(e.target.value)} onKeyDown={e => e.key === "Enter" && novoItem.trim() && (setItensCustom(p => [...p, novoItem.trim()]), setNovoItem(""))} placeholder="Nome do novo item..." style={{ ...inp, flex: 1, padding: "8px 12px" }} />
                    <button onClick={() => { if (novoItem.trim()) { setItensCustom(p => [...p, novoItem.trim()]); setNovoItem(""); } }} disabled={!novoItem.trim()} style={{ ...btnAdd, background: novoItem.trim() ? "#1B3F7A" : "#ccc" }}>+ Add</button>
                  </div>
                </div>
                <BtnSalvar />
              </div>
            )}

            {/* ===== BLOCO EQUIPAMENTOS ===== */}
            {blocoAtivo === "equipamentos" && (() => {
              const addEquipamento = () => {
                const tipo = novoEq.tipo === "Outro" ? (novoEq.outro?.trim() || "Outro") : novoEq.tipo;
                if (!tipo) return;
                setEquipamentos(prev => [...prev, { tipo, tombo: novoEq.tombo || "", descricao: novoEq.descricao || "" }]);
                setNovoEq({ tipo: "", tombo: "", descricao: "", outro: "" });
              };
              const removerEq = (i) => setEquipamentos(prev => prev.filter((_, j) => j !== i));
              return (
                <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 16, boxShadow: "0 2px 16px rgba(27,63,122,0.08)" }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#7c3aed", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 4, height: 18, background: "#7c3aed", borderRadius: 2 }} />🎒 Equipamentos e Acessórios
                  </div>

                  {/* Lista atual */}
                  {equipamentos.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      {equipamentos.map((eq, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#f8f4ff", borderRadius: 10, padding: "10px 14px", marginBottom: 6, border: "1px solid #e9d5ff" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "#7c3aed" }}>🎒 {eq.tipo}</div>
                            <div style={{ display: "flex", gap: 12, marginTop: 3 }}>
                              {eq.tombo && <span style={{ fontSize: 11, color: "#888" }}>🏷️ Tombo: <b>{eq.tombo}</b></span>}
                              {eq.descricao && <span style={{ fontSize: 11, color: "#555" }}>{eq.descricao}</span>}
                            </div>
                          </div>
                          <button onClick={() => removerEq(i)} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Form novo equipamento */}
                  <div style={{ background: "#f8f4ff", borderRadius: 14, padding: 16, border: "2px dashed #e9d5ff" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#7c3aed", marginBottom: 12 }}>+ Adicionar Equipamento</div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={lbl}>Equipamento / Acessório *</label>
                      <select value={novoEq.tipo} onChange={e => setNovoEq(n => ({ ...n, tipo: e.target.value, outro: "" }))} style={inp}>
                        <option value="">Selecione...</option>
                        {EQUIPAMENTOS_LISTA.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                      </select>
                    </div>
                    {novoEq.tipo === "Outro" && (
                      <div style={{ marginBottom: 10 }}>
                        <label style={lbl}>Descrição do equipamento *</label>
                        <input value={novoEq.outro || ""} onChange={e => setNovoEq(n => ({ ...n, outro: e.target.value }))} placeholder="Descreva o equipamento..." style={inp} />
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                      <div>
                        <label style={lbl}>Tombo (opcional)</label>
                        <input value={novoEq.tombo || ""} onChange={e => setNovoEq(n => ({ ...n, tombo: e.target.value }))} placeholder="Nº do tombo..." style={inp} />
                      </div>
                      <div>
                        <label style={lbl}>Descrição / Observação</label>
                        <input value={novoEq.descricao || ""} onChange={e => setNovoEq(n => ({ ...n, descricao: e.target.value }))} placeholder="Ex: Cabo HDMI incluso..." style={inp} />
                      </div>
                    </div>
                    <button onClick={addEquipamento} disabled={!novoEq.tipo || (novoEq.tipo === "Outro" && !novoEq.outro?.trim())}
                      style={{ background: !novoEq.tipo || (novoEq.tipo === "Outro" && !novoEq.outro?.trim()) ? "#ccc" : "#7c3aed", border: "none", borderRadius: 10, padding: "9px 20px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>
                      + Adicionar
                    </button>
                  </div>
                  <BtnSalvar />
                </div>
              );
            })()}

            {/* ===== BLOCO LOGÍSTICA DE VIAGEM ===== */}
            {blocoAtivo === "logviagem" && (
              <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 16, boxShadow: "0 2px 16px rgba(27,63,122,0.08)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#2a5ba8", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 4, height: 18, background: "#2a5ba8", borderRadius: 2 }} />🗺️ Logística de Viagem</div>

                {/* ABAS INTERNAS */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                  {[
                    { id: "hosp",    icon: "🏨", label: "Hospedagem",  count: hospedagens.length },
                    { id: "hor",     icon: "🕐", label: "Horários",    count: horarios.length },
                    { id: "contato", icon: "📞", label: "Contatos",    count: contatos.length },
                    { id: "alim",    icon: "🍽️", label: "Alimentação", count: alimentacao.length },
                    { id: "agenda",  icon: "📅", label: "Agenda",      count: agenda.length },
                  ].map(a => (
                    <div key={a.id} onClick={() => setSubBloco(subBloco === a.id ? null : a.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: subBloco === a.id ? "#1B3F7A" : "#f8f9fb", borderRadius: 10, padding: "7px 14px", cursor: "pointer", border: `1px solid ${subBloco === a.id ? "#1B3F7A" : "#e8edf2"}` }}>
                      <span>{a.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: subBloco === a.id ? "#fff" : "#1B3F7A" }}>{a.label}</span>
                      {a.count > 0 && <span style={{ background: subBloco === a.id ? "rgba(255,255,255,0.3)" : "#1B3F7A", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{a.count}</span>}
                    </div>
                  ))}
                </div>

                {/* HOSPEDAGEM */}
                {subBloco === "hosp" && (
                  <div>
                    {hospedagens.map((h, i) => (
                      <div key={i} style={cardItem}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#1B3F7A" }}>🏨 {h.nome}</div>
                            <div style={{ fontSize: 12, color: "#666", marginTop: 3 }}>📍 {h.municipio}{h.tipoQuarto ? ` · ${h.tipoQuarto}` : ""}</div>
                            {h.valorDiaria && <div style={{ fontSize: 12, color: "#059669", fontWeight: 700, marginTop: 4 }}>R$ {h.valorDiaria} × {h.qtdDiaria} diárias = R$ {(parseFloat(h.valorDiaria||0)*parseInt(h.qtdDiaria||0)).toFixed(2)}</div>}
                            {h.infoPagamento && <div style={{ fontSize: 12, color: "#555", marginTop: 6, background: "#f0f4ff", borderRadius: 8, padding: "6px 10px" }}>{h.infoPagamento}</div>}
                          </div>
                          <button style={btnDel} onClick={() => setHospedagens(p => p.filter((_,j)=>j!==i))}>×</button>
                        </div>
                      </div>
                    ))}
                    <div style={{ background: "#f8f9fb", borderRadius: 14, padding: 16, border: "2px dashed #e8edf2" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#1B3F7A", marginBottom: 12 }}>+ Nova Hospedagem</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div><label style={lbl}>Município *</label><input value={novaHosp.municipio} onChange={e=>setNovaHosp(h=>({...h,municipio:e.target.value}))} placeholder="Ex: Sobral" style={inp}/></div>
                        <div><label style={lbl}>Nome do Hotel *</label><input value={novaHosp.nome} onChange={e=>setNovaHosp(h=>({...h,nome:e.target.value}))} placeholder="Nome do hotel" style={inp}/></div>
                        <div><label style={lbl}>Tipo de Quarto</label><input value={novaHosp.tipoQuarto} onChange={e=>setNovaHosp(h=>({...h,tipoQuarto:e.target.value}))} placeholder="Duplo, Solteiro..." style={inp}/></div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          <div><label style={lbl}>Valor Diária (R$)</label><input type="number" value={novaHosp.valorDiaria} onChange={e=>setNovaHosp(h=>({...h,valorDiaria:e.target.value}))} placeholder="0,00" style={inp}/></div>
                          <div><label style={lbl}>Qtd Diárias</label><input type="number" value={novaHosp.qtdDiaria} onChange={e=>setNovaHosp(h=>({...h,qtdDiaria:e.target.value}))} placeholder="1" style={inp}/></div>
                        </div>
                      </div>
                      <div style={{marginBottom:10}}><label style={lbl}>Pagamento / Antecipação</label><textarea value={novaHosp.infoPagamento} onChange={e=>setNovaHosp(h=>({...h,infoPagamento:e.target.value}))} placeholder="Reserva confirmada? Antecipado? Nota fiscal?..." style={{...inp,minHeight:60,resize:"vertical"}}/></div>
                      <button onClick={()=>{if(!novaHosp.municipio||!novaHosp.nome)return;setHospedagens(p=>[...p,{...novaHosp}]);setNovaHosp({municipio:"",nome:"",tipoQuarto:"",valorDiaria:"",qtdDiaria:"",infoPagamento:""}); }} disabled={!novaHosp.municipio||!novaHosp.nome} style={{...btnAdd,background:!novaHosp.municipio||!novaHosp.nome?"#ccc":"#1B3F7A"}}>+ Adicionar</button>
                    </div>
                  </div>
                )}

                {/* HORÁRIOS */}
                {subBloco === "hor" && (
                  <div>
                    {[...horarios].sort((a,b)=>(a.data+(a.hora||"")).localeCompare(b.data+(b.hora||""))).map((h, i) => (
                      <div key={i} style={cardItem}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                              <span style={{ background: "#1B3F7A", color: "#fff", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{formatDate(h.data)}</span>
                              <span style={{ background: "#E8730A", color: "#fff", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{h.hora}</span>
                            </div>
                            <div style={{ fontSize: 13, color: "#333", fontWeight: 600 }}>{h.origem} → {h.destino}</div>
                            {h.extra && <div style={{ fontSize: 12, color: "#555", marginTop: 5, background: "#f8f9fb", borderRadius: 8, padding: "5px 10px" }}>{h.extra}</div>}
                          </div>
                          <button style={btnDel} onClick={()=>setHorarios(p=>p.filter((_,j)=>j!==i))}>×</button>
                        </div>
                      </div>
                    ))}
                    <div style={{ background: "#f8f9fb", borderRadius: 14, padding: 16, border: "2px dashed #e8edf2" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#1B3F7A", marginBottom: 12 }}>+ Novo Horário de Deslocamento</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div>
                          <label style={lbl}>Data *</label>
                          <select value={novoHor.data} onChange={e=>setNovoHor(h=>({...h,data:e.target.value}))} style={inp}>
                            <option value="">Selecione...</option>
                            {datasNoPeriodo.map(d=><option key={d} value={d}>{formatDate(d)}</option>)}
                            {datasNoPeriodo.length===0 && <option disabled>Defina o período da viagem</option>}
                          </select>
                        </div>
                        <div><label style={lbl}>Hora *</label><input type="time" value={novoHor.hora} onChange={e=>setNovoHor(h=>({...h,hora:e.target.value}))} style={inp}/></div>
                        <div><label style={lbl}>Origem *</label><input value={novoHor.origem} onChange={e=>setNovoHor(h=>({...h,origem:e.target.value}))} placeholder="De onde partem" style={inp}/></div>
                        <div><label style={lbl}>Destino *</label><input value={novoHor.destino} onChange={e=>setNovoHor(h=>({...h,destino:e.target.value}))} placeholder="Para onde vão" style={inp}/></div>
                      </div>
                      <div style={{marginBottom:10}}><label style={lbl}>Informações Extras</label><textarea value={novoHor.extra} onChange={e=>setNovoHor(h=>({...h,extra:e.target.value}))} placeholder="Ponto de encontro, nº veículo, observações..." style={{...inp,minHeight:55,resize:"vertical"}}/></div>
                      <button onClick={()=>{if(!novoHor.data||!novoHor.hora||!novoHor.origem||!novoHor.destino)return;setHorarios(p=>[...p,{...novoHor}]);setNovoHor({data:"",hora:"",origem:"",destino:"",extra:""}); }} disabled={!novoHor.data||!novoHor.hora||!novoHor.origem||!novoHor.destino} style={{...btnAdd,background:!novoHor.data||!novoHor.hora||!novoHor.origem||!novoHor.destino?"#ccc":"#1B3F7A"}}>+ Adicionar</button>
                    </div>
                  </div>
                )}

                {/* CONTATOS */}
                {subBloco === "contato" && (
                  <div>
                    {contatos.map((c, i) => (
                      <div key={i} style={cardItem}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#1B3F7A" }}>👤 {c.nome}</div>
                            {c.whatsapp && <a href={`https://wa.me/55${c.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 5, background: "#dcfce7", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#16a34a", textDecoration: "none" }}>💬 {fmtWhats(c.whatsapp)}</a>}
                            {c.extra && <div style={{ fontSize: 12, color: "#555", marginTop: 6, background: "#f8f9fb", borderRadius: 8, padding: "5px 10px" }}>{c.extra}</div>}
                          </div>
                          <button style={btnDel} onClick={()=>setContatos(p=>p.filter((_,j)=>j!==i))}>×</button>
                        </div>
                      </div>
                    ))}
                    <div style={{ background: "#f8f9fb", borderRadius: 14, padding: 16, border: "2px dashed #e8edf2" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#1B3F7A", marginBottom: 12 }}>+ Novo Contato Importante</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div><label style={lbl}>Nome *</label><input value={novoContato.nome} onChange={e=>setNovoContato(c=>({...c,nome:e.target.value}))} placeholder="Nome do contato" style={inp}/></div>
                        <div><label style={lbl}>WhatsApp</label><input value={novoContato.whatsapp} onChange={e=>setNovoContato(c=>({...c,whatsapp:e.target.value}))} placeholder="85 99999-0000" style={inp}/></div>
                      </div>
                      <div style={{marginBottom:10}}><label style={lbl}>Informações Extras</label><textarea value={novoContato.extra} onChange={e=>setNovoContato(c=>({...c,extra:e.target.value}))} placeholder="Cargo, empresa, quando acionar..." style={{...inp,minHeight:55,resize:"vertical"}}/></div>
                      <button onClick={()=>{if(!novoContato.nome)return;setContatos(p=>[...p,{...novoContato}]);setNovoContato({nome:"",whatsapp:"",extra:""}); }} disabled={!novoContato.nome} style={{...btnAdd,background:!novoContato.nome?"#ccc":"#1B3F7A"}}>+ Adicionar</button>
                    </div>
                  </div>
                )}

                {/* ALIMENTAÇÃO */}
                {subBloco === "alim" && (
                  <div>
                    {alimentacao.map((a, i) => (
                      <div key={i} style={cardItem}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#1B3F7A" }}>🍽️ {a.nome}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 5 }}>
                              {a.endereco && <a href={`https://waze.com/ul?q=${encodeURIComponent(a.endereco)}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#dbeafe", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#1d4ed8", textDecoration: "none" }}>📍 {a.endereco}</a>}
                              {a.whatsapp && <a href={`https://wa.me/55${a.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#dcfce7", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#16a34a", textDecoration: "none" }}>💬 {fmtWhats(a.whatsapp)}</a>}
                            </div>
                            {a.extra && <div style={{ fontSize: 12, color: "#555", marginTop: 6, background: "#f8f9fb", borderRadius: 8, padding: "5px 10px" }}>{a.extra}</div>}
                          </div>
                          <button style={btnDel} onClick={()=>setAlimentacao(p=>p.filter((_,j)=>j!==i))}>×</button>
                        </div>
                      </div>
                    ))}
                    <div style={{ background: "#f8f9fb", borderRadius: 14, padding: 16, border: "2px dashed #e8edf2" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#1B3F7A", marginBottom: 12 }}>+ Novo Local de Alimentação</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div><label style={lbl}>Nome do Restaurante *</label><input value={novoAlim.nome} onChange={e=>setNovoAlim(a=>({...a,nome:e.target.value}))} placeholder="Nome" style={inp}/></div>
                        <div><label style={lbl}>WhatsApp</label><input value={novoAlim.whatsapp} onChange={e=>setNovoAlim(a=>({...a,whatsapp:e.target.value}))} placeholder="85 99999-0000" style={inp}/></div>
                        <div style={{gridColumn:"1/-1"}}><label style={lbl}>Endereço (abre no Waze)</label><input value={novoAlim.endereco} onChange={e=>setNovoAlim(a=>({...a,endereco:e.target.value}))} placeholder="Rua, nº, Cidade" style={inp}/></div>
                      </div>
                      <div style={{marginBottom:10}}><label style={lbl}>Informações Extras</label><textarea value={novoAlim.extra} onChange={e=>setNovoAlim(a=>({...a,extra:e.target.value}))} placeholder="Cardápio, horário, observações..." style={{...inp,minHeight:55,resize:"vertical"}}/></div>
                      <button onClick={()=>{if(!novoAlim.nome)return;setAlimentacao(p=>[...p,{...novoAlim}]);setNovoAlim({nome:"",endereco:"",whatsapp:"",extra:""}); }} disabled={!novoAlim.nome} style={{...btnAdd,background:!novoAlim.nome?"#ccc":"#1B3F7A"}}>+ Adicionar</button>
                    </div>
                  </div>
                )}

                {/* AGENDA */}
                {subBloco === "agenda" && (
                  <div>
                    {[...agenda].sort((a,b)=>(a.data+(a.hora||"")).localeCompare(b.data+(b.hora||""))).map((a, i) => (
                      <div key={i} style={{ ...cardItem, borderLeft: "3px solid #7c3aed" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                              <span style={{ background: "#7c3aed", color: "#fff", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{formatDate(a.data)}</span>
                              {a.hora && <span style={{ background: "#E8730A", color: "#fff", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{a.hora}</span>}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#1B3F7A", marginBottom: 4 }}>{a.descricao}</div>
                            {a.destino && <div style={{ fontSize: 12, color: "#555", marginBottom: 3 }}>📍 {a.destino}</div>}
                            {a.motorista && <div style={{ fontSize: 12, color: "#0891b2", fontWeight: 600, marginBottom: 3 }}>🚗 {resolveMembro(a.motorista)}</div>}
                            {(a.pessoas||[]).length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 4 }}>{a.pessoas.map((p,j)=><span key={j} style={{ background: "#eff6ff", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: "#1B3F7A", fontWeight: 600 }}>👤 {resolveMembro(p)}</span>)}</div>}
                            {a.extra && <div style={{ fontSize: 12, color: "#555", background: "#f8f9fb", borderRadius: 8, padding: "5px 10px" }}>{a.extra}</div>}
                          </div>
                          <button style={btnDel} onClick={()=>setAgenda(p=>p.filter((_,j)=>j!==i))}>×</button>
                        </div>
                      </div>
                    ))}
                    <div style={{ background: "#f8f9fb", borderRadius: 14, padding: 16, border: "2px dashed #e8edf2" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#1B3F7A", marginBottom: 12 }}>+ Nova Agenda</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div>
                          <label style={lbl}>Data *</label>
                          <select value={novaAgenda.data} onChange={e=>setNovaAgenda(a=>({...a,data:e.target.value}))} style={inp}>
                            <option value="">Selecione...</option>
                            {datasNoPeriodo.map(d=><option key={d} value={d}>{formatDate(d)}</option>)}
                            {datasNoPeriodo.length===0 && <option disabled>Defina o período da viagem</option>}
                          </select>
                        </div>
                        <div><label style={lbl}>Horário</label><input type="time" value={novaAgenda.hora} onChange={e=>setNovaAgenda(a=>({...a,hora:e.target.value}))} style={inp}/></div>
                        <div style={{gridColumn:"1/-1"}}><label style={lbl}>Descrição *</label><input value={novaAgenda.descricao} onChange={e=>setNovaAgenda(a=>({...a,descricao:e.target.value}))} placeholder="Ex: Visita Escola XXX, Reunião com prefeito..." style={inp}/></div>
                        <div style={{gridColumn:"1/-1"}}><label style={lbl}>Destino / Local</label><input value={novaAgenda.destino} onChange={e=>setNovaAgenda(a=>({...a,destino:e.target.value}))} placeholder="Endereço ou local" style={inp}/></div>
                        <div>
                          <label style={lbl}>Motorista</label>
                          <select value={novaAgenda.motorista} onChange={e=>setNovaAgenda(a=>({...a,motorista:e.target.value}))} style={inp}>
                            <option value="">Sem motorista</option>
                            {form.equipe.map(email=>{const m=todosOsMembros.find(x=>x.email===email);if(!m||m.tipo!=="motorista")return null;return <option key={email} value={email}>🚗 {m.nome}</option>;})}
                            {apenasMotoristas.filter(m=>!form.equipe.includes(m.email)).map(m=><option key={m.email} value={m.email}>{m.nome}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={lbl}>Pessoas ({(novaAgenda.pessoas||[]).length})</label>
                          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8edf2", maxHeight: 120, overflowY: "auto", padding: "3px 0" }}>
                            {form.equipe.length === 0 && <div style={{ fontSize: 12, color: "#aaa", padding: "8px 12px" }}>Adicione membros à equipe primeiro</div>}
                            {form.equipe.map(email=>{
                              const m=todosOsMembros.find(x=>x.email===email);
                              const sel=(novaAgenda.pessoas||[]).includes(email);
                              return <div key={email} onClick={()=>setNovaAgenda(a=>({...a,pessoas:sel?(a.pessoas||[]).filter(x=>x!==email):[...(a.pessoas||[]),email]}))} style={{ display:"flex",alignItems:"center",gap:7,padding:"6px 10px",cursor:"pointer",background:sel?"#eff6ff":"transparent" }}><div style={{ width:13,height:13,borderRadius:3,background:sel?"#1B3F7A":"#fff",border:`2px solid ${sel?"#1B3F7A":"#ddd"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",flexShrink:0 }}>{sel?"✓":""}</div><span style={{ fontSize:12,fontWeight:600,color:"#333" }}>{m?.nome||email}</span></div>;
                            })}
                          </div>
                        </div>
                      </div>
                      <div style={{marginBottom:10}}><label style={lbl}>Informações Extras</label><textarea value={novaAgenda.extra} onChange={e=>setNovaAgenda(a=>({...a,extra:e.target.value}))} placeholder="Documentos, detalhes adicionais..." style={{...inp,minHeight:55,resize:"vertical"}}/></div>
                      <button onClick={()=>{if(!novaAgenda.data||!novaAgenda.descricao)return;setAgenda(p=>[...p,{...novaAgenda}]);setNovaAgenda({data:"",hora:"",descricao:"",destino:"",motorista:"",pessoas:[],extra:""}); }} disabled={!novaAgenda.data||!novaAgenda.descricao} style={{...btnAdd,background:!novaAgenda.data||!novaAgenda.descricao?"#ccc":"#1B3F7A"}}>+ Adicionar</button>
                    </div>
                  </div>
                )}

                {!subBloco && <div style={{ textAlign: "center", color: "#aaa", fontSize: 13, padding: "20px 0" }}>Selecione uma categoria acima para gerenciar</div>}
                <BtnSalvar />
              </div>
            )}

            {/* ===== BLOCO DISTÂNCIAS ===== */}
            {blocoAtivo === "distancias" && (() => {
              const nomeMun = (ev) => ev.tipo === "Municipal" ? ev.municipio : ev.regiao;
              const opcoesSelect = [
                ...eventosVinculados.map(ev => ({ value: ev.id, label: nomeMun(ev) })),
                { value: "__outro__", label: "Outro município..." },
              ];
              const resolveLabel = (d, campo) => {
                if (d[campo] === "__outro__") return d[campo + "Custom"] || "Outro";
                const ev = eventosVinculados.find(e => e.id === d[campo]);
                return ev ? nomeMun(ev) : d[campo];
              };
              const totalKm = distancias.reduce((s, d) => s + (parseFloat(d.km) || 0), 0);
              const canAdd = novaDistancia.origem && novaDistancia.destino && novaDistancia.km &&
                (novaDistancia.origem !== "__outro__" || novaDistancia.origemCustom.trim()) &&
                (novaDistancia.destino !== "__outro__" || novaDistancia.destinoCustom.trim());
              const addDistancia = () => {
                const orig = novaDistancia.origem === "__outro__" ? novaDistancia.origemCustom.trim() : novaDistancia.origem;
                const origLabel = novaDistancia.origem === "__outro__" ? novaDistancia.origemCustom.trim() : resolveLabel(novaDistancia, "origem");
                const dest = novaDistancia.destino === "__outro__" ? novaDistancia.destinoCustom.trim() : novaDistancia.destino;
                const destLabel = novaDistancia.destino === "__outro__" ? novaDistancia.destinoCustom.trim() : resolveLabel(novaDistancia, "destino");
                setDistancias(prev => [...prev, { origem: orig, origemLabel: origLabel, destino: dest, destinoLabel: destLabel, km: parseFloat(novaDistancia.km) }]);
                setNovaDistancia({ origem: "", origemCustom: "", destino: "", destinoCustom: "", km: "" });
              };
              return (
                <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 16, boxShadow: "0 2px 16px rgba(27,63,122,0.08)" }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#0891b2", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 4, height: 18, background: "#0891b2", borderRadius: 2 }} />📏 Distâncias entre Municípios
                  </div>

                  {/* Lista de trechos */}
                  {distancias.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ border: "1px solid #e8edf2", borderRadius: 12, overflow: "hidden" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr auto", background: "#0891b2", padding: "10px 16px" }}>
                          {["Origem", "Destino", "Distância", ""].map(h => (
                            <div key={h} style={{ color: "#fff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{h}</div>
                          ))}
                        </div>
                        {distancias.map((d, i) => (
                          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr auto", padding: "10px 16px", borderBottom: i < distancias.length - 1 ? "1px solid #f0f0f0" : "none", background: i % 2 === 0 ? "#fff" : "#f0f9ff", alignItems: "center" }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>📍 {d.origemLabel || d.origem}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>📍 {d.destinoLabel || d.destino}</div>
                            <div style={{ fontSize: 14, fontWeight: 900, color: "#0891b2" }}>{d.km} km</div>
                            <button onClick={() => setDistancias(prev => prev.filter((_, j) => j !== i))}
                              style={{ background: "none", border: "none", color: "#dc2626", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>×</button>
                          </div>
                        ))}
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr auto", padding: "10px 16px", background: "#0891b2" }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", gridColumn: "1 / 3" }}>TOTAL</div>
                          <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>{totalKm.toFixed(0)} km</div>
                          <div />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Formulário novo trecho */}
                  <div style={{ background: "#f0f9ff", borderRadius: 14, padding: 16, border: "2px dashed #bae6fd" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#0891b2", marginBottom: 12 }}>+ Adicionar Trecho</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={lbl}>Origem *</label>
                        <select value={novaDistancia.origem} onChange={e => setNovaDistancia(n => ({ ...n, origem: e.target.value, origemCustom: "" }))} style={inp}>
                          <option value="">Selecione...</option>
                          {opcoesSelect.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        {novaDistancia.origem === "__outro__" && (
                          <input value={novaDistancia.origemCustom} onChange={e => setNovaDistancia(n => ({ ...n, origemCustom: e.target.value }))}
                            placeholder="Nome do município..." style={{ ...inp, marginTop: 6 }} />
                        )}
                      </div>
                      <div>
                        <label style={lbl}>Destino *</label>
                        <select value={novaDistancia.destino} onChange={e => setNovaDistancia(n => ({ ...n, destino: e.target.value, destinoCustom: "" }))} style={inp}>
                          <option value="">Selecione...</option>
                          {opcoesSelect.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        {novaDistancia.destino === "__outro__" && (
                          <input value={novaDistancia.destinoCustom} onChange={e => setNovaDistancia(n => ({ ...n, destinoCustom: e.target.value }))}
                            placeholder="Nome do município..." style={{ ...inp, marginTop: 6 }} />
                        )}
                      </div>
                      <div>
                        <label style={lbl}>Distância (km) *</label>
                        <input type="number" min="0" step="0.1" value={novaDistancia.km} onChange={e => setNovaDistancia(n => ({ ...n, km: e.target.value }))}
                          placeholder="Ex: 45.5" style={inp} />
                      </div>
                    </div>
                    <button onClick={addDistancia} disabled={!canAdd}
                      style={{ background: canAdd ? "#0891b2" : "#ccc", border: "none", borderRadius: 10, padding: "9px 20px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: canAdd ? "pointer" : "not-allowed", fontFamily: "'Montserrat', sans-serif" }}>
                      + Adicionar Trecho
                    </button>
                  </div>
                  <BtnSalvar />
                </div>
              );
            })()}

            {/* ===== BLOCO MATERIAIS ALMOXARIFADO ===== */}
            {blocoAtivo === "materiais" && (
              <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 16, boxShadow: "0 2px 16px rgba(27,63,122,0.08)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#059669", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 4, height: 18, background: "#059669", borderRadius: 2 }} />
                  📦 Materiais do Almoxarifado
                </div>

                {/* Solicitações existentes */}
                {solicitacoesViagem.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>Solicitações desta viagem</div>
                    {solicitacoesViagem.map((sol, i) => {
                      const statusCor = { "Aguardando Autorização":"#E8730A","Aguardando Homologação":"#7c3aed","Em Separação":"#0891b2","Entregue":"#059669","Entregue Parcial":"#059669","Recusada":"#dc2626","Devolução Pendente":"#0891b2","Devolução Homologada":"#059669" };
                      const cor = statusCor[sol.status]||"#888";
                      return (
                        <div key={sol.id} style={{ background: "#f8f9fb", borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${cor}22` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                            <div style={{ flex: 1 }}>
                              {(sol.itens||[]).map((it,j)=>(
                                <div key={j} style={{ fontSize: 13, color: "#333", fontWeight: 600 }}>📦 {it.materialNome} — {it.quantidade} {it.unidade}</div>
                              ))}
                              {sol.justificativa && <div style={{ fontSize: 11, color: "#888", marginTop: 3, fontStyle: "italic" }}>"{sol.justificativa}"</div>}
                            </div>
                            <div style={{ background: cor+"18", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: cor, whiteSpace: "nowrap", marginLeft: 8 }}>{sol.status}</div>
                          </div>
                          {sol.cargoAutorizadorNome && sol.status==="Aguardando Autorização" && (
                            <div style={{ fontSize: 11, color: "#E8730A", fontWeight: 600 }}>🔐 Aguardando autorização: {sol.cargoAutorizadorNome}</div>
                          )}
                          {/* Botão devolução */}
                          {(sol.status==="Entregue"||sol.status==="Entregue Parcial") && sol.solicitante===user?.email && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: 11, color: "#888", marginBottom: 5 }}>Devolver material não utilizado:</div>
                              {(sol.itensEntregues||sol.itens||[]).map((it,j)=>(
                                <div key={j} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                                  <span style={{ fontSize:12, flex:1, color:"#333" }}>{it.materialNome}</span>
                                  <input type="number" min="0" max={it.quantidade} value={devForm[it.materialId]??0}
                                    onChange={e=>setDevForm(f=>({...f,[it.materialId]:parseInt(e.target.value)||0}))}
                                    style={{ ...inp, width:60, padding:"4px 8px", fontSize:11 }}/>
                                  <span style={{ fontSize:11, color:"#888" }}>{it.unidade}</span>
                                </div>
                              ))}
                              <button onClick={()=>registrarDevolucao(sol)} disabled={enviandoMat}
                                style={{ marginTop:6, background:"#0891b2", border:"none", borderRadius:8, padding:"7px 14px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>
                                ↩️ Registrar Devolução
                              </button>
                            </div>
                          )}
                          {/* Resultado devolução */}
                          {sol.status==="Devolução Homologada" && (sol.itensDevolucao||[]).map((it,j)=>(
                            <div key={j} style={{ fontSize:12, color:sol.devolucaoAceita?"#059669":"#dc2626", marginTop:4, background:sol.devolucaoAceita?"#e8f5e9":"#fee2e2", borderRadius:6, padding:"4px 10px" }}>
                              {sol.devolucaoAceita?"✅":"❌"} Devolução de {it.materialNome} — {viagem.titulo} QTD {it.qtdDevolvida} ({sol.devolucaoAceita?"Devolução aceita":"Não aceita"} no dia {new Date(sol.devolucaoHomologadaEm).toLocaleDateString("pt-BR")} às {new Date(sol.devolucaoHomologadaEm).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} por {sol.devolucaoHomologadaPor})
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Form nova solicitação */}
                <div style={{ background: "#f0fdf4", borderRadius: 14, padding: 16, border: "2px dashed #bbf7d0" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#059669", marginBottom: 12 }}>+ Solicitar Material</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={lbl}>Material</label>
                      <select value={novaMatSol.materialId} onChange={e=>setNovaMatSol(n=>({...n,materialId:e.target.value}))} style={inp}>
                        <option value="">Selecione o material...</option>
                        {materiaisAlmox.filter(m=>(m.estoqueAtual||0)>0).map(m=>(
                          <option key={m.id} value={m.id}>{m.nome} ({m.estoqueAtual||0} {m.unidade||"un."} disponíveis){m.cargoAutorizadorId?" 🔐":""}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Qtd</label>
                      <input type="number" min="1" value={novaMatSol.quantidade} onChange={e=>setNovaMatSol(n=>({...n,quantidade:e.target.value}))} style={inp}/>
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={lbl}>Justificativa</label>
                    <input value={novaMatSol.justificativa} onChange={e=>setNovaMatSol(n=>({...n,justificativa:e.target.value}))} placeholder="Para que será utilizado..." style={inp}/>
                  </div>
                  {novaMatSol.materialId && materiaisAlmox.find(m=>m.id===novaMatSol.materialId)?.cargoAutorizadorId && (
                    <div style={{ background:"#fff3e0", borderRadius:8, padding:"6px 12px", marginBottom:10, fontSize:11, color:"#E8730A", fontWeight:600 }}>
                      🔐 Este material requer autorização do cargo: {materiaisAlmox.find(m=>m.id===novaMatSol.materialId)?.cargoAutorizadorNome}
                    </div>
                  )}
                  <button onClick={solicitarMaterialAlmox} disabled={enviandoMat||!novaMatSol.materialId}
                    style={{ background:enviandoMat||!novaMatSol.materialId?"#ccc":"#059669", border:"none", borderRadius:10, padding:"9px 18px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>
                    {enviandoMat?"Enviando...":"📦 Solicitar ao Almoxarifado"}
                  </button>
                </div>
              </div>
            )}

            {/* ===== BLOCO OCORRÊNCIAS ===== */}
            {blocoAtivo === "ocorrencias" && (
              <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 16, boxShadow: "0 2px 16px rgba(27,63,122,0.08)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#E8730A", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 4, height: 18, background: "#E8730A", borderRadius: 2 }} />⚠️ Ocorrências de Viagem</div>
                <div style={{ background: "#f8f9fb", borderRadius: 14, padding: 16, marginBottom: 16, border: "1px solid #e8edf2" }}>
                  <div style={{ marginBottom: 10 }}><label style={lbl}>Tipo</label><select value={novaOc.tipo} onChange={e=>setNovaOc(o=>({...o,tipo:e.target.value}))} style={inp}><option value="transporte">🚌 Transporte</option><option value="hotel">🏨 Hotel/Hospedagem</option><option value="alimentacao">🍽️ Alimentação</option><option value="outro">📌 Outro</option></select></div>
                  <div style={{ marginBottom: 10 }}><label style={lbl}>Descrição *</label><textarea value={novaOc.descricao} onChange={e=>setNovaOc(o=>({...o,descricao:e.target.value}))} placeholder="Descreva a ocorrência..." style={{...inp,minHeight:75,resize:"vertical"}}/></div>
                  <button onClick={()=>{if(!novaOc.descricao.trim())return;setOcorrencias(p=>[...p,{id:Date.now().toString(),tipo:novaOc.tipo,descricao:novaOc.descricao.trim(),autorEmail:user?.email||"sistema",autorNome:user?.displayName||user?.email||"sistema",data:new Date().toISOString()}]);setNovaOc({tipo:"transporte",descricao:""}); }} disabled={!novaOc.descricao.trim()} style={{...btnAdd,background:!novaOc.descricao.trim()?"#ccc":"#E8730A"}}>+ Registrar Ocorrência</button>
                </div>
                {ocorrencias.length === 0 ? <div style={{ textAlign: "center", color: "#aaa", padding: 20, fontSize: 13 }}>✅ Nenhuma ocorrência registrada</div> : ocorrencias.map(oc => (
                  <div key={oc.id} style={{ ...cardItem, borderLeft: "3px solid #E8730A" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <span style={{ background: "#fff3e0", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: "#E8730A" }}>{TIPO_OC[oc.tipo]||oc.tipo}</span>
                      {(isAdmin||oc.autorEmail===user?.email) && <button style={{...btnDel,fontSize:18}} onClick={()=>excluirOcorrencia(oc.id)}>×</button>}
                    </div>
                    <div style={{ fontSize: 13, color: "#333", background: "#f8f9fb", borderRadius: 8, padding: "8px 12px", marginBottom: 5 }}>{oc.descricao}</div>
                    <div style={{ fontSize: 10, color: "#aaa" }}>Por: {oc.autorEmail} · {oc.data?new Date(oc.data).toLocaleString("pt-BR"):""}</div>
                  </div>
                ))}
                <BtnSalvar />
              </div>
            )}

            {/* ===== BLOCO MUNICÍPIOS ===== */}
            {blocoAtivo === "municipios" && (
              <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 16, boxShadow: "0 2px 16px rgba(27,63,122,0.08)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#059669", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 4, height: 18, background: "#059669", borderRadius: 2 }} />📍 Municípios / Eventos da Viagem</div>
                {/* Municípios atendidos pela regional */}
                {viagem.modalidade === "Regional" && (viagem.municipiosAtendidos || []).length > 0 && (
                  <div style={{ background: "#f0f4ff", borderRadius: 14, padding: "14px 16px", marginBottom: 16, border: "1px solid #dbeafe" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#1B3F7A", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      🗺️ Municípios Atendidos pela Regional
                      <span style={{ background: "#1B3F7A", color: "#fff", borderRadius: 6, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>
                        {(viagem.municipiosAtendidos || []).length}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {(viagem.municipiosAtendidos || []).sort().map(m => (
                        <span key={m} style={{ background: "#fff", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 600, color: "#1B3F7A", border: "1px solid #bfdbfe" }}>{m}</span>
                      ))}
                    </div>
                  </div>
                )}
                {eventosVinculados.length === 0 ? <div style={{ textAlign: "center", color: "#aaa", padding: 24 }}>Nenhum evento vinculado</div> : eventosVinculados.map((ev) => {
                  const cap = (ev.acoesEducacionais||[]).reduce((s,a)=>s+(parseInt(a.participantes)||0),0);
                  const emq = equipeMunicipio[ev.id] || { motoristas: [], apoios: [] };
                  const isOpen = expandedMun === ev.id;

                  // Helpers: resolve nome de chave da equipe
                  const resolveNome = (chave) => {
                    if (!chave) return "—";
                    if (chave.startsWith("mot_")) {
                      const m = (motoristas||[]).find(x => x.id === chave.replace("mot_",""));
                      return m ? (m.nome||m.email||chave) : chave;
                    }
                    if (chave.startsWith("inst_")) {
                      const m = (instrutores||[]).find(x => x.id === chave.replace("inst_",""));
                      return m ? (m.nome||m.email||chave) : chave;
                    }
                    const srv = (servidores||[]).find(x => x.email===chave);
                    if (srv) return srv.nome||chave;
                    const usr = (usuarios||[]).find(x => x.email===chave);
                    return usr ? (usr.nome||usr.displayName||chave) : chave;
                  };
                  const resolveIcone = (chave) => {
                    if (chave?.startsWith("mot_")) return "🚗";
                    if (chave?.startsWith("inst_")) return "👨‍🏫";
                    return "👤";
                  };

                  const toggleMembro = (campo, chave) => {
                    setEquipeMunicipio(prev => {
                      const atual = prev[ev.id] || { motoristas: [], apoios: [] };
                      const lista = atual[campo] || [];
                      const nova = lista.includes(chave) ? lista.filter(x => x !== chave) : [...lista, chave];
                      return { ...prev, [ev.id]: { ...atual, [campo]: nova } };
                    });
                  };

                  // Separar motoristas reais da equipe para sugestão
                  // Filtro correto: motoristas = apenas mot_, apoio = apenas servidores/usuários TCEduc (sem inst_/mot_)
                  const grupoTCEduc = (grupos||[]).find(g => g.nome?.toLowerCase().includes("tceduc"));
                  const membrosTCEduc = grupoTCEduc ? (servidores||[]).filter(s => (s.grupos||[]).includes(grupoTCEduc.id)).map(s=>s.email) : [];
                  const motoristasDaEquipe = (form.equipe || []).filter(ch => ch.startsWith("mot_"));
                  const apoiosDaEquipe = (form.equipe || []).filter(ch => !ch.startsWith("mot_") && !ch.startsWith("inst_") && (membrosTCEduc.includes(ch) || membrosTCEduc.length === 0));

                  return (
                    <div key={ev.id} style={{ ...cardItem, marginBottom: 10 }}>
                      {/* Cabeçalho do card */}
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "#1B3F7A" }}>{ev.tipo==="Municipal"?ev.municipio:ev.regiao}</div>
                          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>📅 {formatDate(ev.data)}{ev.local?` · 📍 ${ev.local}`:""}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 900, fontSize: 18, color: "#059669" }}>{cap}</div>
                          <div style={{ fontSize: 10, color: "#aaa" }}>participantes</div>
                        </div>
                      </div>

                      {(ev.acoesEducacionais||[]).length>0 && (
                        <div style={{ marginTop: 6 }}>
                          {ev.acoesEducacionais.map((a,j)=>(
                            <div key={j} style={{ display:"flex",justifyContent:"space-between",fontSize:12,color:"#555",padding:"3px 0",borderBottom:j<ev.acoesEducacionais.length-1?"1px solid #f0f0f0":"none" }}>
                              <span>{a.acaoNome||a.nome||"—"}</span><span style={{ fontWeight:700,color:"#1B3F7A" }}>{a.participantes||0}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {(ev.ocorrencias||[]).length>0 && (
                        <div style={{ marginTop:8,background:"#fff3e0",borderRadius:8,padding:"5px 10px",fontSize:11,color:"#E8730A",fontWeight:700 }}>
                          ⚠️ {ev.ocorrencias.length} ocorrência{ev.ocorrencias.length!==1?"s":""}
                        </div>
                      )}

                      {/* Resumo equipe já definida */}
                      {(emq.motoristas.length > 0 || emq.apoios.length > 0) && (
                        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {emq.motoristas.map((ch,i) => (
                            <span key={i} style={{ background:"#e0f2fe",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,color:"#0891b2" }}>🚗 {resolveNome(ch)}</span>
                          ))}
                          {emq.apoios.map((ch,i) => (
                            <span key={i} style={{ background:"#eff6ff",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,color:"#1B3F7A" }}>{resolveIcone(ch)} {resolveNome(ch)}</span>
                          ))}
                        </div>
                      )}

                      {/* Botão toggle equipe */}
                      <div onClick={() => setExpandedMun(isOpen ? null : ev.id)}
                        style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#1B3F7A", fontSize: 12, fontWeight: 700 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 6, background: isOpen ? "#1B3F7A" : "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: isOpen ? "#fff" : "#1B3F7A" }}>
                          {isOpen ? "▲" : "▼"}
                        </div>
                        {isOpen ? "Fechar" : "👥 Definir equipe para este município"}
                      </div>

                      {/* Painel de seleção de equipe */}
                      {isOpen && (
                        <div style={{ marginTop: 10, background: "#f0f4ff", borderRadius: 14, padding: 16, border: "1px solid #dce8f5" }}>
                          {/* MOTORISTAS */}
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: "#0891b2", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                              🚗 Motorista(s)
                              <span style={{ fontSize: 10, fontWeight: 400, color: "#888" }}>— pode ser mais de um</span>
                            </div>
                            {form.equipe.length === 0 ? (
                              <div style={{ fontSize: 12, color: "#aaa" }}>Nenhum membro na equipe da viagem ainda</div>
                            ) : (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {/* Primeiro os motoristas reais, depois os demais */}
                                {motoristasDaEquipe.map((ch, i) => {
                                  const sel = (emq.motoristas || []).includes(ch);
                                  return (
                                    <div key={i} onClick={() => toggleMembro("motoristas", ch)}
                                      style={{ display: "flex", alignItems: "center", gap: 5, background: sel ? "#0891b2" : "#fff", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: sel ? "#fff" : "#333", border: `1px solid ${sel ? "#0891b2" : "#e0e0e0"}`, cursor: "pointer" }}>
                                      {sel && <span style={{ fontSize: 10 }}>✓</span>}
                                      {resolveIcone(ch)} {resolveNome(ch)}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* APOIO */}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 12, color: "#1B3F7A", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                              👥 Apoio
                              <span style={{ fontSize: 10, fontWeight: 400, color: "#888" }}>— pode ser mais de um</span>
                            </div>
                            {apoiosDaEquipe.length === 0 ? (
                              <div style={{ fontSize: 12, color: "#aaa" }}>Nenhum membro TCEduc na equipe da viagem ainda</div>
                            ) : (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {apoiosDaEquipe.map((ch, i) => {
                                  const sel = (emq.apoios || []).includes(ch);
                                  return (
                                    <div key={i} onClick={() => toggleMembro("apoios", ch)}
                                      style={{ display: "flex", alignItems: "center", gap: 5, background: sel ? "#1B3F7A" : "#fff", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: sel ? "#fff" : "#333", border: `1px solid ${sel ? "#1B3F7A" : "#e0e0e0"}`, cursor: "pointer" }}>
                                      {sel && <span style={{ fontSize: 10 }}>✓</span>}
                                      {resolveIcone(ch)} {resolveNome(ch)}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <button onClick={salvarBloco} disabled={salvando}
                            style={{ marginTop: 14, background: salvando ? "#ccc" : "#059669", border: "none", borderRadius: 10, padding: "8px 18px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>
                            {salvando ? "Salvando..." : "💾 Salvar equipe"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ===== PÓS VIAGEM ===== */}
            {blocoAtivo === "posviagem" && (
              <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 16, boxShadow: "0 2px 16px rgba(27,63,122,0.08)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#059669", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 4, height: 18, background: "#059669", borderRadius: 2 }} />✅ Pós Viagem</div>

                {/* Materiais solicitados e devoluções */}
                {solicitacoesViagem.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#1B3F7A", marginBottom: 10 }}>📦 Materiais Solicitados na Viagem</div>
                    {solicitacoesViagem.map((sol, i) => {
                      const statusCor = { "Entregue":"#059669","Entregue Parcial":"#059669","Recusada":"#dc2626","Aguardando Autorização":"#E8730A","Aguardando Homologação":"#7c3aed","Devolução Pendente":"#0891b2","Devolução Homologada":"#059669" };
                      const cor = statusCor[sol.status]||"#888";
                      const podeDevolver = (sol.status==="Entregue"||sol.status==="Entregue Parcial") && sol.solicitante===user?.email;
                      return (
                        <div key={sol.id} style={{ background:"#f8f9fb", borderRadius:12, padding:"12px 14px", marginBottom:8, borderLeft:`4px solid ${cor}` }}>
                          {(sol.itens||[]).map((it,j)=>(
                            <div key={j} style={{ fontSize:13, color:"#333", fontWeight:600 }}>📦 {it.materialNome} — {it.quantidade} {it.unidade}</div>
                          ))}
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
                            <div style={{ background:cor+"18", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700, color:cor }}>{sol.status}</div>
                            <span style={{ fontSize:11, color:"#aaa" }}>{new Date(sol.criadoEm).toLocaleDateString("pt-BR")}</span>
                          </div>
                          {/* Resultado devolução detalhado — formato solicitado */}
                          {sol.status==="Devolução Homologada" && (sol.itensDevolucao||[]).map((it,j)=>(
                            <div key={j} style={{ fontSize:12, marginTop:6, background:sol.devolucaoAceita?"#e8f5e9":"#fee2e2", borderRadius:8, padding:"6px 10px", border:`1px solid ${sol.devolucaoAceita?"#c8e6c9":"#fecaca"}` }}>
                              <div style={{ fontWeight:700, color:sol.devolucaoAceita?"#059669":"#dc2626" }}>
                                {sol.devolucaoAceita?"✅":"❌"} Devolução de {it.materialNome} - {viagem.titulo} QTD {it.qtdDevolvida}
                              </div>
                              <div style={{ color:"#555", fontSize:11, marginTop:2 }}>
                                ({sol.devolucaoAceita?"Devolução aceita":"Não aceita"} no dia {new Date(sol.devolucaoHomologadaEm).toLocaleDateString("pt-BR")} às {new Date(sol.devolucaoHomologadaEm).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} por {sol.devolucaoHomologadaPor})
                              </div>
                            </div>
                          ))}
                          {/* Botão devolução no pós-viagem */}
                          {podeDevolver && (
                            <div style={{ marginTop:10, background:"#e0f2fe", borderRadius:10, padding:"10px 12px", border:"1px solid #bae6fd" }}>
                              <div style={{ fontSize:12, fontWeight:600, color:"#0891b2", marginBottom:8 }}>↩️ Devolver materiais não utilizados</div>
                              {(sol.itensEntregues||sol.itens||[]).map((it,j)=>(
                                <div key={j} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                                  <span style={{ fontSize:12, flex:1, color:"#333" }}>{it.materialNome}</span>
                                  <input type="number" min="0" max={it.quantidade} value={devForm[it.materialId]??0}
                                    onChange={e=>setDevForm(f=>({...f,[it.materialId]:parseInt(e.target.value)||0}))}
                                    style={{ ...inp, width:60, padding:"4px 8px", fontSize:11 }}/>
                                  <span style={{ fontSize:11, color:"#888" }}>{it.unidade}</span>
                                </div>
                              ))}
                              <button onClick={()=>registrarDevolucao(sol)} disabled={enviandoMat}
                                style={{ marginTop:6, background:enviandoMat?"#ccc":"#0891b2", border:"none", borderRadius:8, padding:"8px 16px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>
                                {enviandoMat?"Enviando...":"↩️ Confirmar Devolução"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <label style={lbl}>💡 Lições Aprendidas</label>
                <textarea value={licoesAprendidas} onChange={e=>setLicoesAprendidas(e.target.value)} placeholder="O que funcionou bem? O que pode melhorar? Insights da equipe para as próximas viagens..." style={{ ...inp, minHeight: 130, resize: "vertical", lineHeight: 1.6 }} />

                {/* ---- PLANO DE AÇÃO DA VIAGEM ---- */}
                <div style={{ marginTop: 24, marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#059669", marginBottom: 4, display:"flex", alignItems:"center", gap:8 }}>
                    📋 Plano de Ação
                    {(planoAcaoViagem?.acoes || []).length > 0 && (
                      <span style={{ background:"#e8f5e9", borderRadius:8, padding:"2px 10px", fontSize:11, color:"#059669", fontWeight:700 }}>
                        {(planoAcaoViagem.acoes || []).length} ação{(planoAcaoViagem.acoes || []).length !== 1 ? "ões" : ""}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:12, color:"#888", marginBottom:14 }}>Crie ações a partir das lições aprendidas e delegue responsabilidades. O responsável receberá uma notificação por e-mail.</div>

                  {/* LISTA */}
                  {(planoAcaoViagem?.acoes || []).length > 0 && (
                    <div style={{ marginBottom:16 }}>
                      {(planoAcaoViagem.acoes || []).map((acao) => {
                        const corSt = { Pendente:"#E8730A", "Em andamento":"#0891b2", Concluída:"#059669" }[acao.status] || "#E8730A";
                        const corPr = { Alta:"#dc2626", Média:"#E8730A", Baixa:"#059669" }[acao.prioridade] || "#888";
                        return (
                          <div key={acao.id} style={{ background:"#fff", borderRadius:14, padding:"14px 16px", marginBottom:10, border:`1px solid ${corSt}33`, boxShadow:"0 2px 8px rgba(27,63,122,0.05)" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                                <span style={{ background:corSt+"22", borderRadius:6, padding:"2px 8px", fontSize:10, fontWeight:700, color:corSt }}>{acao.status||"Pendente"}</span>
                                <span style={{ background:corPr+"22", borderRadius:6, padding:"2px 8px", fontSize:10, fontWeight:700, color:corPr }}>{acao.prioridade==="Alta"?"🔴":acao.prioridade==="Média"?"🟡":"🟢"} {acao.prioridade}</span>
                                {acao.prazo && <span style={{ background:"#f8f9fb", borderRadius:6, padding:"2px 8px", fontSize:10, color:"#888", fontWeight:600 }}>📅 {new Date(acao.prazo+"T12:00:00").toLocaleDateString("pt-BR")}</span>}
                              </div>
                              {["gestaoipc@tce.ce.gov.br","fabricio@tce.ce.gov.br"].includes(user?.email) && (
                                <div onClick={() => removerAcaoViagem(acao.id)} style={{ cursor:"pointer", color:"#dc2626", fontSize:16, padding:"0 4px" }}>×</div>
                              )}
                            </div>
                            <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A", marginBottom:4 }}>{acao.titulo}</div>
                            {acao.descricao && <div style={{ fontSize:12, color:"#666", marginBottom:6 }}>{acao.descricao}</div>}
                            <div style={{ fontSize:11, color:"#888" }}>👤 {acao.responsavelNome} · {acao.responsavelEmail}</div>
                            {acao.andamento && <div style={{ fontSize:11, color:"#0891b2", marginTop:4, background:"#e0f2fe", borderRadius:6, padding:"4px 8px" }}>🔄 {acao.andamento}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* FORMULÁRIO NOVA AÇÃO */}
                  <div style={{ background:"#f0fdf4", borderRadius:16, padding:18, border:"1px solid #bbf7d0" }}>
                    <div style={{ fontWeight:700, fontSize:13, color:"#059669", marginBottom:12 }}>+ Nova Ação</div>
                    <div style={{ marginBottom:10 }}>
                      <label style={lbl}>Título da ação *</label>
                      <input value={novaAcaoV.titulo} onChange={e=>setNovaAcaoV(n=>({...n,titulo:e.target.value}))} placeholder="Ex: Verificar lista de presença..." style={inp} />
                    </div>
                    <div style={{ marginBottom:10 }}>
                      <label style={lbl}>Descrição</label>
                      <textarea value={novaAcaoV.descricao} onChange={e=>setNovaAcaoV(n=>({...n,descricao:e.target.value}))} placeholder="Detalhe o que precisa ser feito..." style={{ ...inp, minHeight:60, resize:"vertical" }} />
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                      <div>
                        <label style={lbl}>Prioridade</label>
                        <select value={novaAcaoV.prioridade} onChange={e=>setNovaAcaoV(n=>({...n,prioridade:e.target.value}))} style={inp}>
                          <option>Alta</option><option>Média</option><option>Baixa</option>
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Prazo</label>
                        <input type="date" value={novaAcaoV.prazo} onChange={e=>setNovaAcaoV(n=>({...n,prazo:e.target.value}))} style={inp} />
                      </div>
                    </div>
                    <div style={{ marginBottom:12 }}>
                      <label style={lbl}>Responsável</label>
                      <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                        {[["servidor","👤 Servidor"],["motorista","🚗 Motorista"],["instrutor","👨‍🏫 Instrutor"],["outro","✏️ Outro"]].map(([tipo,label]) => (
                          <div key={tipo} onClick={() => setNovaAcaoV(n=>({...n,responsavelTipo:tipo,responsavelId:"",responsavelNome:"",responsavelEmail:"",responsavelOutroNome:"",responsavelOutroEmail:""}))}
                            style={{ flex:1, textAlign:"center", padding:"6px 4px", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:700,
                              background: novaAcaoV.responsavelTipo===tipo ? "#059669" : "#fff",
                              color: novaAcaoV.responsavelTipo===tipo ? "#fff" : "#888",
                              border:`1px solid ${novaAcaoV.responsavelTipo===tipo ? "#059669" : "#e8edf2"}` }}>
                            {label}
                          </div>
                        ))}
                      </div>
                      {novaAcaoV.responsavelTipo === "outro" ? (
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                          <div>
                            <label style={lbl}>Nome *</label>
                            <input value={novaAcaoV.responsavelOutroNome} onChange={e=>setNovaAcaoV(n=>({...n,responsavelOutroNome:e.target.value}))} placeholder="Nome completo" style={inp} />
                          </div>
                          <div>
                            <label style={lbl}>E-mail *</label>
                            <input type="email" value={novaAcaoV.responsavelOutroEmail} onChange={e=>setNovaAcaoV(n=>({...n,responsavelOutroEmail:e.target.value}))} placeholder="email@exemplo.com" style={inp} />
                          </div>
                        </div>
                      ) : (
                        <select value={novaAcaoV.responsavelId} onChange={e => {
                          const lista = novaAcaoV.responsavelTipo==="motorista" ? motoristas : novaAcaoV.responsavelTipo==="instrutor" ? instrutores : servidores;
                          const item = lista.find(x => x.id === e.target.value);
                          setNovaAcaoV(n=>({...n, responsavelId:e.target.value, responsavelNome:item?.nome||item?.email||"", responsavelEmail:item?.email||""}));
                        }} style={inp}>
                          <option value="">Selecione...</option>
                          {(novaAcaoV.responsavelTipo==="motorista" ? motoristas : novaAcaoV.responsavelTipo==="instrutor" ? instrutores : servidores)
                            .filter(x => x.email)
                            .sort((a,b) => (a.nome||"").localeCompare(b.nome||""))
                            .map(x => <option key={x.id} value={x.id}>{x.nome||x.email}</option>)}
                        </select>
                      )}
                    </div>
                    <button onClick={adicionarAcaoViagem} disabled={salvandoAcaoV || !novaAcaoV.titulo.trim() || !(novaAcaoV.responsavelTipo==="outro" ? novaAcaoV.responsavelOutroNome.trim() && novaAcaoV.responsavelOutroEmail.trim() : novaAcaoV.responsavelEmail.trim())} style={{
                      width:"100%", background: salvandoAcaoV ? "#ccc" : "#059669",
                      border:"none", borderRadius:12, padding:"11px", color:"#fff",
                      fontWeight:700, fontSize:13, cursor: salvandoAcaoV ? "not-allowed" : "pointer",
                      fontFamily:"'Montserrat',sans-serif",
                    }}>
                      {salvandoAcaoV ? "Salvando e notificando..." : "➕ Adicionar Ação e Notificar Responsável"}
                    </button>
                  </div>
                </div>

                {/* ---- CUSTOS DA VIAGEM ---- */}
                <div style={{ background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:16, padding:20, marginBottom:16 }}>
                  <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:4, height:18, background:"#1B3F7A", borderRadius:2 }} />💰 Custos da Viagem
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                    <div>
                      <label style={{ display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 }}>Transporte (R$)</label>
                      <input type="number" min="0" step="0.01" value={custoTransporte} onChange={e=>setCustoTransporte(e.target.value)} placeholder="0,00"
                        style={{ width:"100%", background:"#fff", border:"1px solid #e8edf2", borderRadius:10, padding:"10px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" }}/>
                    </div>
                    <div>
                      <label style={{ display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 }}>Instrutoria (R$)</label>
                      <input type="number" min="0" step="0.01" value={custoInstrutoria} onChange={e=>setCustoInstrutoria(e.target.value)} placeholder="0,00"
                        style={{ width:"100%", background:"#fff", border:"1px solid #e8edf2", borderRadius:10, padding:"10px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" }}/>
                    </div>
                    <div>
                      <label style={{ display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 }}>Diárias (R$)</label>
                      <input type="number" min="0" step="0.01" value={custoDiarias} onChange={e=>setCustoDiarias(e.target.value)} placeholder="0,00"
                        style={{ width:"100%", background:"#fff", border:"1px solid #e8edf2", borderRadius:10, padding:"10px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" }}/>
                    </div>
                  </div>
                  {(parseFloat(custoTransporte)||0) + (parseFloat(custoInstrutoria)||0) + (parseFloat(custoDiarias)||0) > 0 && (
                    <div style={{ marginTop:12, display:"flex", justifyContent:"flex-end", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:12, color:"#888", fontWeight:600 }}>Total:</span>
                      <span style={{ fontWeight:900, fontSize:18, color:"#1B3F7A" }}>
                        {((parseFloat(custoTransporte)||0)+(parseFloat(custoInstrutoria)||0)+(parseFloat(custoDiarias)||0)).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
                      </span>
                    </div>
                  )}
                </div>

                {/* ---- PAGAMENTO DE INSTRUTORIA CONCLUÍDO ---- */}
                {instutoriaPaga && (
                  <div style={{ marginTop:24, border:"2px solid #059669", borderRadius:16, padding:20, background:"#f0fdf4" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:26 }}>✅</span>
                      <div>
                        <div style={{ fontWeight:800, fontSize:15, color:"#059669" }}>Pagamentos de Instrutoria Realizados</div>
                        <div style={{ fontSize:12, color:"#888", marginTop:2 }}>
                          {"Processo concluído" + (instutoriaPagaEm ? " em " + new Date(instutoriaPagaEm).toLocaleDateString("pt-BR") : "") + ". Os pagamentos das instrutorias desta viagem foram efetuados."}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ---- AUTORIZAÇÃO DE PAGAMENTO DE INSTRUTORIA ---- */}
                {(() => {
                  const eventosVinc = eventosDisponiveis.filter(e => (form.municipiosIds||[]).includes(e.id));
                  const temInstrutoria = eventosVinc.some(ev => (ev.acoesEducacionais||[]).some(a => a.pagamentoInstrutoria));
                  if (!temInstrutoria) return null;
                  const auth = autorizacaoInstrutoria || {};
                  const jaAutorizado = auth.autorizado;
                  return (
                    <div style={{ marginTop:24, border: jaAutorizado ? "2px solid #059669" : "2px solid #E8730A", borderRadius:16, padding:20, background: jaAutorizado ? "#f0fdf4" : "#fffbeb" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                        <span style={{ fontSize:22 }}>{jaAutorizado ? "✅" : "💰"}</span>
                        <div>
                          <div style={{ fontWeight:800, fontSize:15, color: jaAutorizado ? "#059669" : "#E8730A" }}>
                            {jaAutorizado ? "Pagamento de Instrutoria Autorizado" : "Autorização de Pagamento de Instrutoria"}
                          </div>
                          <div style={{ fontSize:12, color:"#888", marginTop:2 }}>
                            {jaAutorizado
                              ? ("Autorizado por " + auth.autorizadoPor + " em " + (auth.autorizadoEm ? new Date(auth.autorizadoEm).toLocaleDateString("pt-BR") : ""))
                              : "Esta viagem possui ações educacionais com pagamento de instrutoria pendente."}
                          </div>
                        </div>
                      </div>
                      {jaAutorizado && auth.observacao && (
                        <div style={{ background:"#dcfce7", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#166534", marginBottom:12 }}>
                          📝 {auth.observacao}
                        </div>
                      )}
                      {jaAutorizado && isAdmin && (
                        <div
                          onClick={async () => {
                            if (!window.confirm("Desfazer a autorização de pagamento de instrutoria? Esta ação removerá a liberação dos processos vinculados.")) return;
                            const nova = { autorizado: false, observacao: "", autorizadoPor: "", autorizadoEm: "" };
                            setAutorizacaoInstrutoria(nova);
                            if (viagem?.id) {
                              await updateDoc(doc(db, "tceduc_viagens", viagem.id), { autorizacaoInstrutoria: nova, atualizadoEm: new Date().toISOString() });
                              try {
                                const pfSnap = await getDocs(collection(db, "processos_futuros"));
                                await Promise.all(pfSnap.docs
                                  .filter(d => d.data().viagemId === viagem.id)
                                  .map(d => updateDoc(doc(db, "processos_futuros", d.id), { liberadoPagamento: false, liberadoEm: "" }))
                                );
                                const procSnap = await getDocs(collection(db, "processos"));
                                await Promise.all(procSnap.docs
                                  .filter(d => d.data().viagemId === viagem.id)
                                  .map(d => updateDoc(doc(db, "processos", d.id), { instrutoriaLiberada: false, atualizadoEm: new Date().toISOString() }))
                                );
                              } catch(e) { console.warn("Erro ao desfazer:", e); }
                            }
                          }}
                          style={{ marginTop:10, background:"#fee2e2", borderRadius:10, padding:"9px 16px", color:"#dc2626", fontWeight:700, fontSize:12, cursor:"pointer", textAlign:"center", border:"1px solid #fecaca" }}
                        >
                          🔄 Desfazer Autorização (Admin)
                        </div>
                      )}
                      {!jaAutorizado && podeEditar && (
                        <div>
                          <div style={{ fontSize:12, fontWeight:700, color:"#555", marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>Observação / Justificativa</div>
                          <textarea
                            value={auth.observacao||""}
                            onChange={e => setAutorizacaoInstrutoria(a => ({...a, observacao: e.target.value}))}
                            placeholder="Descreva as condições ou observações para autorizar o pagamento..."
                            style={{ width:"100%", background:"#fff", border:"1px solid #fde68a", borderRadius:10, padding:"10px 14px", fontSize:13, fontFamily:"'Montserrat',sans-serif", resize:"vertical", minHeight:80, marginBottom:12, outline:"none" }}
                          />
                          <div
                            onClick={async () => {
                              const nova = { autorizado: true, observacao: auth.observacao||"", autorizadoPor: user?.displayName || user?.email || "Coordenação", autorizadoEm: new Date().toISOString() };
                              setAutorizacaoInstrutoria(nova);
                              if (viagem?.id) {
                                await updateDoc(doc(db, "tceduc_viagens", viagem.id), { autorizacaoInstrutoria: nova, atualizadoEm: new Date().toISOString() });
                                // Marcar processos vinculados como liberados
                                try {
                                  const pfSnap = await getDocs(collection(db, "processos_futuros"));
                                  await Promise.all(pfSnap.docs
                                    .filter(d => d.data().viagemId === viagem.id && !d.data().distribuido)
                                    .map(d => updateDoc(doc(db, "processos_futuros", d.id), { liberadoPagamento: true, liberadoEm: new Date().toISOString() }))
                                  );
                                  const procSnap = await getDocs(collection(db, "processos"));
                                  await Promise.all(procSnap.docs
                                    .filter(d => d.data().viagemId === viagem.id)
                                    .map(d => updateDoc(doc(db, "processos", d.id), { instrutoriaLiberada: true, instutoriaLiberadaEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() }))
                                  );
                                } catch(e) { console.warn("Erro ao liberar processo:", e); }
                              }
                            }}
                            style={{ background:"linear-gradient(135deg,#059669,#34D399)", borderRadius:12, padding:"12px 24px", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", textAlign:"center", boxShadow:"0 4px 14px rgba(5,150,105,0.3)" }}
                          >
                            ✅ Autorizar Pagamento de Instrutoria
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <BtnSalvar />
              </div>
            )}


            {/* MATERIAL DIDÁTICO */}
            {blocoAtivo === "material_didatico" && (
              <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 16, boxShadow: "0 2px 16px rgba(27,63,122,0.08)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#7c3aed", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 4, height: 18, background: "#7c3aed", borderRadius: 2 }} />📚 Material Didático
                  <span style={{ fontWeight: 400, fontSize: 12, color: "#888", marginLeft: 8 }}>Apresentações por ação educacional</span>
                </div>

                {eventosVinculados.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 32, color: "#aaa", fontSize: 13 }}>Nenhum município/evento vinculado a esta viagem.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {eventosVinculados.map(ev => {
                      const nomeEv = ev.tipo === "Municipal" ? ev.municipio : ev.regiao;
                      const acoes = ev.acoesEducacionais || [];
                      return (
                        <div key={ev.id} style={{ background: "#f8f9fb", borderRadius: 14, padding: 16, border: "1px solid #e8edf2" }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#1B3F7A", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                            📍 {nomeEv}
                            <span style={{ fontSize: 11, color: "#888", fontWeight: 400 }}>{acoes.length} ação{acoes.length !== 1 ? "ões" : ""} educacional{acoes.length !== 1 ? "is" : ""}</span>
                          </div>

                          {acoes.length === 0 ? (
                            <div style={{ fontSize: 12, color: "#aaa", padding: "8px 0" }}>Nenhuma ação educacional cadastrada neste evento.</div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                              {acoes.map((acao, acaoIdx) => {
                                const key = ev.id + "_" + acaoIdx;
                                const mat = materialDidatico[key];
                                const uploading = uploadandoMaterial[key];
                                const nomePadrao = (viagem?.titulo||"viagem").replace(/\s+/g,"_") + "_" + (acao.acaoNome||acao.nome||"acao").replace(/\s+/g,"_") + "_" + nomeEv.replace(/\s+/g,"_");

                                const handleUpload = async (file) => {
                                  if (!file) return;
                                  setUploadandoMaterial(p => Object.assign({}, p, { [key]: true }));
                                  try {
                                    const ext = file.name.split(".").pop();
                                    const dados = await uploadParaDrive(file, "ipctceduc_apresentacoes", nomePadrao + "." + ext, true);
                                    if (!dados.sucesso) throw new Error(dados.erro);
                                    const link = "https://drive.google.com/file/d/" + dados.fileId + "/view";
                                    const novoMat = Object.assign({}, materialDidatico, {
                                      [key]: { url: link, fileId: dados.fileId, nome: file.name, acaoNome: acao.acaoNome||acao.nome||"Ação", eventoNome: nomeEv, nomeArquivo: nomePadrao + "." + ext }
                                    });
                                    setMaterialDidatico(novoMat);
                                    await updateDoc(doc(db, "tceduc_viagens", viagem.id), { materialDidatico: novoMat });
                                  } catch(err) {
                                    alert("Erro ao enviar: " + err.message);
                                  }
                                  setUploadandoMaterial(p => Object.assign({}, p, { [key]: false }));
                                };

                                return (
                                  <div key={acaoIdx} style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1px solid " + (mat ? "#7c3aed33" : "#e8edf2"), boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: "#1B3F7A", marginBottom: 10 }}>
                                      📖 {acao.acaoNome || acao.nome || "Ação " + (acaoIdx + 1)}
                                    </div>

                                    {mat ? (
                                      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                                        {/* Info do arquivo */}
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
                                            📎 <span style={{ fontWeight: 600 }}>{mat.nomeArquivo || mat.nome}</span>
                                          </div>
                                          <a href={mat.url} target="_blank" rel="noreferrer"
                                            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#7c3aed", color: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, textDecoration: "none", marginBottom: 8 }}>
                                            🔗 Abrir apresentação
                                          </a>
                                          <div style={{ marginTop: 4 }}>
                                            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f3e8ff", color: "#7c3aed", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer" }}>
                                              {uploading ? "⏳ Enviando..." : "🔄 Substituir arquivo"}
                                              <input type="file" accept=".pdf,.ppt,.pptx,.key" style={{ display: "none" }} onChange={e => handleUpload(e.target.files[0])} disabled={uploading} />
                                            </label>
                                          </div>
                                        </div>
                                        {/* QR Code */}
                                        <QRCodeImg url={mat.url} size={90} />
                                      </div>
                                    ) : (
                                      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: uploading ? "#e8edf2" : "#7c3aed", color: uploading ? "#888" : "#fff", borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer" }}>
                                        {uploading ? "⏳ Enviando..." : "📤 Enviar apresentação"}
                                        <input type="file" accept=".pdf,.ppt,.pptx,.key" style={{ display: "none" }} onChange={e => handleUpload(e.target.files[0])} disabled={uploading} />
                                      </label>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* CARDS MUNICÍPIOS resumo (sempre visível quando bloco não ativo) */}
            {blocoAtivo !== "municipios" && (
              <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 20, boxShadow: "0 2px 16px rgba(27,63,122,0.08)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 4, height: 18, background: "#1B3F7A", borderRadius: 2 }} />📍 Municípios da Viagem</div>
                {eventosVinculados.length === 0 ? <div style={{ textAlign: "center", color: "#aaa", padding: 14, fontSize: 13 }}>Nenhum município vinculado</div> : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                    {eventosVinculados.map(ev => {
                      const cap = (ev.acoesEducacionais||[]).reduce((s,a)=>s+(parseInt(a.participantes)||0),0);
                      const nOcs = (ev.ocorrencias||[]).length;
                      const statusCores = { Programado:"#7c3aed","Em Execução":"#E8730A",Realizado:"#059669",Cancelado:"#dc2626" };
                      const cor = statusCores[ev.status]||"#888";
                      const aberto = menuEvento===ev.id;
                      const equipAberto = expandedMun === ev.id;
                      const emqSide = equipeMunicipio[ev.id] || { motoristas: [], apoios: [] };
                      const temEquipe = emqSide.motoristas.length > 0 || emqSide.apoios.length > 0;
                      const nomeChave = (ch) => {
                        if (ch?.startsWith("mot_")) { const m=(motoristas||[]).find(x=>x.id===ch.replace("mot_","")); return m?.nome||ch; }
                        if (ch?.startsWith("inst_")) { const m=(instrutores||[]).find(x=>x.id===ch.replace("inst_","")); return m?.nome||ch; }
                        return (servidores||[]).find(x=>x.email===ch)?.nome || (usuarios||[]).find(x=>x.email===ch)?.nome || ch;
                      };
                      const toggleMembroSide = (campo, ch) => {
                        setEquipeMunicipio(prev => {
                          const atual = prev[ev.id] || { motoristas: [], apoios: [] };
                          const lista = atual[campo] || [];
                          const nova = lista.includes(ch) ? lista.filter(x=>x!==ch) : [...lista, ch];
                          return { ...prev, [ev.id]: { ...atual, [campo]: nova } };
                        });
                      };
                      const grupoTCEduc2 = (grupos||[]).find(g => g.nome?.toLowerCase().includes("tceduc"));
                      const membrosTCEduc2 = grupoTCEduc2 ? (servidores||[]).filter(s => (s.grupos||[]).includes(grupoTCEduc2.id)).map(s=>s.email) : [];
                      const motoristasDaEquipe = (form.equipe||[]).filter(ch=>ch.startsWith("mot_"));
                      const apoiosDaEquipe = (form.equipe||[]).filter(ch=>!ch.startsWith("mot_") && !ch.startsWith("inst_") && (membrosTCEduc2.includes(ch) || membrosTCEduc2.length === 0));
                      return (
                        <div key={ev.id} style={{ position: "relative" }}>
                          <div style={{ background: equipAberto?"#f0f4ff":aberto?"#f0f4ff":"#f8f9fb", borderRadius: equipAberto?"14px 14px 0 0":14, padding: "14px 16px", border: `2px solid ${equipAberto?"#1B3F7A":aberto?"#1B3F7A":cor+"33"}`, borderBottom: equipAberto?"none":undefined, transition: "all .15s" }}>
                            <div onClick={()=>{ setMenuEvento(aberto?null:ev.id); setExpandedMun(null); }} style={{ cursor:"pointer" }}>
                              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6 }}>
                                <div style={{ fontWeight:700,fontSize:14,color:"#1B3F7A",flex:1,paddingRight:4 }}>{ev.tipo==="Municipal"?ev.municipio:ev.regiao}</div>
                                <div style={{ background:cor,borderRadius:6,padding:"2px 7px",fontSize:10,fontWeight:700,color:"#fff",whiteSpace:"nowrap" }}>{ev.status}</div>
                              </div>
                              <div style={{ fontSize:11,color:"#888",marginBottom:6 }}>📅 {formatDate(ev.data)}</div>
                              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                                <div style={{ fontWeight:900,fontSize:18,color:"#059669" }}>{cap}</div>
                                <div style={{ fontSize:10,color:"#aaa",fontWeight:600 }}>participantes</div>
                              </div>
                              {nOcs>0 && <div style={{ marginTop:5,background:"#fff3e0",borderRadius:6,padding:"3px 8px",fontSize:11,color:"#E8730A",fontWeight:700,display:"inline-block" }}>⚠️ {nOcs} ocorr.</div>}
                            </div>
                            {temEquipe && (
                              <div style={{ marginTop:7, display:"flex", flexWrap:"wrap", gap:4 }}>
                                {emqSide.motoristas.map((ch,i)=>(
                                  <span key={i} style={{ background:"#e0f2fe",borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700,color:"#0891b2" }}>🚗 {nomeChave(ch)}</span>
                                ))}
                                {emqSide.apoios.map((ch,i)=>(
                                  <span key={i} style={{ background:"#eff6ff",borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700,color:"#1B3F7A" }}>👤 {nomeChave(ch)}</span>
                                ))}
                              </div>
                            )}
                            <div onClick={e=>{ e.stopPropagation(); setExpandedMun(equipAberto?null:ev.id); setMenuEvento(null); }}
                              style={{ marginTop:8, display:"flex", alignItems:"center", gap:5, cursor:"pointer", fontSize:11, fontWeight:700, color:"#1B3F7A", borderTop:"1px solid #e8edf2", paddingTop:7 }}>
                              <div style={{ width:18,height:18,borderRadius:5,background:equipAberto?"#1B3F7A":"#e8edf2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:equipAberto?"#fff":"#666" }}>
                                {equipAberto?"▲":"▼"}
                              </div>
                              {equipAberto ? "Fechar" : (temEquipe ? "✏️ Editar equipe" : "👥 Definir equipe")}
                            </div>
                          </div>
                          {equipAberto && (
                            <div style={{ background:"#f0f4ff", borderRadius:"0 0 14px 14px", padding:"14px 16px", border:"2px solid #1B3F7A", borderTop:"none" }}>
                              {form.equipe.length === 0 ? (
                                <div style={{ fontSize:12,color:"#aaa",textAlign:"center",padding:"8px 0" }}>Adicione membros à equipe da viagem primeiro</div>
                              ) : (
                                <>
                                  <div style={{ marginBottom:10 }}>
                                    <div style={{ fontSize:11,fontWeight:800,color:"#0891b2",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5 }}>🚗 Motorista(s)</div>
                                    <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
                                      {motoristasDaEquipe.map((ch,i)=>{
                                        const sel=(emqSide.motoristas||[]).includes(ch);
                                        return (
                                          <div key={i} onClick={()=>toggleMembroSide("motoristas",ch)}
                                            style={{ display:"flex",alignItems:"center",gap:4,background:sel?"#0891b2":"#fff",borderRadius:7,padding:"4px 10px",fontSize:11,fontWeight:700,color:sel?"#fff":"#555",border:`1px solid ${sel?"#0891b2":"#ddd"}`,cursor:"pointer" }}>
                                            {sel&&<span style={{fontSize:9}}>✓</span>}
                                            {ch.startsWith("mot_")?"🚗":ch.startsWith("inst_")?"👨‍🏫":"👤"} {nomeChave(ch)}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <div style={{ marginBottom:12 }}>
                                    <div style={{ fontSize:11,fontWeight:800,color:"#1B3F7A",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5 }}>👥 Apoio</div>
                                    <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
                                      {apoiosDaEquipe.map((ch,i)=>{
                                        const sel=(emqSide.apoios||[]).includes(ch);
                                        return (
                                          <div key={i} onClick={()=>toggleMembroSide("apoios",ch)}
                                            style={{ display:"flex",alignItems:"center",gap:4,background:sel?"#1B3F7A":"#fff",borderRadius:7,padding:"4px 10px",fontSize:11,fontWeight:700,color:sel?"#fff":"#555",border:`1px solid ${sel?"#1B3F7A":"#ddd"}`,cursor:"pointer" }}>
                                            {sel&&<span style={{fontSize:9}}>✓</span>}
                                            {ch.startsWith("mot_")?"🚗":ch.startsWith("inst_")?"👨‍🏫":"👤"} {nomeChave(ch)}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <button onClick={salvarBloco} disabled={salvando}
                                    style={{ width:"100%",background:salvando?"#ccc":"#059669",border:"none",borderRadius:9,padding:"8px 0",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Montserrat',sans-serif" }}>
                                    {salvando?"Salvando...":"💾 Salvar"}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                          {aberto && (
                            <div style={{ position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:"#fff",borderRadius:14,boxShadow:"0 8px 32px rgba(27,63,122,0.18)",border:"1px solid #e8edf2",zIndex:50,overflow:"hidden" }} onClick={e=>e.stopPropagation()}>
                              {[
                                { acao:undefined, icon:"👁️", label:"Ver Evento", sub:"Detalhes completos", bg:"#eff6ff", cor:"#1B3F7A", sempre:true },
                                { acao:"editar", icon:"✏️", label:"Gerenciar", sub:"Editar evento", bg:"#fff0e0", cor:"#E8730A", soAdmin:true },
                                { acao:"ocorrencias", icon:"⚠️", label:"Ocorrências", sub:(ev.ocorrencias||[]).length>0?`${ev.ocorrencias.length} registradas`:"Sem ocorrências", bg:"#fff3e0", cor:"#E8730A", sempre:true },
                                { acao:"relatorio", icon:"📄", label:"Relatório", sub:"Gerar PDF do evento", bg:"#e8f5e9", cor:"#059669", sempre:true },
                              ].filter(m=>m.sempre||(m.soAdmin&&podeEditar!==false)).map((m,idx,arr)=>(
                                <div key={m.label} onClick={()=>{setMenuEvento(null);onVerEvento&&onVerEvento(ev,m.acao);}} style={{ display:"flex",alignItems:"center",gap:10,padding:"12px 16px",cursor:"pointer",borderBottom:idx<arr.length-1?"1px solid #f0f0f0":"none" }} onMouseEnter={e=>e.currentTarget.style.background="#f8f9fb"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                                  <div style={{ width:32,height:32,borderRadius:10,background:m.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>{m.icon}</div>
                                  <div><div style={{ fontSize:13,fontWeight:700,color:m.cor }}>{m.label}</div><div style={{ fontSize:11,color:"#888" }}>{m.sub}</div></div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* EQUIPE */}
            {form.equipe.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 20, boxShadow: "0 2px 16px rgba(27,63,122,0.08)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 4, height: 18, background: "#1B3F7A", borderRadius: 2 }} />👥 Equipe da Viagem</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {form.equipe.map(email => {
                    const m = todosOsMembros.find(x=>x.email===email);
                    const bg=m?.tipo==="instrutor"?"#f3e8ff":m?.tipo==="motorista"?"#e0f2fe":"#eff6ff";
                    const cor=m?.tipo==="instrutor"?"#7c3aed":m?.tipo==="motorista"?"#0891b2":"#1B3F7A";
                    const ico=m?.tipo==="instrutor"?"👨‍🏫":m?.tipo==="motorista"?"🚗":"👤";
                    return <div key={email} style={{ background:bg,borderRadius:10,padding:"6px 14px",fontSize:13,color:cor,fontWeight:600,display:"flex",alignItems:"center",gap:6 }}>{ico} {m?.nome||email}</div>;
                  })}
                </div>
              </div>
            )}

            {/* BOTÕES */}
            <div style={{ display: "flex", gap: 10 }}>
              {podeEditar!==false && <button onClick={()=>setModoEdicao(true)} style={{ flex:1,background:"#1B3F7A",border:"none",borderRadius:14,padding:14,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Montserrat', sans-serif" }}>✏️ Editar Viagem</button>}
              <button onClick={()=>onRelatorio&&onRelatorio(viagem.id)} style={{ flex:1,background:"#f0f4ff",border:"none",borderRadius:14,padding:14,color:"#1B3F7A",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Montserrat', sans-serif" }}>📄 Relatório</button>
            </div>
          </>
        )}

        {!viagem && !modoEdicao && <div style={{ textAlign:"center",padding:60,color:"#aaa" }}><div style={{ fontSize:48,marginBottom:12 }}>🗺️</div><div style={{ fontWeight:700,fontSize:16 }}>Viagem salva com sucesso!</div></div>}
      </div>
    </div>
  );
}
