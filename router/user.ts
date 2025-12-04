import express from "express"
import { ShopModel } from "../models/shopModel"
import { UserModel } from "../models/userModel"


const router = express.Router()

router.post("/shoplist", async (req, res) => {
  try {
    const { user_id } = req.body

    if (!user_id) {
      return res.status(400).json({ success: false, message: "user_id é obrigatório" })
    }

    const stores = await ShopModel.find({ user_id })

    if (stores.length === 0) {
      return res.status(200).json({ success: false, stores: [] })
    }

    return res.status(200).json({ success: true, stores })

  } catch {
    return res.status(500).json({ success: false })
  }
})

router.get("/userlist", async (req, res) =>{
    const users = await UserModel.find()

    res.send(users)
})

export default router