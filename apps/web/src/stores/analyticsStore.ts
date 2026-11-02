import { create } from "zustand";
import { apiGet } from "../api/client";

type Range = 7 | 30 | 90;

type SiteDashboard = {
  scope: "site";
  days: number;
  summary: {
    pageViews: number;
    placeViews: number;
    ctaPhone: number;
    ctaEmail: number;
    ctaWebsite: number;
    ctaMaps: number;
    ctaFloorplan: number;
  };
  timeseries: Array<{
    day: string;
    pageViews: number;
    placeViews: number;
    ctaTotal: number;
  }>;
  ctaBreakdown: {
    ctaPhone: number;
    ctaEmail: number;
    ctaWebsite: number;
    ctaMaps: number;
    ctaFloorplan: number;
  };
  topPlaces: Array<{
    placeId: string;
    name: string;
    placeViews: number;
    ctaTotal: number;
  }>;
};

type PlaceDashboard = {
  scope: "place";
  placeId: string;
  days: number;
  summary: {
    placeViews: number;
    ctaPhone: number;
    ctaEmail: number;
    ctaWebsite: number;
    ctaMaps: number;
    ctaFloorplan: number;
    ctaTotal: number;
    conversionPct: number;
  };
  timeseries: Array<{
    day: string;
    placeViews: number;
    ctaTotal: number;
  }>;
  ctaBreakdown: {
    ctaPhone: number;
    ctaEmail: number;
    ctaWebsite: number;
    ctaMaps: number;
    ctaFloorplan: number;
  };
  productClicks: Array<{
    productId: string;
    name: string;
    clicks: number;
  }>;
};

type EventDashboard = {
  scope: "event";
  eventId: string;
  days: number;
  summary: {
    eventViews: number;
    ctaPhone: number;
    ctaEmail: number;
    ctaWebsite: number;
    ctaMaps: number;
    ctaFloorplan: number;
    ctaTotal: number;
    conversionPct: number;
  };
  timeseries: Array<{
    day: string;
    eventViews: number;
    ctaTotal: number;
  }>;
  ctaBreakdown: {
    ctaPhone: number;
    ctaEmail: number;
    ctaWebsite: number;
    ctaMaps: number;
    ctaFloorplan: number;
  };
};

type TownDashboard = {
  scope: "town";
  townId: string;
  days: number;
  summary: {
    pageViews: number;
    placeViews: number;
    ctaPhone: number;
    ctaEmail: number;
    ctaWebsite: number;
    ctaMaps: number;
    ctaFloorplan: number;
  };
  timeseries: Array<{
    day: string;
    pageViews: number;
    placeViews: number;
    ctaTotal: number;
  }>;
  ctaBreakdown: {
    ctaPhone: number;
    ctaEmail: number;
    ctaWebsite: number;
    ctaMaps: number;
    ctaFloorplan: number;
  };
  topPlaces: Array<{
    placeId: string;
    name: string;
    placeViews: number;
    ctaTotal: number;
  }>;
};

type GlobalDashboard = {
  scope: "global";
  days: number;
  summary: {
    pageViews: number;
    placeViews: number;
    ctaPhone: number;
    ctaEmail: number;
    ctaWebsite: number;
    ctaMaps: number;
    ctaFloorplan: number;
  };
  timeseries: Array<{
    day: string;
    pageViews: number;
    placeViews: number;
    ctaTotal: number;
  }>;
  ctaBreakdown: {
    ctaPhone: number;
    ctaEmail: number;
    ctaWebsite: number;
    ctaMaps: number;
    ctaFloorplan: number;
  };
  topSites: Array<{
    siteId: string;
    name: string;
    pageViews: number;
    placeViews: number;
    ctaTotal: number;
  }>;
  topPlaces: Array<{
    placeId: string;
    name: string;
    placeViews: number;
    ctaTotal: number;
  }>;
};

type State = {
  loading: boolean;
  error?: string;
  site?: SiteDashboard;
  place?: PlaceDashboard;
  event?: EventDashboard;
  town?: TownDashboard;
  global?: GlobalDashboard;
  fetchSite: (range: Range, lang?: string, siteKey?: string) => Promise<void>;
  fetchPlace: (placeId: string, range: Range, lang?: string) => Promise<void>;
  fetchEvent: (eventId: string, range: Range, lang?: string) => Promise<void>;
  fetchTown: (townId: string, range: Range, lang?: string) => Promise<void>;
  fetchGlobal: (range: Range, lang?: string) => Promise<void>;
};

export const useAnalyticsStore = create<State>((set) => ({
  loading: false,
  error: undefined,
  site: undefined,
  place: undefined,
  event: undefined,
  town: undefined,
  global: undefined,

  fetchSite: async (range, lang = "hu", siteKey) => {
    set({ loading: true, error: undefined });
    try {
      const key = siteKey ? `&siteKey=${encodeURIComponent(siteKey)}` : "";
      const data = await apiGet<SiteDashboard>(`/${lang}/analytics/site?range=${range}${key}`);
      set({ site: data, loading: false });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to fetch analytics";
      set({ error: errorMessage, loading: false });
    }
  },

  fetchPlace: async (placeId, range, lang = "hu") => {
    set({ loading: true, error: undefined });
    try {
      const data = await apiGet<PlaceDashboard>(
        `/${lang}/analytics/place/${placeId}?range=${range}`
      );
      set({ place: data, loading: false });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to fetch analytics";
      set({ error: errorMessage, loading: false });
    }
  },

  fetchEvent: async (eventId, range, lang = "hu") => {
    set({ loading: true, error: undefined });
    try {
      const data = await apiGet<EventDashboard>(
        `/${lang}/analytics/event/${eventId}?range=${range}`
      );
      set({ event: data, loading: false });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to fetch analytics";
      set({ error: errorMessage, loading: false });
    }
  },

  fetchTown: async (townId, range, lang = "hu") => {
    set({ loading: true, error: undefined });
    try {
      const data = await apiGet<TownDashboard>(
        `/${lang}/analytics/town/${townId}?range=${range}`
      );
      set({ town: data, loading: false });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to fetch analytics";
      set({ error: errorMessage, loading: false });
    }
  },

  fetchGlobal: async (range, lang = "hu") => {
    set({ loading: true, error: undefined });
    try {
      const data = await apiGet<GlobalDashboard>(`/${lang}/analytics/global?range=${range}`);
      set({ global: data, loading: false });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to fetch analytics";
      set({ error: errorMessage, loading: false });
    }
  },
}));
