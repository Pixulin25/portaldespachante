export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { tipo, marca, modelo, ano, codigoFipe } = req.method === "GET" ? req.query : req.body;

  const BASE = "https://fipe.parallelum.com.br/api/v2";
  const mapaTipo = { carros: "cars", motos: "motorcycles", caminhoes: "trucks" };
  const tipoVeiculo = mapaTipo[tipo] || "cars";

  try {
    let url;

    if (codigoFipe) {
      url = `${BASE}/${tipoVeiculo}/${codigoFipe}/years`;
    } else if (marca && modelo && ano) {
      url = `${BASE}/${tipoVeiculo}/brands/${marca}/models/${modelo}/years/${ano}`;
    } else if (marca && modelo) {
      url = `${BASE}/${tipoVeiculo}/brands/${marca}/models/${modelo}/years`;
    } else if (marca) {
      url = `${BASE}/${tipoVeiculo}/brands/${marca}/models`;
    } else {
      url = `${BASE}/${tipoVeiculo}/brands`;
    }

    const resposta = await fetch(url, { headers: { accept: "application/json" } });
    const texto = await resposta.text();
    console.log("[FIPE] URL:", url, "Status:", resposta.status, "Body:", texto.substring(0, 300));

    let dados;
    try { dados = JSON.parse(texto); } catch { dados = null; }

    if (!resposta.ok) {
      return res.status(resposta.status).json({ erro: dados?.message || dados?.error || `Erro ${resposta.status}: ${texto.substring(0,150)}` });
    }

    return res.status(200).json({ tipo: "json", dados, urlUsada: url });
  } catch (erro) {
    return res.status(500).json({ erro: "Exceção: " + erro.message });
  }
}
