/**
 * ============================================================
 *  Portal Despachante — Webhook Mercado Pago
 *  Rota: /api/webhook
 *  Recebe notificações de pagamento e adiciona saldo ao user
 * ============================================================
 */

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.SUPABASE_URL || "https://ofutxldgzocvfjcjemlk.supabase.co",
  process.env.SUPABASE_SERVICE_KEY || ""
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { type, data } = req.body || {};

  if (type !== "payment") return res.status(200).json({ ok: true });

  try {
    const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

    // Buscar dados do pagamento no MP
    const pagResp = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
    const pagamento = await pagResp.json();

    if (pagamento.status !== "approved") {
      return res.status(200).json({ ok: true, status: pagamento.status });
    }

    const user_id = pagamento.external_reference;
    const valor = pagamento.transaction_amount;

    // Registrar transação no Supabase
    await sb.from("transacoes").insert({
      user_id,
      tipo: "recarga",
      creditos: 0,
      valor,
      status: "aprovado",
      mp_payment_id: String(data.id),
    });

    return res.status(200).json({ ok: true });
  } catch (erro) {
    console.error("[Webhook Error]", erro.message);
    return res.status(500).json({ erro: erro.message });
  }
}
