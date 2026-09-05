import type {
  GeographyBlock,
  GeographyDistrict,
  GeographyState,
} from '../services/api/geographyApi';

/** Customer-facing place label — never fake "near you" when location is unknown. */
export function formatBrowsePlaceLabel(
  locationLabel: string | null,
  stateId: string,
  districtId: string,
  states: GeographyState[],
  districts: GeographyDistrict[],
  blockId?: string,
  blocks?: GeographyBlock[],
  blockName?: string,
): string | null {
  const block = blocks?.find((b) => b._id === blockId);
  const district = districts.find((d) => d._id === districtId);
  const state = states.find((s) => s._id === stateId);

  const structuredParts = [
    block?.name || blockName?.trim(),
    district?.name,
    state?.name,
  ].filter(Boolean);
  if (structuredParts.length) return structuredParts.join(', ');

  if (locationLabel?.trim()) return locationLabel.trim();

  if (district?.name && state?.name) {
    return `${district.name}, ${state.name}`;
  }
  if (district?.name) return district.name;
  if (state?.name) return state.name;
  return null;
}

export function hasBrowseLocationFilter(
  locationLabel: string | null,
  stateId: string,
  districtId: string,
  blockId?: string,
): boolean {
  return Boolean(locationLabel || stateId || districtId || blockId);
}
