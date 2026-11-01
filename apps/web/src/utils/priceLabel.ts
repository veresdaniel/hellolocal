const VISITOR_PRICE_LABEL: Record<string, string> = {
  költségvetési: "Megfizethető",
  középkategória: "Közepes",
  budget: "Affordable",
  "mid-range": "Moderate",
  mittelklasse: "Mittel",
};

const PRICE_ORDER = [
  "megfizethető",
  "affordable",
  "günstig",
  "közepes",
  "moderate",
  "mittel",
  "prémium",
  "premium",
  "luxus",
  "luxury",
];

export function visitorPriceLabel(name: string) {
  return VISITOR_PRICE_LABEL[name.trim().toLowerCase()] ?? name;
}

export function comparePriceLabels(a: string, b: string) {
  const rank = (name: string) => {
    const index = PRICE_ORDER.indexOf(name.trim().toLowerCase());
    return index === -1 ? PRICE_ORDER.length : index;
  };
  return rank(a) - rank(b);
}
