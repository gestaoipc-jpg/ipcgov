import { useState, useEffect, useRef } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

// Helper — chave interna para autenticar APIs
async function getAuthHeader() {
  return { "X-Internal-Key": process.env.REACT_APP_INTERNAL_API_KEY || "" };
}


const ADMINS = ["gestaoipc@tce.ce.gov.br","fabricio@tce.ce.gov.br"];

function fmtData(d) {
  if (!d) return "—";
  const [y,m,dia] = d.split("-");
  return `${dia}/${m}/${y}`;
}

function corAvatar(nome) {
  const cores = ["#1B3F7A","#7c3aed","#059669","#E8730A","#0891b2","#dc2626"];
  let h = 0;
  for (let c of (nome||"")) h += c.charCodeAt(0);
  return cores[h % cores.length];
}
function initials(nome) {
  if (!nome) return "?";
  return nome.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase();
}

// Drag and drop hook
// Exclui arquivo do Google Drive via API
function normDriveUrl(url) {
  if (!url) return url;
  if (url.includes("lh3.googleusercontent.com")) return url;
  const drive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (drive) return `https://lh3.googleusercontent.com/d/${drive[1]}`;
  const driveUc = url.match(/[?&]id=([^&]+)/);
  if (url.includes("drive.google.com") && driveUc) return `https://lh3.googleusercontent.com/d/${driveUc[1]}`;
  return url;
}

async function deletarDoDrive(driveFileId) {
  if (!driveFileId) return;
  try {
    const authHdr = await getAuthHeader();
    await fetch("/api/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...authHdr },
      body: JSON.stringify({ fileId: driveFileId }),
    });
  } catch(e) {
    console.warn("Não foi possível excluir do Drive:", e);
  }
}

function useDragList(items, setItems) {
  const dragIdx = useRef(null);
  const onDragStart = (i) => { dragIdx.current = i; };
  const onDragOver = (e, i) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const next = [...items];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(i, 0, moved);
    dragIdx.current = i;
    setItems(next);
  };
  const onDragEnd = () => { dragIdx.current = null; };
  return { onDragStart, onDragOver, onDragEnd };
}

