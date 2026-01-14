/**
 * Centralized error message constants
 * These should be used instead of hardcoded strings in exceptions
 * Frontend will handle i18n translation based on error codes
 */

export const ERROR_MESSAGES = {
  // Permission errors
  FORBIDDEN_VIEW_PLACE_SUBSCRIPTION: "errors.forbidden.viewPlaceSubscription",
  FORBIDDEN_VIEW_PLACE_ENTITLEMENTS: "errors.forbidden.viewPlaceEntitlements",
  FORBIDDEN_VIEW_SITE_SUBSCRIPTION: "errors.forbidden.viewSiteSubscription",
  FORBIDDEN_VIEW_SITE_ENTITLEMENTS: "errors.forbidden.viewSiteEntitlements",
  FORBIDDEN_UPDATE_SUBSCRIPTION: "errors.forbidden.updateSubscription",
  FORBIDDEN_UPDATE_SITE_SUBSCRIPTION: "errors.forbidden.updateSiteSubscription",
  FORBIDDEN_MANAGE_PLACE_MEMBERSHIPS: "errors.forbidden.managePlaceMemberships",
  FORBIDDEN_ASSIGN_OWNER_ROLE: "errors.forbidden.assignOwnerRole",
  FORBIDDEN_MODIFY_OWNER_ROLE: "errors.forbidden.modifyOwnerRole",
  FORBIDDEN_ACTOR_NOT_FOUND: "errors.forbidden.actorNotFound",
  FORBIDDEN_ACTOR_NO_PERMISSION_MANAGE_MEMBERSHIPS: "errors.forbidden.actorNoPermissionManageMemberships",
  FORBIDDEN_MANAGER_CANNOT_ASSIGN_OWNER: "errors.forbidden.managerCannotAssignOwner",
  FORBIDDEN_MANAGER_CANNOT_MODIFY_OWNER: "errors.forbidden.managerCannotModifyOwner",
  FORBIDDEN_EDITOR_CANNOT_MANAGE_MEMBERSHIPS: "errors.forbidden.editorCannotManageMemberships",
  FORBIDDEN_MANAGER_CANNOT_DELETE_OWNER: "errors.forbidden.managerCannotDeleteOwner",
  
  // Not found errors
  NOT_FOUND_USER: "errors.notFound.user",
  NOT_FOUND_CATEGORY: "errors.notFound.category",
  NOT_FOUND_PARENT_CATEGORY: "errors.notFound.parentCategory",
  NOT_FOUND_PLACE: "errors.notFound.place",
  NOT_FOUND_SITE: "errors.notFound.site",
  NOT_FOUND_SUBSCRIPTION: "errors.notFound.subscription",
  NOT_FOUND_LEGAL_PAGE: "errors.notFound.legalPage",
  NOT_FOUND_LEGAL_PAGE_TRANSLATION: "errors.notFound.legalPageTranslation",
  NOT_FOUND_TOWN: "errors.notFound.town",
  NOT_FOUND_TAG: "errors.notFound.tag",
  NOT_FOUND_STATIC_PAGE: "errors.notFound.staticPage",
  NOT_FOUND_PRICE_BAND: "errors.notFound.priceBand",
  NOT_FOUND_BRAND: "errors.notFound.brand",
  NOT_FOUND_SLUG: "errors.notFound.slug",
  NOT_FOUND_SITE_KEY: "errors.notFound.siteKey",
  
  // Bad request errors
  BAD_REQUEST_CATEGORY_PARENT_SELF: "errors.badRequest.categoryParentSelf",
  BAD_REQUEST_CATEGORY_CIRCULAR_REFERENCE: "errors.badRequest.categoryCircularReference",
  BAD_REQUEST_CATEGORIES_NOT_FOUND: "errors.badRequest.categoriesNotFound",
  BAD_REQUEST_PARENT_CATEGORIES_NOT_FOUND: "errors.badRequest.parentCategoriesNotFound",
  BAD_REQUEST_CIRCULAR_REFERENCE_DETECTED: "errors.badRequest.circularReferenceDetected",
  BAD_REQUEST_CATEGORIES_NOT_FOUND_UPDATE: "errors.badRequest.categoriesNotFoundUpdate",
  BAD_REQUEST_SUBSCRIPTION_ALREADY_CANCELLED: "errors.badRequest.subscriptionAlreadyCancelled",
  BAD_REQUEST_SUBSCRIPTION_NOT_CANCELLED: "errors.badRequest.subscriptionNotCancelled",
  BAD_REQUEST_INVALID_LANG: "errors.badRequest.invalidLang",
  BAD_REQUEST_LANG_REQUIRED: "errors.badRequest.langRequired",
  BAD_REQUEST_USER_ID_REQUIRED: "errors.badRequest.userIdRequired",
  BAD_REQUEST_2FA_NOT_SETUP: "errors.badRequest.2FANotSetup",
  BAD_REQUEST_2FA_DEPENDENCIES_NOT_INSTALLED: "errors.badRequest.2FADependenciesNotInstalled",
  BAD_REQUEST_2FA_QR_CODE_NOT_AVAILABLE: "errors.badRequest.2FAQRCodeNotAvailable",
  BAD_REQUEST_INVALID_LOGO_URL: "errors.badRequest.invalidLogoUrl",
  BAD_REQUEST_INVALID_FAVICON_URL: "errors.badRequest.invalidFaviconUrl",
  BAD_REQUEST_FEATURED_UNTIL_FUTURE: "errors.badRequest.featuredUntilFuture",
  BAD_REQUEST_PLAN_IMAGE_LIMIT: "errors.badRequest.planImageLimit",
  BAD_REQUEST_PLAN_FEATURED_NOT_SUPPORTED: "errors.badRequest.planFeaturedNotSupported",
  BAD_REQUEST_SLUG_CONFLICT: "errors.badRequest.slugConflict",
  BAD_REQUEST_UNSUPPORTED_LEGAL_PAGE: "errors.badRequest.unsupportedLegalPage",
  BAD_REQUEST_CATEGORY_CANNOT_BE_PARENT: "errors.badRequest.categoryCannotBeParent",
  BAD_REQUEST_CATEGORIES_NOT_FOUND_OR_NOT_BELONG: "errors.badRequest.categoriesNotFoundOrNotBelong",
  BAD_REQUEST_PARENT_CATEGORIES_NOT_FOUND_OR_NOT_BELONG: "errors.badRequest.parentCategoriesNotFoundOrNotBelong",
  
  // Unauthorized errors
  UNAUTHORIZED_DISABLE_OWN_2FA: "errors.unauthorized.disableOwn2FA",
  
  // Internal errors
  INTERNAL_ERROR: "errors.internal.error",
  INTERNAL_OAUTH_ERROR: "errors.internal.oauthError",
} as const;

export type ErrorMessageKey = typeof ERROR_MESSAGES[keyof typeof ERROR_MESSAGES];
