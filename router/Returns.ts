import express from "express";

const router = express.Router();

router.get("/teste", (req, res) =>{
    res.send("teste usnado o router")
})

export default router;