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

type State = {
  loading: boolean;
  error?: string;
  site?: SiteDashboard;
  place?: PlaceDashboard;
  event?: EventDashboard;
  fetchSite: (range: Range, lang?: string) => Promise<void>;
  fetchPlace: (placeId: string, range: Range, lang?: string) => Promise<void>;
  fetchEvent: (eventId: string, range: Range, lang?: string) => Promise<void>;
};

export const useAnalyticsStore = create<State>((set) => ({
  loading: false,
  error: undefined,
  site: undefined,
  place: undefined,
  event: undefined,

  fetchSite: async (range, lang = "hu") => {
    set({ loading: true, error: undefined });
    try {
      const data = await apiGet<SiteDashboard>(`/${lang}/analytics/site?range=${range}`);
      set({ site: data, loading: false });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to fetch analytics";
      set({ error: errorMessage, loading: false });
    }
  },

  fetchPlace: async (placeId, range, lang = "hu") => {
    set({ loading: true, error: undefined });
    try {
      const data = await apiGet<PlaceDashboard>(`/${lang}/analytics/place/${placeId}?range=${range}`);
      set({ place: data, loading: false });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to fetch analytics";
      set({ error: errorMessage, loading: false });
    }
  },

  fetchEvent: async (eventId, range, lang = "hu") => {
    set({ loading: true, error: undefined });
    try {
      const data = await apiGet<EventDashboard>(`/${lang}/analytics/event/${eventId}?range=${range}`);
      set({ event: data, loading: false });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to fetch analytics";
      set({ error: errorMessage, loading: false });
    }
  },
}));
