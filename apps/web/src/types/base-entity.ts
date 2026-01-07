import type { Seo } from "./seo";

// Base entity type that Place and Event share
export type BaseEntity = {
  id: string;
  slug: string;
  tenantSlug?: string | null;
  name: string;
  description?: string;
  heroImage?: string;
  gallery?: string[];
  location?: { lat: number; lng: number };
  category?: string | null;
  tags?: string[];
  seo?: Seo;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// Entity type discriminator
export type EntityType = "place" | "event";

// Extended base entity with type discriminator
export type TypedEntity = BaseEntity & {
  type: EntityType;
};

