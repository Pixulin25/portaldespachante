export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });

  const { valor, email, user_id } = req.body || {};
  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

  try {
    const resposta = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        items: [{
          title: "Recarga Portal Despachante",
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number(valor),
        }],
        payer: { email },
        back_urls: {
          success: `https://portaldespachante.online/dashboard.html?pagamento=sucesso&valor=${valor}&user_id=${user_id}`,
          failure: `https://portaldespachante.online/dashboard.html?pagamento=falhou`,
          pending: `https://portaldespachante.online/dashboard.html?pagamento=pendente`,
        },
        auto_return: "approved",
        external_reference: user_id || "sem_user",
      }),
    });

    const dados = await resposta.json();
    console.log("[MP Resposta completa]", JSON.stringify(dados));

    if (!resposta.ok) throw new Error(JSON.stringify(dados));

    return res.status(200).json({
      init_point: dados.init_point,
      sandbox_init_point: dados.sandbox_init_point,
    });

  } catch (erro) {
    console.error("[MP Error]", erro.message);
    return res.status(500).json({ erro: erro.message });
  }
}
