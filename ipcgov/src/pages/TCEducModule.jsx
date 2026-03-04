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

export default function TCEducModule({ user, onBack }) {
  const [tab, setTab] = useState("eventos");
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filtro, setFiltro] = useState("Todos");
  const [form, setForm] = useState({});

  useEffect(() => { loadEventos(); }, []);

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

  const filtered = eventos
    .filter(e => filtro === "Todos" || e.tipo === filtro)
    .sort((a, b) => new Date(a.data) - new Date(b.data));

  const municipaisRealizados = eventos.filter(e => e.tipo === "Municipal" && e.status === "Realizado").length;
  const regionaisRealizados = eventos.filter(e => e.tipo === "Regional" && e.status === "Realizado").length;

  return (
    <div style={{ minHeight: "100vh", background: "#E8EDF2", fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 0; }
        select, input, textarea { font-family: 'Montserrat', sans-serif; }
      `}</style>

      {/* HEADER */}
      <div style={{
        background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)",
        padding: "24px 32px 50px", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: 40, bottom: -60, fontSize: 220, opacity: 0.04 }}>🗺</div>
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div onClick={onBack} style={{
              width: 40, height: 40, background: "rgba(255,255,255,0.15)",
              borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#fff", fontSize: 20, fontWeight: 700,
            }}>←</div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 3, textTransform: "uppercase" }}>Módulo</div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 24, letterSpacing: -0.5 }}>TCEduc</div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <div onClick={() => { setSelected(null); setForm({ tipo: "Municipal", municipio: MUNICIPIOS_CE[0], status: "Pendente" }); setModal("form"); }} style={{
                background: "#E8730A", borderRadius: 14, padding: "10px 20px",
                color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 14px rgba(232,115,10,0.4)",
              }}>+ Novo Evento</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { label: "Municipais 2026", value: `${municipaisRealizados}/54` },
              { label: "Regionais 2026", value: `${regionaisRealizados}/7` },
              { label: "Total Eventos", value: eventos.length },
            ].map((s, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.12)", borderRadius: 14,
                padding: "12px 20px", minWidth: 120,
              }}>
                <div style={{ color: "#fff", fontWeight: 900, fontSize: 22 }}>{s.value}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px 100px" }}>

        {/* FILTROS */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          {["Todos", "Municipal", "Regional"].map(f => (
            <div key={f} onClick={() => setFiltro(f)} style={{
              background: filtro === f ? "#1B3F7A" : "#fff",
              color: filtro === f ? "#fff" : "#555",
              borderRadius: 20, padding: "8px 20px",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 2px 8px rgba(27,63,122,0.08)",
              transition: "all .15s",
            }}>{f}</div>
          ))}
        </div>

        {/* EVENTOS GRID */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#aaa", fontSize: 16 }}>Carregando eventos...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>Nenhum evento encontrado.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {filtered.map(ev => {
              const nome = ev.tipo === "Municipal" ? ev.municipio : ev.regiao;
              const days = ev.data ? daysUntil(ev.data) : null;
              return (
                <div key={ev.id} onClick={() => { setSelected(ev); setModal("detalhe"); }} style={{
                  background: "#fff", borderRadius: 20, overflow: "hidden",
                  boxShadow: "0 2px 12px rgba(27,63,122,0.08)",
                  cursor: "pointer", transition: "transform .15s, box-shadow .15s",
                  border: `2px solid ${statusColors[ev.status]}22`,
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 28px rgba(27,63,122,0.15)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(27,63,122,0.08)"; }}
                >
                  {/* Card header */}
                  <div style={{
                    height: 100, position: "relative",
                    background: ev.tipo === "Municipal"
                      ? "linear-gradient(135deg, #1B3F7A, #4a7fc1)"
                      : "linear-gradient(135deg, #2a5ba8, #5B9BD5)",
                    display: "flex", alignItems: "flex-end", padding: "0 16px 12px",
                  }}>
                    <div style={{
                      position: "absolute", top: 10, left: 12,
                      background: "rgba(255,255,255,0.9)", borderRadius: 8,
                      padding: "3px 10px", fontSize: 10, fontWeight: 700, color: "#1B3F7A",
                    }}>{ev.tipo}</div>
                    <div style={{
                      position: "absolute", top: 10, right: 12,
                      background: statusColors[ev.status] + "30",
                      border: `1px solid ${statusColors[ev.status]}60`,
                      borderRadius: 8, padding: "3px 10px",
                      fontSize: 10, fontWeight: 700, color: statusColors[ev.status],
                    }}>{ev.status}</div>
                    <div style={{ color: "#fff", fontWeight: 900, fontSize: 22, letterSpacing: -0.5, textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                      {nome}
                    </div>
                  </div>
                  {/* Card body */}
                  <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ color: "#888", fontSize: 13 }}>📅 {formatDate(ev.data)}</div>
                      {ev.local && <div style={{ color: "#aaa", fontSize: 11, marginTop: 4 }}>📍 {ev.local}</div>}
                      {ev.instrutorPresencial && <div style={{ color: "#aaa", fontSize: 11, marginTop: 4 }}>👨‍🏫 {ev.instrutorPresencial}</div>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {days !== null && days > 0 && (
                        <div style={{
                          color: days <= 7 ? "#dc2626" : days <= 15 ? "#E8730A" : "#1B3F7A",
                          fontWeight: 700, fontSize: 14,
                        }}>em {days}d</div>
                      )}
                      {days === 0 && <div style={{ color: "#059669", fontWeight: 700 }}>Hoje!</div>}
                      {days !== null && days < 0 && <div style={{ color: "#aaa", fontSize: 12 }}>Encerrado</div>}
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
        padding: "10px 0 20px",
        display: "flex", justifyContent: "center", gap: 60,
        zIndex: 100, boxShadow: "0 -4px 20px rgba(27,63,122,0.08)",
      }}>
        {[
          { id: "eventos", icon: "📅", label: "Eventos" },
          { id: "municipios", icon: "🗺️", label: "Municípios" },
          { id: "alertas", icon: "🔔", label: "Alertas" },
          { id: "relatorios", icon: "📄", label: "Relatórios" },
        ].map(item => (
          <div key={item.id} onClick={() => setTab(item.id)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer",
          }}>
            <div style={{ fontSize: 22 }}>{item.icon}</div>
            <div style={{
              fontSize: 10, fontWeight: tab === item.id ? 700 : 500,
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
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }} onClick={() => setModal(null)}>
          <div style={{
            background: "#fff", borderRadius: 24,
            width: "100%", maxWidth: 640, padding: 32,
            maxHeight: "85vh", overflowY: "auto",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ color: "#aaa", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>{selected.tipo}</div>
                <div style={{ color: "#1B3F7A", fontWeight: 900, fontSize: 26 }}>
                  {selected.tipo === "Municipal" ? selected.municipio : selected.regiao}
                </div>
                <div style={{ color: "#888", fontSize: 14, marginTop: 6 }}>
                  📅 {formatDate(selected.data)} {selected.hora && `às ${selected.hora}`}
                </div>
              </div>
              <div style={{
                background: statusColors[selected.status] + "20",
                border: `2px solid ${statusColors[selected.status]}40`,
                borderRadius: 12, padding: "6px 16px",
                color: statusColors[selected.status], fontWeight: 700, fontSize: 13,
              }}>{selected.status}</div>
            </div>

            {/* Info grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Local", value: selected.local },
                { label: "Instrutor Presencial", value: selected.instrutorPresencial },
                { label: "Instrutor Remoto", value: selected.instrutorRemoto },
                { label: "Motorista", value: selected.motorista },
                { label: "Inscritos", value: selected.inscritos },
                { label: "Link Meet", value: selected.linkMeet },
              ].filter(f => f.value).map((f, i) => (
                <div key={i} style={{ background: "#f8f9fb", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ color: "#aaa", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{f.label}</div>
                  <div style={{ color: "#1B3F7A", fontWeight: 600, fontSize: 13 }}>{f.value}</div>
                </div>
              ))}
            </div>

            {/* Blocos */}
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1B3F7A", marginBottom: 12 }}>Gestão do Evento</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {[
                { icon: "📋", label: "Logística Antes", sub: "Viagem, inscrições, divulgação", color: "#1B3F7A" },
                { icon: "🚗", label: "Logística em Viagem", sub: "Hotel, horários, alimentação", color: "#2a5ba8" },
                { icon: "⚡", label: "Durante o Evento", sub: "Ocorrências e registros", color: "#E8730A" },
                { icon: "✅", label: "Pós Evento", sub: "Lições aprendidas", color: "#059669" },
              ].map((b, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "#f8f9fb", borderRadius: 14, padding: "14px",
                  cursor: "pointer", border: `1px solid ${b.color}22`,
                  transition: "background .15s",
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: b.color + "18",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                  }}>{b.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#1B3F7A" }}>{b.label}</div>
                    <div style={{ color: "#aaa", fontSize: 11, marginTop: 2 }}>{b.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setForm({ ...selected }); setModal("form"); }} style={{
                flex: 1, background: "#1B3F7A", border: "none", borderRadius: 14,
                padding: 14, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                fontFamily: "'Montserrat', sans-serif",
              }}>✏️ Editar Evento</button>
              <button onClick={() => deleteEvento(selected.id)} style={{
                width: 52, background: "#fee2e2", border: "none", borderRadius: 14,
                color: "#dc2626", fontSize: 20, cursor: "pointer",
              }}>🗑</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM */}
      {modal === "form" && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }} onClick={() => setModal(null)}>
          <div style={{
            background: "#fff", borderRadius: 24,
            width: "100%", maxWidth: 640, padding: 32,
            maxHeight: "90vh", overflowY: "auto",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontWeight: 900, fontSize: 22, color: "#1B3F7A" }}>
                {selected ? "✏️ Editar Evento" : "➕ Novo Evento"}
              </div>
              <div onClick={() => setModal(null)} style={{
                width: 36, height: 36, background: "#f0f4ff", borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 18, color: "#1B3F7A",
              }}>✕</div>
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

              <div>
                <label style={labelStyle}>Data</label>
                <input type="date" value={form.data || ""} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Horário</label>
                <input type="time" value={form.hora || ""} onChange={e => setForm(p => ({ ...p, hora: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Local do Evento</label>
                <input type="text" value={form.local || ""} onChange={e => setForm(p => ({ ...p, local: e.target.value }))} placeholder="Ex: Câmara Municipal" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Instrutor Presencial</label>
                <input type="text" value={form.instrutorPresencial || ""} onChange={e => setForm(p => ({ ...p, instrutorPresencial: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Instrutor Remoto</label>
                <input type="text" value={form.instrutorRemoto || ""} onChange={e => setForm(p => ({ ...p, instrutorRemoto: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Link Google Meet</label>
                <input type="url" value={form.linkMeet || ""} onChange={e => setForm(p => ({ ...p, linkMeet: e.target.value }))} placeholder="https://meet.google.com/..." style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Motorista</label>
                <input type="text" value={form.motorista || ""} onChange={e => setForm(p => ({ ...p, motorista: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nº de Inscritos</label>
                <input type="number" value={form.inscritos || ""} onChange={e => setForm(p => ({ ...p, inscritos: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Status</label>
                <select value={form.status || "Pendente"} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
                  <option>Pendente</option><option>Realizado</option><option>Cancelado</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Observações</label>
                <textarea value={form.observacoes || ""} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                  style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
              </div>
            </div>

            <button onClick={saveEvento} style={{
              width: "100%", marginTop: 20,
              background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)",
              border: "none", borderRadius: 14, padding: 16,
              color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer",
              fontFamily: "'Montserrat', sans-serif",
            }}>💾 Salvar Evento</button>
          </div>
        </div>
      )}
    </div>
  );
}
