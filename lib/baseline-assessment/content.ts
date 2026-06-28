/**
 * Static content for the F-017 onboarding baseline assessment.
 *
 * v1 deliberately uses a single fixed passage and fixed-answer multiple
 * choice questions rather than Claude-generated content:
 *   - Zero AI latency inside a timed test.
 *   - Deterministic, instantly-gradable scoring (no model grading needed).
 *   - Every user is measured against the same yardstick, which matters for
 *     a "baseline" that is never recalculated.
 *
 * If we later want varied or harder/easier passages, swap this module for
 * a passage bank and keep the scoring logic in scoring.ts unchanged.
 */

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface BaselinePassage {
  id: string;
  title: string;
  body: string;
  wordCount: number;
}

export const BASELINE_PASSAGE: BaselinePassage = {
  id: "octopus-intelligence-v1",
  title: "The Octopus's Garden",
  body: `Long before humans built the first cities, octopuses were already solving puzzles that would stump a great many animals with backbones. An octopus has no skeleton at all, which lets it pour its boneless body through gaps barely wider than one of its eyes. Yet what makes the octopus truly remarkable is not its flexibility but its mind. Two-thirds of an octopus's neurons live not in its brain but spread through its eight arms, so that each arm can taste, touch, and even make simple decisions on its own, almost as if it were a separate creature loosely supervised by a central command.

Researchers have watched octopuses unscrew jar lids to reach a trapped shrimp, stack rocks into makeshift doors to seal off their dens, and squirt water at lights they find irritating until the bulb shorts out. In one famous case, an octopus in a New Zealand aquarium was nicknamed Inky after he slipped out of his tank at night, crossed the floor, and slid down a drainpipe that led directly to the sea. Staff only pieced together what happened from the trail of wet suction-cup prints left behind on the tile.

This intelligence is especially curious because octopuses are almost entirely solitary and short-lived, often dying within a year or two of hatching. Unlike crows or chimpanzees, they cannot have learned their cunning from parents, since most octopus mothers die shortly after their eggs hatch and never meet their offspring. Whatever cleverness an octopus possesses, it must essentially reinvent on its own, within a lifespan barely long enough to grow to full size. Scientists still do not fully agree on why such a short-lived, solitary animal would evolve a mind this elaborate, and the octopus remains one of the more humbling reminders that intelligence on Earth has arisen more than once, and in stranger shapes than we might expect.`,
  // Keep in sync with the body above — used directly in the WPM calculation.
  wordCount: 311,
};

export const COMPREHENSION_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "comp-1",
    prompt: "Where do two-thirds of an octopus's neurons reside?",
    options: ["In its brain", "In its eight arms", "In its eyes", "In its skin"],
    correctIndex: 1,
  },
  {
    id: "comp-2",
    prompt: "How did the octopus named Inky escape the aquarium?",
    options: [
      "Through a feeding hatch",
      "Down a drainpipe leading to the sea",
      "Through an unlocked tank lid",
      "By breaking the tank glass",
    ],
    correctIndex: 1,
  },
  {
    id: "comp-3",
    prompt: "What do octopus mothers typically do shortly after their eggs hatch?",
    options: ["Teach their young to hunt", "Migrate to deeper water", "Die", "Guard the den for a year"],
    correctIndex: 2,
  },
  {
    id: "comp-4",
    prompt: "Why can an octopus's body fit through very narrow gaps?",
    options: [
      "It has a flexible but sturdy skeleton",
      "It has no skeleton at all",
      "Its arms detach and regrow",
      "It shrinks its body temporarily",
    ],
    correctIndex: 1,
  },
];

export const VOCABULARY_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "vocab-1",
    prompt: 'In the passage, "solitary" most nearly means:',
    options: ["Social", "Living alone", "Aggressive", "Nocturnal"],
    correctIndex: 1,
  },
  {
    id: "vocab-2",
    prompt: 'As used to describe the octopus\'s mind, "elaborate" most nearly means:',
    options: ["Simple", "Detailed and complex", "Fragile", "Outdated"],
    correctIndex: 1,
  },
  {
    id: "vocab-3",
    prompt: '"Cunning" most nearly means:',
    options: ["Clumsy", "Cleverness, especially in strategy", "Friendliness", "Slowness"],
    correctIndex: 1,
  },
  {
    id: "vocab-4",
    prompt: '"Reinvent" most nearly means:',
    options: ["Destroy completely", "Create anew without outside help", "Copy exactly", "Forget entirely"],
    correctIndex: 1,
  },
];

export const INFERENCE_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "infer-1",
    prompt: "The passage suggests octopus intelligence puzzles scientists mainly because:",
    options: [
      "Octopuses have larger brains than most animals",
      "It can't be explained by learning from parents or a long life to practice",
      "Octopuses are aggressive predators",
      "Octopuses live in large groups",
    ],
    correctIndex: 1,
  },
  {
    id: "infer-2",
    prompt: 'The detail about Inky\'s "trail of wet suction-cup prints" implies that:',
    options: [
      "Staff watched Inky escape in real time",
      "Staff reconstructed the escape afterward from physical evidence",
      "Inky was recaptured immediately",
      "The aquarium had security cameras",
    ],
    correctIndex: 1,
  },
  {
    id: "infer-3",
    prompt: "The author most likely compares octopuses to crows and chimpanzees to:",
    options: [
      "Prove octopuses are less intelligent than those animals",
      "Highlight that octopus intelligence can't rely on the same explanation (social learning) that explains theirs",
      "Argue that all intelligent animals learn from their parents",
      "Suggest that crows and chimps are also solitary",
    ],
    correctIndex: 1,
  },
  {
    id: "infer-4",
    prompt: "Based on the passage, if an octopus lived for years in a social group, scientists would most likely:",
    options: [
      "Expect it to lose its intelligence",
      "Find the species' intelligence less surprising, since social learning could explain it",
      "Expect its arm neurons to disappear",
      "Expect it to stop exploring its environment",
    ],
    correctIndex: 1,
  },
];
