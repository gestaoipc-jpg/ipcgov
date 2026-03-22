import { useState } from "react";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

const VIAGENS_2026 = [
  {
    titulo: "TCEduc Municipal - Viagem 3",
    modalidade: "Municipal",
    dataInicio: "2026-04-06",
    dataFim: "2026-04-10",
    municipios: ["RUSSAS","PALHANO","QUIXERÉ","ICAPUÍ","JAGUARUANA","ITAIÇABA","ARACATI","BEBERIBE","FORTIM"],
  },
  {
    titulo: "TCEduc Municipal - Viagem 4",
    modalidade: "Municipal",
    dataInicio: "2026-04-13",
    dataFim: "2026-04-17",
    municipios: ["AMONTADA","MORRINHOS","MIRAÍMA","ITAPIPOCA","URUBURETAMA","TURURU","PARACURU","TRAIRÍ","PARAIPABA"],
  },
  {
    titulo: "TCEduc Municipal - Viagem 5",
    modalidade: "Municipal",
    dataInicio: "2026-05-04",
    dataFim: "2026-05-08",
    municipios: ["BOA VIAGEM","MADALENA","ITATIRA","CANINDÉ","SANTA QUITÉRIA","CARIDADE","GENERAL SAMPAIO","PARAMOTI","TEJUÇUOCA"],
  },
  {
    titulo: "TCEduc Municipal - Viagem 6",
    modalidade: "Municipal",
    dataInicio: "2026-05-18",
    dataFim: "2026-05-22",
    municipios: ["CARIRÉ","GROAÍRAS","FORQUILHA","SOBRAL","ALCÂNTARAS","MERUOCA","IRAUÇUBA","ITAPAJÉ","UMIRIM"],
  },
];

export default function TCEduc2026SeedPage({ onBack }) {
  const [status, setStatus] = useState("");
  const [progresso, setProgresso] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);

  const executar = async () => {
    if (!window.confirm("Criar as 4 viagens municipais de 2026 no Firebase?")) return;
    setLoading(true);
    setProgresso(0);
    setDone(false);
    setLog([]);

    try {
      const [vSnap, evSnap] = await Promise.all([
        getDocs(collection(db, "tceduc_viagens")),
        getDocs(collection(db, "tceduc_eventos")),
      ]);
      const viagensExist = vSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const todosEvs = evSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      let criados = 0, pulados = 0;

      await VIAGENS_2026.reduce(async (promise, v, idx) => {
        await promise;
        const jaExiste = viagensExist.some(ve => ve.titulo === v.titulo);
        if (jaExiste) {
          pulados++;
          setLog(l => [...l, { tipo:"aviso", msg:"Já existe: " + v.titulo }]);
        } else {
          const municipiosIds = v.municipios.map(mun => {
            const ev = todosEvs.find(e => e.municipio === mun && e.data && e.data.startsWith("2026"));
            return ev ? ev.id : null;
          }).filter(Boolean);

          await addDoc(collection(db, "tceduc_viagens"), {
            titulo: v.titulo,
            modalidade: v.modalidade,
            dataInicio: v.dataInicio,
            dataFim: v.dataFim,
            municipiosIds,
            equipe: [],
            status: "Programado",
            criadoEm: new Date().toISOString(),
            criadoPor: "sistema",
          });
          criados++;
          setLog(l => [...l, { tipo:"ok", msg: v.titulo + " — " + municipiosIds.length + "/" + v.municipios.length + " municípios vinculados" }]);
        }
        setProgresso(Math.round((idx + 1) / VIAGENS_2026.length * 100));
      }, Promise.resolve());

      setStatus("✅ Concluído! " + criados + " criada(s)" + (pulados > 0 ? ", " + pulados + " já existia(m)" : "") + ".");
      setDone(true);
    } catch(e) {
      setStatus("❌ Erro: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"40px 20px" }}>
      <div style={{ background:"#fff", borderRadius:24, padding:36, maxWidth:680, width:"100%", boxShadow:"0 4px 32px rgba(27,63,122,0.12)" }}>

        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
          <div onClick={onBack} style={{ width:36,height:36,background:"#f0f4ff",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:18,color:"#1B3F7A" }}>←</div>
          <div>
            <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>🗺️ Criar Viagens — TCEduc 2026</div>
            <div style={{ color:"#888", fontSize:13, marginTop:2 }}>4 viagens municipais · Abril e Maio de 2026</div>
          </div>
        </div>

        <div style={{ border:"1px solid #e8edf2", borderRadius:14, overflow:"hidden", marginBottom:24 }}>
          {VIAGENS_2026.map((v, i) => (
            <div key={i} style={{ padding:"14px 18px", borderBottom: i < VIAGENS_2026.length-1 ? "1px solid #f0f0f0" : "none", background: i%2===0?"#fff":"#f8f9fb" }}>
              <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:8 }}>
                <span style={{ background:"#1B3F7A", color:"#fff", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700 }}>
                  {v.dataInicio.split("-").reverse().slice(0,2).join("/")} → {v.dataFim.split("-").reverse().slice(0,2).join("/")}
                </span>
                <span style={{ fontWeight:800, fontSize:14, color:"#1B3F7A" }}>{v.titulo}</span>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {v.municipios.map(m => (
                  <span key={m} style={{ background:"#eff6ff", borderRadius:6, padding:"2px 9px", fontSize:11, fontWeight:600, color:"#1B3F7A" }}>{m}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {loading && (
          <div style={{ marginBottom:16 }}>
            <div style={{ height:8, background:"#e8edf2", borderRadius:4, overflow:"hidden", marginBottom:6 }}>
              <div style={{ height:"100%", background:"linear-gradient(90deg,#1B3F7A,#2a5ba8)", borderRadius:4, width:progresso+"%", transition:"width 0.3s" }}/>
            </div>
            <div style={{ fontSize:11, color:"#888" }}>{progresso}%</div>
          </div>
        )}

        {log.length > 0 && (
          <div style={{ background:"#f8f9fb", borderRadius:12, padding:"12px 16px", marginBottom:16, maxHeight:150, overflowY:"auto" }}>
            {log.map((l, i) => (
              <div key={i} style={{ fontSize:12, color: l.tipo==="ok"?"#059669":"#E8730A", fontWeight:600, marginBottom:3 }}>
                {l.tipo==="ok" ? "✅" : "⏭️"} {l.msg}
              </div>
            ))}
          </div>
        )}

        {status && (
          <div style={{ background: done?"#f0fdf4":"#f0f4ff", borderRadius:12, padding:"12px 16px", marginBottom:20, fontSize:13, color: done?"#059669":"#1B3F7A", fontWeight:700 }}>
            {status}
          </div>
        )}

        <div style={{ display:"flex", gap:10 }}>
          <div onClick={onBack} style={{ flex:1, background:"#f0f4ff", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:14, color:"#1B3F7A", cursor:"pointer" }}>
            ← Voltar
          </div>
          {!done ? (
            <div onClick={loading ? undefined : executar}
              style={{ flex:2, background:loading?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:14, color:"#fff", cursor:loading?"not-allowed":"pointer" }}>
              {loading ? "Criando..." : "🚀 Criar 4 Viagens"}
            </div>
          ) : (
            <div onClick={onBack} style={{ flex:2, background:"#059669", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:14, color:"#fff", cursor:"pointer" }}>
              ✅ Concluído — Voltar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
