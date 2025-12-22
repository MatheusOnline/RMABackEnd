import express from "express";

const router = express.Router();

router.post("/shopee", (req, res) => {
  console.log("📩 CHEGOU DA SHOPEE");
  console.log(req.body);

  res.status(200).json({ ok: true });
});

export default router;
