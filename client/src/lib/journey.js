// client/src/lib/journey.js

// Check/convert date
const isValidDate = (d) => !!d && !isNaN(new Date(d));
const asDate = (d) => (isValidDate(d) ? new Date(d) : null);

// Sort journey ascending by time
export function sortJourneyAsc(journey = []) {
  return [...(journey || [])].sort((a, b) => +new Date(a.at) - +new Date(b.at));
}

/**
 * Compute the 3 canonical steps from a doc + its history:
 *   1) from (បានបញ្ចូនពី)
 *   2) received (បានទទួល​នៅ)
 *   3) to (បានបញ្ចូនទៅ)
 *
 * Priority:
 *  - Prefer explicit document fields:
 *      fromDept/sentDate, receivedAt/receivedDate, toDept/forwardedDate
 *  - Fallback to history (sorted asc):
 *      first, middle, last entries respectively
 */
export function computeRouteSteps(doc = {}, journey = []) {
  const hist = sortJourneyAsc(journey);

  // FROM
  const from = {
    label: "បានបញ្ចូនពី",
    dept: doc.fromDept || (hist[0]?.stage || ""),
    at: asDate(doc.sentDate) || asDate(doc.date) || asDate(hist[0]?.at),
  };

  // RECEIVED (middle entry if not explicitly set)
  const mid = hist.length ? Math.floor(hist.length / 2) : 0;
  const received = {
    label: "បានទទួល​នៅ",
    dept: doc.receivedAt || (hist[mid]?.stage || ""),
    at: asDate(doc.receivedDate) || asDate(hist[mid]?.at),
  };

  // TO (last entry)
  const to = {
    label: "បានបញ្ចូនទៅ",
    dept: doc.toDept || (hist[hist.length - 1]?.stage || ""),
    at: asDate(doc.forwardedDate) || asDate(hist[hist.length - 1]?.at),
  };

  return { from, received, to };
}
