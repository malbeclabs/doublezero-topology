/**
 * Zustand Store for Table-Map Synchronization
 *
 * Provides shared state for bi-directional interaction between
 * the data table and the map visualization.
 */

import { create } from "zustand";

interface TableStore {
  /**
   * Currently selected link (from table row click)
   */
  selectedLinkPk: string | null;

  /**
   * Currently hovered link (from map or table hover)
   */
  hoveredLinkPk: string | null;

  /**
   * Set the selected link
   */
  setSelectedLink: (pk: string | null) => void;

  /**
   * Set the hovered link
   */
  setHoveredLink: (pk: string | null) => void;

  /**
   * Clear all selections
   */
  clearSelection: () => void;
}

/**
 * Zustand store instance
 */
export const useTableStore = create<TableStore>((set) => ({
  selectedLinkPk: null,
  hoveredLinkPk: null,

  setSelectedLink: (pk) => set({ selectedLinkPk: pk }),

  setHoveredLink: (pk) => set({ hoveredLinkPk: pk }),

  clearSelection: () => set({ selectedLinkPk: null, hoveredLinkPk: null }),
}));