export default function IPCMidiaModule({ user, userInfo, onBack }) {
  const [aba, setAba] = useState("telas");
  const [conteudos, setConteudos] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [telas, setTelas] = useState([]);
  const [servidores, setServidores] = useState([]);
  const [eventosTC, setEventosTC] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const isAdmin = ADMINS.includes(user?.email);
  const grupoMidiaAdm = grupos.find(g => (g.nome||"").toLowerCase().includes("mídia") && (g.nome||"").toLowerCase().includes("admin"));
  const grupoMidia = grupos.find(g => (g.nome||"").toLowerCase().includes("mídia") && !(g.nome||"").toLowerCase().includes("admin"));
  const isMidiaAdm = isAdmin || !!(grupoMidiaAdm && (userInfo?.grupos||[]).includes(grupoMidiaAdm.id));
  const isMidia = isMidiaAdm || !!(grupoMidia && (userInfo?.grupos||[]).includes(grupoMidia.id));

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cSnap, pSnap, tSnap, sSnap, eSnap, gSnap, oSnap] = await Promise.all([
        getDocs(collection(db, "midia_conteudos")),
        getDocs(collection(db, "midia_playlists")),
        getDocs(collection(db, "midia_telas")),
        getDocs(collection(db, "ipc_servidores")),
        getDocs(collection(db, "tceduc_eventos")),
        getDocs(collection(db, "ipc_grupos_trabalho")),
        getDocs(collection(db, "olimpiadas_escolas")),
      ]);
      setConteudos(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPlaylists(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTelas(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setServidores(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setEventosTC(eSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setGrupos(gSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setEscolas(oSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      // Carrega config de informes
      try {
        const cfgSnap = await getDoc(doc(db, "midia_config", "informes"));
        if (cfgSnap.exists()) {
          const cfg = cfgSnap.data();
          // setOcultarTCEduc/setOcultarOlimp serão chamados nas abas
        }
      } catch(e) { console.log("midia_config não existe ainda"); }
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  // Aniversariantes hoje e próximos 7 dias
  const hoje = new Date();
  const anivHoje = servidores.filter(s => {
    if (!s.dataAniversario) return false;
    const [,m,d] = s.dataAniversario.split("-");
    return parseInt(m)-1 === hoje.getMonth() && parseInt(d) === hoje.getDate();
  });

  const inp = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" };
  const lbl = { display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 };

  const ABAS = [
    { id:"telas", l:"📺 Telas" },
    { id:"playlists", l:"🎬 Playlists" },
    { id:"conteudos", l:"🖼️ Conteúdos" },
    { id:"agenda", l:"📅 Agenda" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#0f172a", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#0f172a,#1e293b)", borderBottom:"1px solid rgba(255,255,255,0.08)", padding:"16px 28px" }}>
        <div style={{ maxWidth:1400, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
            <div onClick={onBack} style={{ width:38,height:38,background:"rgba(255,255,255,0.08)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",fontSize:18 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.4)", fontSize:10, letterSpacing:3, textTransform:"uppercase" }}>IPC</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:20 }}>📺 Mídia Indoor</div>
            </div>
            {isMidiaAdm && (
              <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
                {anivHoje.length > 0 && (
                  <div style={{ background:"rgba(232,115,10,0.25)", border:"1px solid rgba(232,115,10,0.4)", borderRadius:10, padding:"6px 14px", color:"#E8730A", fontSize:12, fontWeight:700 }}>
                    🎂 {anivHoje.length} aniversariante{anivHoje.length>1?"s":""} hoje
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ABAS */}
          <div style={{ display:"flex", gap:2 }}>
            {ABAS.map(a => (
              <div key={a.id} onClick={() => setAba(a.id)}
                style={{ padding:"10px 20px", fontWeight:700, fontSize:13, cursor:"pointer", borderRadius:"10px 10px 0 0",
                  background: aba===a.id ? "#f0f2f5" : "rgba(255,255,255,0.06)",
                  color: aba===a.id ? "#1B3F7A" : "rgba(255,255,255,0.7)" }}>
                {a.l}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background:"#f0f2f5", minHeight:"calc(100vh - 120px)" }}>
        <div style={{ maxWidth:1400, margin:"0 auto", padding:"24px 28px 60px" }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:60, color:"#888" }}>Carregando...</div>
          ) : (
            <>
              {aba === "telas" && <AbaTelas telas={telas} setTelas={setTelas} playlists={playlists} isMidiaAdm={isMidiaAdm} user={user} />}
              {aba === "playlists" && <AbaPlaylists playlists={playlists} setPlaylists={setPlaylists} conteudos={conteudos} servidores={servidores} eventosTC={eventosTC} isMidiaAdm={isMidiaAdm} user={user} />}
              {aba === "conteudos" && <AbaConteudos conteudos={conteudos} setConteudos={setConteudos} playlists={playlists} setPlaylists={setPlaylists} eventosTC={eventosTC} escolas={escolas} isMidiaAdm={isMidiaAdm} user={user} />}
              {aba === "agenda" && <AbaAgenda conteudos={conteudos} setConteudos={setConteudos} playlists={playlists} setPlaylists={setPlaylists} isMidiaAdm={isMidiaAdm} eventosTC={eventosTC} servidores={servidores} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}



// ═══════════════════════════════════════════════
// EDITOR DE CROP — para foto do evento
// Proporção 8:9 (metade esquerda do slide 16:9)
// ═══════════════════════════════════════════════
function CropEditorEvento({ urlOriginal, onConfirm, onCancelar }) {
  const LARGURA = 280;
  const ALTURA = Math.round(LARGURA * 9 / 8); // 315px
  const [escala, setEscala] = useState(1);
  const [pos, setPos] = useState({ x:0, y:0 });
  const [arrastando, setArrastando] = useState(false);
  const [startDrag, setStartDrag] = useState({ x:0, y:0 });
  const [imgSize, setImgSize] = useState({ w:0, h:0 });
  const [enviando, setEnviando] = useState(false);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImgSize({ w: img.width, h: img.height });
      // Escala inicial para preencher o espaço
      const escIni = Math.max(LARGURA / img.width, ALTURA / img.height);
      setEscala(escIni);
      setPos({ x:0, y:0 });
    };
    img.src = urlOriginal;
  }, [urlOriginal]);

  useEffect(() => {
    desenhar();
  }, [escala, pos, imgSize]);

  const desenhar = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete || imgSize.w === 0) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, LARGURA, ALTURA);
    const escW = imgSize.w * escala;
    const escH = imgSize.h * escala;
    const x = (LARGURA - escW) / 2 + pos.x;
    const y = (ALTURA - escH) / 2 + pos.y;
    ctx.drawImage(img, x, y, escW, escH);
    // Overlay com grade
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(LARGURA/3, 0); ctx.lineTo(LARGURA/3, ALTURA);
    ctx.moveTo(LARGURA*2/3, 0); ctx.lineTo(LARGURA*2/3, ALTURA);
    ctx.moveTo(0, ALTURA/3); ctx.lineTo(LARGURA, ALTURA/3);
    ctx.moveTo(0, ALTURA*2/3); ctx.lineTo(LARGURA, ALTURA*2/3);
    ctx.stroke();
    // Borda
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, LARGURA, ALTURA);
  };

  const onMouseDown = (e) => {
    setArrastando(true);
    setStartDrag({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  };
  const onMouseMove = (e) => {
    if (!arrastando) return;
    setPos({ x: e.clientX - startDrag.x, y: e.clientY - startDrag.y });
  };
  const onMouseUp = () => setArrastando(false);

  // Touch support
  const onTouchStart = (e) => {
    const t = e.touches[0];
    setArrastando(true);
    setStartDrag({ x: t.clientX - pos.x, y: t.clientY - pos.y });
  };
  const onTouchMove = (e) => {
    if (!arrastando) return;
    const t = e.touches[0];
    setPos({ x: t.clientX - startDrag.x, y: t.clientY - startDrag.y });
  };

  const confirmar = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Regerar em alta resolução (960x1080)
    const hd = document.createElement("canvas");
    hd.width = 960; hd.height = 1080;
    const ctx = hd.getContext("2d");
    const img = imgRef.current;
    const fator = 960 / LARGURA;
    const escW = imgSize.w * escala * fator;
    const escH = imgSize.h * escala * fator;
    const x = (960 - escW) / 2 + pos.x * fator;
    const y = (1080 - escH) / 2 + pos.y * fator;
    ctx.drawImage(img, x, y, escW, escH);

    setEnviando(true);
    hd.toBlob(async (blob) => {
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const authHdr = await getAuthHeader();

        const resposta = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHdr },
          body: JSON.stringify({
            nomeArquivo: "evento_crop_" + Date.now() + ".jpg",
            tipoArquivo: "image/jpeg",
            tamanho: blob.size,
            modulo: "ipcmidiaindoor",
            publico: true,
            conteudoBase64: base64,
          }),
        });
        const dados = JSON.parse(await resposta.text());
        if (!dados.sucesso) throw new Error(dados.erro);
        onConfirm(dados.linkDireto, dados.fileId);
      } catch(err) {
        alert("Erro ao salvar: " + err.message);
      }
      setEnviando(false);
    }, "image/jpeg", 0.92);
  };

  return (
    <div style={{ background:"#f8f9fb", borderRadius:16, padding:16, marginTop:8 }}>
      <div style={{ fontWeight:700, fontSize:12, color:"#1B3F7A", marginBottom:8 }}>
        ✂️ Ajustar recorte — arraste para reposicionar
        <span style={{ fontWeight:400, color:"#888", fontSize:11 }}> · proporção do slide na TV</span>
      </div>
      <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
        {/* Canvas */}
        <div style={{ flexShrink:0 }}>
          <canvas ref={canvasRef} width={LARGURA} height={ALTURA}
            style={{ display:"block", cursor:arrastando?"grabbing":"grab", borderRadius:8, border:"1px solid #e8edf2" }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onMouseUp}/>
          <img ref={imgRef} src={urlOriginal} crossOrigin="anonymous"
            onLoad={desenhar} style={{ display:"none" }} alt=""/>
        </div>
        {/* Controles */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <label style={{ fontSize:11, color:"#888", fontWeight:700, display:"block", marginBottom:4 }}>ZOOM</label>
            <input type="range" min="0.3" max="4" step="0.05" value={escala}
              onChange={e => setEscala(parseFloat(e.target.value))}
              style={{ width:"100%" }}/>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#aaa", marginTop:2 }}>
              <span>− afastar</span><span>+ aproximar</span>
            </div>
          </div>
          <div style={{ background:"#e8f4ff", borderRadius:10, padding:"8px 10px", fontSize:10, color:"#1B3F7A", lineHeight:1.5 }}>
            💡 Arraste a imagem para centralizar o conteúdo principal. Use o zoom para ajustar o tamanho.
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:"auto" }}>
            <div onClick={confirmar}
              style={{ background:enviando?"#ccc":"#1B3F7A", borderRadius:10, padding:"10px", textAlign:"center",
                fontWeight:700, fontSize:12, color:"#fff", cursor:enviando?"not-allowed":"pointer" }}>
              {enviando ? "⏳ Salvando..." : "✅ Confirmar recorte"}
            </div>
            <div onClick={onCancelar}
              style={{ background:"#f0f4ff", borderRadius:10, padding:"8px", textAlign:"center",
                fontWeight:700, fontSize:12, color:"#1B3F7A", cursor:"pointer" }}>
              Cancelar
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// COMPONENTE DE UPLOAD — reutilizável
// ═══════════════════════════════════════════════
function UploadArquivo({ modulo, onUpload, aceitar, label }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const inputRef = useRef(null);

  const handleArquivo = async (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    setErro(null);
    setEnviando(true);

    try {
      // Converter para base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(arquivo);
      });

      const authHdr = await getAuthHeader();


      const resposta = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHdr },
        body: JSON.stringify({
          nomeArquivo: arquivo.name,
          tipoArquivo: arquivo.type,
          tamanho: arquivo.size,
          modulo: modulo,
          publico: true,
          conteudoBase64: base64,
        }),
      });

      // Lê o texto bruto primeiro para debugar
      const textoResposta = await resposta.text();
      console.log("Resposta bruta da API:", textoResposta);
      console.log("Status HTTP:", resposta.status);

      if (!textoResposta) {
        throw new Error("API retornou resposta vazia (status " + resposta.status + ")");
      }

      let dados;
      try {
        dados = JSON.parse(textoResposta);
      } catch(e) {
        throw new Error("Resposta inválida da API: " + textoResposta.substring(0, 200));
      }

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.erro || "Erro ao fazer upload");
      }

      onUpload(dados.linkDireto, dados);
    } catch(err) {
      setErro(err.message);
    }
    setEnviando(false);
    // Limpa o input para permitir novo upload do mesmo arquivo
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div style={{ marginTop:6 }}>
      <input
        ref={inputRef}
        type="file"
        accept={aceitar || "image/*,video/mp4"}
        onChange={handleArquivo}
        style={{ display:"none" }}
        id="upload-input-midia"/>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <label htmlFor="upload-input-midia"
          style={{ background:enviando?"#ccc":"#1B3F7A", color:"#fff", borderRadius:8, padding:"7px 14px",
            fontSize:12, fontWeight:700, cursor:enviando?"not-allowed":"pointer", whiteSpace:"nowrap",
            display:"flex", alignItems:"center", gap:6 }}>
          {enviando ? "⏳ Enviando..." : "📤 " + (label || "Fazer upload")}
        </label>
        <span style={{ fontSize:11, color:"#aaa" }}>ou cole o link abaixo</span>
      </div>
      {erro && <div style={{ fontSize:11, color:"#dc2626", marginTop:4 }}>❌ {erro}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════
// ABA TELAS
// ═══════════════════════════════════════════════
function AbaTelas({ telas, setTelas, playlists, isMidiaAdm, user }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nome:"", tipo:"recepção", orientacao:"horizontal", playlistId:"" });
  const [salvando, setSalvando] = useState(false);

  const TIPOS = ["recepção","corredor","auditório","elevador","sala de reunião","externo"];

  const salvar = async () => {
    if (!form.nome.trim()) { alert("Informe o nome da tela."); return; }
    setSalvando(true);
    try {
      if (modal === "edit" && form.id) {
        await updateDoc(doc(db, "midia_telas", form.id), { ...form, atualizadoEm: new Date().toISOString() });
        setTelas(prev => prev.map(t => t.id === form.id ? { ...t, ...form } : t));
      } else {
        const dados = { ...form, criadoEm: new Date().toISOString(), criadoPor: user?.email, ultimoPing: null };
        const ref = await addDoc(collection(db, "midia_telas"), dados);
        setTelas(prev => [...prev, { id: ref.id, ...dados }]);
      }
      setModal(null);
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const excluir = async (id) => {
    if (!window.confirm("Excluir esta tela?")) return;
    await deleteDoc(doc(db, "midia_telas", id));
    setTelas(prev => prev.filter(t => t.id !== id));
  };

  const isOnline = (t) => {
    if (!t.ultimoPing) return false;
    return (Date.now() - new Date(t.ultimoPing).getTime()) < 90000;
  };

  const getPlaylistNome = (id) => playlists.find(p => p.id === id)?.nome || "—";

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ fontWeight:800, fontSize:18, color:"#1B3F7A" }}>📺 Telas de Exibição</div>
        {isMidiaAdm && (
          <div onClick={() => { setForm({ nome:"", tipo:"recepção", orientacao:"horizontal", playlistId:"" }); setModal("new"); }}
            style={{ background:"#1B3F7A", borderRadius:12, padding:"10px 20px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            + Nova Tela
          </div>
        )}
      </div>

      {telas.length === 0 ? (
        <div style={{ textAlign:"center", padding:60, color:"#aaa", background:"#fff", borderRadius:18 }}>
          Nenhuma tela cadastrada
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
          {telas.map(t => {
            const online = isOnline(t);
            const playlist = playlists.find(p => p.id === t.playlistId);
            return (
              <div key={t.id} style={{ background:"#fff", borderRadius:18, padding:20, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", borderTop:`3px solid ${online?"#059669":"#dc2626"}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A" }}>{t.nome}</div>
                    <div style={{ fontSize:12, color:"#888", marginTop:2 }}>{t.tipo} · {t.orientacao}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background: online?"#059669":"#dc2626" }}/>
                    <span style={{ fontSize:11, fontWeight:700, color: online?"#059669":"#dc2626" }}>{online?"Online":"Offline"}</span>
                  </div>
                </div>

                <div style={{ background:"#f0f4ff", borderRadius:10, padding:"10px 14px", marginBottom:12 }}>
                  <div style={{ fontSize:11, color:"#888", marginBottom:2 }}>Playlist vinculada</div>
                  <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A" }}>{playlist ? playlist.nome : "Nenhuma"}</div>
                  {playlist && <div style={{ fontSize:11, color:"#888" }}>{(playlist.itens||[]).length} itens</div>}
                </div>

                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <a href={`/tela/${t.id}`} target="_blank" rel="noreferrer"
                    style={{ background:"#0891b2", borderRadius:8, padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:700, textDecoration:"none", cursor:"pointer" }}>
                    🔗 Abrir tela
                  </a>
                  {isMidiaAdm && (
                    <>
                      <div onClick={() => { setForm({ ...t }); setModal("edit"); }}
                        style={{ background:"#f0f4ff", borderRadius:8, padding:"6px 14px", color:"#1B3F7A", fontSize:12, fontWeight:700, cursor:"pointer" }}>✏️ Editar</div>
                      <div onClick={() => excluir(t.id)}
                        style={{ background:"#fee2e2", borderRadius:8, padding:"6px 14px", color:"#dc2626", fontSize:12, fontWeight:700, cursor:"pointer" }}>🗑️</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(modal === "new" || modal === "edit") && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={() => setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:480, padding:32 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight:900, fontSize:18, color:"#1B3F7A", marginBottom:20 }}>{modal==="edit"?"✏️ Editar Tela":"➕ Nova Tela"}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={{ display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 }}>Nome da Tela *</label>
                <input value={form.nome||""} onChange={e => setForm(Object.assign({},form,{nome:e.target.value}))} placeholder="Ex: Recepção 1º andar" style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none" }}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 }}>Tipo</label>
                  <select value={form.tipo||"recepção"} onChange={e => setForm(Object.assign({},form,{tipo:e.target.value}))} style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none" }}>
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 }}>Orientação</label>
                  <select value={form.orientacao||"horizontal"} onChange={e => setForm(Object.assign({},form,{orientacao:e.target.value}))} style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none" }}>
                    <option value="horizontal">Horizontal (16:9)</option>
                    <option value="vertical">Vertical (9:16)</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 }}>Playlist vinculada</label>
                <select value={form.playlistId||""} onChange={e => setForm(Object.assign({},form,{playlistId:e.target.value}))} style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none" }}>
                  <option value="">Nenhuma</option>
                  {playlists.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <div onClick={() => setModal(null)} style={{ flex:1, background:"#f0f4ff", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:13, color:"#1B3F7A", cursor:"pointer" }}>Cancelar</div>
              <div onClick={salvar} style={{ flex:2, background:salvando?"#ccc":"#1B3F7A", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:13, color:"#fff", cursor:salvando?"not-allowed":"pointer" }}>{salvando ? "Salvando..." : form.id ? "✅ Salvar Edição" : "✅ Salvar"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// ABA PLAYLISTS
// ═══════════════════════════════════════════════
function AbaPlaylists({ playlists, setPlaylists, conteudos, servidores, eventosTC, isMidiaAdm, user }) {
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nome:"", tipo:"geral", itens:[] });
  const [salvando, setSalvando] = useState(false);
  const [editItens, setEditItens] = useState([]);

  const TIPOS_PL = ["geral","institucional","eventos","aniversários","recepção","corredor"];

  const hoje = new Date();
  const anivHoje = servidores.filter(s => {
    if (!s.dataAniversario) return false;
    const [,m,d] = s.dataAniversario.split("-");
    return parseInt(m)-1 === hoje.getMonth() && parseInt(d) === hoje.getDate();
  });
  const anivProximos = servidores.filter(s => {
    if (!s.dataAniversario) return false;
    const [,m,d] = s.dataAniversario.split("-");
    const prox = new Date(`${hoje.getFullYear()}-${m}-${d}`);
    if (prox < hoje) prox.setFullYear(hoje.getFullYear()+1);
    const dias = Math.ceil((prox - hoje) / 86400000);
    return dias > 0 && dias <= 7;
  });

  const eventosSemana = eventosTC.filter(e => {
    if (!e.data) return false;
    const d = new Date(e.data+"T00:00:00");
    const diff = Math.ceil((d - hoje) / 86400000);
    return diff >= 0 && diff <= 20;
  });

  const FONTES_ESPECIAIS = [
    { id:"aniv_mes", tipo:"aniversario", label:"🎂 Aniversariantes do mês", count: null },
    { id:"aniv_hoje", tipo:"aniversario", label:"🎂 Aniversariante do dia / fim de semana", count: anivHoje.length },
    { id:"eventos_semana", tipo:"eventos_tc", label:"📅 Agenda TCEduc", count: eventosSemana.length },
    { id:"informe_tceduc", tipo:"informe_tceduc", label:"📊 Informe TCEduc", count: null },
    { id:"informe_olimpiada", tipo:"informe_olimpiada", label:"🏆 Informe Olímpiada", count: null },
  ];

  const isEditMode = modal === "edit";

  const salvarPlaylist = async () => {
    if (!form.nome.trim()) { alert("Informe o nome da playlist."); return; }
    setSalvando(true);
    // Remove undefined — Firestore rejects undefined values
    const limparObj = (obj) => {
      const clean = {};
      Object.keys(obj).forEach(k => { if (obj[k] !== undefined) clean[k] = obj[k]; });
      return clean;
    };
    const itensParaSalvar = editItens.map((it, idx) => limparObj(Object.assign({}, it, { ordem: idx })));
    try {
      const dados = {
        nome: form.nome,
        tipo: form.tipo || "geral",
        itens: itensParaSalvar,
        atualizadoEm: new Date().toISOString()
      };
      if (isEditMode && form.id) {
        await updateDoc(doc(db, "midia_playlists", form.id), dados);
        setPlaylists(prev => prev.map(p => p.id === form.id ? Object.assign({}, p, dados) : p));
      } else {
        const dadosNovos = Object.assign({}, dados, { criadoEm: new Date().toISOString(), criadoPor: user && user.email });
        const ref = await addDoc(collection(db, "midia_playlists"), dadosNovos);
        setPlaylists(prev => [...prev, Object.assign({ id: ref.id }, dadosNovos)]);
      }
      setModal(null);
    } catch(err) {
      console.error("Erro ao salvar playlist:", err);
      alert("Erro ao salvar: " + err.message);
    }
    setSalvando(false);
  };

  const excluir = async (id) => {
    if (!window.confirm("Excluir esta playlist?")) return;
    await deleteDoc(doc(db, "midia_playlists", id));
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const addItem = (item) => {
    const novo = { ...item, tempo: item.tempo||10, oculto: false, ordem: editItens.length };
    setEditItens(prev => [...prev, novo]);
  };

  const removeItem = (idx) => setEditItens(prev => prev.filter((_,i) => i !== idx));

  const { onDragStart, onDragOver, onDragEnd } = useDragList(editItens, setEditItens);

  const abrirNova = () => {
    setForm({ nome:"", tipo:"geral" });
    setEditItens([]);
    setModal("new");
  };

  const abrirEdit = (p) => {
    setForm({ ...p });
    setEditItens([...(p.itens||[])]);
    setModal("edit");
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns: selected ? "280px 1fr" : "1fr", gap:16 }}>
      {/* LISTA */}
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:18, color:"#1B3F7A" }}>🎬 Playlists</div>
          {isMidiaAdm && (
            <div onClick={abrirNova} style={{ background:"#1B3F7A", borderRadius:10, padding:"8px 16px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>+ Nova</div>
          )}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {playlists.length === 0 && <div style={{ textAlign:"center", padding:40, color:"#aaa", background:"#fff", borderRadius:14 }}>Nenhuma playlist</div>}
          {playlists.map(p => (
            <div key={p.id} onClick={() => setSelected(selected?.id===p.id ? null : p)}
              style={{ background:"#fff", borderRadius:14, padding:"14px 16px", cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.05)",
                border: selected?.id===p.id ? "2px solid #1B3F7A" : "2px solid transparent" }}>
              <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A" }}>{p.nome}</div>
              <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{p.tipo} · {(p.itens||[]).length} itens</div>
              {isMidiaAdm && (
                <div style={{ display:"flex", gap:6, marginTop:10 }}>
                  <div onClick={e => { e.stopPropagation(); abrirEdit(p); }} style={{ background:"#f0f4ff", borderRadius:8, padding:"4px 12px", color:"#1B3F7A", fontSize:11, fontWeight:700, cursor:"pointer" }}>✏️ Editar</div>
                  <div onClick={e => { e.stopPropagation(); excluir(p.id); }} style={{ background:"#fee2e2", borderRadius:8, padding:"4px 12px", color:"#dc2626", fontSize:11, fontWeight:700, cursor:"pointer" }}>🗑️</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* DETALHE */}
      {selected && (
        <div style={{ background:"#fff", borderRadius:18, padding:20, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:16 }}>{selected.nome} — itens da playlist</div>
          {(selected.itens||[]).length === 0 ? (
            <div style={{ color:"#aaa", textAlign:"center", padding:30 }}>Nenhum item</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {(selected.itens||[]).map((item, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, background:"#f8f9fb", borderRadius:12, padding:"10px 14px" }}>
                  <div style={{ fontWeight:900, fontSize:16, color:"#888", minWidth:24 }}>{i+1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A" }}>{item.label || item.nome || item.tipo}</div>
                    <div style={{ fontSize:11, color:"#888" }}>{item.tipo} · {item.tempo||10}s</div>
                  </div>
                  {item.oculto && <span style={{ background:"#fee2e2", borderRadius:6, padding:"2px 8px", fontSize:10, color:"#dc2626", fontWeight:700 }}>Oculto</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL CRIAR/EDITAR */}
      {(modal === "new" || modal === "edit") && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={() => setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:680, padding:28, maxHeight:"90vh", overflowY:"auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight:900, fontSize:18, color:"#1B3F7A", marginBottom:20 }}>{modal==="edit"?"✏️ Editar Playlist":"➕ Nova Playlist"}</div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              <div>
                <label style={{ display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 }}>Nome *</label>
                <input value={form.nome||""} onChange={e => setForm(Object.assign({},form,{nome:e.target.value}))} style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none" }}/>
              </div>
              <div>
                <label style={{ display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 }}>Tipo</label>
                <select value={form.tipo||"geral"} onChange={e => setForm(Object.assign({},form,{tipo:e.target.value}))} style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none" }}>
                  {TIPOS_PL.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* ITENS — KANBAN/DRAG */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              {/* Adicionar itens */}
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A", marginBottom:10 }}>➕ Adicionar conteúdos</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:320, overflowY:"auto" }}>
                  <div style={{ fontSize:11, color:"#888", fontWeight:700, marginBottom:4, letterSpacing:1 }}>CONTEÚDOS CADASTRADOS</div>
                  {conteudos.map((c,i) => (
                    <div key={c.id} onClick={() => addItem({ id:c.id, tipo:c.tipo, label:c.nome, thumb:c.url, tempo:c.tempoPadrao||10 })}
                      style={{ background:"#f0f4ff", borderRadius:10, padding:"8px 12px", cursor:"pointer", fontSize:12, fontWeight:600, color:"#1B3F7A", display:"flex", alignItems:"center", gap:8 }}>
                      <span>{c.tipo==="video"?"🎥":c.tipo==="imagem"?"🖼️":"📋"}</span>
                      <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.nome}</span>
                      <span style={{ color:"#0891b2" }}>+</span>
                    </div>
                  ))}
                  <div style={{ fontSize:11, color:"#888", fontWeight:700, marginTop:8, marginBottom:4, letterSpacing:1 }}>FONTES AUTOMÁTICAS</div>
                  {FONTES_ESPECIAIS.map(f => (
                    <div key={f.id} onClick={() => addItem({ id:f.id, tipo:f.tipo, label:f.label, tempo:15 })}
                      style={{ background:"#f0fdf4", borderRadius:10, padding:"8px 12px", cursor:"pointer", fontSize:12, fontWeight:600, color:"#059669", display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ flex:1 }}>{f.label}</span>
                      <span style={{ background:"#dcfce7", borderRadius:6, padding:"1px 6px", fontSize:10 }}>{f.count}</span>
                      <span>+</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lista ordenável */}
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A", marginBottom:10 }}>📋 Ordem de exibição <span style={{ fontSize:11, color:"#888", fontWeight:400 }}>(arraste para reordenar)</span></div>
                <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:320, overflowY:"auto" }}>
                  {editItens.length === 0 && <div style={{ color:"#aaa", textAlign:"center", padding:20, fontSize:12 }}>Adicione itens ao lado →</div>}
                  {editItens.map((item, i) => (
                    <div key={i} style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      <div draggable
                        onDragStart={() => onDragStart(i)}
                        onDragOver={e => onDragOver(e, i)}
                        onDragEnd={onDragEnd}
                        style={{ background:"#f8f9fb", borderRadius:10, padding:"8px 12px", display:"flex", alignItems:"center", gap:8, cursor:"grab", border:"1px solid #e8edf2" }}>
                        <span style={{ color:"#aaa", fontSize:16 }}>⠿</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"#1B3F7A", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.label||item.tipo}</div>
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
                            <input type="number" min="3" max="300" value={item.tempo||10}
                              onChange={e => {
                                const next = [...editItens];
                                next[i] = Object.assign({},next[i],{tempo:parseInt(e.target.value)||10});
                                setEditItens(next);
                              }}
                              onClick={e => e.stopPropagation()}
                              onKeyDown={e => e.stopPropagation()}
                              style={{ width:50, background:"#fff", border:"1px solid #e8edf2", borderRadius:6, padding:"2px 6px", fontSize:11, outline:"none" }}/>
                            <span style={{ fontSize:10, color:"#888" }}>seg</span>
                          </div>
                        </div>
                        <div onClick={() => removeItem(i)} style={{ color:"#dc2626", cursor:"pointer", fontSize:14 }}>✕</div>
                      </div>
                      {item.tipo === "eventos_tc" && (
                        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                          <UploadArquivo
                            modulo="ipcmidiaindoor"
                            aceitar="image/*"
                            label="Enviar capa"
                            onUpload={(link) => {
                              const next = [...editItens];
                              next[i] = Object.assign({}, next[i], { capaUrl: link });
                              setEditItens(next);
                            }}/>
                          <input
                            value={item.capaUrl||""}
                            onChange={e => {
                              const next = [...editItens];
                              next[i] = Object.assign({}, next[i], { capaUrl: e.target.value });
                              setEditItens(next);
                            }}
                            onClick={e => e.stopPropagation()}
                            onKeyDown={e => e.stopPropagation()}
                            placeholder="ou cole a URL da capa (exibida 4s antes da agenda)"
                            style={{ width:"100%", background:"#fff", border:"1px solid #e0e7ef", borderRadius:8, padding:"5px 10px", fontSize:11, outline:"none", color:"#1B3F7A" }}/>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <div onClick={() => setModal(null)} style={{ flex:1, background:"#f0f4ff", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:13, color:"#1B3F7A", cursor:"pointer" }}>Cancelar</div>
              <div onClick={salvarPlaylist} style={{ flex:2, background:salvando?"#ccc":"#1B3F7A", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:13, color:"#fff", cursor:salvando?"not-allowed":"pointer" }}>{salvando?"Salvando...":"✅ Salvar Playlist"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// ABA CONTEÚDOS
// ═══════════════════════════════════════════════
function AbaConteudos({ conteudos, setConteudos, playlists, setPlaylists, eventosTC, escolas, isMidiaAdm, user }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nome:"", tipo:"imagem", url:"", tempoPadrao:10, descricao:"" });
  const [salvando, setSalvando] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("todos");

  const TIPOS = ["imagem","video","data_comemorativa"];
  const TIPO_LABEL = { imagem:"🖼️ Imagem", video:"🎥 Vídeo", data_comemorativa:"🗓️ Data comemorativa" };

  const salvar = async () => {
    if (!form.nome.trim()) { alert("Informe o nome."); return; }
    if ((form.tipo==="imagem"||form.tipo==="video") && !form.url.trim()) { alert("Informe a URL."); return; }
    setSalvando(true);
    try {
      if (modal==="edit" && form.id) {
        await updateDoc(doc(db,"midia_conteudos",form.id), { ...form, atualizadoEm: new Date().toISOString() });
        setConteudos(prev => prev.map(c => c.id===form.id ? { ...c, ...form } : c));
      } else {
        const dados = { ...form, criadoEm: new Date().toISOString(), criadoPor: user?.email };
        const ref = await addDoc(collection(db,"midia_conteudos"), dados);
        setConteudos(prev => [...prev, { id: ref.id, ...dados }]);
      }
      setModal(null);
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const excluir = async (id) => {
    if (!window.confirm("Excluir este conteúdo? Ele também será removido de todas as playlists.")) return;
    const item = conteudos.find(c => c.id === id);
    await deleteDoc(doc(db,"midia_conteudos",id));
    setConteudos(prev => prev.filter(c => c.id !== id));
    if (item && item.driveFileId) await deletarDoDrive(item.driveFileId);
    // Remover o conteúdo de todas as playlists que o contêm
    const playlistsAfetadas = (playlists || []).filter(p => (p.itens || []).some(it => it.id === id));
    for (let pl of playlistsAfetadas) {
      const novosItens = (pl.itens || []).filter(it => it.id !== id);
      await updateDoc(doc(db, "midia_playlists", pl.id), { itens: novosItens });
      setPlaylists(prev => prev.map(p => p.id === pl.id ? Object.assign({}, p, { itens: novosItens }) : p));
    }
  };

  const filtrados = filtroTipo==="todos" ? conteudos : conteudos.filter(c => c.tipo===filtroTipo);

  // Dados Informe TCEduc 2026
  const getCapacitadosEv = (e) => {
    if (e.modoTotalManual) return parseInt(e.totalAprovadosManual) || 0;
    const porAcao = (e.acoesEducacionais || []).reduce((s, a) => s + (parseInt(a.participantes) || 0), 0);
    if (porAcao === 0 && e.totalAprovadosManual) return parseInt(e.totalAprovadosManual) || 0;
    return porAcao;
  };
  const getStatusEfetivo = (e) => getCapacitadosEv(e) > 0 ? "Realizado" : (e.status || "Programado");
  const ev2026 = (eventosTC||[]).filter(e => {
    const ano = e.data ? e.data.split("-")[0] : (e.ano ? String(e.ano) : "");
    return ano === "2026" && getStatusEfetivo(e) === "Realizado";
  });
  const municiRealizados = new Set(ev2026.filter(e=>e.tipo==="Municipal").map(e=>e.municipio||e.regiao)).size;
  const capMunicipal = ev2026.filter(e=>e.tipo==="Municipal").reduce((s,e) => s + getCapacitadosEv(e), 0);
  const regionaisRealizadas = new Set(ev2026.filter(e=>e.tipo==="Regional").map(e=>e.municipio||e.regiao)).size;
  const capRegional = ev2026.filter(e=>e.tipo==="Regional").reduce((s,e) => s + getCapacitadosEv(e), 0);
  const totalCapTC = capMunicipal + capRegional;

  // Dados Informe Olímpiada 2026
  const ol2026 = (escolas||[]).filter(e => e.edicao === 2026);
  const totalEscolas = ol2026.length;
  const totalAlunos = ol2026.reduce((s,e) => s + (parseInt(e.alunosInscritos)||0), 0);

  // Estado ocultar informes — salvo no Firestore como config
  const [ocultarTCEduc, setOcultarTCEduc] = useState(false);
  const [ocultarOlimp, setOcultarOlimp] = useState(false);

  const toggleInforme = async (tipo, valor) => {
    if (tipo === "tceduc") {
      setOcultarTCEduc(valor);
      await updateDoc(doc(db, "midia_config", "informes"), { ocultarTCEduc: valor }).catch(() =>
        setDoc(doc(db, "midia_config", "informes"), { ocultarTCEduc: valor, ocultarOlimp })
      );
      // Propaga oculto nas playlists que tem esse item
      const afetadas = (playlists||[]).filter(p => (p.itens||[]).some(it => it.id === "informe_tceduc"));
      for (let pl of afetadas) {
        const novosItens = (pl.itens||[]).map(it => it.id === "informe_tceduc" ? Object.assign({},it,{oculto:valor}) : it);
        await updateDoc(doc(db,"midia_playlists",pl.id),{itens:novosItens});
        setPlaylists(prev => prev.map(p => p.id===pl.id ? Object.assign({},p,{itens:novosItens}) : p));
      }
    } else {
      setOcultarOlimp(valor);
      await updateDoc(doc(db, "midia_config", "informes"), { ocultarOlimp: valor }).catch(() =>
        setDoc(doc(db, "midia_config", "informes"), { ocultarTCEduc, ocultarOlimp: valor })
      );
      const afetadas = (playlists||[]).filter(p => (p.itens||[]).some(it => it.id === "informe_olimpiada"));
      for (let pl of afetadas) {
        const novosItens = (pl.itens||[]).map(it => it.id === "informe_olimpiada" ? Object.assign({},it,{oculto:valor}) : it);
        await updateDoc(doc(db,"midia_playlists",pl.id),{itens:novosItens});
        setPlaylists(prev => prev.map(p => p.id===pl.id ? Object.assign({},p,{itens:novosItens}) : p));
      }
    }
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div style={{ fontWeight:800, fontSize:18, color:"#1B3F7A" }}>🖼️ Conteúdos</div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ display:"flex", gap:4 }}>
            {["todos","imagem","video","data_comemorativa"].map(t => (
              <div key={t} onClick={() => setFiltroTipo(t)}
                style={{ background:filtroTipo===t?"#1B3F7A":"#fff", color:filtroTipo===t?"#fff":"#555", borderRadius:8, padding:"6px 12px", fontSize:11, fontWeight:700, cursor:"pointer", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
                {t==="todos"?"Todos":TIPO_LABEL[t]}
              </div>
            ))}
          </div>
          {isMidiaAdm && (
            <div onClick={() => { setForm({ nome:"", tipo:"imagem", url:"", tempoPadrao:10, descricao:"" }); setModal("new"); }}
              style={{ background:"#1B3F7A", borderRadius:10, padding:"8px 16px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>+ Novo</div>
          )}
        </div>
      </div>

      {/* ── CARDS FIXOS DE INFORME ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(380px,1fr))", gap:14, marginBottom:20 }}>

        {/* Informe TCEduc */}
        <div style={{ background:"#042C53", borderRadius:18, overflow:"hidden", opacity:ocultarTCEduc?0.5:1 }}>
          <div style={{ padding:"18px 20px", display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ color:"#85B7EB", fontSize:10, letterSpacing:2, textTransform:"uppercase" }}>Conteúdo fixo</div>
                <div style={{ color:"#fff", fontWeight:800, fontSize:16, marginTop:2 }}>Informe TCEduc</div>
              </div>
              {ocultarTCEduc && <span style={{ background:"#7f1d1d", color:"#fca5a5", fontSize:10, fontWeight:700, padding:"2px 10px", borderRadius:8 }}>Oculto</span>}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:10, padding:"10px 12px" }}>
                <div style={{ color:"#E8730A", fontWeight:900, fontSize:24 }}>{municiRealizados}</div>
                <div style={{ color:"#85B7EB", fontSize:10, marginTop:2 }}>municípios</div>
              </div>
              <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:10, padding:"10px 12px" }}>
                <div style={{ color:"#E8730A", fontWeight:900, fontSize:24 }}>{regionaisRealizadas}</div>
                <div style={{ color:"#85B7EB", fontSize:10, marginTop:2 }}>regionais</div>
              </div>
              <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:10, padding:"10px 12px" }}>
                <div style={{ color:"#E8730A", fontWeight:900, fontSize:24 }}>{totalCapTC.toLocaleString("pt-BR")}</div>
                <div style={{ color:"#85B7EB", fontSize:10, marginTop:2 }}>capacitados</div>
              </div>
            </div>
            {isMidiaAdm && (
              <div onClick={() => toggleInforme("tceduc", !ocultarTCEduc)}
                style={{ background:ocultarTCEduc?"rgba(5,150,105,0.2)":"rgba(220,38,38,0.15)", borderRadius:10, padding:"7px 14px", textAlign:"center", fontSize:12, fontWeight:700, color:ocultarTCEduc?"#34d399":"#f87171", cursor:"pointer" }}>
                {ocultarTCEduc ? "👁️ Mostrar nas playlists" : "🚫 Ocultar das playlists"}
              </div>
            )}
          </div>
        </div>

        {/* Informe Olímpiada */}
        <div style={{ background:"#0f172a", borderRadius:18, overflow:"hidden", border:"1px solid rgba(232,115,10,0.2)", opacity:ocultarOlimp?0.5:1 }}>
          <div style={{ padding:"18px 20px", display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ color:"rgba(232,115,10,0.6)", fontSize:10, letterSpacing:2, textTransform:"uppercase" }}>Conteúdo fixo</div>
                <div style={{ color:"#fff", fontWeight:800, fontSize:16, marginTop:2 }}>Informe Olímpiada</div>
              </div>
              {ocultarOlimp && <span style={{ background:"#7f1d1d", color:"#fca5a5", fontSize:10, fontWeight:700, padding:"2px 10px", borderRadius:8 }}>Oculto</span>}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px 12px", border:"1px solid rgba(232,115,10,0.1)" }}>
                <div style={{ color:"#E8730A", fontWeight:900, fontSize:24 }}>{totalEscolas}</div>
                <div style={{ color:"rgba(255,255,255,0.4)", fontSize:10, marginTop:2 }}>escolas</div>
              </div>
              <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px 12px", border:"1px solid rgba(232,115,10,0.1)" }}>
                <div style={{ color:"#E8730A", fontWeight:900, fontSize:24 }}>{totalAlunos.toLocaleString("pt-BR")}</div>
                <div style={{ color:"rgba(255,255,255,0.4)", fontSize:10, marginTop:2 }}>alunos</div>
              </div>
              <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px 12px", border:"1px solid rgba(232,115,10,0.1)" }}>
                <div style={{ color:"#E8730A", fontWeight:900, fontSize:24 }}>2026</div>
                <div style={{ color:"rgba(255,255,255,0.4)", fontSize:10, marginTop:2 }}>edição</div>
              </div>
            </div>
            {isMidiaAdm && (
              <div onClick={() => toggleInforme("olimpiada", !ocultarOlimp)}
                style={{ background:ocultarOlimp?"rgba(5,150,105,0.2)":"rgba(220,38,38,0.15)", borderRadius:10, padding:"7px 14px", textAlign:"center", fontSize:12, fontWeight:700, color:ocultarOlimp?"#34d399":"#f87171", cursor:"pointer" }}>
                {ocultarOlimp ? "👁️ Mostrar nas playlists" : "🚫 Ocultar das playlists"}
              </div>
            )}
          </div>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div style={{ textAlign:"center", padding:60, color:"#aaa", background:"#fff", borderRadius:18 }}>Nenhum conteúdo cadastrado</div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:14 }}>
          {filtrados.map(c => (
            <div key={c.id} style={{ background:"#fff", borderRadius:16, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
              {/* Preview */}
              <div style={{ height:130, background:"#1e293b", display:"flex", alignItems:"center", justifyContent:"center", fontSize:40 }}>
                {c.tipo==="imagem" ? (
                  c.url ? <img src={normDriveUrl(c.url)} alt={c.nome} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e => { e.target.style.display="none"; }} /> : "🖼️"
                ) : c.tipo==="video" ? "🎥" : "🗓️"}
              </div>
              <div style={{ padding:"12px 14px" }}>
                <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A", marginBottom:4 }}>{c.nome}</div>
                <div style={{ fontSize:11, color:"#888", marginBottom:8 }}>{TIPO_LABEL[c.tipo]} · {c.tempoPadrao||10}s</div>
                {c.url && <div style={{ fontSize:10, color:"#0891b2", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:8 }}>{c.url}</div>}
                {isMidiaAdm && (
                  <div style={{ display:"flex", gap:6 }}>
                    <div onClick={() => { setForm({...c}); setModal("edit"); }} style={{ background:"#f0f4ff", borderRadius:8, padding:"4px 10px", color:"#1B3F7A", fontSize:11, fontWeight:700, cursor:"pointer" }}>✏️</div>
                    <div onClick={() => excluir(c.id)} style={{ background:"#fee2e2", borderRadius:8, padding:"4px 10px", color:"#dc2626", fontSize:11, fontWeight:700, cursor:"pointer" }}>🗑️</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(modal==="new"||modal==="edit") && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={() => setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:480, padding:32 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight:900, fontSize:18, color:"#1B3F7A", marginBottom:20 }}>{modal==="edit"?"✏️ Editar Conteúdo":"➕ Novo Conteúdo"}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={{ display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 }}>Nome *</label>
                <input value={form.nome||""} onChange={e => setForm(Object.assign({},form,{nome:e.target.value}))} style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none" }}/>
              </div>
              <div>
                <label style={{ display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 }}>Tipo</label>
                <select value={form.tipo||"imagem"} onChange={e => setForm(Object.assign({},form,{tipo:e.target.value}))} style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none" }}>
                  {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                </select>
              </div>
              {(form.tipo==="imagem"||form.tipo==="video") && (
                <div>
                  <label style={{ display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 }}>Arquivo {form.tipo==="video"?"(vídeo)":"(imagem)"} *</label>
                  <UploadArquivo
                    modulo="ipcmidiaindoor"
                    aceitar={form.tipo==="video" ? "video/mp4,video/quicktime" : "image/*"}
                    label={form.tipo==="video" ? "Enviar vídeo" : "Enviar imagem"}
                    onUpload={(link, dados) => setForm(Object.assign({},form,{url:link, driveFileId:dados.fileId}))}/>
                  <input value={form.url||""} onChange={e => setForm(Object.assign({},form,{url:e.target.value}))} placeholder="ou cole a URL aqui (Google Drive / YouTube)" style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none", marginTop:8 }}/>
                  {form.tipo==="video" && <div style={{ fontSize:10, color:"#888", marginTop:4 }}>Para YouTube: cole a URL do vídeo no campo acima.</div>}
                </div>
              )}
              {form.tipo==="data_comemorativa" && (
                <div>
                  <label style={{ display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 }}>Data (MM-DD)</label>
                  <input value={form.dataFixa||""} onChange={e => setForm(Object.assign({},form,{dataFixa:e.target.value}))} placeholder="Ex: 09-07 (Independência)" style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none" }}/>
                </div>
              )}
              <div>
                <label style={{ display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 }}>Tempo padrão (segundos)</label>
                <input type="number" min="3" max="300" value={form.tempoPadrao||10} onChange={e => setForm(Object.assign({},form,{tempoPadrao:parseInt(e.target.value)||10}))} style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none" }}/>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <div onClick={() => setModal(null)} style={{ flex:1, background:"#f0f4ff", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:13, color:"#1B3F7A", cursor:"pointer" }}>Cancelar</div>
              <div onClick={salvar} style={{ flex:2, background:salvando?"#ccc":"#1B3F7A", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:13, color:"#fff", cursor:salvando?"not-allowed":"pointer" }}>{salvando ? "Salvando..." : form.id ? "✅ Salvar Edição" : "✅ Salvar"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// ABA AGENDA
// ═══════════════════════════════════════════════
function AbaAgenda({ conteudos, setConteudos, playlists, setPlaylists, isMidiaAdm, eventosTC, servidores }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nome:"", tipo:"evento_manual", dataInicio:"", dataFim:"", descricao:"", fotoUrl:"", local:"", horario:"", categoria:"" });
  const [salvando, setSalvando] = useState(false);
  const [imagensApoio, setImagensApoio] = useState([]);
  const [uploadandoApoio, setUploadandoApoio] = useState(false);
  const [mostrarGaleria, setMostrarGaleria] = useState(false);
  const [cropUrl, setCropUrl] = useState(null);

  // Carrega imagens de apoio do Firestore
  useEffect(() => {
    getDoc(doc(db, "midia_config", "imagens_apoio"))
      .then(snap => { if (snap.exists()) setImagensApoio(snap.data().lista || []); })
      .catch(() => {});
  }, []);

  const salvarImagensApoio = async (lista) => {
    await setDoc(doc(db, "midia_config", "imagens_apoio"), { lista });
    setImagensApoio(lista);
  };

  const handleUploadApoio = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (imagensApoio.length >= 10) { alert("Máximo de 10 imagens de apoio."); return; }
    setUploadandoApoio(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const authHdr = await getAuthHeader();

      const resposta = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHdr },
        body: JSON.stringify({
          nomeArquivo: file.name,
          tipoArquivo: file.type,
          tamanho: file.size,
          modulo: "ipcmidiaindoor",
          publico: true,
          conteudoBase64: base64,
        }),
      });
      const texto = await resposta.text();
      const dados = JSON.parse(texto);
      if (!dados.sucesso) throw new Error(dados.erro);
      const novaLista = [...imagensApoio, { url: dados.linkDireto, fileId: dados.fileId, nome: file.name }];
      await salvarImagensApoio(novaLista);
    } catch(err) {
      alert("Erro ao enviar: " + err.message);
    }
    setUploadandoApoio(false);
    e.target.value = "";
  };

  const removerImagemApoio = async (idx) => {
    if (!window.confirm("Remover esta imagem de apoio?")) return;
    const novaLista = imagensApoio.filter((_,i) => i !== idx);
    await salvarImagensApoio(novaLista);
  };

  const hoje = new Date();
  const hojeStr = hoje.toISOString().split("T")[0];

  const agendaManual = conteudos.filter(c => c.tipo==="evento_manual" || c.tipo==="data_comemorativa");

  const anivHoje = servidores.filter(s => {
    if (!s.dataAniversario) return false;
    const [,m,d] = s.dataAniversario.split("-");
    return parseInt(m)-1 === hoje.getMonth() && parseInt(d) === hoje.getDate();
  });

  const eventosSemana = eventosTC.filter(e => {
    if (!e.data) return false;
    const d = new Date(e.data+"T00:00:00");
    const diff = Math.ceil((d - hoje) / 86400000);
    return diff >= 0 && diff <= 20;
  }).slice(0,10);

  const salvarEvento = async () => {
    if (!form.nome.trim()) { alert("Informe o nome."); return; }
    setSalvando(true);
    try {
      const raw = Object.assign({}, form, { tipo:"evento_manual" });
      const dados = {};
      Object.keys(raw).forEach(k => { if (raw[k] !== undefined) dados[k] = raw[k]; });
      if (form.id) {
        // Edição
        await updateDoc(doc(db,"midia_conteudos",form.id), Object.assign({}, dados, { atualizadoEm: new Date().toISOString() }));
        setConteudos(prev => prev.map(ev => ev.id === form.id ? Object.assign({}, ev, dados) : ev));
      } else {
        // Novo
        Object.assign(dados, { criadoEm: new Date().toISOString() });
        const ref = await addDoc(collection(db,"midia_conteudos"), dados);
        setConteudos(prev => [...prev, Object.assign({ id: ref.id }, dados)]);
      }
      setModal(null);
      setForm({ nome:"", tipo:"evento_manual", dataInicio:"", dataFim:"", descricao:"", fotoUrl:"", local:"", horario:"", categoria:"" });
    } catch(err) {
      console.error("Erro ao salvar evento:", err);
      alert("Erro ao salvar: " + err.message);
    }
    setSalvando(false);
  };

  const excluir = async (id) => {
    if (!window.confirm("Excluir este evento? Ele também será removido de todas as playlists.")) return;
    const item = conteudos.find(c => c.id === id);
    await deleteDoc(doc(db,"midia_conteudos",id));
    setConteudos(prev => prev.filter(c => c.id!==id));
    if (item && item.driveFileId) await deletarDoDrive(item.driveFileId);
    // Remover o conteúdo de todas as playlists que o contêm
    const playlistsAfetadas = (playlists || []).filter(p => (p.itens || []).some(it => it.id === id));
    for (let pl of playlistsAfetadas) {
      const novosItens = (pl.itens || []).filter(it => it.id !== id);
      await updateDoc(doc(db, "midia_playlists", pl.id), { itens: novosItens });
      setPlaylists(prev => prev.map(p => p.id === pl.id ? Object.assign({}, p, { itens: novosItens }) : p));
    }
  };

  const toggleOculto = async (item) => {
    const next = !item.oculto;
    await updateDoc(doc(db,"midia_conteudos",item.id), { oculto: next });
    setConteudos(prev => prev.map(c => c.id===item.id ? { ...c, oculto: next } : c));
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
      {/* AGENDA MANUAL */}
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A" }}>📋 Agenda Manual</div>
          {isMidiaAdm && (
            <div onClick={() => { setForm({ nome:"", tipo:"evento_manual", dataInicio:"", dataFim:"", descricao:"" }); setModal("evento"); }}
              style={{ background:"#1B3F7A", borderRadius:10, padding:"6px 14px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>+ Evento</div>
          )}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {agendaManual.length===0 && <div style={{ color:"#aaa", textAlign:"center", padding:30, background:"#fff", borderRadius:14 }}>Nenhum evento manual</div>}
          {agendaManual.map(ev => (
            <div key={ev.id} style={{ background:"#fff", borderRadius:14, overflow:"hidden", boxShadow:"0 1px 6px rgba(0,0,0,0.05)", opacity:ev.oculto?0.5:1 }}>
              {ev.fotoUrl && (
                <div style={{ height:72, overflow:"hidden" }}>
                  <img src={normDriveUrl(ev.fotoUrl)} alt={ev.nome} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>{e.target.parentElement.style.display="none";}}/>
                </div>
              )}
              <div style={{ padding:"10px 14px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A", flex:1 }}>{ev.nome}</div>
                  {ev.oculto && <span style={{ background:"#fee2e2", borderRadius:6, padding:"1px 8px", fontSize:10, color:"#dc2626", fontWeight:700, flexShrink:0 }}>Oculto</span>}
                </div>
                {ev.categoria && <span style={{ background:"#f0f4ff", color:"#1B3F7A", fontSize:10, padding:"1px 8px", borderRadius:6, fontWeight:700 }}>{ev.categoria}</span>}
                {ev.dataInicio && <div style={{ fontSize:11, color:"#888", marginTop:3 }}>{fmtData(ev.dataInicio)}{ev.dataFim && ev.dataFim!==ev.dataInicio ? " → "+fmtData(ev.dataFim) : ""}</div>}
                {ev.local && <div style={{ fontSize:11, color:"#0891b2", marginTop:2 }}>📍 {ev.local}</div>}
                {ev.horario && <div style={{ fontSize:11, color:"#888", marginTop:1 }}>🕐 {ev.horario}</div>}
                {ev.descricao && <div style={{ fontSize:11, color:"#555", marginTop:4 }}>{ev.descricao}</div>}
                {isMidiaAdm && (
                  <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
                    <div onClick={() => { setForm(Object.assign({},ev)); setModal("evento"); }} style={{ background:"#f0f4ff", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#1B3F7A", cursor:"pointer" }}>✏️ Editar</div>
                    <div onClick={() => toggleOculto(ev)} style={{ background:ev.oculto?"#f0fdf4":"#fff3e0", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:ev.oculto?"#059669":"#E8730A", cursor:"pointer" }}>{ev.oculto?"👁️ Mostrar":"🚫 Ocultar"}</div>
                    <div onClick={() => excluir(ev.id)} style={{ background:"#fee2e2", borderRadius:8, padding:"3px 10px", fontSize:11, color:"#dc2626", fontWeight:700, cursor:"pointer" }}>🗑️</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* IMPORTAÇÕES */}
      <div>
        <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:14 }}>🔄 Importações automáticas</div>

        {/* Aniversariantes */}
        <div style={{ background:"#fff", borderRadius:14, padding:"14px 16px", marginBottom:12, boxShadow:"0 1px 6px rgba(0,0,0,0.05)" }}>
          <div style={{ fontWeight:700, fontSize:13, color:"#7c3aed", marginBottom:10 }}>🎂 Aniversariantes de hoje ({anivHoje.length})</div>
          {anivHoje.length===0 ? (
            <div style={{ color:"#aaa", fontSize:12 }}>Nenhum aniversariante hoje</div>
          ) : anivHoje.map(s => (
            <div key={s.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:corAvatar(s.nome), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:13 }}>{initials(s.nome)}</div>
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A" }}>{s.nome}</div>
                <div style={{ fontSize:11, color:"#888" }}>{s.cargo||s.setor||""}</div>
              </div>
              {s.artAniversario && <div style={{ marginLeft:"auto", fontSize:10, color:"#059669", fontWeight:700 }}>🎨 Arte</div>}
            </div>
          ))}
        </div>

        {/* Eventos TCEduc */}
        <div style={{ background:"#fff", borderRadius:14, padding:"14px 16px", boxShadow:"0 1px 6px rgba(0,0,0,0.05)" }}>
          <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A", marginBottom:10 }}>📅 Eventos TCEduc (próximos 20 dias)</div>
          {eventosSemana.length===0 ? (
            <div style={{ color:"#aaa", fontSize:12 }}>Nenhum evento nos próximos 20 dias</div>
          ) : eventosSemana.map(e => (
            <div key={e.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, paddingBottom:8, borderBottom:"1px solid #f0f0f0" }}>
              <div style={{ background:"#f0f4ff", borderRadius:8, padding:"4px 10px", textAlign:"center", minWidth:46 }}>
                <div style={{ fontWeight:900, fontSize:14, color:"#1B3F7A", lineHeight:1 }}>{e.data?.split("-")[2]}</div>
                <div style={{ fontSize:9, color:"#888", textTransform:"uppercase" }}>
                  {["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"][parseInt(e.data?.split("-")[1])-1]}
                </div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:12, color:"#1B3F7A" }}>{e.municipio||e.regiao||"Evento"}</div>
                <div style={{ fontSize:11, color:"#888" }}>{e.tipo}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* IMAGENS DE APOIO */}
      {isMidiaAdm && (
        <div style={{ background:"#fff", borderRadius:18, padding:"18px 20px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", marginTop:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A" }}>🖼️ Imagens de apoio</div>
              <div style={{ fontSize:11, color:"#888", marginTop:2 }}>Até 10 imagens disponíveis para usar nos eventos · {imagensApoio.length}/10</div>
            </div>
            {imagensApoio.length < 10 && (
              <label style={{ background:"#1B3F7A", borderRadius:10, padding:"8px 16px", color:"#fff", fontSize:12, fontWeight:700, cursor:uploadandoApoio?"not-allowed":"pointer", opacity:uploadandoApoio?0.6:1, display:"inline-block" }}>
                {uploadandoApoio ? "⏳ Enviando..." : "📤 Adicionar imagem"}
                <input type="file" accept="image/*" style={{ display:"none" }} onChange={handleUploadApoio} disabled={uploadandoApoio}/>
              </label>
            )}
          </div>
          {imagensApoio.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px", color:"#aaa", fontSize:13, background:"#f8f9fb", borderRadius:12 }}>
              Nenhuma imagem de apoio cadastrada. Adicione até 10 imagens para usar nos eventos.
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:10 }}>
              {imagensApoio.map((img, i) => (
                <div key={i} style={{ position:"relative", borderRadius:12, overflow:"hidden", aspectRatio:"16/9", background:"#f0f4ff" }}>
                  <img src={normDriveUrl(img.url)} alt={img.nome}
                    style={{ width:"100%", height:"100%", objectFit:"cover" }}
                    onError={e => { e.target.style.display="none"; }}/>
                  <div onClick={() => removerImagemApoio(i)}
                    style={{ position:"absolute", top:4, right:4, width:20, height:20, background:"rgba(220,38,38,0.85)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:11, color:"#fff", fontWeight:700 }}>✕</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL EVENTO */}
      {modal==="evento" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={() => setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:460, padding:32, maxHeight:"90vh", overflowY:"auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight:900, fontSize:18, color:"#1B3F7A", marginBottom:20 }}>{form.id ? "✏️ Editar Evento" : "📋 Novo Evento na Agenda"}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={{ display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 }}>Nome do evento *</label>
                <input value={form.nome||""} onChange={e => setForm(Object.assign({},form,{nome:e.target.value}))} style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none" }}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 }}>Data início</label>
                  <input type="date" value={form.dataInicio||""} onChange={e => setForm(Object.assign({},form,{dataInicio:e.target.value}))} style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none" }}/>
                </div>
                <div>
                  <label style={{ display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 }}>Data fim</label>
                  <input type="date" value={form.dataFim||""} onChange={e => setForm(Object.assign({},form,{dataFim:e.target.value}))} style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none" }}/>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 }}>Local de realização</label>
                  <input value={form.local||""} onChange={e => setForm(Object.assign({},form,{local:e.target.value}))} placeholder="Ex: Auditório — TCE-CE" style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none" }}/>
                </div>
                <div>
                  <label style={{ display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 }}>Horário</label>
                  <input value={form.horario||""} onChange={e => setForm(Object.assign({},form,{horario:e.target.value}))} placeholder="Ex: 8h às 17h" style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none" }}/>
                </div>
              </div>
              <div>
                <label style={{ display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 }}>Categoria <span style={{ fontWeight:400, textTransform:"none" }}>(aparece como tag)</span></label>
                <input value={form.categoria||""} onChange={e => setForm(Object.assign({},form,{categoria:e.target.value}))} placeholder="Ex: Evento institucional, Capacitação..." style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none" }}/>
              </div>
              <div>
                <label style={{ display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 }}>Foto do evento</label>
                <UploadArquivo
                  modulo="ipcmidiaindoor"
                  aceitar="image/*"
                  label="Enviar foto do evento"
                  onUpload={(link) => { setCropUrl(link); setMostrarGaleria(false); }}/>
                <input value={form.fotoUrl||""} onChange={e => setForm(Object.assign({},form,{fotoUrl:e.target.value}))} placeholder="ou cole a URL aqui (Google Drive ou outra)" style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none", marginTop:8 }}/>
                {imagensApoio.length > 0 && (
                  <div style={{ marginTop:8 }}>
                    <div onClick={() => setMostrarGaleria(g => !g)}
                      style={{ fontSize:12, color:"#1B3F7A", fontWeight:700, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6, padding:"4px 0" }}>
                      🖼️ {mostrarGaleria ? "▲ Ocultar galeria" : "▼ Escolher das imagens de apoio"} ({imagensApoio.length})
                    </div>
                    {mostrarGaleria && (
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6, marginTop:6 }}>
                        {imagensApoio.map((img, i) => (
                          <div key={i} onClick={() => { setCropUrl(img.url); setMostrarGaleria(false); }}
                            style={{ borderRadius:8, overflow:"hidden", height:56, cursor:"pointer",
                              border:"2px solid #e8edf2" }}>
                            <img src={normDriveUrl(img.url)} alt={img.nome} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {cropUrl && (
                  <CropEditorEvento
                    urlOriginal={cropUrl}
                    onConfirm={(link, fileId) => {
                      setForm(Object.assign({},form,{fotoUrl:link, driveFileId:fileId}));
                      setCropUrl(null);
                    }}
                    onCancelar={() => setCropUrl(null)}/>
                )}
                <div style={{ fontSize:10, color:"#aaa", marginTop:4 }}>Se não informar, será exibida uma arte automática no slide</div>
                {form.fotoUrl && (
                  <div style={{ marginTop:8, borderRadius:10, overflow:"hidden", height:100, background:"#f0f4ff" }}>
                    <img src={normDriveUrl(form.fotoUrl)} alt="preview"
                      style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
                      onError={e => { e.target.parentElement.style.display="none"; }}/>
                  </div>
                )}
              </div>
              <div>
                <label style={{ display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 }}>Descrição</label>
                <textarea value={form.descricao||""} onChange={e => setForm(Object.assign({},form,{descricao:e.target.value}))} rows={2} placeholder="Texto de apoio exibido no slide..." style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none", resize:"none" }}/>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <div onClick={() => setModal(null)} style={{ flex:1, background:"#f0f4ff", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:13, color:"#1B3F7A", cursor:"pointer" }}>Cancelar</div>
              <div onClick={salvarEvento} style={{ flex:2, background:salvando?"#ccc":"#1B3F7A", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:13, color:"#fff", cursor:salvando?"not-allowed":"pointer" }}>{salvando ? "Salvando..." : form.id ? "✅ Salvar Edição" : "✅ Salvar"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
