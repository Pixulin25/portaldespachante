/**
 * ============================================================
 *  Portal Despachante — Backend Seguro (Vercel Function)
 *  Arquivo: /api/consulta.js
 *  Rota: /api/consulta
 * ============================================================
 */

const SUPABASE_URL = "https://ofutxldgzocvfjcjemlk.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mdXR4bGRnem9jdmZqY2plbWxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMjI4OTQsImV4cCI6MjEwMDU5ODg5NH0.XmmfRPwOy4ZxW4OmHyNeYQY3SRIs2wLu-b3suLKV2XA";

async function buscarPrioridades(endpoint) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/config_fornecedores?servico=eq.${encodeURIComponent(endpoint)}&select=*`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    const data = await res.json();
    return data[0] || null;
  } catch {
    return null;
  }
}

const PROVEDORES = [
  {
    nome: "Portal Despachantes",
    baseURL: "https://portaldespachantes.online",
    chave: () => process.env.CHAVE_PORTAL_DESPACHANTES,
    ativo: () => !!process.env.CHAVE_PORTAL_DESPACHANTES,
  },
];

const APIBRASIL_TOKEN = process.env.APIBRASIL_BEARER_TOKEN;
const APIBRASIL_BASE = "https://gateway.apibrasil.io/api/v2";

const MAPA_APIBRASIL = {
  "/consultar-placa-v2": { url: "/vehicles/dados", campo: "placa" },
  "/consultar-placa-v3": { url: "/vehicles/dados", campo: "placa" },
  "/consultar-placa-fipe": { url: "/vehicles/fipe", campo: "placa" },
  "/consultar-chassi": { url: "/vehicles/dados", campo: "chassi" },
};

async function chamarApiBrasil(endpoint, params) {
  const mapa = MAPA_APIBRASIL[endpoint];
  if (!mapa || !APIBRASIL_TOKEN) throw new Error("Endpoint não suportado pela ApiBrasil");

  const res = await fetch(`${APIBRASIL_BASE}${mapa.url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${APIBRASIL_TOKEN}` },
    body: JSON.stringify({ [mapa.campo]: params[mapa.campo] }),
    signal: AbortSignal.timeout(15000),
  });

  const texto = await res.text();
  console.log("[ApiBrasil]", mapa.url, "Status:", res.status, "Body:", texto.substring(0, 300));

  let dados;
  try { dados = JSON.parse(texto); } catch { throw new Error(`ApiBrasil não retornou JSON: ${texto.substring(0,150)}`); }

  if (!res.ok || dados.error) throw new Error(dados?.message || `Erro ApiBrasil ${res.status}: ${JSON.stringify(dados)}`);
  return { tipo: "json", dados: dados.response || dados, provedor: "ApiBrasil" };
}

const ENDPOINTS_PERMITIDOS = [
  "/consultar-placa-v2", "/consultar-placa-nacional", "/consultar-placa-v3",
  "/consultar-cautelar", "/consultar-chassi", "/gravame", "/consultar-debito",
  "/debitos-json", "/consultar-placa-fipe", "/proprietario-atual",
  "/consultar-historico-proprietario", "/auto-quilometragem", "/consultar-motor",
  "/consultar-spc", "/renajud", "/licenciamento-bin", "/placa-crv",
  "/numero-atpv-e", "/reemissao-atpv-e-pdf", "/consultar-foto-leilao",
  "/placa-crv-json", "/codigo-seguranca-crv", "/codigo-seguranca-crv-v2",
  "/consultar-crv-pi", "/validacao-crv",
  "/crlv-acre", "/crlv-amapa", "/crlv-bahia", "/crlv-goias", "/crlv-maranhao",
  "/crlv-minas-gerais", "/crlv-mato-grosso-do-sul", "/crlv-mato-grosso",
  "/crlv-para", "/crlv-piaui", "/crlv-parana", "/crlv-rondonia", "/crlv-roraima",
  "/crlv-sergipe", "/crlv-sao-paulo", "/crlv-tocantins",
  "/crlv-agendado-alagoas", "/crlv-agendado-ceara", "/crlv-agendado-distrito-federal",
  "/crlv-agendado-espirito-santo", "/crlv-agendado-paraiba", "/crlv-agendado-pernambuco",
  "/crlv-agendado-rio-de-janeiro", "/crlv-agendado-rio-grande-do-norte",
  "/crlv-agendado-santa-catarina",
  "/comunicado-venda/inserir", "/comunicado-venda/transmitir",
  "/comunicado-venda/alterar", "/comunicado-venda/cancelar",
  "/comunicado-venda/desbloquear",
];

async function chamarProvedor(provedor, endpoint, params) {
  const res = await fetch(`${provedor.baseURL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "chaveAcesso": provedor.chave(),
    },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(15000),
  });

  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/pdf") || contentType.includes("octet-stream")) {
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return { tipo: "pdf", base64, provedor: provedor.nome };
  }

  const dados = await res.json();
  console.log("[Fornecedor Resposta]", JSON.stringify(dados));
  if (!res.ok) throw new Error(dados?.message || dados?.erro || dados?.mensagem || JSON.stringify(dados) || `Erro ${res.status}`);
  return { tipo: "json", dados, provedor: provedor.nome };
}

async function chamarComFallback(endpoint, params, provedorPreferido) {
  if (provedorPreferido === "apibrasil") {
    if (!MAPA_APIBRASIL[endpoint]) throw new Error("Este serviço não está disponível na ApiBrasil");
    return await chamarApiBrasil(endpoint, params);
  }
  if (provedorPreferido === "portal") {
    const provedor = PROVEDORES.find(p => p.nome === "Portal Despachantes");
    if (!provedor || !provedor.ativo()) throw new Error("Portal Despachantes não configurado");
    return await chamarProvedor(provedor, endpoint, params);
  }

  const config = await buscarPrioridades(endpoint);
  const ordem = config && config.ativo
    ? [config.prioridade_1, config.prioridade_2, config.prioridade_3].filter(Boolean)
    : ["portal", "apibrasil"];

  const erros = [];

  for (const chave of ordem) {
    try {
      if (chave === "portal") {
        const provedor = PROVEDORES.find(p => p.nome === "Portal Despachantes");
        if (!provedor || !provedor.ativo()) throw new Error("não configurado");
        return await chamarProvedor(provedor, endpoint, params);
      }
      if (chave === "apibrasil") {
        if (!MAPA_APIBRASIL[endpoint]) throw new Error("endpoint não suportado");
        return await chamarApiBrasil(endpoint, params);
      }
    } catch (e) {
      erros.push(`${chave}: ${e.message}`);
    }
  }

  if (erros.length === 0) throw new Error("Nenhum fornecedor configurado para este serviço.");
  throw new Error("Todos os fornecedores falharam: " + erros.join(" | "));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });

  const { endpoint, provedorPreferido, ...params } = req.body || {};

  if (!endpoint || !ENDPOINTS_PERMITIDOS.includes(endpoint)) {
    return res.status(400).json({ erro: "Endpoint não autorizado: " + endpoint });
  }

  try {
    const resultado = await chamarComFallback(endpoint, params, provedorPreferido);
    return res.status(200).json(resultado);
  } catch (e) {
    return res.status(502).json({ erro: e.message });
  }
}
