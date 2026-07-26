/**
 * ============================================================
 *  Portal Despachante — Pagamento Mercado Pago
 *  Rota: /api/pagamento
 * ============================================================
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });

  const { valor, descricao, email, user_id } = req.body || {};

  if (!valor || !email) {
    return res.status(400).json({ erro: "Valor e e-mail são obrigatórios" });
  }

  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!ACCESS_TOKEN) {
    return res.status(500).json({ erro: "Token do Mercado Pago não configurado" });
  }

  try {
    // Criar preferência de pagamento no Mercado Pago
    const preference = {
      items: [
        {
          title: descricao || `Recarga Portal Despachante — R$ ${valor}`,
          quantity: 1,
          unit_price: parseFloat(valor),
          currency_id: "BRL",
        },
      ],
      payer: {
        email: email,
      },
      payment_methods: {
        excluded_payment_types: [],
        installments: 12,
      },
      back_urls: {
        success: `${req.headers.origin || "https://portaldespachante.online"}/dashboard.html?pagamento=sucesso&valor=${valor}&user_id=${user_id}`,
        failure: `${req.headers.origin || "https://portaldespachante.online"}/dashboard.html?pagamento=falhou`,
        pending: `${req.headers.origin || "https://portaldespachante.online"}/dashboard.html?pagamento=pendente`,
      },
      auto_return: "approved",
      external_reference: user_id || "sem_user",
      statement_descriptor: "PORTAL DESPACHANTE",
    };

    const resposta = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados?.message || "Erro ao criar preferência");
    }

    return res.status(200).json({
      id: dados.id,
      init_point: dados.init_point,         // link de pagamento produção
      sandbox_init_point: dados.sandbox_init_point, // link de pagamento teste
    });
  } catch (erro) {
    console.error("[MP Error]", erro.message);
    return res.status(500).json({ erro: erro.message });
  }
}
