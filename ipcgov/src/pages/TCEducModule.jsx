import { useState, useEffect } from "react";
import emailjs from "@emailjs/browser";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import ViagemPage from "./ViagemPage";

const EMAILJS_SERVICE = "service_m6wjek9";
const EMAILJS_TEMPLATE = "template_lglpt37";
const EMAILJS_PUBLIC_KEY = "j--nV6wNKs8Pqyxlo";
import ViagemRelatorio from "./ViagemRelatorio";

const MUNICIPIOS_CE = [
  "Abaiara","Acaraú","Acopiara","Aiuaba","Alcântaras","Altaneira","Alto Santo","Amontada","Antonina do Norte","Apuiarés",
  "Aquiraz","Aracati","Aracoiaba","Ararendá","Araripe","Aratuba","Arneiroz","Assaré","Aurora","Baixio",
  "Banabuiú","Barbalha","Barreira","Barro","Barroquinha","Baturité","Beberibe","Bela Cruz","Boa Viagem","Brejo Santo",
  "Camocim","Campos Sales","Canindé","Capistrano","Caridade","Cariré","Caririaçu","Cariús","Carnaubal","Cascavel",
  "Catarina","Caucaia","Cedro","Chaval","Choró","Chorozinho","Coreaú","Crateús","Crato","Cruz",
  "Eusébio","Farias Brito","Forquilha","Fortaleza","Fortim","Frecheirinha","General Sampaio","Graça","Granja","Granjeiro",
  "Groaíras","Guaiúba","Guaraciaba do Norte","Guaramiranga","Hidrolândia","Horizonte","Ibiapina","Icapuí","Icó","Iguatu",
  "Independência","Ipu","Ipueiras","Iracema","Irauçuba","Itapajé","Itapipoca","Itarema","Jaguaribe","Jaguaruana",
  "Jardim","Jati","Jijoca de Jericoacoara","Juazeiro do Norte","Jucás","Lavras da Mangabeira","Limoeiro do Norte","Maracanaú","Maranguape","Marco",
  "Martinópole","Massapê","Mauriti","Meruoca","Milagres","Missão Velha","Mombaça","Morada Nova","Mucambo","Mulungu",
  "Nova Olinda","Nova Russas","Novo Oriente","Ocara","Orós","Pacajus","Pacatuba","Pacoti","Palhano","Palmácia",
  "Paracuru","Paraipaba","Parambu","Pedra Branca","Penaforte","Pentecoste","Pereiro","Piquet Carneiro","Poranga","Porteiras",
  "Potengi","Quixadá","Quixeramobim","Quixeré","Redenção","Reriutaba","Russas","Saboeiro","Salitre","Santa Quitéria",
  "Santana do Acaraú","Santana do Cariri","São Benedito","São Gonçalo do Amarante","São Luís do Curu","Senador Pompeu","Sobral","Solonópole","Tabuleiro do Norte","Tamboril",
  "Tauá","Tianguá","Trairi","Ubajara","Uruburetama","Várzea Alegre","Viçosa do Ceará"
];

const REGIOES_SEDES = [
  { nome: "Crato" }, { nome: "Iguatu" }, { nome: "Crateús" }, { nome: "Tianguá" },
  { nome: "Sobral" }, { nome: "Limoeiro do Norte" }, { nome: "Fortaleza" },
];

const EVENTOS_INICIAIS = [
  { municipio: "Camocim", data: "2026-02-24", tipo: "Municipal", status: "Pendente" },
  { municipio: "Barroquinha", data: "2026-02-24", tipo: "Municipal", status: "Pendente" },
  { municipio: "Chaval", data: "2026-02-24", tipo: "Municipal", status: "Pendente" },
  { municipio: "Cruz", data: "2026-02-25", tipo: "Municipal", status: "Pendente" },
  { municipio: "Jijoca de Jericoacoara", data: "2026-02-25", tipo: "Municipal", status: "Pendente" },
  { municipio: "Bela Cruz", data: "2026-02-25", tipo: "Municipal", status: "Pendente" },
  { municipio: "Acaraú", data: "2026-02-26", tipo: "Municipal", status: "Pendente" },
  { municipio: "Marco", data: "2026-02-26", tipo: "Municipal", status: "Pendente" },
  { municipio: "Itarema", data: "2026-02-26", tipo: "Municipal", status: "Pendente" },
  { regiao: "Crato", data: "2026-03-17", tipo: "Regional", status: "Pendente" },
  { regiao: "Iguatu", data: "2026-04-29", tipo: "Regional", status: "Pendente" },
  { regiao: "Crateús", data: "2026-05-14", tipo: "Regional", status: "Pendente" },
  { regiao: "Tianguá", data: "2026-06-19", tipo: "Regional", status: "Pendente" },
];

const CHECKLIST_ANTES = [
  "Cadastrar evento no IPCeduc e liberar inscrição",
  "Alocar instrutores",
  "Alocar apoio IPC município",
  "Alocar apoio IPC salas Fortaleza",
];

function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function daysUntil(d) {
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}

const statusColors = { Programado: "#7c3aed", "Em Execução": "#E8730A", Realizado: "#059669", Cancelado: "#dc2626" };

function calcStatusEvento(data) {
  if (!data) return "Programado";
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dEvento = new Date(data + "T00:00:00");
  const dAmanha = new Date(dEvento); dAmanha.setDate(dEvento.getDate() + 1);
  if (hoje < dEvento) return "Programado";
  if (hoje.getTime() === dEvento.getTime()) return "Em Execução";
  return "Realizado";
}

const inputStyle = {
  width: "100%", background: "#f8f9fb", border: "1px solid #e8edf2",
  borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#1B3F7A",
  outline: "none", fontFamily: "'Montserrat', sans-serif",
};
const labelStyle = {
  display: "block", color: "#888", fontSize: 11, letterSpacing: 1,
  textTransform: "uppercase", marginBottom: 6, fontWeight: 600,
};

