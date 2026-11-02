export type Seo = {
  title: string;
  description: string;
  image?: string;
  keywords?: string[];
  /** Effective crawl flag for this page (global switch already applied). */
  indexable?: boolean;

  canonical?: string;
  robots?: string;

  og?: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
  };

  twitter?: {
    card?: "summary" | "summary_large_image";
    title?: string;
    description?: string;
    image?: string;
  };

  // Schema.org structured data
  schemaOrg?: {
    type:
      | "LocalBusiness"
      | "TouristAttraction"
      | "Event"
      | "Article"
      | "WebPage"
      | "WebSite"
      | "Organization"
      | "BreadcrumbList"
      | "Graph";
    data: any; // Schema-specific data
  };
};
