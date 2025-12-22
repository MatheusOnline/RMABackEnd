import express from "express";

const router = express.Router();

router.post("/shopee", (req, res) => {
  console.log("📩 CHEGOU DA SHOPEE");
  console.log(req.body);

  // 🔐 mensagem de verificação
  if (req.body.code === 0) {
    return res.status(200).json({
      code: 0,
      message: "success"
    });
  }

  // eventos normais
  res.status(200).json({ ok: true });
});


export default router;
