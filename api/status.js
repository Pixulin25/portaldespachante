export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    chave_configurada: !!process.env.CHAVE_PORTAL_DESPACHANTES,
    chave_tamanho: process.env.CHAVE_PORTAL_DESPACHANTES?.length || 0,
    node_version: process.version,
  });
}
