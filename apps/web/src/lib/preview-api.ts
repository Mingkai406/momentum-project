// Browser-only, fictional data adapter for the public playground.
// The Express/Cognito API remains the implementation for real accounts.
import type { Detail, User, Relationship } from "./api";
type State = {
  users: Record<string, User>;
  goals: Detail[];
  relationships: (Relationship & {
    mentor_id: string;
    student_id: string | null;
  })[];
  nextId: number;
};
const KEY = "momentum-playground-v4";
const emails = {
  student: "student@example.test",
  mentor: "mentor@example.test",
  other: "other@example.test",
  otherMentor: "other-mentor@example.test",
};
const now = () => new Date().toISOString();
const month = () => now().slice(0, 7);
function seed(): State {
  const users = Object.fromEntries(
    Object.entries(emails).map(([key, email]) => [
      key,
      {
        id: `demo-${key}`,
        email,
        role: key.toLowerCase().includes("mentor") ? "mentor" : "student",
      },
    ]),
  ) as Record<string, User>;
  const make = (
    id: number,
    title: string,
    description: string,
    steps: { description: string; completed: boolean }[],
    plan: Partial<Detail["grow"]>,
    notes: string,
    feedback: string,
  ): Detail => ({
    id,
    owner_id: "demo-student",
    owner_email: emails.student,
    title,
    description,
    total_steps: steps.length,
    completed_steps: steps.filter((s) => s.completed).length,
    grow: { goal: title, reality: "", options: "", will: "", ...plan },
    steps: steps.map((s, i) => ({ ...s, id: id * 10 + i })),
    checkpoints: notes
      ? [{ id: id * 10, month: month(), updated_at: now(), notes }]
      : [],
    feedback: feedback
      ? [
          {
            id: id * 10,
            mentor_email: emails.mentor,
            body: feedback,
            created_at: now(),
          },
        ]
      : [],
  });
  return {
    users,
    nextId: 100,
    relationships: [
      {
        id: 1,
        mentor_id: "demo-mentor",
        student_id: "demo-student",
        mentor_email: emails.mentor,
        student_email: emails.student,
        status: "accepted",
      },
    ],
    goals: [
      make(
        1,
        "Build a portfolio worth sharing",
        "Turn a class project into something people can try.",
        [
          {
            description: "Choose a project and define the user problem",
            completed: true,
          },
          { description: "Ship the first working flow", completed: true },
          { description: "Ask two peers to try it", completed: false },
          {
            description: "Write a short project walkthrough",
            completed: false,
          },
        ],
        {
          reality:
            "The core flow works locally. I have not collected feedback yet.",
          options:
            "Run a short usability session or share a demo with classmates.",
          will: "Send two invitations and observe where people get stuck.",
        },
        "The first flow is working. Next I want to learn whether the navigation makes sense without an explanation.",
        "The scope is clear. For your first feedback session, give people a task and watch what they do before explaining the interface.",
      ),
      make(
        2,
        "Get ready for technical interviews",
        "Build confidence explaining decisions, not just writing code.",
        [
          { description: "Pick three topics to practice", completed: true },
          { description: "Solve a problem out loud", completed: true },
          { description: "Run a mock interview", completed: true },
          {
            description: "Review the recording and take notes",
            completed: false,
          },
        ],
        {
          reality: "I can solve familiar problems but rush the explanation.",
          options: "Pair with a classmate. Record a solo practice session.",
          will: "Spend five minutes outlining an approach before coding.",
        },
        "The mock interview helped. Explaining the tradeoffs is the part I want to keep practicing.",
        "Try describing the simplest solution first, then explain which constraint makes you change it.",
      ),
      make(
        3,
        "Find a steady study routine",
        "Create a weekly rhythm that leaves room for life outside class.",
        [
          { description: "Track one week of study time", completed: true },
          { description: "Block two focused sessions", completed: true },
          { description: "Reflect on what worked", completed: true },
        ],
        {
          reality: "My schedule varies, so a rigid daily plan is hard to keep.",
          options: "Use two fixed weekly sessions instead of daily targets.",
          will: "Keep the sessions short and review the plan at the end of each week.",
        },
        "Two focused sessions worked better than planning to study every day. I’m keeping this rhythm next month.",
        "",
      ),
      make(
        4,
        "Make the most of campus connections",
        "Start a few useful conversations with people in my field.",
        [
          { description: "Choose one campus event", completed: false },
          { description: "Prepare two questions", completed: false },
          { description: "Follow up with someone I meet", completed: false },
        ],
        {
          reality: "I attend events but rarely follow up afterward.",
          options: "Go with a classmate or reach out to a speaker in advance.",
          will: "Attend one event and send one thoughtful follow-up.",
        },
        "",
        "",
      ),
    ],
  };
}
function read(): State {
  try {
    const value = localStorage.getItem(KEY);
    if (value) return JSON.parse(value);
  } catch {}
  const state = seed();
  write(state);
  return state;
}
function write(state: State) {
  localStorage.setItem(KEY, JSON.stringify(state));
}
export function resetPreview() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem("momentum-demo");
}
export async function previewApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const method = init.method || "GET";
  const body = init.body ? JSON.parse(String(init.body)) : {};
  const state = read();
  if (path === "/config") return { authMode: "preview" } as T;
  if (path === "/demo/login") {
    if (!state.users[body.account]) throw new Error("Unknown account");
    return { token: `preview:${body.account}` } as T;
  }
  const account = sessionStorage
    .getItem("momentum-demo")
    ?.replace("preview:", "");
  const user = account ? state.users[account] : null;
  if (!user) {
    window.location.assign(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/login/`);
    throw new Error("Choose a demo account to continue.");
  }
  const readable = (g: Detail) =>
    g.owner_id === user.id ||
    (user.role === "mentor" &&
      state.relationships.some(
        (r) =>
          r.mentor_id === user.id &&
          r.student_id === g.owner_id &&
          r.status === "accepted",
      ));
  const visible = state.goals.filter(readable);
  let result: unknown;
  const next = () => state.nextId++;
  const count = (g: Detail) => ({
    ...g,
    total_steps: g.steps.length,
    completed_steps: g.steps.filter((s) => s.completed).length,
  });
  if (path === "/me") result = user;
  else if (path === "/overview")
    result = {
      stats: {
        goals: visible.length,
        steps: visible.reduce((a, g) => a + g.steps.length, 0),
        completed_steps: visible.reduce(
          (a, g) => a + g.steps.filter((s) => s.completed).length,
          0,
        ),
        feedback: visible.reduce((a, g) => a + g.feedback.length, 0),
      },
      feedback: visible
        .flatMap((g) =>
          g.feedback.map((f) => ({ ...f, goal_id: g.id, title: g.title })),
        )
        .slice(0, 6),
      checkpoints: visible
        .flatMap((g) =>
          g.checkpoints.map((c) => ({
            ...c,
            goal_id: g.id,
            title: g.title,
            updated_at: c.updated_at || `${c.month}-01T12:00:00Z`,
          })),
        )
        .slice(0, 6),
      nextSteps: visible
        .flatMap((g) =>
          g.steps
            .filter((s) => !s.completed)
            .map((s) => ({ ...s, goal_id: g.id, title: g.title })),
        )
        .slice(0, 5),
    };
  else if (path === "/relationships") {
    if (method === "GET")
      result = state.relationships.filter(
        (r) => r.mentor_id === user.id || r.student_email === user.email,
      );
    else {
      if (user.role !== "mentor") throw new Error("Mentor access required");
      const email = String(body.email).toLowerCase().trim();
      if (email === user.email) throw new Error("Cannot invite yourself");
      let r = state.relationships.find(
        (r) => r.mentor_id === user.id && r.student_email === email,
      );
      if (!r) {
        r = {
          id: next(),
          mentor_id: user.id,
          mentor_email: user.email,
          student_email: email,
          student_id: null,
          status: "pending",
        };
        state.relationships.push(r);
      }
      result = r;
    }
  } else if (path.startsWith("/relationships/")) {
    const match = path.match(/^\/relationships\/(\d+)(\/accept)?$/);
    const r = state.relationships.find((r) => r.id === Number(match?.[1]));
    if (!r) throw new Error("Invitation not found");
    if (method === "POST" && match?.[2]) {
      if (user.role !== "student" || r.student_email !== user.email)
        throw new Error("Invitation not found");
      r.status = "accepted";
      r.student_id = user.id;
      result = r;
    } else if (method === "DELETE") {
      if (r.mentor_id !== user.id && r.student_email !== user.email)
        throw new Error("Connection not found");
      state.relationships = state.relationships.filter((item) => item !== r);
    }
  } else if (path === "/goals") {
    if (method === "GET") result = visible.map(count).reverse();
    else {
      if (user.role !== "student") throw new Error("Student access required");
      if (!String(body.title).trim()) throw new Error("Add a goal title");
      const goal: Detail = {
        id: next(),
        owner_id: user.id,
        owner_email: user.email,
        title: String(body.title).trim().slice(0, 180),
        description: String(body.description || "").slice(0, 4000),
        total_steps: 0,
        completed_steps: 0,
        grow: { goal: "", reality: "", options: "", will: "" },
        steps: [],
        checkpoints: [],
        feedback: [],
      };
      state.goals.push(goal);
      result = goal;
    }
  } else {
    const match = path.match(
      /^\/goals\/(\d+)(?:\/(grow|steps|checkpoints|feedback))?(?:\/(\d+))?$/,
    );
    const goal = state.goals.find((g) => g.id === Number(match?.[1]));
    if (!goal || !readable(goal)) throw new Error("Goal not found");
    const action = match?.[2];
    if (method === "GET") result = count(goal);
    else if (action === "feedback") {
      if (user.role !== "mentor" || goal.owner_id === user.id)
        throw new Error("Mentor access required");
      result = {
        id: next(),
        mentor_email: user.email,
        body: String(body.body).slice(0, 4000),
        created_at: now(),
      };
      goal.feedback.unshift(result as Detail["feedback"][number]);
    } else {
      if (user.role !== "student" || goal.owner_id !== user.id)
        throw new Error("Only the student can edit this plan");
      if (action === "grow") {
        goal.grow = {
          goal: body.goal,
          reality: body.reality,
          options: body.options,
          will: body.will,
        };
        result = goal.grow;
      }
      if (action === "steps") {
        if (method === "PATCH") {
          const step = goal.steps.find((s) => s.id === Number(match?.[3]));
          if (!step) throw new Error("Step not found");
          step.completed = Boolean(body.completed);
          result = step;
        } else {
          result = {
            id: next(),
            description: String(body.description).slice(0, 500),
            completed: false,
          };
          goal.steps.push(result as Detail["steps"][number]);
        }
      }
      if (action === "checkpoints") {
        let c = goal.checkpoints.find((c) => c.month === body.month);
        if (c) {
          c.notes = String(body.notes);
          c.updated_at = now();
        } else {
          c = {
            id: next(),
            month: body.month,
            updated_at: now(),
            notes: String(body.notes),
          };
          goal.checkpoints.unshift(c);
        }
        result = c;
      }
    }
  }
  if (method !== "GET") write(state);
  return structuredClone(result) as T;
}
