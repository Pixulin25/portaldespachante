/**
 * Portal Despachante — Consulta Tabela FIPE (gratuita)
 * Rota: /api/fipe
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { tipo, marca, modelo, ano, codigoFipe } = req.method === "GET" ? req.query : req.body;

  const BASE = "https://fipe.parallelum.com.br/api/v2";
  const tipoVeiculo = tipo || "carros"; // carros, motos, caminhoes

  try {
    let url;

    if (codigoFipe) {
      // Consulta direta por código FIPE
      url = `${BASE}/${tipoVeiculo}/codigos/${codigoFipe}`;
    } else if (marca && modelo && ano) {
      // Consulta completa por marca/modelo/ano
      url = `${BASE}/${tipoVeiculo}/marcas/${marca}/modelos/${modelo}/anos/${ano}`;
    } else if (marca && modelo) {
      // Listar anos disponíveis
      url = `${BASE}/${tipoVeiculo}/marcas/${marca}/modelos/${modelo}/anos`;
    } else if (marca) {
      // Listar modelos da marca
      url = `${BASE}/${tipoVeiculo}/marcas/${marca}/modelos`;
    } else {
      // Listar marcas disponíveis
      url = `${BASE}/${tipoVeiculo}/marcas`;
    }

    const resposta = await fetch(url);
    const dados = await resposta.json();

    if (!resposta.ok) {
      return res.status(resposta.status).json({ erro: dados?.message || "Erro na consulta FIPE" });
    }

    return res.status(200).json({ tipo: "json", dados });
  } catch (erro) {
    return res.status(500).json({ erro: erro.message });
  }
}
