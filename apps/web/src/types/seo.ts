export type Seo = {
    title: string;
    description: string;
    image?: string;
    keywords?: string[];

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
  };