export default function TCEducModule({ user, onBack, onCadastros, onAlertas, onDashboard, onRelatorio, onOcorrencias, onPlanos }) {
  const [tab, setTab] = useState("eventos");
  const [eventos, setEventos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [minhasOcorrencias, setMinhasOcorrencias] = useState([]);
  const [respostaOc, setRespostaOc] = useState({});
  const [instrutores, setInstrutores] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [tiposAcaoEdu, setTiposAcaoEdu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filtro, setFiltro] = useState("Proximos");
  const [form, setForm] = useState({});
  const [blocoAtivo, setBlocoAtivo] = useState(null);
  const [checklist, setChecklist] = useState({});
  const [ocorrencias, setOcorrencias] = useState([]);
  const [novaOcorrencia, setNovaOcorrencia] = useState({ tipo: "inscricao", descricao: "", cpf: "", nome: "", email: "", destinoTipo: "usuario", destinoId: "", destinoNome: "", acaoId: "", acaoNome: "" });
  const [licoesAprendidas, setLicoesAprendidas] = useState("");
  const [participantesPorAcao, setParticipantesPorAcao] = useState({});
  const [planoAcao, setPlanoAcao] = useState(null); // { titulo, acoes:[] } do evento selecionado
  const [novaAcaoPA, setNovaAcaoPA] = useState({ titulo:"", descricao:"", prioridade:"Média", prazo:"", responsavelTipo:"servidor", responsavelId:"", responsavelNome:"", responsavelEmail:"", responsavelOutroNome:"", responsavelOutroEmail:"" });
  const [salvandoPA, setSalvandoPA] = useState(false);
  const [infoViagem, setInfoViagem] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [itemOcorrencia, setItemOcorrencia] = useState(null);
  const [novaOcorrenciaItem, setNovaOcorrenciaItem] = useState("");
  const [itensCustomEvento, setItensCustomEvento] = useState([]);
  const [novoItemEvento, setNovoItemEvento] = useState("");
  // Viagens
  const [viagens, setViagens] = useState([]);
  const [selectedViagem, setSelectedViagem] = useState(null);
  const [viewViagem, setViewViagem] = useState(false);
  const [viewViagemRelatorio, setViewViagemRelatorio] = useState(false);
  const [servidores, setServidores] = useState([]);

  useEffect(() => { loadEventos(); loadUsuarios(); loadInstrutores(); loadMotoristas(); loadTiposAcaoEdu(); loadGrupos(); loadViagens(); loadServidores(); }, []);

  const loadInstrutores = async () => {
    try {
      const snap = await getDocs(collection(db, "tceduc_instrutores"));
      setInstrutores(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e) { console.error(e); }
  };

  const loadMotoristas = async () => {
    try {
      const snap = await getDocs(collection(db, "tceduc_motoristas"));
      setMotoristas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) { console.error(e); }
  };

  const loadTiposAcaoEdu = async () => {
    try {
      const snap = await getDocs(collection(db, "tceduc_acoes_edu"));
      setTiposAcaoEdu(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e) { console.error(e); }
  };

  const loadEventos = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "tceduc_eventos"));
      if (snap.empty) {
        const saved = [];
        for (const ev of EVENTOS_INICIAIS) {
          const ref = await addDoc(collection(db, "tceduc_eventos"), { ...ev, criadoEm: new Date().toISOString() });
          saved.push({ id: ref.id, ...ev });
        }
        setEventos(saved.map(ev => ({
          ...ev,
          status: ev.status !== "Cancelado" ? calcStatusEvento(ev.data) : ev.status,
        })));
      } else {
        setEventos(snap.docs.map(d => {
          const ev = { id: d.id, ...d.data() };
          if (ev.status !== "Cancelado") {
            ev.status = calcStatusEvento(ev.data);
          }
          return ev;
        }));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadUsuarios = async () => {
    try {
      const snap = await getDocs(collection(db, "ipc_servidores"));
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  const loadGrupos = async () => {
    try {
      const snap = await getDocs(collection(db, "ipc_grupos_trabalho"));
      setGrupos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  const loadViagens = async () => {
    try {
      const snap = await getDocs(collection(db, "tceduc_viagens"));
      const vs = snap.docs.map(d => {
        const data = { id: d.id, ...d.data() };
        // Recalculate status dynamically
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const ini = data.dataInicio ? new Date(data.dataInicio) : null;
        const fim = data.dataFim ? new Date(data.dataFim) : null;
        let status = "Programada";
        if (ini && hoje >= ini) status = "Em Execução";
        if (fim && hoje > fim) status = "Concluída";
        return { ...data, status };
      });
      setViagens(vs.sort((a, b) => (a.dataInicio || "").localeCompare(b.dataInicio || "")));
    } catch (e) { console.error(e); }
  };

  const loadServidores = async () => {
    try {
      const snap = await getDocs(collection(db, "ipc_servidores"));
      setServidores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  // Verifica se o usuário logado pertence ao grupo "TCEduc Administrativo"
  const _isAdminGlobal = ["gestaoipc@tce.ce.gov.br","fabricio@tce.ce.gov.br"].includes(user?.email);
  const _meuServidor = usuarios.find(u => u.id === user?.uid || u.email === user?.email);
  const _meusGrupoIds = _meuServidor?.grupos || [];
  const _grupoAdmTCEduc = grupos.find(g => g.nome?.toLowerCase().includes("tceduc administrativo"));
  const _grupoTCEduc = grupos.find(g => g.nome?.toLowerCase().replace(/\s/g,"") === "tceduc");

  // Pode criar/editar EVENTOS: admin ou TCEduc Administrativo
  const podeCriarEvento = _isAdminGlobal || (_grupoAdmTCEduc ? _meusGrupoIds.includes(_grupoAdmTCEduc.id) : false);

  // Pode criar VIAGEM: admin ou TCEduc Administrativo
  // Se grupos ainda não carregaram (loading), mostra para admin pelo menos
  const podeCriarViagem = _isAdminGlobal || (_grupoAdmTCEduc ? _meusGrupoIds.includes(_grupoAdmTCEduc.id) : _isAdminGlobal);

  const saveEvento = async () => {
    const statusCalculado = form.status === "Cancelado" ? "Cancelado" : calcStatusEvento(form.data);
    const formComStatus = { ...form, status: statusCalculado };
    if (selected) {
      await updateDoc(doc(db, "tceduc_eventos", selected.id), formComStatus);
      setEventos(ev => ev.map(e => e.id === selected.id ? { ...e, ...formComStatus } : e));
    } else {
      const ref = await addDoc(collection(db, "tceduc_eventos"), { ...formComStatus, criadoEm: new Date().toISOString() });
      setEventos(ev => [...ev, { id: ref.id, ...formComStatus }]);
    }
    setModal(null); setSelected(null); setForm({});
  };

  const deleteEvento = async (id) => {
    await deleteDoc(doc(db, "tceduc_eventos", id));
    setEventos(ev => ev.filter(e => e.id !== id));
    setModal(null); setSelected(null);
  };

  const abrirBloco = (ev, bloco) => {
    setSelected(ev);
    setBlocoAtivo(bloco);
    setChecklist(ev.checklist || {});
    setOcorrencias(ev.ocorrencias || []);
    setLicoesAprendidas(ev.licoesAprendidas || "");
    setItensCustomEvento(ev.itensCustom || []);
    // Carrega participantes de cada ação educacional
    const partic = {};
    (ev.acoesEducacionais || []).forEach((a, idx) => {
      const key = a.acaoId || a.id || String(idx);
      partic[key] = a.participantes || 0;
    });
    setParticipantesPorAcao(partic);
    setInfoViagem(ev.infoViagem || {});
    setPlanoAcao(ev.planoAcao || null);
    setModal("bloco");
  };

  const salvarBloco = async () => {
    setSalvando(true);
    // Atualiza participantes nas ações educacionais
    const acoesAtualizadas = (selected.acoesEducacionais || []).map((a, idx) => {
      const key = a.acaoId || a.id || String(idx);
      return { ...a, participantes: parseInt(participantesPorAcao[key]) || 0 };
    });
    const updates = {
      checklist,
      itensCustom: itensCustomEvento,
      ocorrencias,
      licoesAprendidas,
      infoViagem,
      planoAcao: planoAcao || null,
      acoesEducacionais: acoesAtualizadas,
      atualizadoEm: new Date().toISOString(),
    };
    await updateDoc(doc(db, "tceduc_eventos", selected.id), updates);
    // Gerar alertas para itens com data limite e responsável
    const hoje = new Date();
    for (const [key, val] of Object.entries(checklist)) {
      if (val?.dataLimite && val?.responsavel && !val?.feito) {
        const diff = Math.ceil((new Date(val.dataLimite) - hoje) / 86400000);
        if (diff <= 2 && diff >= 0) {
          const chave = `tceduc_${selected.id}_${key}`;
          const alertasSnap = await getDocs(collection(db, "alertas"));
          const jaExiste = alertasSnap.docs.find(d => d.data().chave === chave);
          if (!jaExiste) {
            await addDoc(collection(db, "alertas"), {
              chave, modulo: "tceduc", tipo: "checklist",
              titulo: `Checklist pendente: ${key}`,
              mensagem: `Item "${key}" do evento ${selected.municipio || selected.regiao} vence em ${diff === 0 ? "hoje" : `${diff} dia(s)`}`,
              responsavel: val.responsavel,
              eventoId: selected.id,
              lido: false,
              criadoEm: new Date().toISOString(),
            });
          }
        }
      }
    }
    setEventos(ev => ev.map(e => e.id === selected.id ? { ...e, ...updates } : e));
    setSalvando(false);
    setModal("detalhe");
  };


  // ---- PLANO DE AÇÃO ----
  const adicionarAcaoPlano = async () => {
    const n = novaAcaoPA;
    if (!n.titulo.trim()) return;
    const responsavelNome  = n.responsavelTipo === "outro" ? n.responsavelOutroNome  : n.responsavelNome;
    const responsavelEmail = n.responsavelTipo === "outro" ? n.responsavelOutroEmail : n.responsavelEmail;
    if (!responsavelNome.trim() || !responsavelEmail.trim()) return;

    setSalvandoPA(true);
    const eventoNome = selected?.municipio || selected?.regiao || "Evento";
    const novaAcao = {
      id: Date.now().toString(),
      titulo: n.titulo,
      descricao: n.descricao,
      prioridade: n.prioridade,
      prazo: n.prazo,
      responsavelId: n.responsavelId || "",
      responsavelNome,
      responsavelEmail,
      status: "Pendente",
      criadoPor: user?.displayName || user?.email || "—",
      criadoEm: new Date().toISOString(),
    };

    // Busca ou cria plano para este evento
    let planoAtual = planoAcao;
    if (!planoAtual) {
      planoAtual = { titulo: `Plano de Ação — ${eventoNome}`, eventoId: selected.id, eventoNome, acoes: [], criadoEm: new Date().toISOString() };
    }
    const novasAcoes = [...(planoAtual.acoes || []), novaAcao];
    const planoAtualizado = { ...planoAtual, acoes: novasAcoes, atualizadoEm: new Date().toISOString() };

    // Salva na coleção separada e no evento
    const { collection: col, addDoc: add, updateDoc: upd, doc: docRef, getDocs: gDocs, query: q, where: wh } = await import("firebase/firestore");
    const { db: firedb } = await import("../firebase/config");

    let planoId = planoAtual.id;
    if (!planoId) {
      const ref = await add(col(firedb, "tceduc_planos_acao"), planoAtualizado);
      planoId = ref.id;
      planoAtualizado.id = planoId;
    } else {
      await upd(docRef(firedb, "tceduc_planos_acao", planoId), planoAtualizado);
    }
    await upd(docRef(firedb, "tceduc_eventos", selected.id), { planoAcao: planoAtualizado, atualizadoEm: new Date().toISOString() });
    setPlanoAcao(planoAtualizado);
    setEventos(ev => ev.map(e => e.id === selected.id ? { ...e, planoAcao: planoAtualizado } : e));

    // Enviar notificação por email
    try {
      const corpo_completo = `Olá, ${responsavelNome}!\n\nVocê tem uma nova ação delegada no Plano de Ação do TCEduc.\n\n📍 Evento: ${eventoNome}\n📋 Plano: ${planoAtualizado.titulo}\n🎯 Ação: ${novaAcao.titulo}\n${novaAcao.descricao ? "📝 Descrição: " + novaAcao.descricao + "\n" : ""}🔴 Prioridade: ${novaAcao.prioridade}\n${novaAcao.prazo ? "📅 Prazo: " + new Date(novaAcao.prazo + "T12:00:00").toLocaleDateString("pt-BR") + "\n" : ""}\nAcesse o sistema para visualizar e atualizar o andamento desta ação.\n\n---\nAtenciosamente,\nEquipe IPCgov — Instituto Plácido Castelo\n\n🔗 Acesse: https://ipcgov.vercel.app`;
      await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
        to_name: responsavelNome,
        to_email: responsavelEmail,
        subject: `📋 Nova ação delegada — TCEduc ${eventoNome}`,
        corpo_completo,
      }, EMAILJS_PUBLIC_KEY);
    } catch(e) { console.warn("Email não enviado:", e); }

    setNovaAcaoPA({ titulo:"", descricao:"", prioridade:"Média", prazo:"", responsavelTipo:"servidor", responsavelId:"", responsavelNome:"", responsavelEmail:"", responsavelOutroNome:"", responsavelOutroEmail:"" });
    setSalvandoPA(false);
  };

  const removerAcaoPlano = async (acaoId) => {
    if (!planoAcao) return;
    const novasAcoes = (planoAcao.acoes || []).filter(a => a.id !== acaoId);
    const planoAtualizado = { ...planoAcao, acoes: novasAcoes, atualizadoEm: new Date().toISOString() };
    const { updateDoc: upd, doc: docRef } = await import("firebase/firestore");
    const { db: firedb } = await import("../firebase/config");
    await upd(docRef(firedb, "tceduc_planos_acao", planoAcao.id), planoAtualizado);
    await upd(docRef(firedb, "tceduc_eventos", selected.id), { planoAcao: planoAtualizado, atualizadoEm: new Date().toISOString() });
    setPlanoAcao(planoAtualizado);
    setEventos(ev => ev.map(e => e.id === selected.id ? { ...e, planoAcao: planoAtualizado } : e));
  };

  const toggleCheck = (key) => {
    setChecklist(c => ({ ...c, [key]: { ...c[key], feito: !c[key]?.feito } }));
  };

  const setItemResponsavel = (key, responsavel) => {
    setChecklist(c => ({ ...c, [key]: { ...c[key], responsavel } }));
  };

  const setItemDataLimite = (key, dataLimite) => {
    setChecklist(c => ({ ...c, [key]: { ...c[key], dataLimite } }));
  };

  const adicionarOcorrenciaItem = (key) => {
    if (!novaOcorrenciaItem.trim()) return;
    const ocAtual = checklist[key]?.ocorrencias || [];
    setChecklist(c => ({ ...c, [key]: { ...c[key], ocorrencias: [...ocAtual, { texto: novaOcorrenciaItem, data: new Date().toISOString(), autor: user?.email || "sistema" }] } }));
    setNovaOcorrenciaItem("");
  };

  const adicionarOcorrencia = async () => {
    const isInscricao = novaOcorrencia.tipo === "inscricao";
    if (!novaOcorrencia.descricao.trim()) return;
    if (isInscricao && (!novaOcorrencia.nome.trim() || !novaOcorrencia.cpf.trim() || !novaOcorrencia.email.trim())) return;
    const oc = {
      ...novaOcorrencia,
      id: Date.now(),
      data: new Date().toISOString(),
      autorId: user?.uid || "",
      autorEmail: user?.email || "sistema",
      autorNome: "",
      status: "Pendente",
      resposta: "",
      respondidoPor: "",
      respondidoEm: "",
    };
    const novasOcs = [...ocorrencias, oc];
    setOcorrencias(novasOcs);
    // Salva imediatamente no Firebase para não perder
    try {
      await updateDoc(doc(db, "tceduc_eventos", selected.id), {
        ocorrencias: novasOcs,
        atualizadoEm: new Date().toISOString(),
      });
      setEventos(ev => ev.map(e => e.id === selected.id ? { ...e, ocorrencias: novasOcs } : e));
    } catch(e) { console.error(e); }
    setNovaOcorrencia({ tipo: "inscricao", descricao: "", cpf: "", nome: "", email: "", destinoTipo: "usuario", destinoId: "", destinoNome: "", acaoId: "", acaoNome: "" });
  };

  const excluirOcorrencia = async (ocId) => {
    const oc = ocorrencias.find(o => o.id === ocId);
    if (!oc) return;
    const isAdmin = ["gestaoipc@tce.ce.gov.br","fabricio@tce.ce.gov.br"].includes(user?.email);
    const isCriador = oc.autorId === user?.uid || oc.autorEmail === user?.email;
    const jaRespondida = !!(oc.resposta && oc.resposta.trim());
    // Admin pode excluir qualquer ocorrência. Criador só pode se ainda não respondida.
    if (!isAdmin && !isCriador) { alert("Apenas o criador ou administrador pode excluir esta ocorrência."); return; }
    if (!isAdmin && isCriador && jaRespondida) { alert("Esta ocorrência já foi respondida e não pode mais ser excluída. Solicite ao administrador."); return; }
    if (!window.confirm("Excluir esta ocorrência?")) return;
    const novasOcs = ocorrencias.filter(x => x.id !== ocId);
    setOcorrencias(novasOcs);
    try {
      await updateDoc(doc(db, "tceduc_eventos", selected.id), {
        ocorrencias: novasOcs,
        atualizadoEm: new Date().toISOString(),
      });
      setEventos(ev => ev.map(e => e.id === selected.id ? { ...e, ocorrencias: novasOcs } : e));
    } catch(e) { console.error(e); }
  };

  const responderOcorrencia = async (eventoId, ocId, resposta, status) => {
    const novasOcs = ocorrencias.map(o => o.id === ocId
      ? { ...o, resposta, status, respondidoPor: user?.email || "", respondidoEm: new Date().toISOString() }
      : o
    );
    setOcorrencias(novasOcs);
    await updateDoc(doc(db, "tceduc_eventos", eventoId), { ocorrencias: novasOcs, atualizadoEm: new Date().toISOString() });
    setEventos(ev => ev.map(e => e.id === eventoId ? { ...e, ocorrencias: novasOcs } : e));
  };

  // Computa todas as ocorrências direcionadas ao usuário logado (por uid ou grupo)
  const getMinhasOcorrencias = (eventosList, gruposList) => {
    const result = [];
    const uid = user?.uid || "";
    const email = user?.email || "";
    // Grupos que o usuário participa (via ipc_servidores.grupos)
    const meuServidor = usuarios.find(u => u.id === uid || u.email === email);
    const meusGrupoIds = meuServidor?.grupos || [];

    eventosList.forEach(ev => {
      (ev.ocorrencias || []).forEach(oc => {
        let isParaMim = false;
        if (oc.destinoTipo === "usuario") {
          isParaMim = oc.destinoId === uid || oc.destinoId === email;
        } else if (oc.destinoTipo === "grupo") {
          isParaMim = meusGrupoIds.includes(oc.destinoId);
        }
        if (isParaMim) result.push({ ...oc, eventoId: ev.id, eventoNome: ev.municipio || ev.regiao || "Evento", eventoData: ev.data });
      });
    });
    return result.sort((a, b) => b.data?.localeCompare(a.data));
  };

  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const limite10 = new Date(hoje); limite10.setDate(hoje.getDate() + 10);

  const filtered = eventos
    .filter(e => {
      if (filtro === "Proximos") {
        if (!e.data) return false;
        const d = new Date(e.data + "T00:00:00");
        return d >= hoje && d <= limite10;
      }
      if (filtro.startsWith("viagem_")) {
        const vId = filtro.replace("viagem_", "");
        const v = viagens.find(x => x.id === vId);
        return v ? (v.municipiosIds || []).includes(e.id) : false;
      }
      return filtro === "Todos" || e.tipo === filtro;
    })
    .sort((a, b) => new Date(a.data) - new Date(b.data));

  const municipaisRealizados = eventos.filter(e => e.tipo === "Municipal" && e.status === "Realizado").length;
  const regionaisRealizados = eventos.filter(e => e.tipo === "Regional" && e.status === "Realizado").length;

  const progressoChecklist = (ev, items) => {
    const ch = ev.checklist || {};
    const done = items.filter(i => ch[i]?.feito).length;
    return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
  };

  // Roteamento ViagemRelatorio
  if (viewViagemRelatorio && selectedViagem) {
    return <ViagemRelatorio viagem={selectedViagem} eventos={eventos} onBack={() => setViewViagemRelatorio(false)} servidores={servidores} usuarios={usuarios} instrutores={instrutores} motoristas={motoristas} />;
  }

  // Roteamento ViagemPage
  if (viewViagem) {
    return (
      <ViagemPage
        user={user}
        viagem={selectedViagem}
        onBack={() => { setViewViagem(false); setSelectedViagem(null); }}
        onSaved={(v) => {
          setViagens(prev => {
            const idx = prev.findIndex(x => x.id === v.id);
            if (idx >= 0) { const n = [...prev]; n[idx] = v; return n; }
            return [...prev, v];
          });
          setSelectedViagem(v);
        }}
        onRelatorio={() => { setViewViagemRelatorio(true); }}
        onVerEvento={(ev, acao) => {
          setViewViagem(false);
          setSelectedViagem(null);
          const evObj = eventos.find(e => e.id === ev.id);
          if (evObj) {
            setSelected(evObj);
            if (acao === "editar") { setForm({ ...evObj }); setModal("form"); }
            else if (acao === "ocorrencias") { abrirBloco(evObj, "durante"); }
            else if (acao === "relatorio") { onRelatorio && onRelatorio(evObj.id); }
            else { setModal("detalhe"); }
          }
        }}
        eventos={eventos}
        usuarios={usuarios}
        servidores={servidores}
        instrutores={instrutores}
        motoristas={motoristas}
        grupos={grupos}
        podeEditar={podeCriarViagem}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#E8EDF2", fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 0; }
        select, input, textarea { font-family: 'Montserrat', sans-serif; }
      `}</style>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", padding: "24px 32px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: 40, bottom: -60, fontSize: 220, opacity: 0.04 }}>🗺</div>
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div onClick={onBack} style={{
              width: 40, height: 40, background: "rgba(255,255,255,0.15)",
              borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#fff", fontSize: 20, flexShrink: 0,
            }}>←</div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(145deg,#4338CA,#818CF8)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 3px 10px rgba(67,56,202,0.4)" }}><svg width="20" height="20" viewBox="0 0 42 42" fill="none"><path d="M21 8L33 14V18C33 25 27.2 31.5 21 33C14.8 31.5 9 25 9 18V14L21 8Z" stroke="white" strokeWidth="2" fill="rgba(255,255,255,0.2)"/><polyline points="16,21 20,25 27,17" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg></div>
              <div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 3 }}>MÓDULO</div>
                <div style={{ color: "#fff", fontWeight: 900, fontSize: 24 }}>TCEduc</div>
              </div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div onClick={onDashboard} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 14, padding: "10px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📊 Dashboard</div>
              <div onClick={onOcorrencias} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 14, padding: "10px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>⚠️ Ocorrências</div>
              <div onClick={onPlanos} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 14, padding: "10px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📋 Plano de Ação</div>
              <div onClick={onCadastros} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 14, padding: "10px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>👥 Cadastros</div>
              {podeCriarEvento && <div onClick={() => { setSelected(null); setForm({ tipo: "Municipal", municipio: MUNICIPIOS_CE[0], status: "Programado" }); setModal("form"); }} style={{
                background: "#E8730A", borderRadius: 14, padding: "10px 20px",
                color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 14px rgba(232,115,10,0.4)",
              }}>+ Novo Evento</div>}
            </div>
          </div>
        </div>
      </div>

      {/* VIAGENS BLOCK */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px 0" }}>

        {/* ESTATÍSTICAS — início da área branca */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
          {[
            { label: "Municipais 2026", value: `${municipaisRealizados}/54` },
            { label: "Regionais 2026",  value: `${regionaisRealizados}/7` },
            { label: "Total Eventos",   value: eventos.length },
          ].map((s, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "14px 22px", boxShadow: "0 2px 12px rgba(27,63,122,0.07)", borderLeft: "4px solid #1B3F7A" }}>
              <div style={{ color: "#1B3F7A", fontWeight: 900, fontSize: 24 }}>{s.value}</div>
              <div style={{ color: "#888", fontSize: 11, marginTop: 2, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#1B3F7A" }}>🗺️ Viagens</div>
            {podeCriarViagem && (
              <div onClick={() => { setSelectedViagem(null); setViewViagem(true); }}
                style={{ background: "#E8730A", borderRadius: 12, padding: "8px 18px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                + Nova Viagem
              </div>
            )}
          </div>
          {viagens.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, padding: "24px", textAlign: "center", color: "#aaa", fontSize: 13 }}>
              Nenhuma viagem cadastrada ainda
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {viagens.map(v => {
                const corStatus = { Programada: "#7c3aed", "Em Execução": "#E8730A", Concluída: "#059669" };
                const cor = corStatus[v.status] || "#888";
                const eventsVinc = eventos.filter(e => (v.municipiosIds || []).includes(e.id));
                const totalCap = eventsVinc.reduce((s, e) => s + (e.acoesEducacionais || []).reduce((ss, a) => ss + (parseInt(a.participantes) || 0), 0), 0);
                return (
                  <div key={v.id} onClick={() => { setSelectedViagem(v); setViewViagem(true); }}
                    style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", cursor: "pointer", border: `2px solid ${cor}22`, boxShadow: "0 2px 12px rgba(27,63,122,0.07)", transition: "all .15s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A", flex: 1, paddingRight: 8 }}>{v.titulo}</div>
                      <div style={{ background: cor, borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>{v.status}</div>
                    </div>
                    {(v.dataInicio || v.dataFim) && (
                      <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                        📅 {v.dataInicio ? v.dataInicio.split("-").reverse().join("/") : "—"}{v.dataFim ? ` → ${v.dataFim.split("-").reverse().join("/")}` : ""}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 12, color: "#888" }}>📍 {eventsVinc.length} município{eventsVinc.length !== 1 ? "s" : ""}</div>
                      <div style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>👥 {totalCap} capacitados</div>
                      {(v.ocorrencias || []).length > 0 && <div style={{ fontSize: 12, color: "#E8730A", fontWeight: 700 }}>⚠️ {v.ocorrencias.length} ocorr.</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 100px" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { id: "Proximos", label: "📅 Próximos 10 dias" },
            { id: "Todos",    label: "Todos" },
            { id: "Municipal",label: "Municipal" },
            { id: "Regional", label: "Regional" },
            ...viagens.map(v => ({ id: "viagem_" + v.id, label: "🗺️ " + v.titulo })),
          ].map(f => (
            <div key={f.id} onClick={() => setFiltro(f.id)} style={{
              background: filtro === f.id ? (f.id === "Proximos" ? "#E8730A" : "#1B3F7A") : "#fff",
              color: filtro === f.id ? "#fff" : "#555",
              borderRadius: 20, padding: "8px 20px",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: filtro === f.id && f.id === "Proximos" ? "0 4px 14px rgba(232,115,10,0.35)" : "0 2px 8px rgba(27,63,122,0.08)",
            }}>{f.label}</div>
          ))}
          {filtro === "Proximos" && filtered.length === 0 && (
            <div style={{ alignSelf: "center", fontSize: 12, color: "#aaa", fontWeight: 600 }}>Nenhum evento nos próximos 10 dias</div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>Carregando eventos...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {filtered.map(ev => {
              const nome = ev.tipo === "Municipal" ? ev.municipio : ev.regiao;
              const days = ev.data ? daysUntil(ev.data) : null;
              const progAntes = progressoChecklist(ev, CHECKLIST_ANTES);
              return (
                <div key={ev.id} onClick={() => { setSelected(ev); setModal("detalhe"); }} style={{
                  background: "#fff", borderRadius: 20, overflow: "hidden",
                  boxShadow: "0 2px 12px rgba(27,63,122,0.08)", cursor: "pointer",
                  transition: "transform .15s, box-shadow .15s",
                  border: `2px solid ${statusColors[ev.status]}22`,
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 28px rgba(27,63,122,0.15)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(27,63,122,0.08)"; }}
                >
                  <div style={{
                    height: 100, position: "relative",
                    background: ev.tipo === "Municipal" ? "linear-gradient(135deg, #1B3F7A, #4a7fc1)" : "linear-gradient(135deg, #2a5ba8, #5B9BD5)",
                    display: "flex", alignItems: "flex-end", padding: "0 16px 12px",
                  }}>
                    <div style={{ position: "absolute", top: 10, left: 12, background: "rgba(255,255,255,0.9)", borderRadius: 8, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: "#1B3F7A" }}>{ev.tipo}</div>
                    <div style={{ position: "absolute", top: 10, right: 12, background: statusColors[ev.status] + "30", border: `1px solid ${statusColors[ev.status]}60`, borderRadius: 8, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: statusColors[ev.status] }}>{ev.status}</div>
                    <div style={{ color: "#fff", fontWeight: 900, fontSize: 22, letterSpacing: -0.5, textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>{nome}</div>
                  </div>
                  <div style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ color: "#888", fontSize: 13 }}>📅 {formatDate(ev.data)}</div>
                      {days !== null && days > 0 && <div style={{ color: days <= 7 ? "#dc2626" : days <= 15 ? "#E8730A" : "#1B3F7A", fontWeight: 700, fontSize: 13 }}>em {days}d</div>}
                      {days === 0 && <div style={{ color: "#059669", fontWeight: 700 }}>Hoje!</div>}
                      {days !== null && days < 0 && <div style={{ color: "#aaa", fontSize: 12 }}>Encerrado</div>}
                    </div>
                    {/* Progress bar */}
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ fontSize: 10, color: "#aaa" }}>Logística antes</div>
                        <div style={{ fontSize: 10, color: "#1B3F7A", fontWeight: 700 }}>{progAntes.done}/{progAntes.total}</div>
                      </div>
                      <div style={{ height: 4, background: "#e8edf2", borderRadius: 4 }}>
                        <div style={{ height: 4, background: progAntes.pct === 100 ? "#059669" : "#1B3F7A", borderRadius: 4, width: `${progAntes.pct}%`, transition: "width .3s" }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#fff", borderTop: "1px solid #e8edf2",
        padding: "10px 0 20px", display: "flex", justifyContent: "center", gap: 60,
        zIndex: 100, boxShadow: "0 -4px 20px rgba(27,63,122,0.08)",
      }}>
        {[
          { id: "eventos", icon: "📅", label: "Eventos" },
          { id: "municipios", icon: "🗺️", label: "Municípios" },
          { id: "alertas", icon: "🔔", label: "Alertas", action: onAlertas },
          { id: "relatorios", icon: "📄", label: "Relatórios", action: onRelatorio },
        ].map(item => (
          <div key={item.id} onClick={() => item.action ? item.action() : setTab(item.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <div style={{ fontSize: 22 }}>{item.icon}</div>
            <div style={{ fontSize: 10, fontWeight: tab === item.id ? 700 : 500, color: tab === item.id ? "#1B3F7A" : "#aaa", textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</div>
            {tab === item.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#1B3F7A" }} />}
          </div>
        ))}
      </div>

      {/* MODAL DETALHE */}
      {modal === "detalhe" && selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 680, padding: 32, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <div style={{ color: "#aaa", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>{selected.tipo}</div>
                <div style={{ color: "#1B3F7A", fontWeight: 900, fontSize: 26 }}>{selected.tipo === "Municipal" ? selected.municipio : selected.regiao}</div>
                <div style={{ color: "#888", fontSize: 14, marginTop: 6 }}>📅 {formatDate(selected.data)} {selected.hora && `às ${selected.hora}`}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ background: statusColors[selected.status] + "20", border: `2px solid ${statusColors[selected.status]}40`, borderRadius: 12, padding: "6px 16px", color: statusColors[selected.status], fontWeight: 700, fontSize: 13 }}>{selected.status}</div>
                <div onClick={() => setModal(null)} style={{ width: 36, height: 36, background: "#f0f4ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: "#1B3F7A" }}>✕</div>
              </div>
            </div>

            {/* Info rápida */}
            {(selected.local || selected.instrutorPresencial || selected.motorista) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
                {selected.local && <div style={{ background: "#f8f9fb", borderRadius: 12, padding: "10px 14px" }}><div style={{ color: "#aaa", fontSize: 10, marginBottom: 3 }}>LOCAL</div><div style={{ color: "#1B3F7A", fontWeight: 600, fontSize: 13 }}>{selected.local}</div></div>}
                {selected.instrutorPresencial && <div style={{ background: "#f8f9fb", borderRadius: 12, padding: "10px 14px" }}><div style={{ color: "#aaa", fontSize: 10, marginBottom: 3 }}>INSTRUTOR PRESENCIAL</div><div style={{ color: "#1B3F7A", fontWeight: 600, fontSize: 13 }}>{selected.instrutorPresencial}</div></div>}
                {selected.instrutorRemoto && <div style={{ background: "#f8f9fb", borderRadius: 12, padding: "10px 14px" }}><div style={{ color: "#aaa", fontSize: 10, marginBottom: 3 }}>INSTRUTOR REMOTO</div><div style={{ color: "#1B3F7A", fontWeight: 600, fontSize: 13 }}>{selected.instrutorRemoto}</div></div>}

                {/* AÇÕES EDUCACIONAIS */}
                {(selected.acoesEducacionais||[]).length > 0 && (
                  <div style={{ gridColumn:"1/-1" }}>
                    <div style={{ color:"#aaa", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:8, fontWeight:600 }}>Ações Educacionais</div>
                    {selected.acoesEducacionais.map((a,i) => (
                      <div key={i} style={{ background:"#f0f4ff", borderRadius:12, padding:"10px 14px", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                        <div>
                          <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A" }}>{a.acaoNome||a.nome||"—"}</div>
                          <div style={{ fontSize:11, color:"#888", marginTop:2 }}>
                            {a.instrutorNome && `👤 ${a.instrutorNome}`}
                            {a.modalidade && ` · ${a.modalidade}`}
                            {a.cargaHoraria && ` · ${a.cargaHoraria}h`}
                            {a.link && <span> · <a href={a.link} target="_blank" rel="noreferrer" style={{ color:"#1B3F7A" }}>🔗 Link</a></span>}
                          </div>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <div style={{ fontWeight:700, fontSize:15, color:"#059669" }}>{a.participantes||0}</div>
                          <div style={{ fontSize:10, color:"#aaa" }}>participantes</div>
                        </div>
                      </div>
                    ))}
                    <div style={{ background:"#059669", borderRadius:12, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ color:"#fff", fontWeight:700, fontSize:13 }}>Total de Participantes</div>
                      <div style={{ color:"#fff", fontWeight:900, fontSize:18 }}>{(selected.acoesEducacionais||[]).reduce((s,a)=>s+(parseInt(a.participantes)||0),0)}</div>
                    </div>
                  </div>
                )}
                {selected.motorista && <div style={{ background: "#f8f9fb", borderRadius: 12, padding: "10px 14px" }}><div style={{ color: "#aaa", fontSize: 10, marginBottom: 3 }}>MOTORISTA</div><div style={{ color: "#1B3F7A", fontWeight: 600, fontSize: 13 }}>{selected.motorista}</div></div>}
              </div>
            )}

            {/* BLOCOS */}
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1B3F7A", marginBottom: 14 }}>Gestão do Evento</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {[
                { id: "antes", icon: "📋", label: "Logística Antes do Evento", sub: "Checklist de preparação", color: "#1B3F7A", prog: progressoChecklist(selected, CHECKLIST_ANTES) },
                { id: "durante", icon: "⚡", label: "Durante o Evento", sub: `${(selected.ocorrencias || []).length} ocorrências`, color: "#E8730A", prog: null },
                { id: "pos", icon: "✅", label: "Pós Evento", sub: selected.licoesAprendidas ? "Lições registradas" : "Sem registros", color: "#059669", prog: null },
              ].map((b) => (
                <div key={b.id} onClick={() => abrirBloco(selected, b.id)} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "#f8f9fb", borderRadius: 16, padding: "16px",
                  cursor: "pointer", border: `1px solid ${b.color}22`,
                  transition: "background .15s",
                }}>
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: b.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{b.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#1B3F7A" }}>{b.label}</div>
                    <div style={{ color: "#aaa", fontSize: 11, marginTop: 2 }}>{b.sub}</div>
                    {b.prog && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ height: 3, background: "#e8edf2", borderRadius: 3 }}>
                          <div style={{ height: 3, background: b.prog.pct === 100 ? "#059669" : b.color, borderRadius: 3, width: `${b.prog.pct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ color: "#ccc", fontSize: 20 }}>›</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              {podeCriarEvento && <button onClick={() => { setForm({ ...selected }); setModal("form"); }} style={{ flex: 1, background: "#1B3F7A", border: "none", borderRadius: 14, padding: 14, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>✏️ Editar Evento</button>}
              <button onClick={() => onRelatorio(selected.id)} style={{ flex: 1, background: "#f0f4ff", border: "none", borderRadius: 14, padding: 14, color: "#1B3F7A", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>📄 Relatório</button>
              <button onClick={() => deleteEvento(selected.id)} style={{ width: 52, background: "#fee2e2", border: "none", borderRadius: 14, color: "#dc2626", fontSize: 20, cursor: "pointer" }}>🗑</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BLOCO */}
      {modal === "bloco" && selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setModal("detalhe")}>
          <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 640, padding: 32, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div onClick={() => setModal("detalhe")} style={{ width: 36, height: 36, background: "#f0f4ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: "#1B3F7A" }}>←</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18, color: "#1B3F7A" }}>
                  {blocoAtivo === "antes" && "📋 Logística Antes do Evento"}
                  {blocoAtivo === "durante" && "⚡ Durante o Evento"}
                  {blocoAtivo === "pos" && "✅ Pós Evento"}
                </div>
                <div style={{ color: "#aaa", fontSize: 12, marginTop: 2 }}>{selected.tipo === "Municipal" ? selected.municipio : selected.regiao} · {formatDate(selected.data)}</div>
              </div>
            </div>

            {/* BLOCO ANTES */}
            {blocoAtivo === "antes" && (
              <div>
                {CHECKLIST_ANTES.map((item, i) => {
                  const val = checklist[item] || {};
                  const venceEm = val.dataLimite ? Math.ceil((new Date(val.dataLimite) - new Date()) / 86400000) : null;
                  const atrasado = venceEm !== null && venceEm < 0 && !val.feito;
                  const urgente = venceEm !== null && venceEm <= 2 && venceEm >= 0 && !val.feito;
                  return (
                    <div key={i} style={{ background: val.feito ? "#e8f5e9" : atrasado ? "#fee2e2" : urgente ? "#fff3e0" : "#f8f9fb", borderRadius: 14, marginBottom: 10, border: `1px solid ${val.feito ? "#c8e6c9" : atrasado ? "#fecaca" : urgente ? "#fed7aa" : "#e8edf2"}`, overflow: "hidden" }}>
                      {/* linha principal */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }} onClick={() => toggleCheck(item)}>
                        <div style={{ width: 24, height: 24, borderRadius: 8, background: val.feito ? "#059669" : "#fff", border: `2px solid ${val.feito ? "#059669" : "#ddd"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", flexShrink: 0 }}>{val.feito ? "✓" : ""}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, color: val.feito ? "#059669" : "#333", fontWeight: val.feito ? 600 : 400, textDecoration: val.feito ? "line-through" : "none" }}>{item}</div>
                          <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                            {val.responsavel && <div style={{ fontSize: 11, color: "#888" }}>👤 {val.responsavel}</div>}
                            {val.dataLimite && <div style={{ fontSize: 11, color: atrasado ? "#dc2626" : urgente ? "#E8730A" : "#888", fontWeight: atrasado || urgente ? 700 : 400 }}>📅 {formatDate(val.dataLimite)}{atrasado ? " ⚠️ ATRASADO" : urgente ? ` ⏰ ${venceEm === 0 ? "HOJE" : `${venceEm}d`}` : ""}</div>}
                            {(val.ocorrencias || []).length > 0 && <div style={{ fontSize: 11, color: "#E8730A", fontWeight: 700 }}>⚠️ {val.ocorrencias.length} ocorrência{val.ocorrencias.length !== 1 ? "s" : ""}</div>}
                          </div>
                        </div>
                        <div onClick={e => { e.stopPropagation(); setItemOcorrencia(itemOcorrencia === item ? null : item); }} style={{ fontSize: 16, color: "#aaa", cursor: "pointer", padding: "4px 8px" }}>⋮</div>
                      </div>
                      {/* painel expandido */}
                      {itemOcorrencia === item && (
                        <div style={{ padding: "0 16px 14px", borderTop: "1px solid #e8edf2" }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12, marginBottom: 12 }}>
                            <div>
                              <label style={labelStyle}>Responsável</label>
                              <select value={val.responsavel || ""} onChange={e => setItemResponsavel(item, e.target.value)} style={{ ...inputStyle, padding: "8px 12px" }}>
                                <option value="">Selecione...</option>
                                {usuarios.map(u => <option key={u.id} value={u.email}>{u.nome || u.email}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={labelStyle}>Data Limite</label>
                              <input type="date" value={val.dataLimite || ""} onChange={e => setItemDataLimite(item, e.target.value)} style={{ ...inputStyle, padding: "8px 12px" }} />
                            </div>
                          </div>
                          <label style={labelStyle}>Ocorrências do item</label>
                          {(val.ocorrencias || []).map((oc, j) => (
                            <div key={j} style={{ background: "#fff3e0", borderRadius: 8, padding: "8px 12px", marginBottom: 6, fontSize: 12, color: "#333", borderLeft: "3px solid #E8730A" }}>
                              <div style={{ color: "#aaa", fontSize: 10, marginBottom: 2 }}>{new Date(oc.data).toLocaleString("pt-BR")} · {oc.autor}</div>
                              {oc.texto}
                            </div>
                          ))}
                          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                            <input value={novaOcorrenciaItem} onChange={e => setNovaOcorrenciaItem(e.target.value)} placeholder="Registrar ocorrência neste item..." style={{ ...inputStyle, flex: 1, padding: "8px 12px" }} />
                            <div onClick={() => adicionarOcorrenciaItem(item)} style={{ background: "#E8730A", borderRadius: 10, padding: "8px 14px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>+ Add</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Items customizados do evento */}
                {(itensCustomEvento || []).map((item, i) => {
                  const val = checklist[item] || {};
                  const venceEm = val.dataLimite ? Math.ceil((new Date(val.dataLimite) - new Date()) / 86400000) : null;
                  const atrasado = venceEm !== null && venceEm < 0 && !val.feito;
                  const urgente = venceEm !== null && venceEm <= 2 && venceEm >= 0 && !val.feito;
                  return (
                    <div key={"custom_"+i} style={{ background: val.feito ? "#e8f5e9" : atrasado ? "#fee2e2" : urgente ? "#fff3e0" : "#f8f9fb", borderRadius: 14, marginBottom: 10, border: `1px solid ${val.feito ? "#c8e6c9" : atrasado ? "#fecaca" : urgente ? "#fed7aa" : "#e8edf2"}`, overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }} onClick={() => toggleCheck(item)}>
                        <div style={{ width: 24, height: 24, borderRadius: 8, background: val.feito ? "#059669" : "#fff", border: `2px solid ${val.feito ? "#059669" : "#ddd"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", flexShrink: 0 }}>{val.feito ? "✓" : ""}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ fontSize: 14, color: val.feito ? "#059669" : "#333", fontWeight: val.feito ? 600 : 400, textDecoration: val.feito ? "line-through" : "none" }}>{item}</div>
                            <span style={{ background: "#eff6ff", borderRadius: 5, padding: "1px 6px", fontSize: 10, color: "#1B3F7A", fontWeight: 700 }}>custom</span>
                          </div>
                          <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                            {val.responsavel && <div style={{ fontSize: 11, color: "#888" }}>👤 {val.responsavel}</div>}
                            {val.dataLimite && <div style={{ fontSize: 11, color: atrasado ? "#dc2626" : urgente ? "#E8730A" : "#888", fontWeight: atrasado || urgente ? 700 : 400 }}>📅 {formatDate(val.dataLimite)}{atrasado ? " ⚠️ ATRASADO" : urgente ? ` ⏰ ${venceEm === 0 ? "HOJE" : `${venceEm}d`}` : ""}</div>}
                            {(val.ocorrencias || []).length > 0 && <div style={{ fontSize: 11, color: "#E8730A", fontWeight: 700 }}>⚠️ {val.ocorrencias.length} ocorrência{val.ocorrencias.length !== 1 ? "s" : ""}</div>}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <div onClick={e => { e.stopPropagation(); setItensCustomEvento(prev => prev.filter(x => x !== item)); setChecklist(ch => { const n={...ch}; delete n[item]; return n; }); }} style={{ fontSize: 13, color: "#dc2626", cursor: "pointer", padding: "4px 6px" }}>🗑</div>
                          <div onClick={e => { e.stopPropagation(); setItemOcorrencia(itemOcorrencia === item ? null : item); }} style={{ fontSize: 16, color: "#aaa", cursor: "pointer", padding: "4px 8px" }}>⋮</div>
                        </div>
                      </div>
                      {itemOcorrencia === item && (
                        <div style={{ padding: "0 16px 14px", borderTop: "1px solid #e8edf2" }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12, marginBottom: 12 }}>
                            <div>
                              <label style={labelStyle}>Responsável</label>
                              <select value={val.responsavel || ""} onChange={e => setItemResponsavel(item, e.target.value)} style={{ ...inputStyle, padding: "8px 12px" }}>
                                <option value="">Selecione...</option>
                                {usuarios.map(u => <option key={u.id} value={u.email}>{u.nome || u.email}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={labelStyle}>Data Limite</label>
                              <input type="date" value={val.dataLimite || ""} onChange={e => setItemDataLimite(item, e.target.value)} style={{ ...inputStyle, padding: "8px 12px" }} />
                            </div>
                          </div>
                          <label style={labelStyle}>Ocorrências do item</label>
                          {(val.ocorrencias || []).map((oc, j) => (
                            <div key={j} style={{ background: "#fff3e0", borderRadius: 8, padding: "8px 12px", marginBottom: 6, fontSize: 12, color: "#333", borderLeft: "3px solid #E8730A" }}>
                              <div style={{ color: "#aaa", fontSize: 10, marginBottom: 2 }}>{new Date(oc.data).toLocaleString("pt-BR")} · {oc.autor}</div>
                              {oc.texto}
                            </div>
                          ))}
                          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                            <input value={novaOcorrenciaItem} onChange={e => setNovaOcorrenciaItem(e.target.value)} placeholder="Registrar ocorrência neste item..." style={{ ...inputStyle, flex: 1, padding: "8px 12px" }} />
                            <div onClick={() => adicionarOcorrenciaItem(item)} style={{ background: "#E8730A", borderRadius: 10, padding: "8px 14px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>+ Add</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Adicionar item personalizado */}
                <div style={{ marginTop: 16, background: "#f0f4ff", borderRadius: 12, padding: 14, border: "2px dashed #1B3F7A33" }}>
                  <label style={labelStyle}>Adicionar item personalizado</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={novoItemEvento} onChange={e => setNovoItemEvento(e.target.value)} onKeyDown={e => e.key === "Enter" && (novoItemEvento.trim() && (setItensCustomEvento(prev => [...prev, novoItemEvento.trim()]), setNovoItemEvento("")))} placeholder="Nome do novo item..." style={{ ...inputStyle, flex: 1, padding: "8px 12px" }} />
                    <button onClick={() => { if (novoItemEvento.trim()) { setItensCustomEvento(prev => [...prev, novoItemEvento.trim()]); setNovoItemEvento(""); } }} disabled={!novoItemEvento.trim()} style={{ background: novoItemEvento.trim() ? "#1B3F7A" : "#ccc", border: "none", borderRadius: 10, padding: "8px 16px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: novoItemEvento.trim() ? "pointer" : "not-allowed", fontFamily: "'Montserrat', sans-serif" }}>+ Add</button>
                  </div>
                </div>
              </div>
            )}

            {/* BLOCO DURANTE */}
            {blocoAtivo === "durante" && (
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1B3F7A", marginBottom: 16 }}>Registrar Ocorrência</div>
                <div style={{ background: "#f8f9fb", borderRadius: 16, padding: 20, marginBottom: 20, border: "1px solid #e8edf2" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelStyle}>Tipo</label>
                      <select value={novaOcorrencia.tipo} onChange={e => setNovaOcorrencia(o => ({ ...o, tipo: e.target.value }))} style={inputStyle}>
                        <option value="inscricao">Inscrição/Frequência</option>
                        <option value="equipamento">Equipamentos/Material</option>
                        <option value="logistica">Logística/Local/Transporte</option>
                        <option value="infraestrutura">Infraestrutura</option>
                        <option value="tecnico">Problemas Técnicos</option>
                        <option value="comunicacao">Comunicação</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Curso / Ação Educacional</label>
                      <select value={novaOcorrencia.acaoId||""} onChange={e => {
                        const acao = (selected?.acoesEducacionais||[]).find(a=>a.acaoId===e.target.value||a.id===e.target.value);
                        setNovaOcorrencia(o=>({...o, acaoId:e.target.value, acaoNome:acao?.acaoNome||acao?.nome||""}));
                      }} style={inputStyle}>
                        <option value="">Geral (sem curso específico)</option>
                        {(selected?.acoesEducacionais||[]).map((a,i)=>(
                          <option key={i} value={a.acaoId||a.id||String(i)}>{a.acaoNome||a.nome||"Ação "+(i+1)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {/* CPF/Nome/Email apenas para inscrição/frequência */}
                  {novaOcorrencia.tipo === "inscricao" && (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={labelStyle}>CPF *</label>
                          <input value={novaOcorrencia.cpf} onChange={e => setNovaOcorrencia(o => ({ ...o, cpf: e.target.value }))} placeholder="000.000.000-00" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Nome *</label>
                          <input value={novaOcorrencia.nome} onChange={e => setNovaOcorrencia(o => ({ ...o, nome: e.target.value }))} placeholder="Nome da pessoa" style={inputStyle} />
                        </div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>E-mail *</label>
                        <input value={novaOcorrencia.email} onChange={e => setNovaOcorrencia(o => ({ ...o, email: e.target.value }))} placeholder="email@exemplo.com" type="email" style={inputStyle} />
                      </div>
                    </>
                  )}
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Descrição da ocorrência *</label>
                    <textarea value={novaOcorrencia.descricao} onChange={e => setNovaOcorrencia(o => ({ ...o, descricao: e.target.value }))}
                      placeholder="Descreva a ocorrência..." style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
                  </div>
                  {/* Direcionar apenas para inscrição/frequência */}
                  {novaOcorrencia.tipo === "inscricao" && (
                    <div style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1px solid #e8edf2", marginBottom: 14 }}>
                      <label style={{ ...labelStyle, marginBottom: 10 }}>Direcionar ocorrência para</label>
                      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                        {["usuario","grupo"].map(tipo => (
                          <div key={tipo} onClick={() => setNovaOcorrencia(o => ({ ...o, destinoTipo: tipo, destinoId: "", destinoNome: "" }))}
                            style={{ flex: 1, textAlign: "center", padding: "8px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 12,
                              background: novaOcorrencia.destinoTipo === tipo ? "#1B3F7A" : "#f0f4ff",
                              color: novaOcorrencia.destinoTipo === tipo ? "#fff" : "#1B3F7A", border: `1px solid ${novaOcorrencia.destinoTipo === tipo ? "#1B3F7A" : "#e8edf2"}` }}>
                            {tipo === "usuario" ? "👤 Usuário" : "👥 Grupo de Trabalho"}
                          </div>
                        ))}
                      </div>
                      {novaOcorrencia.destinoTipo === "usuario" ? (
                        <select value={novaOcorrencia.destinoId} onChange={e => {
                          const u = usuarios.find(x => x.id === e.target.value);
                          setNovaOcorrencia(o => ({ ...o, destinoId: e.target.value, destinoNome: u?.nome || "" }));
                        }} style={inputStyle}>
                          <option value="">Selecione o usuário...</option>
                          {[...usuarios].sort((a,b) => (a.nome||"").localeCompare(b.nome||"")).map(u => (
                            <option key={u.id} value={u.id}>{u.nome} {u.cargo ? `— ${u.cargo}` : ""}</option>
                          ))}
                        </select>
                      ) : (
                        <select value={novaOcorrencia.destinoId} onChange={e => {
                          const g = grupos.find(x => x.id === e.target.value);
                          setNovaOcorrencia(o => ({ ...o, destinoId: e.target.value, destinoNome: g?.nome || "" }));
                        }} style={inputStyle}>
                          <option value="">Selecione o grupo...</option>
                          {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                        </select>
                      )}
                    </div>
                  )}
                  {(() => {
                    const isInscricao = novaOcorrencia.tipo === "inscricao";
                    const disabled = !novaOcorrencia.descricao.trim() || (isInscricao && (!novaOcorrencia.nome.trim() || !novaOcorrencia.cpf.trim() || !novaOcorrencia.email.trim()));
                    return (
                      <button onClick={adicionarOcorrencia} disabled={disabled} style={{
                        background: disabled ? "#ccc" : "#E8730A", border: "none", borderRadius: 12, padding: "10px 20px",
                        color: "#fff", fontWeight: 700, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'Montserrat', sans-serif",
                      }}>+ Adicionar Ocorrência</button>
                    );
                  })()}
                </div>

                {/* LISTA DE OCORRÊNCIAS REGISTRADAS */}
                {ocorrencias.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#1B3F7A", marginBottom: 12 }}>
                      Ocorrências registradas ({ocorrencias.length})
                    </div>
                    {(() => {
                      const TIPO_CFG_LIST = {
                        inscricao:      { label:"Inscrição/Frequência",       bg:"#fff3e0", cor:"#E8730A" },
                        equipamento:    { label:"Equipamentos/Material",       bg:"#e8f5e9", cor:"#059669" },
                        logistica:      { label:"Logística/Local/Transporte",  bg:"#f3f4f6", cor:"#6b7280" },
                        infraestrutura: { label:"Infraestrutura",              bg:"#f3e8ff", cor:"#7c3aed" },
                        tecnico:        { label:"Problemas Técnicos",          bg:"#fee2e2", cor:"#dc2626" },
                        comunicacao:    { label:"Comunicação",                 bg:"#e0f2fe", cor:"#0891b2" },
                        outro:          { label:"Outro",                       bg:"#f8f9fb", cor:"#888"    },
                      };
                      const ORDEM_TIPOS = ["inscricao","infraestrutura","tecnico","comunicacao","equipamento","logistica","outro"];
                      const grupos_oc = {};
                      ocorrencias.forEach(oc => {
                        const t = oc.tipo || "outro";
                        if (!grupos_oc[t]) grupos_oc[t] = [];
                        grupos_oc[t].push(oc);
                      });
                      const tiposPresentes = ORDEM_TIPOS.filter(t => grupos_oc[t]);
                      return tiposPresentes.map(tipo => {
                        const cfg = TIPO_CFG_LIST[tipo] || { label: tipo, bg:"#f8f9fb", cor:"#888" };
                        return (
                          <div key={tipo} style={{ marginBottom: 16 }}>
                            <div style={{ display:"flex", alignItems:"center", gap: 8, marginBottom: 8 }}>
                              <span style={{ background: cfg.bg, borderRadius: 8, padding:"3px 12px", fontSize:11, fontWeight:800, color:cfg.cor, border:`1px solid ${cfg.cor}33` }}>{cfg.label}</span>
                              <span style={{ fontSize:11, color:"#aaa", fontWeight:600 }}>{grupos_oc[tipo].length} ocorrência{grupos_oc[tipo].length!==1?"s":""}</span>
                            </div>
                            {grupos_oc[tipo].map((oc, i) => {
                      const isAdm = ["gestaoipc@tce.ce.gov.br","fabricio@tce.ce.gov.br"].includes(user?.email);
                      const isCriador = oc.autorId === user?.uid || oc.autorEmail === user?.email;
                      const jaRespondida = !!(oc.resposta && oc.resposta.trim());
                      const podeExcluir = isAdm || (isCriador && !jaRespondida);
                      const statusCor = oc.status === "Resolvido" ? "#059669" : oc.status === "Ciente" ? "#0891b2" : "#E8730A";
                      return (
                        <div key={oc.id || i} style={{ background: "#fff", borderRadius: 16, padding: "16px 18px", marginBottom: 10, border: `2px solid ${statusCor}22`, boxShadow: "0 2px 8px rgba(27,63,122,0.06)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                              <span style={{ background: statusCor+"22", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: statusCor }}>{oc.status||"Pendente"}</span>
                              {oc.acaoNome && <span style={{ background: "#eff6ff", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: "#1B3F7A" }}>📚 {oc.acaoNome}</span>}
                              {oc.destinoNome && <span style={{ background: "#f0fdf4", borderRadius: 6, padding: "2px 8px", fontSize: 10, color: "#059669", fontWeight: 600 }}>{oc.destinoTipo==="grupo"?"👥":"👤"} {oc.destinoNome}</span>}
                            </div>
                            {podeExcluir && (
                              <div onClick={() => excluirOcorrencia(oc.id)} style={{ cursor: "pointer", color: "#dc2626", fontSize: 18, padding: "0 4px", flexShrink: 0 }}>×</div>
                            )}
                          </div>
                          {oc.nome && <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>👤 {oc.nome}{oc.cpf ? ` · CPF: ${oc.cpf}` : ""}</div>}
                          <div style={{ fontSize: 13, color: "#333", lineHeight: 1.5, background: "#f8f9fb", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>{oc.descricao}</div>
                          {oc.resposta && (
                            <div style={{ background: "#e8f5e9", borderRadius: 10, padding: "10px 14px", borderLeft: "3px solid #059669" }}>
                              <div style={{ fontSize: 10, color: "#059669", fontWeight: 700, marginBottom: 3 }}>
                                ✅ Respondido por {oc.respondidoPor}{oc.respondidoEm ? ` · ${new Date(oc.respondidoEm).toLocaleString("pt-BR")}` : ""}
                              </div>
                              <div style={{ fontSize: 13, color: "#333" }}>{oc.resposta}</div>
                            </div>
                          )}
                          <div style={{ fontSize: 10, color: "#bbb", marginTop: 6 }}>Por: {oc.autorEmail} · {oc.data ? new Date(oc.data).toLocaleString("pt-BR") : ""}</div>
                        </div>
                      );
                    })}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            )}

                        {/* BLOCO PÓS */}
            {blocoAtivo === "pos" && (
              <div>
                {/* PARTICIPANTES POR CURSO */}
                {(selected?.acoesEducacionais || []).length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A", marginBottom: 4 }}>📊 Participantes por Curso</div>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>Informe a quantidade de participantes de cada curso realizado neste evento.</div>
                    <div style={{ border: "1px solid #e8edf2", borderRadius: 14, overflow: "hidden" }}>
                      {/* Header */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", background: "#1B3F7A", padding: "10px 16px" }}>
                        <div style={{ color: "#fff", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Curso / Ação Educacional</div>
                        <div style={{ color: "#fff", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, textAlign: "center" }}>Participantes</div>
                      </div>
                      {(selected.acoesEducacionais || []).map((a, idx) => {
                        const key = a.acaoId || a.id || String(idx);
                        return (
                          <div key={key} style={{ display: "grid", gridTemplateColumns: "1fr 140px", padding: "12px 16px", borderBottom: idx < (selected.acoesEducacionais.length - 1) ? "1px solid #f0f0f0" : "none", background: idx % 2 === 0 ? "#fff" : "#f8f9fb", alignItems: "center" }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>{a.acaoNome || a.nome || "Ação " + (idx + 1)}</div>
                            <input
                              type="number"
                              min="0"
                              value={participantesPorAcao[key] || ""}
                              onChange={e => setParticipantesPorAcao(p => ({ ...p, [key]: e.target.value }))}
                              placeholder="0"
                              style={{ ...inputStyle, textAlign: "center", fontWeight: 700, fontSize: 16, color: "#1B3F7A", padding: "8px 12px" }}
                            />
                          </div>
                        );
                      })}
                      {/* Total */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", padding: "12px 16px", background: "#E8730A", alignItems: "center" }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>TOTAL DE CAPACITADOS</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", textAlign: "center" }}>
                          {Object.values(participantesPorAcao).reduce((s, v) => s + (parseInt(v) || 0), 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ---- PLANO DE AÇÃO ---- */}
                <div style={{ marginTop: 28 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#059669", marginBottom: 4, display:"flex", alignItems:"center", gap:8 }}>
                    📋 Plano de Ação
                    {(planoAcao?.acoes || []).length > 0 && (
                      <span style={{ background:"#e8f5e9", borderRadius:8, padding:"2px 10px", fontSize:11, color:"#059669", fontWeight:700 }}>
                        {(planoAcao.acoes || []).length} ação{(planoAcao.acoes || []).length !== 1 ? "ões" : ""}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:12, color:"#888", marginBottom:14 }}>Crie ações a partir das lições aprendidas e delegue responsabilidades. O responsável receberá uma notificação por e-mail.</div>

                  {/* LISTA DE AÇÕES */}
                  {(planoAcao?.acoes || []).length > 0 && (
                    <div style={{ marginBottom:16 }}>
                      {(planoAcao.acoes || []).map((acao, i) => {
                        const corSt = { Pendente:"#E8730A", "Em andamento":"#0891b2", Concluída:"#059669" }[acao.status] || "#E8730A";
                        const corPr = { Alta:"#dc2626", Média:"#E8730A", Baixa:"#059669" }[acao.prioridade] || "#888";
                        return (
                          <div key={acao.id} style={{ background:"#fff", borderRadius:14, padding:"14px 16px", marginBottom:10, border:`1px solid ${corSt}33`, boxShadow:"0 2px 8px rgba(27,63,122,0.05)" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                                <span style={{ background:corSt+"22", borderRadius:6, padding:"2px 8px", fontSize:10, fontWeight:700, color:corSt }}>{acao.status||"Pendente"}</span>
                                <span style={{ background:corPr+"22", borderRadius:6, padding:"2px 8px", fontSize:10, fontWeight:700, color:corPr }}>{acao.prioridade === "Alta" ? "🔴" : acao.prioridade === "Média" ? "🟡" : "🟢"} {acao.prioridade}</span>
                                {acao.prazo && <span style={{ background:"#f8f9fb", borderRadius:6, padding:"2px 8px", fontSize:10, color:"#888", fontWeight:600 }}>📅 {new Date(acao.prazo+"T12:00:00").toLocaleDateString("pt-BR")}</span>}
                              </div>
                              {["gestaoipc@tce.ce.gov.br","fabricio@tce.ce.gov.br"].includes(user?.email) && (
                                <div onClick={() => removerAcaoPlano(acao.id)} style={{ cursor:"pointer", color:"#dc2626", fontSize:16, padding:"0 4px" }}>×</div>
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
                      <label style={labelStyle}>Título da ação *</label>
                      <input value={novaAcaoPA.titulo} onChange={e => setNovaAcaoPA(n=>({...n,titulo:e.target.value}))} placeholder="Ex: Ajustar lista de presença..." style={inputStyle} />
                    </div>
                    <div style={{ marginBottom:10 }}>
                      <label style={labelStyle}>Descrição</label>
                      <textarea value={novaAcaoPA.descricao} onChange={e => setNovaAcaoPA(n=>({...n,descricao:e.target.value}))} placeholder="Detalhe o que precisa ser feito..." style={{ ...inputStyle, minHeight:60, resize:"vertical" }} />
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                      <div>
                        <label style={labelStyle}>Prioridade</label>
                        <select value={novaAcaoPA.prioridade} onChange={e => setNovaAcaoPA(n=>({...n,prioridade:e.target.value}))} style={inputStyle}>
                          <option>Alta</option><option>Média</option><option>Baixa</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Prazo</label>
                        <input type="date" value={novaAcaoPA.prazo} onChange={e => setNovaAcaoPA(n=>({...n,prazo:e.target.value}))} style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ marginBottom:10 }}>
                      <label style={labelStyle}>Responsável</label>
                      <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                        {[["servidor","👤 Servidor"],["motorista","🚗 Motorista"],["instrutor","👨‍🏫 Instrutor"],["outro","✏️ Outro"]].map(([tipo,label]) => (
                          <div key={tipo} onClick={() => setNovaAcaoPA(n=>({...n,responsavelTipo:tipo,responsavelId:"",responsavelNome:"",responsavelEmail:"",responsavelOutroNome:"",responsavelOutroEmail:""}))}
                            style={{ flex:1, textAlign:"center", padding:"6px 4px", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:700,
                              background: novaAcaoPA.responsavelTipo===tipo ? "#059669" : "#fff",
                              color: novaAcaoPA.responsavelTipo===tipo ? "#fff" : "#888",
                              border:`1px solid ${novaAcaoPA.responsavelTipo===tipo ? "#059669" : "#e8edf2"}` }}>
                            {label}
                          </div>
                        ))}
                      </div>
                      {novaAcaoPA.responsavelTipo === "outro" ? (
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                          <div>
                            <label style={labelStyle}>Nome *</label>
                            <input value={novaAcaoPA.responsavelOutroNome} onChange={e => setNovaAcaoPA(n=>({...n,responsavelOutroNome:e.target.value}))} placeholder="Nome completo" style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>E-mail *</label>
                            <input type="email" value={novaAcaoPA.responsavelOutroEmail} onChange={e => setNovaAcaoPA(n=>({...n,responsavelOutroEmail:e.target.value}))} placeholder="email@exemplo.com" style={inputStyle} />
                          </div>
                        </div>
                      ) : (
                        <select value={novaAcaoPA.responsavelId} onChange={e => {
                          const lista = novaAcaoPA.responsavelTipo === "motorista" ? motoristas : novaAcaoPA.responsavelTipo === "instrutor" ? instrutores : servidores;
                          const item = lista.find(x => x.id === e.target.value);
                          setNovaAcaoPA(n=>({...n, responsavelId:e.target.value, responsavelNome:item?.nome||item?.email||"", responsavelEmail:item?.email||""}));
                        }} style={inputStyle}>
                          <option value="">Selecione...</option>
                          {(novaAcaoPA.responsavelTipo === "motorista" ? motoristas : novaAcaoPA.responsavelTipo === "instrutor" ? instrutores : servidores)
                            .filter(x => x.email)
                            .sort((a,b) => (a.nome||"").localeCompare(b.nome||""))
                            .map(x => <option key={x.id} value={x.id}>{x.nome || x.email}</option>)}
                        </select>
                      )}
                    </div>
                    <button onClick={adicionarAcaoPlano} disabled={salvandoPA || !novaAcaoPA.titulo.trim() || !(novaAcaoPA.responsavelTipo==="outro" ? novaAcaoPA.responsavelOutroNome.trim() && novaAcaoPA.responsavelOutroEmail.trim() : novaAcaoPA.responsavelEmail.trim())} style={{
                      width:"100%", background: salvandoPA ? "#ccc" : "#059669",
                      border:"none", borderRadius:12, padding:"11px", color:"#fff",
                      fontWeight:700, fontSize:13, cursor: salvandoPA ? "not-allowed" : "pointer",
                      fontFamily:"'Montserrat',sans-serif",
                    }}>
                      {salvandoPA ? "Salvando e notificando..." : "➕ Adicionar Ação e Notificar Responsável"}
                    </button>
                  </div>
                </div>


                <label style={labelStyle}>Lições aprendidas</label>
                <textarea value={licoesAprendidas} onChange={e => setLicoesAprendidas(e.target.value)}
                  placeholder="Registre aqui as lições aprendidas neste evento para melhorar as próximas edições..."
                  style={{ ...inputStyle, minHeight: 200, resize: "vertical" }} />
              </div>
            )}

            <button onClick={salvarBloco} disabled={salvando} style={{
              width: "100%", marginTop: 24,
              background: salvando ? "#aaa" : "linear-gradient(135deg, #1B3F7A, #2a5ba8)",
              border: "none", borderRadius: 14, padding: 16,
              color: "#fff", fontWeight: 700, fontSize: 15, cursor: salvando ? "not-allowed" : "pointer",
              fontFamily: "'Montserrat', sans-serif",
            }}>{salvando ? "Salvando..." : "💾 Salvar"}</button>
          </div>
        </div>
      )}

      {/* MODAL FORM */}
      {modal === "form" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 640, padding: 32, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontWeight: 900, fontSize: 20, color: "#1B3F7A" }}>{selected ? "✏️ Editar Evento" : "➕ Novo Evento"}</div>
              <div onClick={() => setModal(null)} style={{ width: 36, height: 36, background: "#f0f4ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: "#1B3F7A" }}>✕</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Tipo</label>
                <select value={form.tipo || "Municipal"} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} style={inputStyle}>
                  <option>Municipal</option><option>Regional</option>
                </select>
              </div>
              {form.tipo === "Municipal" ? (
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Município</label>
                  <select value={form.municipio || ""} onChange={e => setForm(p => ({ ...p, municipio: e.target.value }))} style={inputStyle}>
                    {MUNICIPIOS_CE.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              ) : (
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Região/Sede</label>
                  <select value={form.regiao || ""} onChange={e => setForm(p => ({ ...p, regiao: e.target.value }))} style={inputStyle}>
                    {REGIOES_SEDES.map(r => <option key={r.nome}>{r.nome}</option>)}
                  </select>
                </div>
              )}
              <div><label style={labelStyle}>Data</label><input type="date" value={form.data || ""} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Horário</label><input type="time" value={form.hora || ""} onChange={e => setForm(p => ({ ...p, hora: e.target.value }))} style={inputStyle} /></div>
              <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Local</label><input value={form.local || ""} onChange={e => setForm(p => ({ ...p, local: e.target.value }))} placeholder="Ex: Câmara Municipal" style={inputStyle} /></div>
              <div><label style={labelStyle}>Motorista</label><input value={form.motorista || ""} onChange={e => setForm(p => ({ ...p, motorista: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Motorista</label><input value={form.motorista || ""} onChange={e => setForm(p => ({ ...p, motorista: e.target.value }))} style={inputStyle} /></div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Status</label>
                <select value={form.status || "Programado"} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
                  <option value="Programado">Programado</option>
                  <option value="Em Execução">Em Execução</option>
                  <option value="Realizado">Realizado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
                <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>* Status atualizado automaticamente pela data. Somente "Cancelado" é manual.</div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Observações</label><textarea value={form.observacoes || ""} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} /></div>

              {/* AÇÕES EDUCACIONAIS */}
              <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1B3F7A" }}>📚 Ações Educacionais</div>
                </div>
                {(form.acoesEducacionais || []).map((acao, idx) => (
                  <div key={idx} style={{ background:"#f8f9fb", borderRadius:14, padding:"16px", marginBottom:12, border:"1px solid #e8edf2" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                      <div style={{ gridColumn:"1/-1" }}>
                        <label style={labelStyle}>Ação Educacional</label>
                        <select value={acao.acaoId||""} onChange={e => {
                          const sel = tiposAcaoEdu.find(t=>t.id===e.target.value);
                          const a=[...(form.acoesEducacionais||[])]; a[idx]={...a[idx],acaoId:e.target.value,acaoNome:sel?.nome||""}; setForm(f=>({...f,acoesEducacionais:a}));
                        }} style={inputStyle}>
                          <option value="">Selecione...</option>
                          {tiposAcaoEdu.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Modalidade</label>
                        <select value={acao.modalidade||"Presencial"} onChange={e => { const a=[...(form.acoesEducacionais||[])]; a[idx]={...a[idx],modalidade:e.target.value}; setForm(f=>({...f,acoesEducacionais:a})); }} style={inputStyle}>
                          <option>Presencial</option><option>EaD</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Carga Horária (h)</label>
                        <input type="number" value={acao.cargaHoraria||""} onChange={e => { const a=[...(form.acoesEducacionais||[])]; a[idx]={...a[idx],cargaHoraria:e.target.value}; setForm(f=>({...f,acoesEducacionais:a})); }} placeholder="Ex: 8" style={inputStyle}/>
                      </div>
                      {acao.modalidade==="EaD" && (
                        <div style={{ gridColumn:"1/-1" }}>
                          <label style={labelStyle}>Link da Transmissão</label>
                          <input value={acao.link||""} onChange={e => { const a=[...(form.acoesEducacionais||[])]; a[idx]={...a[idx],link:e.target.value}; setForm(f=>({...f,acoesEducacionais:a})); }} placeholder="https://..." style={inputStyle}/>
                        </div>
                      )}
                    </div>

                    {/* INSTRUTORES */}
                    <div style={{ marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <label style={labelStyle}>Instrutores</label>
                        <div onClick={() => {
                          const a=[...(form.acoesEducacionais||[])];
                          a[idx]={...a[idx], instrutores:[...(a[idx].instrutores||[]), {instrutorId:"",instrutorNome:""}]};
                          setForm(f=>({...f,acoesEducacionais:a}));
                        }} style={{ fontSize:11, fontWeight:700, color:"#1B3F7A", cursor:"pointer", background:"#eff6ff", borderRadius:8, padding:"3px 10px" }}>
                          + Instrutor
                        </div>
                      </div>
                      {(acao.instrutores||[{instrutorId:acao.instrutorId||"",instrutorNome:acao.instrutorNome||""}]).map((inst, iIdx) => (
                        <div key={iIdx} style={{ display:"flex", gap:8, marginBottom:6, alignItems:"center" }}>
                          <select value={inst.instrutorId||""} onChange={e => {
                            const sel = instrutores.find(i=>i.id===e.target.value);
                            const a=[...(form.acoesEducacionais||[])];
                            const insts=[...(a[idx].instrutores||[{instrutorId:a[idx].instrutorId||"",instrutorNome:a[idx].instrutorNome||""}])];
                            insts[iIdx]={instrutorId:e.target.value,instrutorNome:sel?.nome||""};
                            a[idx]={...a[idx],instrutores:insts,instrutorId:insts[0]?.instrutorId||"",instrutorNome:insts[0]?.instrutorNome||""};
                            setForm(f=>({...f,acoesEducacionais:a}));
                          }} style={{...inputStyle,flex:1}}>
                            <option value="">Selecione...</option>
                            {instrutores.map(i=><option key={i.id} value={i.id}>{i.nome}</option>)}
                          </select>
                          {(acao.instrutores||[]).length > 0 && (
                            <div onClick={() => {
                              const a=[...(form.acoesEducacionais||[])];
                              const insts=(a[idx].instrutores||[]).filter((_,ii)=>ii!==iIdx);
                              a[idx]={...a[idx],instrutores:insts,instrutorId:insts[0]?.instrutorId||"",instrutorNome:insts[0]?.instrutorNome||""};
                              setForm(f=>({...f,acoesEducacionais:a}));
                            }} style={{ color:"#dc2626", cursor:"pointer", fontSize:18, padding:"0 4px", flexShrink:0 }}>×</div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* PAGAMENTO INSTRUTORIA */}
                    <div style={{ display:"flex", alignItems:"center", gap:10, background: acao.pagamentoInstrutoria ? "#e8f5e9" : "#f8f9fb", borderRadius:10, padding:"10px 14px", marginBottom:10, border:`1px solid ${acao.pagamentoInstrutoria?"#c8e6c9":"#e8edf2"}`, cursor:"pointer" }}
                      onClick={() => { const a=[...(form.acoesEducacionais||[])]; a[idx]={...a[idx],pagamentoInstrutoria:!a[idx].pagamentoInstrutoria}; setForm(f=>({...f,acoesEducacionais:a})); }}>
                      <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${acao.pagamentoInstrutoria?"#059669":"#ccc"}`, background:acao.pagamentoInstrutoria?"#059669":"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {acao.pagamentoInstrutoria && <span style={{ color:"#fff", fontSize:13, fontWeight:900 }}>✓</span>}
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color: acao.pagamentoInstrutoria?"#059669":"#555" }}>💰 Tem pagamento de instrutoria</div>
                        <div style={{ fontSize:11, color:"#888" }}>Marque se esta ação gera pagamento para o(s) instrutor(es)</div>
                      </div>
                    </div>
                    {acao.pagamentoInstrutoria && (
                      <div style={{ marginBottom:10 }}>
                        <label style={labelStyle}>Valor da instrutoria (R$)</label>
                        <input value={acao.valorInstrutoria||""} onChange={e => { const a=[...(form.acoesEducacionais||[])]; a[idx]={...a[idx],valorInstrutoria:e.target.value}; setForm(f=>({...f,acoesEducacionais:a})); }} placeholder="Ex: 500,00" style={inputStyle}/>
                      </div>
                    )}

                    <div onClick={() => { const a=(form.acoesEducacionais||[]).filter((_,i)=>i!==idx); setForm(f=>({...f,acoesEducacionais:a})); }} style={{ color:"#dc2626", fontSize:12, fontWeight:700, cursor:"pointer", textAlign:"right" }}>🗑️ Remover ação</div>
                  </div>
                ))}
                <div onClick={() => setForm(f=>({...f,acoesEducacionais:[...(f.acoesEducacionais||[]),{acaoId:"",acaoNome:"",instrutores:[],instrutorId:"",instrutorNome:"",modalidade:"Presencial",cargaHoraria:"",link:"",pagamentoInstrutoria:false,valorInstrutoria:""}]}))} style={{ background:"#f0f4ff", borderRadius:12, padding:"10px 16px", fontSize:13, color:"#1B3F7A", fontWeight:700, cursor:"pointer", textAlign:"center", border:"2px dashed #1B3F7A33" }}>+ Adicionar Ação Educacional</div>
              </div>
            </div>
            <button onClick={saveEvento} style={{ width: "100%", marginTop: 20, background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", border: "none", borderRadius: 14, padding: 16, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>💾 Salvar Evento</button>
          </div>
        </div>
      )}
    </div>
  );
}
