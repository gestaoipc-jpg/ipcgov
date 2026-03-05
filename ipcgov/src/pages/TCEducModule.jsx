import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/config";

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
  "Solicitar viagem",
  "Cadastrar evento no IPCeduc e liberar inscrição",
  "Solicitar diária terceirizados",
  "Solicitar divulgação site/redes sociais",
  "Reunião de alinhamento",
  "Alocar instrutores",
  "Alocar apoio IPC município",
  "Alocar apoio IPC salas Fortaleza",
  "Organizar material e equipamentos",
];

const CHECKLIST_VIAGEM = [
  "Hotel e hospedagem confirmados",
  "Horários de saída definidos",
  "Alimentação organizada",
  "Documentos e materiais separados",
];

function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function daysUntil(d) {
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}

const statusColors = { Pendente: "#E8730A", Realizado: "#059669", Cancelado: "#dc2626" };

const inputStyle = {
  width: "100%", background: "#f8f9fb", border: "1px solid #e8edf2",
  borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#1B3F7A",
  outline: "none", fontFamily: "'Montserrat', sans-serif",
};
const labelStyle = {
  display: "block", color: "#888", fontSize: 11, letterSpacing: 1,
  textTransform: "uppercase", marginBottom: 6, fontWeight: 600,
};

export default function TCEducModule({ user, onBack, onCadastros, onAlertas, onDashboard, onRelatorio }) {
  const [tab, setTab] = useState("eventos");
  const [eventos, setEventos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filtro, setFiltro] = useState("Todos");
  const [form, setForm] = useState({});
  const [blocoAtivo, setBlocoAtivo] = useState(null);
  const [checklist, setChecklist] = useState({});
  const [ocorrencias, setOcorrencias] = useState([]);
  const [novaOcorrencia, setNovaOcorrencia] = useState({ tipo: "inscricao", descricao: "", cpf: "", nome: "" });
  const [licoesAprendidas, setLicoesAprendidas] = useState("");
  const [infoViagem, setInfoViagem] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [itemOcorrencia, setItemOcorrencia] = useState(null); // item do checklist com ocorrência aberta
  const [novaOcorrenciaItem, setNovaOcorrenciaItem] = useState("");

  useEffect(() => { loadEventos(); loadUsuarios(); }, []);

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
        setEventos(saved);
      } else {
        setEventos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

  const saveEvento = async () => {
    if (selected) {
      await updateDoc(doc(db, "tceduc_eventos", selected.id), form);
      setEventos(ev => ev.map(e => e.id === selected.id ? { ...e, ...form } : e));
    } else {
      const ref = await addDoc(collection(db, "tceduc_eventos"), { ...form, criadoEm: new Date().toISOString() });
      setEventos(ev => [...ev, { id: ref.id, ...form }]);
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
    setInfoViagem(ev.infoViagem || {});
    setModal("bloco");
  };

  const salvarBloco = async () => {
    setSalvando(true);
    const updates = {
      checklist,
      ocorrencias,
      licoesAprendidas,
      infoViagem,
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

  const adicionarOcorrencia = () => {
    if (!novaOcorrencia.descricao) return;
    setOcorrencias(o => [...o, { ...novaOcorrencia, id: Date.now(), data: new Date().toISOString() }]);
    setNovaOcorrencia({ tipo: "inscricao", descricao: "", cpf: "", nome: "" });
  };

  const filtered = eventos
    .filter(e => filtro === "Todos" || e.tipo === filtro)
    .sort((a, b) => new Date(a.data) - new Date(b.data));

  const municipaisRealizados = eventos.filter(e => e.tipo === "Municipal" && e.status === "Realizado").length;
  const regionaisRealizados = eventos.filter(e => e.tipo === "Regional" && e.status === "Realizado").length;

  const progressoChecklist = (ev, items) => {
    const ch = ev.checklist || {};
    const done = items.filter(i => ch[i]?.feito).length;
    return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
  };

  return (
    <div style={{ minHeight: "100vh", background: "#E8EDF2", fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 0; }
        select, input, textarea { font-family: 'Montserrat', sans-serif; }
      `}</style>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", padding: "24px 32px 50px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: 40, bottom: -60, fontSize: 220, opacity: 0.04 }}>🗺</div>
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div onClick={onBack} style={{
              width: 40, height: 40, background: "rgba(255,255,255,0.15)",
              borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#fff", fontSize: 20,
            }}>←</div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 3 }}>MÓDULO</div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 24 }}>TCEduc</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              <div onClick={onDashboard} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 14, padding: "10px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📊 Dashboard</div>
              <div onClick={onCadastros} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 14, padding: "10px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>👥 Cadastros</div>
              <div onClick={() => { setSelected(null); setForm({ tipo: "Municipal", municipio: MUNICIPIOS_CE[0], status: "Pendente" }); setModal("form"); }} style={{
                background: "#E8730A", borderRadius: 14, padding: "10px 20px",
                color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 14px rgba(232,115,10,0.4)",
              }}>+ Novo Evento</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { label: "Municipais 2026", value: `${municipaisRealizados}/54` },
              { label: "Regionais 2026", value: `${regionaisRealizados}/7` },
              { label: "Total Eventos", value: eventos.length },
            ].map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 14, padding: "12px 20px" }}>
                <div style={{ color: "#fff", fontWeight: 900, fontSize: 22 }}>{s.value}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px 100px" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          {["Todos", "Municipal", "Regional"].map(f => (
            <div key={f} onClick={() => setFiltro(f)} style={{
              background: filtro === f ? "#1B3F7A" : "#fff",
              color: filtro === f ? "#fff" : "#555",
              borderRadius: 20, padding: "8px 20px",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 2px 8px rgba(27,63,122,0.08)",
            }}>{f}</div>
          ))}
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
                {selected.motorista && <div style={{ background: "#f8f9fb", borderRadius: 12, padding: "10px 14px" }}><div style={{ color: "#aaa", fontSize: 10, marginBottom: 3 }}>MOTORISTA</div><div style={{ color: "#1B3F7A", fontWeight: 600, fontSize: 13 }}>{selected.motorista}</div></div>}
              </div>
            )}

            {/* BLOCOS */}
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1B3F7A", marginBottom: 14 }}>Gestão do Evento</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {[
                { id: "antes", icon: "📋", label: "Logística Antes", sub: "Checklist de preparação", color: "#1B3F7A", prog: progressoChecklist(selected, CHECKLIST_ANTES) },
                { id: "viagem", icon: "🚗", label: "Logística em Viagem", sub: "Hotel, horários, alimentação", color: "#2a5ba8", prog: progressoChecklist(selected, CHECKLIST_VIAGEM) },
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
              <button onClick={() => { setForm({ ...selected }); setModal("form"); }} style={{ flex: 1, background: "#1B3F7A", border: "none", borderRadius: 14, padding: 14, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>✏️ Editar Evento</button>
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
                  {blocoAtivo === "viagem" && "🚗 Logística em Viagem"}
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
              </div>
            )}

            {/* BLOCO VIAGEM */}
            {blocoAtivo === "viagem" && (
              <div>
                {CHECKLIST_VIAGEM.map((item, i) => {
                  const val = checklist[item] || {};
                  const venceEm = val.dataLimite ? Math.ceil((new Date(val.dataLimite) - new Date()) / 86400000) : null;
                  const atrasado = venceEm !== null && venceEm < 0 && !val.feito;
                  const urgente = venceEm !== null && venceEm <= 2 && venceEm >= 0 && !val.feito;
                  return (
                    <div key={i} style={{ background: val.feito ? "#e8f5e9" : atrasado ? "#fee2e2" : urgente ? "#fff3e0" : "#f8f9fb", borderRadius: 14, marginBottom: 10, border: `1px solid ${val.feito ? "#c8e6c9" : atrasado ? "#fecaca" : urgente ? "#fed7aa" : "#e8edf2"}`, overflow: "hidden" }}>
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
                <div style={{ marginTop: 20 }}>
                  <label style={labelStyle}>Avisos gerais de viagem</label>
                  <textarea value={infoViagem.avisos || ""} onChange={e => setInfoViagem(v => ({ ...v, avisos: e.target.value }))}
                    placeholder="Informações sobre hotel, horários, alimentação..." style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} />
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
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>CPF (se aplicável)</label>
                      <input value={novaOcorrencia.cpf} onChange={e => setNovaOcorrencia(o => ({ ...o, cpf: e.target.value }))} placeholder="000.000.000-00" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Nome (se aplicável)</label>
                    <input value={novaOcorrencia.nome} onChange={e => setNovaOcorrencia(o => ({ ...o, nome: e.target.value }))} placeholder="Nome da pessoa" style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Descrição da ocorrência</label>
                    <textarea value={novaOcorrencia.descricao} onChange={e => setNovaOcorrencia(o => ({ ...o, descricao: e.target.value }))}
                      placeholder="Descreva a ocorrência..." style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
                  </div>
                  <button onClick={adicionarOcorrencia} style={{
                    background: "#E8730A", border: "none", borderRadius: 12, padding: "10px 20px",
                    color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
                  }}>+ Adicionar Ocorrência</button>
                </div>

                {ocorrencias.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#1B3F7A", marginBottom: 12 }}>Ocorrências registradas ({ocorrencias.length})</div>
                    {ocorrencias.map((oc, i) => (
                      <div key={oc.id || i} style={{ background: "#fff3e0", borderRadius: 14, padding: "12px 16px", marginBottom: 10, border: "1px solid #ffe0b2" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <div style={{ fontSize: 11, color: "#E8730A", fontWeight: 700, textTransform: "uppercase" }}>{oc.tipo}</div>
                          <div onClick={() => setOcorrencias(o => o.filter((_, j) => j !== i))} style={{ cursor: "pointer", color: "#dc2626", fontSize: 16 }}>×</div>
                        </div>
                        {oc.nome && <div style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>👤 {oc.nome} {oc.cpf && `· ${oc.cpf}`}</div>}
                        <div style={{ fontSize: 13, color: "#333" }}>{oc.descricao}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* BLOCO PÓS */}
            {blocoAtivo === "pos" && (
              <div>
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
              <div><label style={labelStyle}>Instrutor Presencial</label><input value={form.instrutorPresencial || ""} onChange={e => setForm(p => ({ ...p, instrutorPresencial: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Instrutor Remoto</label><input value={form.instrutorRemoto || ""} onChange={e => setForm(p => ({ ...p, instrutorRemoto: e.target.value }))} style={inputStyle} /></div>
              <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Link Google Meet</label><input type="url" value={form.linkMeet || ""} onChange={e => setForm(p => ({ ...p, linkMeet: e.target.value }))} placeholder="https://meet.google.com/..." style={inputStyle} /></div>
              <div><label style={labelStyle}>Motorista</label><input value={form.motorista || ""} onChange={e => setForm(p => ({ ...p, motorista: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Nº de Inscritos</label><input type="number" value={form.inscritos || ""} onChange={e => setForm(p => ({ ...p, inscritos: e.target.value }))} style={inputStyle} /></div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Status</label>
                <select value={form.status || "Pendente"} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
                  <option>Pendente</option><option>Realizado</option><option>Cancelado</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Observações</label><textarea value={form.observacoes || ""} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} /></div>

              {/* AÇÕES EDUCACIONAIS */}
              <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1B3F7A", marginBottom: 12 }}>
                  📚 Ações Educacionais
                </div>
                {(form.acoesEducacionais || []).map((acao, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
                    <input value={acao.nome || ""} onChange={e => { const a = [...(form.acoesEducacionais||[])]; a[idx]={...a[idx],nome:e.target.value}; setForm(f=>({...f,acoesEducacionais:a})); }} placeholder={form.tipo==="Regional"?"Ex: Palestra, Curso":"Ex: Controle Social, Licitações"} style={{...inputStyle,flex:2}} />
                    <input type="number" value={acao.participantes || ""} onChange={e => { const a = [...(form.acoesEducacionais||[])]; a[idx]={...a[idx],participantes:e.target.value}; setForm(f=>({...f,acoesEducacionais:a})); }} placeholder="Participantes" style={{...inputStyle,flex:1}} />
                    <div onClick={() => { const a=(form.acoesEducacionais||[]).filter((_,i)=>i!==idx); setForm(f=>({...f,acoesEducacionais:a})); }} style={{ width:36,height:36,background:"#fee2e2",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#dc2626",fontSize:18,flexShrink:0 }}>×</div>
                  </div>
                ))}
                <div onClick={() => setForm(f=>({...f,acoesEducacionais:[...(f.acoesEducacionais||[]),{nome:"",participantes:""}]}))} style={{ background:"#f0f4ff",borderRadius:12,padding:"10px 16px",fontSize:13,color:"#1B3F7A",fontWeight:700,cursor:"pointer",textAlign:"center",border:"2px dashed #1B3F7A33" }}>+ Adicionar Ação Educacional</div>
              </div>
            </div>
            <button onClick={saveEvento} style={{ width: "100%", marginTop: 20, background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", border: "none", borderRadius: 14, padding: 16, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>💾 Salvar Evento</button>
          </div>
        </div>
      )}
    </div>
  );
}
