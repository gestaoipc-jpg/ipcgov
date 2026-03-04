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
  { nome: "Crato", municipios: ["Abaiara","Aiuaba","Altaneira","Antonina do Norte","Araripe","Assaré","Barbalha","Brejo Santo","Campos Sales","Caririaçu","Farias Brito","Jardim","Jati","Juazeiro do Norte","Mauriti","Milagres","Missão Velha","Nova Olinda","Penaforte","Porteiras","Potengi","Saboeiro","Salitre","Santana do Cariri"] },
  { nome: "Iguatu", municipios: ["Acopiara","Cariús","Granjeiro","Icó","Iguatu","Jucás","Lavras da Mangabeira","Orós","Quixelô","Várzea Alegre"] },
  { nome: "Crateús", municipios: ["Ararendá","Catunda","Crateús","Independência","Monsenhor Tabosa","Nova Russas","Novo Oriente","Parambu","Poranga","Tamboril"] },
  { nome: "Tianguá", municipios: ["Carnaubal","Croatá","Guaraciaba do Norte","Ibiapina","Ipu","Ipueiras","São Benedito","Tianguá","Ubajara","Viçosa do Ceará"] },
  { nome: "Sobral", municipios: ["Alcântaras","Cariré","Forquilha","Frecheirinha","Groaíras","Massapê","Meruoca","Moraújo","Mucambo","Santana do Acaraú","Sobral","Varjota"] },
  { nome: "Limoeiro do Norte", municipios: ["Aracati","Fortim","Icapuí","Itaiçaba","Jaguaribe","Jaguaruana","Limoeiro do Norte","Morada Nova","Palhano","Russas","Tabuleiro do Norte"] },
  { nome: "Fortaleza", municipios: ["Aquiraz","Caucaia","Eusébio","Fortaleza","Guaiúba","Horizonte","Itaitinga","Maracanaú","Maranguape","Pacajus","Pacatuba","São Gonçalo do Amarante"] },
];

// Eventos pré-cadastrados baseados no calendário
const EVENTOS_INICIAIS_MUNICIPAIS = [
  { municipio: "Camocim", data: "2026-02-24", tipo: "Municipal", status: "Pendente" },
  { municipio: "Barroquinha", data: "2026-02-24", tipo: "Municipal", status: "Pendente" },
  { municipio: "Chaval", data: "2026-02-24", tipo: "Municipal", status: "Pendente" },
  { municipio: "Cruz", data: "2026-02-25", tipo: "Municipal", status: "Pendente" },
  { municipio: "Jijoca de Jericoacoara", data: "2026-02-25", tipo: "Municipal", status: "Pendente" },
  { municipio: "Bela Cruz", data: "2026-02-25", tipo: "Municipal", status: "Pendente" },
  { municipio: "Acaraú", data: "2026-02-26", tipo: "Municipal", status: "Pendente" },
  { municipio: "Marco", data: "2026-02-26", tipo: "Municipal", status: "Pendente" },
  { municipio: "Itarema", data: "2026-02-26", tipo: "Municipal", status: "Pendente" },
];

const EVENTOS_INICIAIS_REGIONAIS = [
  { regiao: "Crato", data: "2026-03-17", tipo: "Regional", status: "Pendente", sede: "Crato" },
  { regiao: "Iguatu", data: "2026-04-29", tipo: "Regional", status: "Pendente", sede: "Iguatu" },
  { regiao: "Crateús", data: "2026-05-14", tipo: "Regional", status: "Pendente", sede: "Crateús" },
  { regiao: "Tianguá", data: "2026-06-19", tipo: "Regional", status: "Pendente", sede: "Tianguá" },
];

function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function daysUntil(d) {
  const diff = new Date(d) - new Date();
  return Math.ceil(diff / 86400000);
}

