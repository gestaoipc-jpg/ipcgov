import { useState } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

const ACOES_PADRAO = [
  {
    acaoNome: "Nova Lei de Licitações e Contratos Administrativos",
    modalidade: "EaD",
    pagamentoInstrutoria: true,
    participantes: 0,
    inscritos: 0,
  },
  {
    acaoNome: "Prestação de Contas de gestão Municipal (IN 01/2025)",
    modalidade: "EaD",
    pagamentoInstrutoria: true,
    participantes: 0,
    inscritos: 0,
  },
  {
    acaoNome: "Controle Social",
    modalidade: "Presencial",
    pagamentoInstrutoria: true,
    participantes: 0,
    inscritos: 0,
  },
];

const EVENTOS_2026 = [
  { municipio: "RUSSAS",          data: "2026-04-07" },
  { municipio: "PALHANO",         data: "2026-04-07" },
  { municipio: "QUIXERÉ",         data: "2026-04-07" },
  { municipio: "ICAPUÍ",          data: "2026-04-08" },
  { municipio: "JAGUARUANA",      data: "2026-04-08" },
  { municipio: "ITAIÇABA",        data: "2026-04-08" },
  { municipio: "ARACATI",         data: "2026-04-09" },
  { municipio: "BEBERIBE",        data: "2026-04-09" },
  { municipio: "FORTIM",          data: "2026-04-09" },
  { municipio: "AMONTADA",        data: "2026-04-14" },
  { municipio: "MORRINHOS",       data: "2026-04-14" },
  { municipio: "MIRAÍMA",         data: "2026-04-14" },
  { municipio: "ITAPIPOCA",       data: "2026-04-15" },
  { municipio: "URUBURETAMA",     data: "2026-04-15" },
  { municipio: "TURURU",          data: "2026-04-15" },
  { municipio: "PARACURU",        data: "2026-04-16" },
  { municipio: "TRAIRÍ",          data: "2026-04-16" },
  { municipio: "PARAIPABA",       data: "2026-04-16" },
  { municipio: "BOA VIAGEM",      data: "2026-05-05" },
  { municipio: "MADALENA",        data: "2026-05-05" },
  { municipio: "ITATIRA",         data: "2026-05-05" },
  { municipio: "CANINDÉ",         data: "2026-05-06" },
  { municipio: "SANTA QUITÉRIA",  data: "2026-05-06" },
  { municipio: "CARIDADE",        data: "2026-05-06" },
  { municipio: "GENERAL SAMPAIO", data: "2026-05-07" },
  { municipio: "PARAMOTI",        data: "2026-05-07" },
  { municipio: "TEJUÇUOCA",       data: "2026-05-07" },
  { municipio: "CARIRÉ",          data: "2026-05-19" },
  { municipio: "GROAÍRAS",        data: "2026-05-19" },
  { municipio: "FORQUILHA",       data: "2026-05-19" },
  { municipio: "SOBRAL",          data: "2026-05-20" },
  { municipio: "ALCÂNTARAS",      data: "2026-05-20" },
  { municipio: "MERUOCA",         data: "2026-05-20" },
  { municipio: "IRAUÇUBA",        data: "2026-05-21" },
  { municipio: "ITAPAJÉ",         data: "2026-05-21" },
  { municipio: "UMIRIM",          data: "2026-05-21" },
];

