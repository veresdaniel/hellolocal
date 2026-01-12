// TypeScript declaration to extend Express Request type
import { SiteCtx } from "../middleware/site-resolve.middleware";

declare global {
  namespace Express {
    interface Request {
      site?: SiteCtx;
    }
  }
}

export {};
