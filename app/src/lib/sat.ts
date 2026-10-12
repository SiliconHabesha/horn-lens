// Satellitenbilder: Angaben, die sich aus dem Produktnamen ergeben, und Links zum Produkt.
// Tests: tests/unit/lib.test.mjs
// Sentinel-2-Produktnamen enden mit dem Zeitpunkt, zu dem ESA das Produkt erzeugt hat (…_20261011T111907)
export const processedOf = (item: string) => {
  const m = /_(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(item || "");
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : null;
};
/** Dieselbe Stelle im Copernicus Browser der ESA (frei zugänglich, ohne Anmeldung zum Ansehen), am Aufnahmetag */
export const copernicusUrl = (lat: number, lon: number, iso: string) => {
  const d = iso.slice(0, 10);
  return `https://browser.dataspace.copernicus.eu/?zoom=13&lat=${lat.toFixed(4)}&lng=${lon.toFixed(4)}&themeId=DEFAULT-THEME&datasetId=S2_L2A_CDAS&fromTime=${d}T00%3A00%3A00.000Z&toTime=${d}T23%3A59%3A59.999Z&layerId=1_TRUE_COLOR`;
};
export const stacUrl = (item: string) => `https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-2-l2a/items/${encodeURIComponent(item)}`;
