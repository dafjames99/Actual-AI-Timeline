// Curated guided-tour script (PRD §7 / §9 Q3): an ordered list of event ids with
// optional per-step commentary. Ids that don't exist in the dataset are skipped.
export interface TourStep {
  id: string;
  note?: string;
}

export const TOUR: TourStep[] = [
  {
    id: "reducing-dimensionality-neural-nets",
    note: "The spark: deep neural networks become trainable again, reviving the field.",
  },
  {
    id: "alexnet",
    note: "Proof at scale — deep learning crushes ImageNet and the boom begins.",
  },
  {
    id: "attention-is-all-you-need",
    note: "The Transformer arrives and quietly becomes the foundation of everything next.",
  },
  {
    id: "gpt-3",
    note: "Scale unlocks few-shot learning; size becomes a capability lever.",
  },
  {
    id: "chatgpt-launch",
    note: "Generative AI goes mainstream overnight.",
  },
  {
    id: "claude-3",
    note: "The frontier race intensifies across multiple labs.",
  },
];
