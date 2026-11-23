/**
 * Google OAuth guard that forwards a signed-looking `state` (return origin / lang / mode).
 */
import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import {
  decodeOAuthReturnState,
  encodeOAuthReturnState,
  type OAuthReturnMode,
} from "../oauth-return.util";
import { langOrDefault } from "../../common/lang";
import { frontendOrigin, publicOriginFromHeaders } from "../../seo/public-path.util";

@Injectable()
export class GoogleAuthGuard extends AuthGuard("google") {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    // Callback already carries Google's state — do not rebuild it.
    if (req.path?.includes("/google/callback") || req.url?.includes("/google/callback")) {
      return {};
    }

    const existing = decodeOAuthReturnState(req.query.state);
    if (existing) {
      return { state: encodeOAuthReturnState(existing), session: false };
    }

    const originRaw =
      typeof req.query.returnOrigin === "string" && req.query.returnOrigin
        ? req.query.returnOrigin
        : publicOriginFromHeaders({
            host: req.headers.host,
            "x-forwarded-host": req.headers["x-forwarded-host"],
            "x-forwarded-proto": req.headers["x-forwarded-proto"],
          }) || frontendOrigin();

    let origin = frontendOrigin();
    try {
      origin = new URL(String(originRaw)).origin;
    } catch {
      // keep frontendOrigin
    }

    const mode: OAuthReturnMode = req.query.mode === "visitor" ? "visitor" : "admin";
    const lang = langOrDefault(
      typeof req.query.lang === "string" ? req.query.lang : undefined
    );

    return {
      state: encodeOAuthReturnState({ origin, lang, mode }),
      session: false,
    };
  }
}
