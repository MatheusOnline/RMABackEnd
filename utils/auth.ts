import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

interface JwtPayload {
  id: string
  userName: string
}

export const auth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization

  if (!authHeader)
    return res.status(401).json({ message: "Token não enviado" })

  const token = authHeader.split(" ")[1]

  try {
    const decoded = jwt.verify(
      token,
      process.env.SECRET_KEY as string
    ) as JwtPayload

    // adiciona tipado no req
    ;(req as any).userId = decoded.id

    next()
  } catch {
    return res.status(401).json({success: false,  message: "Token inválido ou expirado" })
  }
}
