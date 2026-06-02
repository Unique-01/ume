import { Request, Response } from "express";

export const processMedia = (req: Request, res: Response) => {
    return res.json({ message: "Media processed successfully" });
};
