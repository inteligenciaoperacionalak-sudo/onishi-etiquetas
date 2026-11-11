// Etiquetas nutricionais — Onishi Distribuidora. Código comum das páginas.
// Dados do produtor impressos no rodapé da etiqueta
const EMPRESA = { razao: "Cabana do Bosque e Alimentos LTDA", cnpj: "00.893.166/0002-65", endereco: "Rua do Telégrafo, S/N, Taperapuan, Porto Seguro - BA", telefone: "(73) 99969-3475", email: "controle1@complexotoatoa.com.br" };
// Selo de inspeção padrão (S.I.M. Porto Seguro) — usado quando o produto não tem imagem própria de selo
const SIM_REGISTRO = "022/26";
function seloSIM() {
  return `<svg class="sim" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="Inspecionado S.I.M. ${SIM_REGISTRO}">
    <defs><path id="arcTop" d="M 18,50 A 32,32 0 0 1 82,50"/><path id="arcBot" d="M 12,50 A 38,38 0 0 0 88,50"/></defs>
    <circle cx="50" cy="50" r="48" fill="#fff" stroke="#000" stroke-width="3.5"/>
    <text font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="11" fill="#000" letter-spacing=".8"><textPath href="#arcTop" startOffset="50%" text-anchor="middle">INSPECIONADO</textPath></text>
    <text font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="9.5" fill="#000" letter-spacing=".5"><textPath href="#arcBot" startOffset="50%" text-anchor="middle">PORTO SEGURO - BA</textPath></text>
    <text x="50" y="47" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="11" fill="#000">${SIM_REGISTRO}</text>
    <text x="50" y="65" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="18" fill="#000">S.I.M.</text>
  </svg>`;
}
const API = "https://wughmiprdbycsmkjsslj.supabase.co/functions/v1/etiquetas/api";

// Valores diários de referência (IN 75/2020) — iguais aos da função. null = sem VD (imprime "—")
const VD = { energia_kcal: 2000, carboidratos: 300, acucares_totais: null, acucares_adicionados: 50, proteinas: 50, gorduras_totais: 65, gorduras_saturadas: 20, gorduras_trans: null, fibras: 25, sodio_mg: 2000 };
const NUTRIENTES = [
  { chave: "energia_kcal", rotulo: "Valor energético", unidade: "kcal", sub: false },
  { chave: "carboidratos", rotulo: "Carboidratos", unidade: "g", sub: false },
  { chave: "acucares_totais", rotulo: "Açúcares totais", unidade: "g", sub: true },
  { chave: "acucares_adicionados", rotulo: "Açúcares adicionados", unidade: "g", sub: true },
  { chave: "proteinas", rotulo: "Proteínas", unidade: "g", sub: false },
  { chave: "gorduras_totais", rotulo: "Gorduras totais", unidade: "g", sub: false },
  { chave: "gorduras_saturadas", rotulo: "Gorduras saturadas", unidade: "g", sub: true },
  { chave: "gorduras_trans", rotulo: "Gorduras trans", unidade: "g", sub: false },
  { chave: "fibras", rotulo: "Fibras alimentares", unidade: "g", sub: false },
  { chave: "sodio_mg", rotulo: "Sódio", unidade: "mg", sub: false },
];

// ---- sessão ----
function sessao() { try { return JSON.parse(localStorage.getItem("et_sessao") || "null"); } catch (_) { return null; } }
function guardarSessao(s) { try { if (s) localStorage.setItem("et_sessao", JSON.stringify(s)); else localStorage.removeItem("et_sessao"); } catch (_) {} }
function exigirLogin(perfis) {
  const s = sessao();
  if (!s || !s.token) { location.href = "index.html?volta=" + encodeURIComponent(location.pathname.split("/").pop() + location.search); return null; }
  if (perfis && s.usuario.perfil !== "admin" && !perfis.includes(s.usuario.perfil)) { alert("Seu acesso (" + s.usuario.perfil_nome + ") não entra nesta tela."); location.href = "index.html"; return null; }
  return s;
}
async function api(rota, body, metodo) {
  const s = sessao();
  const opts = { method: metodo || (body ? "POST" : "GET"), headers: { "content-type": "application/json" } };
  if (s && s.token) opts.headers["x-token"] = s.token;
  if (body) opts.body = JSON.stringify(body);
  let r;
  try { r = await fetch(API + rota, opts); } catch (_) { throw new Error("Sem conexão com o servidor. Verifique a internet."); }
  const d = await r.json().catch(() => ({ erro: "Resposta inválida do servidor." }));
  if (r.status === 401 && s && rota !== "/login" && rota !== "/senha") { guardarSessao(null); location.href = "index.html?expirou=1"; throw new Error(d.erro || "Sessão expirada."); }
  if (!r.ok) throw new Error(d.erro || "Erro " + r.status);
  return d;
}
async function sair() { try { await api("/sair", {}); } catch (_) {} guardarSessao(null); location.href = "index.html"; }

