import type { Detail } from "./api";

// Deterministic examples for the public playground, never model responses.
export type PreviewDraft = ReturnType<typeof exampleDraft> & {
  mentor_id: string;
  goal_id: number;
  snapshot: string;
  expires: number;
  feedback_id?: number;
  confirmed_body?: string;
};
export function exampleDraft(goal: Detail, id: string) {
  const steps = goal.steps.slice(0, 20);
  const checkin = [...goal.checkpoints].sort((a, b) =>
    b.month.localeCompare(a.month),
  )[0];
  const sources = [
    { id: "goal", kind: "goal", text: goal.title },
    ...steps.map((s) => ({
      id: `step:${s.id}`,
      kind: "step",
      text: s.description,
      completed: s.completed,
    })),
    ...(checkin
      ? [{ id: `checkin:${checkin.id}`, kind: "checkin", text: checkin.notes }]
      : []),
  ];
  const completed = steps.filter((s) => s.completed).length;
  const pending = steps.find((s) => !s.completed);
  const progress = `${completed} of ${steps.length} reviewed action steps are complete.`;
  const question = pending
    ? `What would help you take the next step: “${pending.description}”?`
    : "What would you like to focus on next?";
  return {
    id,
    summary: [
      {
        text: progress,
        sources: steps.length ? steps.map((s) => `step:${s.id}`) : ["goal"],
      },
      ...(checkin
        ? [
            {
              text: `Latest check-in: “${checkin.notes}”`,
              sources: [`checkin:${checkin.id}`],
            },
          ]
        : []),
    ],
    followups: [
      { text: question, sources: pending ? [`step:${pending.id}`] : ["goal"] },
    ],
    draft: `Let’s check in on “${goal.title}”. ${progress} ${question} Let’s agree on one manageable next action together.`,
    sources,
    trace_id: `example-${id}`,
    truncated: goal.steps.length > steps.length || goal.checkpoints.length > 1,
  };
}
