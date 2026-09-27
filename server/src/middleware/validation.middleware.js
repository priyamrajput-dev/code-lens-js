import { ValidationError } from "../utils/app-error.js";
import { getZodFieldErrors } from "../utils/zod-error.js";

export const validate = (schema, source = "body") => {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new ValidationError("Validation failed", getZodFieldErrors(result.error)));
    }
    req.validated = result.data;
    next();
  };
};
