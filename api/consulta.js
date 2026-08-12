/**
 * ============================================================
 *  Portal Despachante — Backend Seguro (Vercel Function)
 *  Arquivo: /api/consulta.js
 *  Rota: /api/consulta
 * ============================================================
 */

const BASE_URL = "https://portaldespachantes.online";

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

// Mapa: endpoint do teu sistema -> endpoint equivalente na ApiBrasil
const MAPA_APIBRASIL = {
  "/consultar-placa-v2": { url: "/vehicles/dados", campo: "placa", metodo: "vehicles" },
  "/consultar-placa-v3": { url: "/vehicles/dados", campo: "placa", metodo: "vehicles" },
  "/consultar-placa-fipe": { url: "/vehicles/fipe", campo: "placa", metodo: "vehicles" },
  "/consultar-chassi": { url: "/vehicles/dados", campo: "chassi", metodo: "vehicles" },
};

async function chamarApiBrasil(endpoint, params) {
  const mapa = MAPA_APIBRASIL[endpoint];
  if (!mapa || !APIBRASIL_TOKEN) throw new Error("Endpoint não suportado pela ApiBrasil");

  const res = await fetch(`${APIBRASIL_BASE}${mapa.url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${APIBRASIL_TOKEN}`,
    },
    body: JSON.stringify({ [mapa.campo]: params[mapa.campo] }),
    signal: AbortSignal.timeout(15000),
  });

  const dados = await res.json();
  if (!res.ok || dados.error) throw new Error(dados?.message || `Erro ApiBrasil ${res.status}`);

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

  const dados = await res.json();
  if (!res.ok || dados.error) throw new Error(dados?.message || `Erro ApiBrasil ${res.status}`);
  return { tipo: "json", dados: dados.response || dados, provedor: "ApiBrasil" };
}

async function chamarComFallback(endpoint, params) {
  const ativos = PROVEDORES.filter(p => p.ativo());
  const erros = [];
  for (const provedor of ativos) {
    try {
      return await chamarProvedor(provedor, endpoint, params);
    } catch (e) {
      erros.push(`${provedor.nome}: ${e.message}`);
    }
  }
  if (MAPA_APIBRASIL[endpoint] && APIBRASIL_TOKEN) {
    try {
      return await chamarApiBrasil(endpoint, params);
    } catch (e) {
      erros.push(`ApiBrasil: ${e.message}`);
    }
  }
  if (erros.length === 0) throw new Error("Nenhuma API configurada.");
  throw new Error("Todos os provedores falharam: " + erros.join(" | "));
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });

  const { endpoint, ...params } = req.body || {};

  if (!endpoint || !ENDPOINTS_PERMITIDOS.includes(endpoint)) {
    return res.status(400).json({ erro: "Endpoint não autorizado: " + endpoint });
  }

  try {
    const resultado = await chamarComFallback(endpoint, params);
    return res.status(200).json(resultado);
  } catch (e) {
    return res.status(502).json({ erro: e.message });
  }
}
