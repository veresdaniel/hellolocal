/**
 * Google OAuth guard: packs return origin into `state`, and uses a same-origin
 * callbackURL so Google brands the consent screen with that public host.
 */
import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import {
  decodeOAuthReturnState,
  defaultGoogleCallbackUrl,
  encodeOAuthReturnState,
  googleCallbackUrlForOrigin,
  type OAuthReturnMode,
} from "../oauth-return.util";
import { langOrDefault } from "../../common/lang";
import { frontendOrigin, publicOriginFromHeaders } from "../../seo/public-path.util";

@Injectable()
export class GoogleAuthGuard extends AuthGuard("google") {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const isCallback =
      req.path?.includes("/google/callback") || req.url?.includes("/google/callback");

    if (isCallback) {
      // Token exchange requires the exact redirect_uri from the authorize step.
      const hostOrigin = publicOriginFromHeaders({
        host: req.headers.host,
        "x-forwarded-host": req.headers["x-forwarded-host"],
        "x-forwarded-proto": req.headers["x-forwarded-proto"],
      });
      return {
        callbackURL: hostOrigin
          ? googleCallbackUrlForOrigin(hostOrigin)
          : defaultGoogleCallbackUrl(),
        session: false,
      };
    }

    const existing = decodeOAuthReturnState(req.query.state);
    if (existing) {
      return {
        state: encodeOAuthReturnState(existing),
        callbackURL: googleCallbackUrlForOrigin(existing.origin),
        session: false,
      };
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
      callbackURL: googleCallbackUrlForOrigin(origin),
      session: false,
    };
  }
}
