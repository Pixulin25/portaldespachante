export default async function handler(req, res) {
  const r = await fetch('https://api.mercadopago.com/users/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
    },
    body: JSON.stringify({ site_id: 'MLB' })
  });
  const d = await r.json();
  return res.status(200).json(d);
}
