export type IsoCountry = {
  code: string;
  label: string;
};

/** Used when Intl.supportedValuesOf("region") is missing or throws. */
const ISO_ALPHA2 = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AR","AT","AU","AW","AX","AZ",
  "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BW","BY","BZ",
  "CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ",
  "DE","DJ","DK","DM","DO","DZ",
  "EC","EE","EG","ER","ES","ET",
  "FI","FJ","FK","FM","FO","FR",
  "GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GT","GU","GW","GY",
  "HK","HN","HR","HT","HU",
  "ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT",
  "JE","JM","JO","JP",
  "KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ",
  "LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY",
  "MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ",
  "NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ",
  "OM",
  "PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY",
  "QA",
  "RE","RO","RS","RU","RW",
  "SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ",
  "TC","TD","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ",
  "UA","UG","US","UY","UZ",
  "VA","VC","VE","VG","VI","VN","VU",
  "WF","WS",
  "YE","YT",
  "ZA","ZM","ZW",
];

function regionCodes(): string[] {
  try {
    if (typeof Intl.supportedValuesOf !== "function") return ISO_ALPHA2;
    const supported = Intl.supportedValuesOf("region").filter((code) => /^[A-Z]{2}$/.test(code));
    return supported.length > 0 ? supported : ISO_ALPHA2;
  } catch {
    return ISO_ALPHA2;
  }
}

function regionLabel(display: Intl.DisplayNames | null, code: string): string {
  if (!display) return code;
  try {
    return display.of(code) || code;
  } catch {
    return code;
  }
}

/** ISO 3166-1 alpha-2 names for the active UI language. Intl owns the translations. */
export function isoCountries(lang: string): IsoCountry[] {
  const locale = lang || "en";
  let display: Intl.DisplayNames | null = null;
  try {
    display = new Intl.DisplayNames([locale], { type: "region" });
  } catch {
    display = null;
  }
  return regionCodes()
    .map((code) => ({ code, label: regionLabel(display, code) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
}
