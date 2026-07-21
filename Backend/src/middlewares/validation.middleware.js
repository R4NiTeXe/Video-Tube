import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";

const assignRequestProp = (req, prop, value) => {
  Object.defineProperty(req, prop, {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
};

export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      if (schema.params) {
        assignRequestProp(req, "params", await schema.params.parseAsync(req.params));
      }
      if (schema.query) {
        assignRequestProp(req, "query", await schema.query.parseAsync(req.query));
      }
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = Array.isArray(error.issues) ? error.issues : error.errors || [];
        const details = issues.map((err) => ({
          field: Array.isArray(err.path) ? err.path.join(".") : String(err.path || ""),
          message: err.message,
          code: err.code,
        }));
        throw new ApiError(400, "Validation failed", details);
      }
      next(error);
    }
  };
};

export const validateParams = (schema) => validate({ params: schema });
export const validateQuery = (schema) => validate({ query: schema });
export const validateBody = (schema) => validate({ body: schema });
export const validateAll = (schemas) => validate(schemas);