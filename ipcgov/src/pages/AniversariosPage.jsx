import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function corAvatar(nome) { const cores=["#1B3F7A","#7c3aed","#059669","#E8730A","#0891b2","#dc2626"]; let h=0; for(let c of (nome||""))h+=c.charCodeAt(0); return cores[h%cores.length]; }
function initials(nome) { if(!nome)return"?"; return nome.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase(); }

export default function AniversariosPage({ onBack }) {
  const [servidores, setServidores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth());
  const [view, setView] = useState("calendario"); // calendario | relatorio

  useEffect(() => { loadServidores(); }, []);

  const loadServidores = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "ipc_servidores"));
      setServidores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const comAniversario = servidores.filter(s => s.dataAniversario);

  const anivPorMes = (mes) => comAniversario
    .filter(s => { const [,m] = s.dataAniversario.split("-"); return parseInt(m)-1 === mes; })
    .sort((a,b) => { const [,,dA]=a.dataAniversario.split("-"); const [,,dB]=b.dataAniversario.split("-"); return parseInt(dA)-parseInt(dB); });

  const hoje = new Date();

  const diasAte = (dataAniversario) => {
    const [,mes,dia] = dataAniversario.split("-");
    const proxAniv = new Date(`${hoje.getFullYear()}-${mes}-${dia}`);
    if (proxAniv < hoje) proxAniv.setFullYear(hoje.getFullYear()+1);
    return Math.ceil((proxAniv - hoje) / 86400000);
  };

  const anivHoje = comAniversario.filter(s => {
    const [,m,d] = s.dataAniversario.split("-");
    return parseInt(m)-1 === hoje.getMonth() && parseInt(d) === hoje.getDate();
  });

  const proximos = comAniversario
    .filter(s => { const d = diasAte(s.dataAniversario); return d > 0 && d <= 30; })
    .sort((a,b) => diasAte(a.dataAniversario) - diasAte(b.dataAniversario));

  const printRelatorio = () => window.print();

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:#1B3F7A44;border-radius:3px}
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      {/* HEADER */}
      <div className="no-print" style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 32px 32px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>IPC PESSOAS</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>🎂 Aniversários</div>
            </div>
            <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
              <div onClick={()=>setView("calendario")} style={{ background:view==="calendario"?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)", border:`1px solid ${view==="calendario"?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.15)"}`, borderRadius:12, padding:"8px 16px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>📅 Calendário</div>
              <div onClick={()=>setView("relatorio")} style={{ background:view==="relatorio"?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)", border:`1px solid ${view==="relatorio"?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.15)"}`, borderRadius:12, padding:"8px 16px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>📄 Relatório</div>
              <div onClick={printRelatorio} style={{ background:"#E8730A", borderRadius:12, padding:"8px 16px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>🖨️ Imprimir</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {[
              { label:"Com aniversário cadastrado", value:comAniversario.length },
              { label:"Aniversários hoje", value:anivHoje.length },
              { label:"Próximos 30 dias", value:proximos.length },
              { label:"Neste mês", value:anivPorMes(hoje.getMonth()).length },
            ].map((s,i)=>(
              <div key={i} style={{ background:i===1&&s.value>0?"rgba(232,115,10,0.4)":"rgba(255,255,255,0.12)", borderRadius:14, padding:"10px 18px" }}>
                <div style={{ color:"#fff", fontWeight:900, fontSize:20 }}>{s.value}</div>
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 32px 80px" }}>

        {/* ANIVERSARIANTES HOJE */}
        {anivHoje.length > 0 && (
          <div style={{ background:"linear-gradient(135deg,#E8730A,#f0920a)", borderRadius:20, padding:"20px 24px", marginBottom:24, boxShadow:"0 4px 20px rgba(232,115,10,0.3)" }}>
            <div style={{ color:"#fff", fontWeight:900, fontSize:18, marginBottom:12 }}>🎉 Aniversariantes Hoje!</div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              {anivHoje.map(s=>(
                <div key={s.id} style={{ background:"rgba(255,255,255,0.2)", borderRadius:14, padding:"10px 16px", display:"flex", alignItems:"center", gap:10 }}>
                  {s.foto ? <img src={s.foto} alt={s.nome} style={{ width:40, height:40, borderRadius:"50%", objectFit:"cover" }}/> : <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,255,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:14 }}>{initials(s.nome)}</div>}
                  <div>
                    <div style={{ color:"#fff", fontWeight:700, fontSize:14 }}>{s.nome}</div>
                    <div style={{ color:"rgba(255,255,255,0.7)", fontSize:11 }}>{s.cargo} · {s.setor}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRÓXIMOS 30 DIAS */}
        {proximos.length > 0 && view==="calendario" && (
          <div style={{ background:"#fff", borderRadius:20, padding:"20px 24px", marginBottom:24, boxShadow:"0 2px 12px rgba(27,63,122,0.08)" }}>
            <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:14 }}>⏰ Próximos 30 dias</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {proximos.map(s=>{
                const dias = diasAte(s.dataAniversario);
                const [,mes,dia] = s.dataAniversario.split("-");
                return (
                  <div key={s.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:dias<=5?"#fff3e0":"#f8f9fb", borderRadius:12, border:`1px solid ${dias<=5?"#fed7aa":"#e8edf2"}` }}>
                    {s.foto ? <img src={s.foto} alt={s.nome} style={{ width:38, height:38, borderRadius:"50%", objectFit:"cover", flexShrink:0 }}/> : <div style={{ width:38, height:38, borderRadius:"50%", background:corAvatar(s.nome), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:13, flexShrink:0 }}>{initials(s.nome)}</div>}
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A" }}>{s.nome}</div>
                      <div style={{ fontSize:11, color:"#888" }}>{s.cargo} · {s.setor}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:700, fontSize:13, color:dias<=5?"#E8730A":"#1B3F7A" }}>{dia}/{mes}</div>
                      <div style={{ fontSize:11, color:dias<=5?"#E8730A":"#aaa", fontWeight:dias<=5?700:400 }}>{dias===1?"amanhã":`em ${dias} dias`}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CALENDÁRIO ANUAL */}
        {view==="calendario" && (
          <>
            {/* Seletor de mês */}
            <div className="no-print" style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:20 }}>
              {MESES.map((m,i)=>{
                const qtd = anivPorMes(i).length;
                const ehAtual = i===hoje.getMonth();
                return (
                  <div key={i} onClick={()=>setMesSelecionado(i)} style={{ flex:"0 0 auto", background:mesSelecionado===i?"#1B3F7A":ehAtual?"#f0f4ff":"#fff", borderRadius:12, padding:"8px 14px", cursor:"pointer", border:`1px solid ${mesSelecionado===i?"#1B3F7A":ehAtual?"#c7d7f0":"#e8edf2"}`, textAlign:"center", minWidth:70 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:mesSelecionado===i?"#fff":ehAtual?"#1B3F7A":"#333" }}>{m.slice(0,3)}</div>
                    {qtd>0 && <div style={{ fontSize:10, color:mesSelecionado===i?"rgba(255,255,255,0.7)":"#E8730A", fontWeight:700 }}>{qtd} 🎂</div>}
                  </div>
                );
              })}
            </div>

            {/* Aniversários do mês selecionado */}
            <div style={{ background:"#fff", borderRadius:20, padding:"24px", boxShadow:"0 2px 12px rgba(27,63,122,0.08)" }}>
              <div style={{ fontWeight:800, fontSize:18, color:"#1B3F7A", marginBottom:4 }}>🎂 {MESES[mesSelecionado]}</div>
              <div style={{ fontSize:12, color:"#aaa", marginBottom:20 }}>{anivPorMes(mesSelecionado).length} aniversariante{anivPorMes(mesSelecionado).length!==1?"s":""}</div>

              {anivPorMes(mesSelecionado).length===0 ? (
                <div style={{ textAlign:"center", padding:"40px 0", color:"#aaa" }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>📅</div>
                  Nenhum aniversário em {MESES[mesSelecionado]}
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 }}>
                  {anivPorMes(mesSelecionado).map(s=>{
                    const [,mes,dia] = s.dataAniversario.split("-");
                    const diasRestantes = diasAte(s.dataAniversario);
                    const ehHoje = diasRestantes===0;
                    return (
                      <div key={s.id} style={{ background:ehHoje?"linear-gradient(135deg,#fff3e0,#fff8f0)":"#f8f9fb", borderRadius:16, padding:"16px", border:`1px solid ${ehHoje?"#fed7aa":"#e8edf2"}`, position:"relative" }}>
                        {ehHoje && <div style={{ position:"absolute", top:10, right:10, fontSize:20 }}>🎉</div>}
                        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                          {s.foto ? <img src={s.foto} alt={s.nome} style={{ width:48, height:48, borderRadius:"50%", objectFit:"cover", flexShrink:0 }}/> : <div style={{ width:48, height:48, borderRadius:"50%", background:corAvatar(s.nome), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:18, flexShrink:0 }}>{initials(s.nome)}</div>}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.nome}</div>
                            <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{s.cargo}</div>
                          </div>
                        </div>
                        <div style={{ marginTop:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <div style={{ background:ehHoje?"#E8730A":"#1B3F7A", color:"#fff", borderRadius:8, padding:"4px 10px", fontSize:12, fontWeight:700 }}>🎂 {dia}/{mes}</div>
                          {s.setor && <div style={{ fontSize:11, color:"#aaa" }}>{s.setor}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* RELATÓRIO COMPLETO */}
        {view==="relatorio" && (
          <div style={{ background:"#fff", borderRadius:20, padding:"32px", boxShadow:"0 2px 12px rgba(27,63,122,0.08)" }}>
            {/* Cabeçalho do relatório */}
            <div style={{ textAlign:"center", marginBottom:32, paddingBottom:20, borderBottom:"2px solid #e8edf2" }}>
              <div style={{ fontWeight:900, fontSize:28, color:"#1B3F7A", letterSpacing:-1 }}>IPC<span style={{ color:"#E8730A" }}>gov</span></div>
              <div style={{ fontWeight:700, fontSize:18, color:"#333", marginTop:8 }}>Relatório de Aniversários — {new Date().getFullYear()}</div>
              <div style={{ color:"#aaa", fontSize:12, marginTop:4 }}>Gerado em {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR")}</div>
            </div>

            {MESES.map((mes, i) => {
              const anivs = anivPorMes(i);
              if (anivs.length===0) return null;
              return (
                <div key={i} style={{ marginBottom:28 }}>
                  <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:12, padding:"8px 14px", background:"#f0f4ff", borderRadius:10, display:"flex", justifyContent:"space-between" }}>
                    <span>🎂 {mes}</span>
                    <span style={{ fontSize:13, color:"#888", fontWeight:600 }}>{anivs.length} aniversariante{anivs.length!==1?"s":""}</span>
                  </div>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ background:"#f8f9fb" }}>
                        {["Nome","Cargo","Setor","Data"].map(h=>(
                          <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontSize:11, color:"#888", fontWeight:700, textTransform:"uppercase", letterSpacing:1 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {anivs.map((s,j)=>{
                        const [,m,d] = s.dataAniversario.split("-");
                        return (
                          <tr key={s.id} style={{ borderBottom:"1px solid #f0f0f0", background:j%2===0?"#fff":"#fafafa" }}>
                            <td style={{ padding:"10px 12px", fontWeight:600, fontSize:13, color:"#1B3F7A" }}>{s.nome}</td>
                            <td style={{ padding:"10px 12px", fontSize:13, color:"#555" }}>{s.cargo}</td>
                            <td style={{ padding:"10px 12px", fontSize:13, color:"#555" }}>{s.setor||"—"}</td>
                            <td style={{ padding:"10px 12px", fontSize:13, color:"#333", fontWeight:700 }}>🎂 {d}/{m}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}

            {comAniversario.length===0 && (
              <div style={{ textAlign:"center", padding:"40px 0", color:"#aaa" }}>Nenhum aniversário cadastrado</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
