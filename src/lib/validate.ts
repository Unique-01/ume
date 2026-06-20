import { Request, Response, NextFunction } from "express";
import { ZodType, ZodError } from "zod";

export const validate =
    (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            return res.status(422).json({
                status: "error",
                message: "Validation failed",
                errors: formatZodErrors(result.error),
            });
        }

        req.body = result.data;
        next();
    };

const formatZodErrors = (error: ZodError) => {
    return error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
    }));
};
