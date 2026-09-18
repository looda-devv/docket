/**
 * Provincial population, for converting counts into rates.
 *
 * Source: Statistics South Africa, *Mid-year population estimates 2026*
 * (P0302), Appendix 1 — mid-2026 estimates by province.
 *   https://www.statssa.gov.za/publications/P0302/P03022026.pdf
 *
 * Crime counts on their own cannot be compared between places. Gauteng records
 * far more of almost everything than the Northern Cape does, and it would be
 * strange if it did not — it holds twelve times the people. The rate per
 * 100 000 is what the entire field uses, and it is what makes a comparison
 * mean something.
 *
 * The caveat worth stating: these are residential populations, and crime is
 * recorded where it happens rather than where the victim lives. A CBD station
 * or a tourist district serves a daytime population many times its resident
 * one, so station-level rates are systematically overstated in places people
 * travel into. Provincial rates are far less exposed to this.
 */
export const PROVINCE_POPULATION: Record<string, number> = {
  'Eastern Cape': 7_031_109,
  'Free State': 3_060_972,
  Gauteng: 16_295_325,
  'KwaZulu-Natal': 12_282_836,
  Limpopo: 6_358_667,
  Mpumalanga: 5_161_746,
  'Northern Cape': 1_381_772,
  'North West': 4_227_795,
  'Western Cape': 7_722_158,
};

/** Published national total; equals the sum of the provinces above. */
export const NATIONAL_POPULATION = 63_522_380;

export const POPULATION_SOURCE = {
  title: 'Statistics South Africa, Mid-year population estimates 2026 (P0302)',
  url: 'https://www.statssa.gov.za/publications/P0302/P03022026.pdf',
  vintage: 'mid-2026',
} as const;
