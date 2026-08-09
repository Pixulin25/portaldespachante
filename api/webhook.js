/**
 * ============================================================
 *  Portal Despachante — Webhook Mercado Pago
 *  Recebe notificações de pagamento e credita saldo automaticamente
 * ============================================================
 */

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).json({ ok: true });

  try {
    const body = req.body || {};
    const paymentId = body.data?.id || body.id;

    if (!paymentId) {
      return res.status(200).json({ ok: true, msg: "sem payment id" });
    }

    const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
    const SUPABASE_URL = "https://ofutxldgzocvfjcjemlk.supabase.co";
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

    // Buscar detalhes do pagamento no Mercado Pago
    const pagResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });
    const pagamento = await pagResp.json();

    if (pagamento.status !== "approved") {
      return res.status(200).json({ ok: true, status: pagamento.status });
    }

    const user_id = pagamento.external_reference;
    const valor = pagamento.transaction_amount;

    if (!user_id || user_id === "sem_user") {
      return res.status(200).json({ ok: true, msg: "sem user_id" });
    }

    // Verificar se já processámos este pagamento (evitar duplicar)
    const checkResp = await fetch(
      `${SUPABASE_URL}/rest/v1/transacoes?mp_payment_id=eq.${paymentId}`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const existentes = await checkResp.json();

    if (existentes.length > 0) {
      return res.status(200).json({ ok: true, msg: "já processado" });
    }

    // Registar transação
    await fetch(`${SUPABASE_URL}/rest/v1/transacoes`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id,
        tipo: "recarga",
        creditos: 0,
        valor,
        status: "aprovado",
        mp_payment_id: String(paymentId),
      }),
    });

    // Buscar saldo atual
    const perfilResp = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user_id}&select=creditos`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const perfis = await perfilResp.json();
    const saldoAtual = perfis[0]?.creditos || 0;
    const novoSaldo = saldoAtual + valor;

    // Atualizar saldo
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user_id}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ creditos: novoSaldo }),
    });

    return res.status(200).json({ ok: true, novoSaldo });
  } catch (erro) {
    console.error("[Webhook Error]", erro.message);
    return res.status(200).json({ ok: false, erro: erro.message });
  }
}