// ---- cálculo (igual ao da função) ----
function calcular(p) {
  const porcao = Number(p.porcao_g) || 0;
  const linhas = NUTRIENTES.map((n) => {
    const raw = p[n.chave];
    const v100 = raw === null || raw === undefined || raw === "" ? null : Number(String(raw).replace(",", "."));
    const vPorcao = v100 === null || !isFinite(v100) ? null : Math.round(v100 * porcao / 100 * 100) / 100;
    const vd = VD[n.chave];
    const pct = vPorcao === null || vd === null ? null : Math.round(vPorcao / vd * 100);
    return { ...n, por100: v100, porcao: vPorcao, vd: pct };
  });
  const completa = linhas.every((l) => l.por100 !== null && isFinite(l.por100)) && porcao > 0 && Number(p.porcoes_por_embalagem) > 0 && !!String(p.medida_caseira || "").trim();
  return { porcao_g: porcao, linhas, completa };
}
// 1 casa decimal; 2 quando o valor tem centésimos (ex.: 0,08 g)
const fmt1 = (v) => { if (v === null || v === undefined || v === "" || !isFinite(v)) return "—"; const n = Math.round(Number(v) * 100) / 100; return (Math.abs(n * 10 - Math.round(n * 10)) > 1e-6 ? n.toFixed(2) : n.toFixed(1)).replace(".", ","); };
const fmtInt = (v) => v === null || v === undefined || !isFinite(v) ? "—" : String(Math.round(v));
const fmtData = (iso) => !iso ? "—" : iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4);
const fmtDataHora = (iso) => !iso ? "—" : new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Bahia", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const lote7 = (n) => String(n).padStart(7, "0");
const hojeISO = () => { const d = new Date(Date.now() - 3 * 3600 * 1000); return d.toISOString().slice(0, 10); };
function somaDias(iso, dias) { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + Number(dias || 0)); return d.toISOString().slice(0, 10); }
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const normBusca = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

// ---- HTML da etiqueta (10 × 6 cm). Usado na impressão e na prévia ----
function htmlEtiqueta(produto, lote) {
  const c = calcular(produto);
  const linhas = c.linhas.map((l) => `
    <tr class="${l.sub ? "sub" : ""}"><td class="rot">${esc(l.rotulo)} (${l.unidade})</td><td>${fmt1(l.por100)}</td><td>${fmt1(l.porcao)}</td><td>${fmtInt(l.vd)}</td></tr>`).join("");
  return `
  <div class="etq">
    <div class="esq">
      <div class="topo">
        <img class="logo" src="logo.png" alt="">
        <div class="titulos"><div class="t1">${esc(produto.nome)}</div><div class="t2">${esc(produto.descricao || "")}</div></div>
      </div>
      <div class="info">
        <div class="info-t">INFORMAÇÃO NUTRICIONAL</div>
        <div>Porções por embalagem: ${fmtInt(produto.porcoes_por_embalagem)}</div>
        <div>Porção: ${fmt1(c.porcao_g)} g (${esc(produto.medida_caseira || "")})</div>
      </div>
      <table class="tab">
        <thead><tr><th></th><th>100 g</th><th>${fmt1(c.porcao_g)} g</th><th>%VD*</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
      <div class="rodape">*Percentual de valores diários fornecidos pela porção.</div>
    </div>
    <div class="dir">
      <div class="caixa"><div class="cx-t">DATA DE FABRICAÇÃO</div><div class="cx-v">${lote ? fmtData(lote.data_fabricacao) : "__/__/____"}</div></div>
      <div class="caixa"><div class="cx-t">VALIDADE</div><div class="cx-v">${lote ? fmtData(lote.data_validade) : "__/__/____"}</div></div>
      <div class="caixa"><div class="cx-t">LOTE</div><div class="cx-v">${lote ? lote7(lote.numero) : "0000000"}</div></div>
      <div class="cons"><div class="cons-t">Conservação e Temperatura</div><div class="cons-v">${esc(produto.conservacao || "")}</div><div class="cons-v">Aviso: ${esc(produto.aviso || "")}</div></div>
      <div class="selo">${produto.selo ? `<img src="${produto.selo}" alt="">` : seloSIM()}</div>
    </div>
    <div class="empresa"><b>Produzido por ${esc(EMPRESA.razao)}</b> · CNPJ ${esc(EMPRESA.cnpj)}<br>${esc(EMPRESA.endereco)} · Tel. ${esc(EMPRESA.telefone)} · ${esc(EMPRESA.email)}</div>
  </div>`;
}

// ---- cabeçalho comum das páginas internas ----
function cabecalho(titulo, ativo) {
  const s = sessao();
  const u = s ? s.usuario : null;
  const links = [
    ["lotes.html", "Lotes e impressão", ["producao"]],
    ["produtos.html", "Fichas nutricionais", ["nutricao", "producao"]],
    ["usuarios.html", "Usuários", []],
  ];
  const nav = links.filter(([, , perfis]) => u && (u.perfil === "admin" || perfis.includes(u.perfil)))
    .map(([h, t]) => `<a href="${h}" class="${ativo === h ? "on" : ""}">${t}</a>`).join("");
  return `<header class="cab"><div class="cab-in">
    <a class="marca" href="index.html"><span class="kanji">大西</span><span>ONISHI <small>etiquetas</small></span></a>
    <nav>${nav}</nav>
    <div class="quem">${u ? esc(u.nome) + " · " + esc(u.perfil_nome) : ""} <button class="lnk" onclick="sair()">sair</button></div>
  </div></header><h1 class="pag-t">${esc(titulo)}</h1>`;
}
// Diminui a fonte do nome e da descrição até caberem na largura (nomes longos, ex.: GUAIUBA 0,800G A 1KG)
function ajustarTitulos(raiz) {
  (raiz || document).querySelectorAll(".etq .t1, .etq .t2").forEach((el) => {
    let pt = el.classList.contains("t1") ? 9 : 7.5;
    el.style.fontSize = pt + "pt";
    while (el.scrollWidth > el.clientWidth + 1 && pt > 5) { pt -= 0.25; el.style.fontSize = pt + "pt"; }
  });
}
function aviso(el, msg, tipo) { el.textContent = msg || ""; el.className = "aviso " + (msg ? (tipo || "ok") : ""); }
