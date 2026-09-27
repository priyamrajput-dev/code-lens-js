import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../services/auth.service.js";
import { UnauthorizedError } from "../utils/app-error.js";

export const requireAuth = async (req, _res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user) {
      throw new UnauthorizedError("Authentication required");
    }

    req.session = session;
    next();
  } catch (error) {
    next(error);
  }
};