export default function TCEducModule({ user, onBack }) {
  const [tab, setTab] = useState("eventos");
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filtro, setFiltro] = useState("Todos");
  const [form, setForm] = useState({});

  useEffect(() => {
    loadEventos();
  }, []);

  const loadEventos = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "tceduc_eventos"));
      if (snap.empty) {
        // Seed initial events
        const todos = [...EVENTOS_INICIAIS_MUNICIPAIS, ...EVENTOS_INICIAIS_REGIONAIS];
        const saved = [];
        for (const ev of todos) {
          const ref = await addDoc(collection(db, "tceduc_eventos"), { ...ev, criadoEm: new Date().toISOString() });
          saved.push({ id: ref.id, ...ev });
        }
        setEventos(saved);
      } else {
        setEventos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const saveEvento = async () => {
    if (selected) {
      await updateDoc(doc(db, "tceduc_eventos", selected.id), form);
      setEventos(ev => ev.map(e => e.id === selected.id ? { ...e, ...form } : e));
    } else {
      const ref = await addDoc(collection(db, "tceduc_eventos"), { ...form, criadoEm: new Date().toISOString() });
      setEventos(ev => [...ev, { id: ref.id, ...form }]);
    }
    setModal(null);
    setSelected(null);
    setForm({});
  };

  const deleteEvento = async (id) => {
    await deleteDoc(doc(db, "tceduc_eventos", id));
    setEventos(ev => ev.filter(e => e.id !== id));
    setModal(null);
    setSelected(null);
  };

  const filtered = eventos.filter(e => filtro === "Todos" || e.tipo === filtro)
    .sort((a, b) => new Date(a.data) - new Date(b.data));

  const municipaisRealizados = eventos.filter(e => e.tipo === "Municipal" && e.status === "Realizado").length;
  const regionaisRealizados = eventos.filter(e => e.tipo === "Regional" && e.status === "Realizado").length;

  return (
    <div style={{
      minHeight: "100vh", background: "#E8EDF2",
      fontFamily: "'Montserrat', sans-serif",
      maxWidth: 480, margin: "0 auto",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); * { box-sizing: border-box; margin:0; padding:0; }`}</style>

      {/* HEADER */}
      <div style={{
        background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)",
        padding: "20px 20px 60px", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: -20, bottom: -30, fontSize: 140, opacity: 0.07 }}>🗺</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, position: "relative", zIndex: 2 }}>
          <div onClick={onBack} style={{
            width: 36, height: 36, background: "rgba(255,255,255,0.15)",
            borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#fff", fontSize: 18,
          }}>←</div>
          <div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 2 }}>MÓDULO</div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 20, letterSpacing: -0.5 }}>TCEduc</div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <div onClick={() => { setSelected(null); setForm({ tipo: "Municipal", municipio: MUNICIPIOS_CE[0], status: "Pendente" }); setModal("form"); }} style={{
              background: "#E8730A", borderRadius: 12, padding: "8px 16px",
              color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>+ Evento</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, position: "relative", zIndex: 2 }}>
          {[
            { label: "Municipais 2026", value: `${municipaisRealizados}/54` },
            { label: "Regionais 2026", value: `${regionaisRealizados}/7` },
            { label: "Total Eventos", value: eventos.length },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, background: "rgba(255,255,255,0.12)",
              borderRadius: 12, padding: "10px 8px", textAlign: "center",
            }}>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>{s.value}</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FILTROS */}
      <div style={{ display: "flex", gap: 8, padding: "16px 20px 8px", overflowX: "auto" }}>
        {["Todos", "Municipal", "Regional"].map(f => (
          <div key={f} onClick={() => setFiltro(f)} style={{
            flexShrink: 0,
            background: filtro === f ? "#1B3F7A" : "#fff",
            color: filtro === f ? "#fff" : "#555",
            borderRadius: 20, padding: "7px 16px",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 2px 8px rgba(27,63,122,0.08)",
          }}>{f}</div>
        ))}
      </div>

      {/* EVENTOS LIST */}
      <div style={{ padding: "8px 20px 100px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>Carregando eventos...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>Nenhum evento encontrado.</div>
        ) : filtered.map(ev => {
          const nome = ev.tipo === "Municipal" ? ev.municipio : ev.regiao;
          const days = ev.data ? daysUntil(ev.data) : null;
          const statusColors = { Pendente: "#E8730A", Realizado: "#059669", Cancelado: "#dc2626" };
          return (
            <div key={ev.id} onClick={() => { setSelected(ev); setModal("detalhe"); }} style={{
              background: "#fff", borderRadius: 20, marginBottom: 12,
              boxShadow: "0 2px 12px rgba(27,63,122,0.08)",
              overflow: "hidden", cursor: "pointer",
              border: `2px solid ${statusColors[ev.status]}22`,
            }}>
              {/* Card image area */}
              <div style={{
                height: 90,
                background: ev.tipo === "Municipal"
                  ? "linear-gradient(135deg, #1B3F7A, #4a7fc1)"
                  : "linear-gradient(135deg, #2a5ba8, #5B9BD5)",
                position: "relative", display: "flex", alignItems: "center", padding: "0 20px",
              }}>
                {ev.foto ? (
                  <img src={ev.foto} alt={nome} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ fontSize: 50, opacity: 0.15 }}>{ev.tipo === "Municipal" ? "🏙️" : "🗺️"}</div>
                )}
                <div style={{
                  position: "absolute", top: 10, left: 10,
                  background: "rgba(255,255,255,0.92)", borderRadius: 8,
                  padding: "3px 10px", fontSize: 10, fontWeight: 700,
                  color: "#1B3F7A", letterSpacing: 1,
                }}>{ev.tipo}</div>
                <div style={{
                  position: "absolute", top: 10, right: 10,
                  background: statusColors[ev.status] + "22",
                  border: `1px solid ${statusColors[ev.status]}44`,
                  borderRadius: 8, padding: "3px 10px",
                  fontSize: 10, fontWeight: 700, color: statusColors[ev.status],
                }}>{ev.status}</div>
                {/* Nome destaque */}
                <div style={{
                  position: "absolute", bottom: 10, left: 16,
                  color: "#fff", fontWeight: 900, fontSize: 20,
                  textShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  letterSpacing: -0.5,
                }}>{nome}</div>
              </div>
              {/* Card body */}
              <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "#888", fontSize: 12 }}>📅 {formatDate(ev.data)}</div>
                  {ev.local && <div style={{ color: "#aaa", fontSize: 11, marginTop: 2 }}>📍 {ev.local}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  {days !== null && days > 0 && (
                    <div style={{ color: days <= 7 ? "#dc2626" : days <= 15 ? "#E8730A" : "#1B3F7A", fontWeight: 700, fontSize: 13 }}>
                      em {days}d
                    </div>
                  )}
                  {days !== null && days === 0 && <div style={{ color: "#059669", fontWeight: 700 }}>Hoje!</div>}
                  {days !== null && days < 0 && <div style={{ color: "#888", fontSize: 12 }}>Realizado</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* BOTTOM NAV */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480,
        background: "#fff", borderTop: "1px solid #e8edf2",
        padding: "10px 20px 20px",
        display: "flex", justifyContent: "space-around", zIndex: 100,
      }}>
        {[
          { id: "eventos", icon: "📅", label: "Eventos" },
          { id: "municipios", icon: "🗺️", label: "Municípios" },
          { id: "alertas", icon: "🔔", label: "Alertas" },
          { id: "relatorios", icon: "📄", label: "Relatórios" },
        ].map(item => (
          <div key={item.id} onClick={() => setTab(item.id)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer",
          }}>
            <div style={{ fontSize: 22 }}>{item.icon}</div>
            <div style={{
              fontSize: 9, fontWeight: tab === item.id ? 700 : 500,
              color: tab === item.id ? "#1B3F7A" : "#aaa",
              textTransform: "uppercase", letterSpacing: 0.5,
            }}>{item.label}</div>
            {tab === item.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#1B3F7A" }} />}
          </div>
        ))}
      </div>

      {/* MODAL DETALHE */}
      {modal === "detalhe" && selected && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200,
          display: "flex", alignItems: "flex-end",
        }} onClick={() => setModal(null)}>
          <div style={{
            background: "#fff", borderRadius: "24px 24px 0 0",
            width: "100%", maxWidth: 480, margin: "0 auto",
            padding: "24px", maxHeight: "85vh", overflowY: "auto",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: "#e0e0e0", borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{
              background: selected.tipo === "Municipal" ? "linear-gradient(135deg, #1B3F7A, #4a7fc1)" : "linear-gradient(135deg, #2a5ba8, #5B9BD5)",
              borderRadius: 16, padding: "20px", marginBottom: 20, position: "relative",
            }}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginBottom: 4 }}>{selected.tipo}</div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 24 }}>
                {selected.tipo === "Municipal" ? selected.municipio : selected.regiao}
              </div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 6 }}>
                📅 {formatDate(selected.data)} {selected.hora && `às ${selected.hora}`}
              </div>
            </div>

            {/* Blocos */}
            <div style={{ fontWeight: 700, fontSize: 14, color: "#1B3F7A", marginBottom: 12 }}>Gestão do Evento</div>
            {[
              { icon: "📋", label: "Logística Antes", sub: "Viagem, inscrições, divulgação", color: "#1B3F7A" },
              { icon: "🚗", label: "Logística em Viagem", sub: "Hotel, horários, alimentação", color: "#2a5ba8" },
              { icon: "⚡", label: "Durante o Evento", sub: "Ocorrências e registros", color: "#E8730A" },
              { icon: "✅", label: "Pós Evento", sub: "Lições aprendidas", color: "#059669" },
            ].map((b, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 14,
                background: "#f8f9fb", borderRadius: 14, padding: "14px 16px", marginBottom: 10,
                cursor: "pointer", border: `1px solid ${b.color}22`,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: b.color + "18",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                }}>{b.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1B3F7A" }}>{b.label}</div>
                  <div style={{ color: "#aaa", fontSize: 11, marginTop: 2 }}>{b.sub}</div>
                </div>
                <div style={{ color: "#ccc", fontSize: 20 }}>›</div>
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => { setForm({ ...selected }); setModal("form"); }} style={{
                flex: 1, background: "#1B3F7A", border: "none", borderRadius: 14,
                padding: 14, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                fontFamily: "'Montserrat', sans-serif",
              }}>✏️ Editar</button>
              <button onClick={() => deleteEvento(selected.id)} style={{
                width: 50, background: "#fee2e2", border: "none", borderRadius: 14,
                padding: 14, color: "#dc2626", fontSize: 18, cursor: "pointer",
              }}>🗑</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM */}
      {modal === "form" && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200,
          display: "flex", alignItems: "flex-end",
        }} onClick={() => setModal(null)}>
          <div style={{
            background: "#fff", borderRadius: "24px 24px 0 0",
            width: "100%", maxWidth: 480, margin: "0 auto",
            padding: "24px", maxHeight: "90vh", overflowY: "auto",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: "#e0e0e0", borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontWeight: 900, fontSize: 18, color: "#1B3F7A", marginBottom: 20 }}>
              {selected ? "Editar Evento" : "Novo Evento"}
            </div>

            {[
              { label: "Tipo", key: "tipo", type: "select", options: ["Municipal", "Regional"] },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: "#888", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{f.label}</label>
                <select value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: "100%", background: "#f8f9fb", border: "1px solid #e8edf2", borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#1B3F7A", outline: "none" }}>
                  {f.options.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}

            {form.tipo === "Municipal" ? (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: "#888", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Município</label>
                <select value={form.municipio || ""} onChange={e => setForm(p => ({ ...p, municipio: e.target.value }))}
                  style={{ width: "100%", background: "#f8f9fb", border: "1px solid #e8edf2", borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#1B3F7A", outline: "none" }}>
                  {MUNICIPIOS_CE.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            ) : (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: "#888", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Região/Sede</label>
                <select value={form.regiao || ""} onChange={e => setForm(p => ({ ...p, regiao: e.target.value }))}
                  style={{ width: "100%", background: "#f8f9fb", border: "1px solid #e8edf2", borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#1B3F7A", outline: "none" }}>
                  {REGIOES_SEDES.map(r => <option key={r.nome}>{r.nome}</option>)}
                </select>
              </div>
            )}

            {[
              { label: "Data", key: "data", type: "date" },
              { label: "Horário", key: "hora", type: "time" },
              { label: "Local do Evento", key: "local", type: "text", placeholder: "Ex: Câmara Municipal" },
              { label: "Instrutor Presencial", key: "instrutorPresencial", type: "text", placeholder: "Nome do instrutor" },
              { label: "Instrutor Remoto (Meet)", key: "instrutorRemoto", type: "text", placeholder: "Nome do instrutor" },
              { label: "Link Google Meet", key: "linkMeet", type: "url", placeholder: "https://meet.google.com/..." },
              { label: "Motorista", key: "motorista", type: "text", placeholder: "Nome do motorista" },
              { label: "Nº de Inscritos", key: "inscritos", type: "number" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: "#888", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{f.label}</label>
                <input type={f.type} value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: "100%", background: "#f8f9fb", border: "1px solid #e8edf2", borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#1B3F7A", outline: "none" }} />
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", color: "#888", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Status</label>
              <select value={form.status || "Pendente"} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                style={{ width: "100%", background: "#f8f9fb", border: "1px solid #e8edf2", borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#1B3F7A", outline: "none" }}>
                <option>Pendente</option><option>Realizado</option><option>Cancelado</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", color: "#888", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Observações</label>
              <textarea value={form.observacoes || ""} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                style={{ width: "100%", background: "#f8f9fb", border: "1px solid #e8edf2", borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#1B3F7A", outline: "none", minHeight: 80, resize: "vertical" }} />
            </div>

            <button onClick={saveEvento} style={{
              width: "100%", background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)",
              border: "none", borderRadius: 14, padding: 16,
              color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer",
              fontFamily: "'Montserrat', sans-serif",
            }}>Salvar Evento</button>
          </div>
        </div>
      )}
    </div>
  );
}
