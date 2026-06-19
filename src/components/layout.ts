// Shared geometry for the timeline. The SVG chart and the HTML strand-label
// gutter both import these so their lane positions line up exactly.
export const AXIS_HEIGHT = 44; // top band reserved for year labels
export const LANE_HEIGHT = 56; // vertical space per strand swim lane
export const NODE_R = 6; // event node radius
export const PADDING_LEFT = 28; // inset before the first date inside the SVG
export const PADDING_RIGHT = 48; // inset after the last date inside the SVG
export const PX_PER_YEAR = 92; // horizontal scale: proportional date spacing
export const MIN_INNER_WIDTH = 640; // floor so a narrow date range still fills space

// Vertical centre of a lane given its 0-based order.
export function laneCenterY(order: number): number {
  return AXIS_HEIGHT + order * LANE_HEIGHT + LANE_HEIGHT / 2;
}
