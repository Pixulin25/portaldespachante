/**
 * ============================================================
 *  Portal Despachante — Notificação de Novo Cadastro
 *  Arquivo: /api/notificar-cadastro.js
 *  Rota: /api/notificar-cadastro
 *
 *  Chamado automaticamente pelo Supabase (Database Webhook)
 *  sempre que uma nova linha é inserida na tabela "profiles".
 *  Envia um e-mail ao admin a avisar do novo cadastro.
 * ============================================================
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_ADMIN = "assessoria.libra@gmail.com";
const EMAIL_REMETENTE = "Portal Despachante <contato@portaldespachante.online>";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });

  if (!RESEND_API_KEY) {
    return res.status(500).json({ erro: "RESEND_API_KEY não configurada" });
  }

  try {
    // O Supabase Database Webhook envia { type, table, record, old_record, schema }
    const payload = req.body || {};
    const novo = payload.record || payload;

    const nome = novo.nome || "Sem nome informado";
    const email = novo.email || "Sem e-mail";
    const whatsapp = novo.whatsapp || novo.telefone || "—";
    const cpfCnpj = novo.cpf_cnpj || "—";
    const dataHora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f4f7fb;">
        <div style="background:#000080;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;">
          <h2 style="margin:0;font-size:18px;">🆕 Novo cadastro no Portal Despachante</h2>
        </div>
        <div style="background:#fff;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;">
          <p style="margin:0 0 12px;color:#333;">Um novo cliente acabou de se registar na plataforma:</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333;">
            <tr><td style="padding:6px 0;font-weight:bold;width:120px;">Nome</td><td style="padding:6px 0;">${nome}</td></tr>
            <tr><td style="padding:6px 0;font-weight:bold;">E-mail</td><td style="padding:6px 0;">${email}</td></tr>
            <tr><td style="padding:6px 0;font-weight:bold;">WhatsApp</td><td style="padding:6px 0;">${whatsapp}</td></tr>
            <tr><td style="padding:6px 0;font-weight:bold;">CPF/CNPJ</td><td style="padding:6px 0;">${cpfCnpj}</td></tr>
            <tr><td style="padding:6px 0;font-weight:bold;">Data/Hora</td><td style="padding:6px 0;">${dataHora}</td></tr>
          </table>
          <p style="margin-top:16px;font-size:12px;color:#888;">Este cliente ainda precisa de confirmar o e-mail antes de conseguir entrar na plataforma.</p>
        </div>
      </div>
    `;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_REMETENTE,
        to: [EMAIL_ADMIN],
        subject: `🆕 Novo cadastro: ${nome}`,
        html,
      }),
    });

    const dados = await resp.json();
    if (!resp.ok) {
      console.log("[Resend erro]", JSON.stringify(dados));
      return res.status(502).json({ erro: dados?.message || "Erro ao enviar e-mail" });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.log("[notificar-cadastro erro]", e.message);
    return res.status(500).json({ erro: e.message });
  }
}
