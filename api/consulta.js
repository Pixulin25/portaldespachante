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
  // Futuras APIs — descomente e adicione a variável no Vercel:
  // {
  //   nome: "SERPRO",
  //   baseURL: "https://gateway.apiserpro.serpro.gov.br",
  //   chave: () => process.env.CHAVE_SERPRO,
  //   ativo: () => !!process.env.CHAVE_SERPRO,
  // },
];

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
  if (!res.ok) throw new Error(dados?.message || dados?.erro || `Erro ${res.status}`);
  return { tipo: "json", dados, provedor: provedor.nome };
}

async function chamarComFallback(endpoint, params) {
  const ativos = PROVEDORES.filter(p => p.ativo());
  if (!ativos.length) throw new Error("Nenhuma API configurada.");

  const erros = [];
  for (const provedor of ativos) {
    try {
      return await chamarProvedor(provedor, endpoint, params);
    } catch (e) {
      erros.push(`${provedor.nome}: ${e.message}`);
    }
  }
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
