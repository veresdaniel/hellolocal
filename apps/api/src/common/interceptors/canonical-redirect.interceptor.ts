import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Observable, from } from "rxjs";
import { switchMap, tap } from "rxjs/operators";
import { Request, Response } from "express";
import { ResolveService } from "../../site/resolve.service";

/**
 * Interceptor that handles canonical URL redirects for public endpoints.
 * 
 * This interceptor:
 * 1. Checks if the request is for a slug-based detail endpoint
 * 2. Resolves the slug to get canonical URL information BEFORE processing the request
 * 3. If the current URL is not canonical, returns a 301 redirect to the canonical URL
 * 
 * Works with:
 * - GET /api/public/:lang/:tenantKey/places/:slug
 * - GET /api/public/:lang/:tenantKey/events/:slug
 * - GET /api/public/:lang/:tenantKey/resolve/:slug
 * - GET /api/public/:lang/:tenantKey/static-pages/:slug (if applicable)
 * 
 * Note: This only applies to slug-based endpoints, not by-id endpoints.
 */
@Injectable()
export class CanonicalRedirectInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CanonicalRedirectInterceptor.name);

  constructor(private readonly resolveService: ResolveService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Only process GET requests to public endpoints
    if (request.method !== "GET" || !request.path.startsWith("/api/public/")) {
      return next.handle();
    }

    // Extract route parameters
    const lang = request.params.lang;
    const siteKey = request.params.siteKey || request.params.tenantKey; // Support both for backward compatibility
    const slug = request.params.slug;

    // Only process if we have all required parameters for slug resolution
    if (!lang || !siteKey || !slug) {
      return next.handle();
    }

    // Skip by-id endpoints (they don't need redirects)
    if (request.path.includes("/by-id/")) {
      return next.handle();
    }

    // Skip list endpoints (they don't have slugs)
    // Check if this is a list endpoint (no slug at the end, or ends with the entity type)
    const pathParts = request.path.split("/");
    const lastPart = pathParts[pathParts.length - 1];
    const entityTypes = ["places", "events", "static-pages", "tenants", "legal"];
    if (entityTypes.includes(lastPart) || !slug) {
      return next.handle();
    }

    // Resolve the slug BEFORE processing the request to check for redirects
    return from(
      this.resolveService.resolve({
        lang,
        siteKey,
        slug,
      })
    ).pipe(
      switchMap((resolved) => {
        // If redirect is needed, send HTTP 301 redirect immediately
        if (resolved.needsRedirect) {
          // Determine the entity type to build the correct canonical URL
          const entityPath = this.getEntityPath(resolved.entityType);
          const canonicalUrl = `/api/public/${resolved.canonical.lang}/${resolved.canonical.siteKey}${entityPath}/${resolved.canonical.slug}`;
          
          // Preserve query string
          const queryString = request.url.includes("?") 
            ? request.url.substring(request.url.indexOf("?")) 
            : "";
          const fullCanonicalUrl = canonicalUrl + queryString;

          this.logger.log(
            `Redirecting ${request.path} -> ${fullCanonicalUrl} (301)`
          );

          // Send 301 Permanent Redirect
          response.redirect(HttpStatus.MOVED_PERMANENTLY, fullCanonicalUrl);
          
          // Return empty observable - redirect was sent, don't process the request
          return new Observable((subscriber) => {
            subscriber.complete();
          });
        }

        // No redirect needed, continue with normal request processing
        return next.handle();
      }),
      tap({
        error: (error) => {
          // If resolution fails, log and continue with normal response
          this.logger.warn(
            `Failed to resolve slug for redirect check: ${request.path}`,
            error instanceof Error ? error.stack : String(error)
          );
        },
      })
    );
  }

  /**
   * Maps entity type to the correct API path segment.
   */
  private getEntityPath(entityType: string): string {
    const entityPathMap: Record<string, string> = {
      place: "/places",
      event: "/events",
      town: "/towns",
      page: "/static-pages",
      // Add more entity types as needed
    };
    return entityPathMap[entityType] || "";
  }
}
