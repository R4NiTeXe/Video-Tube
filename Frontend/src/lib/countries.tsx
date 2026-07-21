export const COUNTRIES = [
  { code: "+91", iso: "in", name: "India" },
  { code: "+1", iso: "us", name: "United States" },
  { code: "+44", iso: "gb", name: "United Kingdom" },
  { code: "+61", iso: "au", name: "Australia" },
  { code: "+81", iso: "jp", name: "Japan" },
  { code: "+82", iso: "kr", name: "South Korea" },
  { code: "+86", iso: "cn", name: "China" },
  { code: "+49", iso: "de", name: "Germany" },
  { code: "+33", iso: "fr", name: "France" },
  { code: "+39", iso: "it", name: "Italy" },
  { code: "+34", iso: "es", name: "Spain" },
  { code: "+55", iso: "br", name: "Brazil" },
  { code: "+7", iso: "ru", name: "Russia" },
  { code: "+971", iso: "ae", name: "UAE" },
  { code: "+966", iso: "sa", name: "Saudi Arabia" },
  { code: "+65", iso: "sg", name: "Singapore" },
  { code: "+60", iso: "my", name: "Malaysia" },
  { code: "+66", iso: "th", name: "Thailand" },
  { code: "+62", iso: "id", name: "Indonesia" },
  { code: "+63", iso: "ph", name: "Philippines" },
  { code: "+84", iso: "vn", name: "Vietnam" },
  { code: "+880", iso: "bd", name: "Bangladesh" },
  { code: "+94", iso: "lk", name: "Sri Lanka" },
  { code: "+977", iso: "np", name: "Nepal" },
  { code: "+92", iso: "pk", name: "Pakistan" },
  { code: "+234", iso: "ng", name: "Nigeria" },
  { code: "+27", iso: "za", name: "South Africa" },
  { code: "+52", iso: "mx", name: "Mexico" },
  { code: "+1", iso: "ca", name: "Canada" },
  { code: "+64", iso: "nz", name: "New Zealand" },
];

const COUNTRY_NAMES: Record<string, string> = {
  in: "India", us: "United States", gb: "United Kingdom", au: "Australia",
  jp: "Japan", kr: "South Korea", cn: "China", de: "Germany",
  fr: "France", it: "Italy", es: "Spain", br: "Brazil",
  ru: "Russia", ae: "UAE", sa: "Saudi Arabia", sg: "Singapore",
  my: "Malaysia", th: "Thailand", id: "Indonesia", ph: "Philippines",
  vn: "Vietnam", bd: "Bangladesh", lk: "Sri Lanka", np: "Nepal",
  pk: "Pakistan", ng: "Nigeria", za: "South Africa", mx: "Mexico",
  ca: "Canada", nz: "New Zealand",
};

export const FlagImg = ({ iso, size = 20 }: { iso: string; size?: number }) => (
  <img
    src={`https://flagcdn.com/${iso.toLowerCase()}.svg`}
    alt={`${COUNTRY_NAMES[iso.toLowerCase()] || iso.toUpperCase()} flag`}
    width={size}
    height={Math.round(size * 0.75)}
    style={{ borderRadius: 2, objectFit: "cover", flexShrink: 0 }}
  />
);
