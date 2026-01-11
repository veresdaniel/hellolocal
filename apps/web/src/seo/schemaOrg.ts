/**
 * Schema.org JSON-LD helper functions
 * Generates structured data for search engines
 */

export interface PlaceSchemaData {
  name: string;
  description?: string;
  image?: string;
  url: string;
  address?: string;
  telephone?: string;
  email?: string;
  url?: string;
  sameAs?: string[]; // Social media URLs
  geo?: {
    latitude: number;
    longitude: number;
  };
  openingHoursSpecification?: Array<{
    dayOfWeek: string; // "Monday", "Tuesday", etc.
    opens?: string; // "HH:mm"
    closes?: string; // "HH:mm"
  }>;
  priceRange?: string;
}

export interface EventSchemaData {
  name: string;
  description?: string;
  image?: string;
  url: string;
  startDate: string; // ISO 8601
  endDate?: string; // ISO 8601
  location?: {
    name?: string;
    address?: string;
    geo?: {
      latitude: number;
      longitude: number;
    };
  };
  organizer?: {
    name?: string;
    url?: string;
  };
}

export interface ArticleSchemaData {
  headline: string;
  description?: string;
  image?: string;
  url: string;
  datePublished?: string; // ISO 8601
  dateModified?: string; // ISO 8601
  author?: {
    name: string;
  };
  publisher?: {
    name: string;
    logo?: {
      url: string;
    };
  };
}

export interface WebPageSchemaData {
  name: string;
  description?: string;
  url: string;
  inLanguage?: string;
  isPartOf?: {
    name: string;
    url: string;
  };
}

export interface WebSiteSchemaData {
  name: string;
  description?: string;
  url: string;
  potentialAction?: {
    "@type": "SearchAction";
    target: {
      "@type": "EntryPoint";
      urlTemplate: string;
    };
    "query-input": string;
  };
}

/**
 * Generate LocalBusiness schema for places
 */
export function generateLocalBusinessSchema(data: PlaceSchemaData): object {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: data.name,
  };

  if (data.description) {
    schema.description = data.description;
  }

  if (data.image) {
    schema.image = data.image;
  }

  if (data.url) {
    schema.url = data.url;
  }

  if (data.address) {
    schema.address = {
      "@type": "PostalAddress",
      streetAddress: data.address,
    };
  }

  if (data.telephone) {
    schema.telephone = data.telephone;
  }

  if (data.email) {
    schema.email = data.email;
  }

  if (data.geo) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: data.geo.latitude,
      longitude: data.geo.longitude,
    };
  }

  if (data.openingHoursSpecification && data.openingHoursSpecification.length > 0) {
    schema.openingHoursSpecification = data.openingHoursSpecification.map((oh) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: oh.dayOfWeek,
      ...(oh.opens && { opens: oh.opens }),
      ...(oh.closes && { closes: oh.closes }),
    }));
  }

  if (data.priceRange) {
    schema.priceRange = data.priceRange;
  }

  if (data.sameAs && data.sameAs.length > 0) {
    schema.sameAs = data.sameAs;
  }

  return schema;
}

/**
 * Generate Event schema for events
 */
export function generateEventSchema(data: EventSchemaData): object {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: data.name,
    startDate: data.startDate,
  };

  if (data.description) {
    schema.description = data.description;
  }

  if (data.image) {
    schema.image = data.image;
  }

  if (data.url) {
    schema.url = data.url;
  }

  if (data.endDate) {
    schema.endDate = data.endDate;
  }

  if (data.location) {
    const location: any = {
      "@type": "Place",
    };
    if (data.location.name) location.name = data.location.name;
    if (data.location.address) {
      location.address = {
        "@type": "PostalAddress",
        streetAddress: data.location.address,
      };
    }
    if (data.location.geo) {
      location.geo = {
        "@type": "GeoCoordinates",
        latitude: data.location.geo.latitude,
        longitude: data.location.geo.longitude,
      };
    }
    schema.location = location;
  }

  if (data.organizer) {
    schema.organizer = {
      "@type": "Organization",
      ...(data.organizer.name && { name: data.organizer.name }),
      ...(data.organizer.url && { url: data.organizer.url }),
    };
  }

  return schema;
}

/**
 * Generate Article schema for blog posts and articles
 */
export function generateArticleSchema(data: ArticleSchemaData): object {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data.headline,
  };

  if (data.description) {
    schema.description = data.description;
  }

  if (data.image) {
    schema.image = data.image;
  }

  if (data.url) {
    schema.url = data.url;
  }

  if (data.datePublished) {
    schema.datePublished = data.datePublished;
  }

  if (data.dateModified) {
    schema.dateModified = data.dateModified;
  }

  if (data.author) {
    schema.author = {
      "@type": "Person",
      name: data.author.name,
    };
  }

  if (data.publisher) {
    schema.publisher = {
      "@type": "Organization",
      name: data.publisher.name,
      ...(data.publisher.logo && {
        logo: {
          "@type": "ImageObject",
          url: data.publisher.logo.url,
        },
      }),
    };
  }

  return schema;
}

/**
 * Generate WebPage schema for static/legal pages
 */
export function generateWebPageSchema(data: WebPageSchemaData): object {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: data.name,
    url: data.url,
  };

  if (data.description) {
    schema.description = data.description;
  }

  if (data.inLanguage) {
    schema.inLanguage = data.inLanguage;
  }

  if (data.isPartOf) {
    schema.isPartOf = {
      "@type": "WebSite",
      name: data.isPartOf.name,
      url: data.isPartOf.url,
    };
  }

  return schema;
}

/**
 * Generate WebSite schema for homepage
 */
export function generateWebSiteSchema(data: WebSiteSchemaData): object {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: data.name,
    url: data.url,
  };

  if (data.description) {
    schema.description = data.description;
  }

  if (data.potentialAction) {
    schema.potentialAction = data.potentialAction;
  }

  return schema;
}

/**
 * Inject JSON-LD script tag into document head
 */
export function injectJsonLd(schema: object): void {
  // Remove existing schema.org script if present
  const existing = document.head.querySelector('script[type="application/ld+json"]');
  if (existing) {
    existing.remove();
  }

  // Create new script tag
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(schema, null, 2);
  document.head.appendChild(script);
}
