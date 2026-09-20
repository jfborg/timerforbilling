// One design for now, matching the chosen visual direction (A: classic stationery). Brief
// section 6 asks for 3 free designs; the other two are an asset-creation task (original
// artwork or a permissively licensed one, with the licence committed under
// assets/licenses/), not something to fabricate placeholder-quality here. Deferred; see
// PHASE_2_NOTES.md.
export const STATIONERY = [
  {
    id: 'classic-cream',
    label: 'Classic cream',
    paperColor: '#F3E9D6',
    cardColor: '#FBF5E9',
    accentColor: '#8B1E1E',
    borderColor: '#D8C6A0',
    textColor: '#3A2A1A',
    mutedTextColor: '#8A7455',
  },
] as const;

export type StationeryId = (typeof STATIONERY)[number]['id'];

export function getStationery(id: string) {
  return STATIONERY.find((s) => s.id === id) ?? STATIONERY[0];
}