export default function TCEduc2026SeedPage({ onBack }) {
  const [status, setStatus] = useState("");
  const [progresso, setProgresso] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modo, setModo] = useState("criar"); // "criar" | "apagar"

  const executar = async () => {
    if (!window.confirm(
      modo === "apagar"
        ? "Apagar todos os eventos de 2026 (Abril/Maio) cadastrados?"
        : "Criar os 36 eventos municipais de 2026 no Firebase?"
    )) return;

    setLoading(true);
    setProgresso(0);
    setDone(false);

    try {
      const snap = await getDocs(collection(db, "tceduc_eventos"));
      const existentes = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (modo === "apagar") {
        const alvo = existentes.filter(e =>
          e.data && (e.data.startsWith("2026-04") || e.data.startsWith("2026-05")) &&
          EVENTOS_2026.some(ev => ev.municipio === e.municipio && ev.data === e.data)
        );
        setStatus("Apagando " + alvo.length + " eventos...");
        await Promise.all(alvo.map(e => deleteDoc(doc(db, "tceduc_eventos", e.id))));
        setStatus("✅ " + alvo.length + " eventos apagados!");
        setDone(true);
        setLoading(false);
        return;
      }

      // Criar
      let criados = 0;
      let pulados = 0;

      await EVENTOS_2026.reduce(async (promise, ev, idx) => {
        await promise;

        // Check if already exists
        const jaExiste = existentes.some(e =>
          e.municipio === ev.municipio && e.data === ev.data
        );

        if (jaExiste) {
          pulados++;
          setStatus("⏭️ Já existe: " + ev.municipio);
        } else {
          const acoes = ACOES_PADRAO.map((a, i) => ({
            ...a,
            id: "acao_" + Date.now() + "_" + i,
            acaoId: "acao_" + Date.now() + "_" + i,
          }));

          await addDoc(collection(db, "tceduc_eventos"), {
            municipio: ev.municipio,
            data: ev.data,
            tipo: "Municipal",
            status: "Programado",
            acoesEducacionais: acoes,
            checklist: {},
            ocorrencias: [],
            licoesAprendidas: "",
            criadoEm: new Date().toISOString(),
            criadoPor: "sistema",
          });
          criados++;
          setStatus("✅ " + ev.municipio + " — " + ev.data.split("-").reverse().join("/"));
        }

        setProgresso(Math.round((idx + 1) / EVENTOS_2026.length * 100));
      }, Promise.resolve());

      setStatus("✅ Concluído! " + criados + " criados, " + pulados + " já existiam.");
      setDone(true);
    } catch(e) {
      setStatus("❌ Erro: " + e.message);
      console.error(e);
    }
    setLoading(false);
  };

  // Group by date for display
  const porData = {};
  EVENTOS_2026.forEach(ev => {
    const d = ev.data.split("-").reverse().join("/");
    if (!porData[d]) porData[d] = [];
    porData[d].push(ev.municipio);
  });

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"40px 20px" }}>
      <div style={{ background:"#fff", borderRadius:24, padding:36, maxWidth:700, width:"100%", boxShadow:"0 4px 32px rgba(27,63,122,0.12)" }}>

        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
          <div onClick={onBack} style={{ width:36,height:36,background:"#f0f4ff",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:18,color:"#1B3F7A" }}>←</div>
          <div>
            <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>🗓️ Seed — TCEduc 2026</div>
            <div style={{ color:"#888", fontSize:13, marginTop:2 }}>36 eventos municipais · Abril e Maio de 2026</div>
          </div>
        </div>

        {/* Ações educacionais que serão criadas */}
        <div style={{ background:"#f0f4ff", borderRadius:12, padding:"12px 16px", marginBottom:20 }}>
          <div style={{ fontWeight:700, fontSize:12, color:"#1B3F7A", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Ações educacionais por evento</div>
          {ACOES_PADRAO.map((a, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, fontSize:13 }}>
              <span style={{ background: a.modalidade==="EaD"?"#7c3aed":"#059669", color:"#fff", borderRadius:5, padding:"1px 8px", fontSize:10, fontWeight:700 }}>{a.modalidade}</span>
              <span style={{ color:"#333" }}>{a.acaoNome}</span>
              <span style={{ color:"#E8730A", fontSize:11, fontWeight:700 }}>💰</span>
            </div>
          ))}
          <div style={{ fontSize:11, color:"#888", marginTop:6 }}>Status: Programado · Tipo: Municipal</div>
        </div>

        {/* Lista por data */}
        <div style={{ maxHeight:280, overflowY:"auto", border:"1px solid #e8edf2", borderRadius:12, marginBottom:20 }}>
          {Object.entries(porData).map(([data, muns]) => (
            <div key={data} style={{ display:"flex", gap:10, padding:"10px 14px", borderBottom:"1px solid #f0f0f0", alignItems:"flex-start" }}>
              <div style={{ background:"#1B3F7A", color:"#fff", borderRadius:8, padding:"3px 10px", fontSize:12, fontWeight:700, flexShrink:0, minWidth:60, textAlign:"center" }}>{data}</div>
              <div style={{ fontSize:13, color:"#333", lineHeight:1.7 }}>{muns.join(" · ")}</div>
            </div>
          ))}
        </div>

        {/* Modo */}
        <div style={{ display:"flex", gap:10, marginBottom:20 }}>
          {["criar","apagar"].map(m => (
            <div key={m} onClick={() => setModo(m)}
              style={{ flex:1, border:"2px solid "+(modo===m?(m==="apagar"?"#dc2626":"#1B3F7A"):"#e8edf2"),
                borderRadius:12, padding:"10px 0", textAlign:"center", cursor:"pointer",
                background:modo===m?(m==="apagar"?"#fee2e2":"#eff6ff"):"#f8f9fb",
                fontWeight:700, fontSize:13, color:modo===m?(m==="apagar"?"#dc2626":"#1B3F7A"):"#888" }}>
              {m === "criar" ? "➕ Criar eventos" : "🗑️ Apagar eventos"}
            </div>
          ))}
        </div>

        {/* Progresso */}
        {loading && (
          <div style={{ marginBottom:16 }}>
            <div style={{ height:8, background:"#e8edf2", borderRadius:4, overflow:"hidden", marginBottom:8 }}>
              <div style={{ height:"100%", background:"linear-gradient(90deg,#1B3F7A,#2a5ba8)", borderRadius:4, width:progresso+"%", transition:"width 0.3s" }}/>
            </div>
            <div style={{ fontSize:12, color:"#888" }}>{progresso}%</div>
          </div>
        )}

        {/* Status */}
        {status && (
          <div style={{ background: done?(modo==="apagar"?"#fff0f0":"#f0fdf4"):"#f0f4ff", borderRadius:12, padding:"12px 16px", marginBottom:16, fontSize:13,
            color: done?(modo==="apagar"?"#dc2626":"#059669"):"#1B3F7A", fontWeight:600 }}>
            {status}
          </div>
        )}

        {/* Botão */}
        <div style={{ display:"flex", gap:10 }}>
          <div onClick={onBack} style={{ flex:1, background:"#f0f4ff", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:14, color:"#1B3F7A", cursor:"pointer" }}>
            ← Voltar
          </div>
          {!done && (
            <div onClick={loading ? undefined : executar}
              style={{ flex:2, background: loading?"#ccc":modo==="apagar"?"#dc2626":"linear-gradient(135deg,#1B3F7A,#2a5ba8)",
                borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:14, color:"#fff",
                cursor:loading?"not-allowed":"pointer" }}>
              {loading ? "Aguarde..." : modo==="apagar" ? "🗑️ Apagar 36 eventos" : "🚀 Criar 36 eventos"}
            </div>
          )}
          {done && (
            <div onClick={onBack} style={{ flex:2, background: modo==="apagar"?"#dc2626":"#059669", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:14, color:"#fff", cursor:"pointer" }}>
              ✅ Concluído — Voltar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
