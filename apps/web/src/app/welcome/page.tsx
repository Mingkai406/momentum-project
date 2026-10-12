import Link from "next/link";
import { Icon, Mark } from "@/components/Icons";
export default function Welcome() {
  return (
    <>
      <header className="welcome-header">
        <Link className="brand" href="/welcome">
          <Mark />
          Momentum
        </Link>
        <nav>
          <a href="https://github.com/Mingkai406/momentum-project">GitHub ↗</a>
          <Link href="/login">
            Open workspace <span>→</span>
          </Link>
        </nav>
      </header>
      <main className="welcome-main">
        <section className="welcome-intro">
          <div>
            <span className="welcome-label">
              A workspace for students and mentors
            </span>
            <h1>
              Keep your goals
              <br />
              and guidance together.
            </h1>
            <p>
              Make a plan, track progress and prepare a thoughtful follow-up.
              The mentor reviews the sources and decides what gets shared.
            </p>
            <div className="welcome-actions">
              <Link className="button-link" href="/login">
                {process.env.NEXT_PUBLIC_PLAYGROUND === "true"
                  ? "Explore the demo"
                  : "Open workspace"}
                <Icon name="arrow" size={16} />
              </Link>
              <a
                className="button-link secondary"
                href="https://github.com/Mingkai406/momentum-project"
              >
                View the project
              </a>
            </div>
            {process.env.NEXT_PUBLIC_PLAYGROUND === "true" && (
              <p className="demo-caption">
                No signup. Fictional examples. Changes stay in your browser.
              </p>
            )}
          </div>
          <div className="welcome-preview">
            <img
              src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/workspace-preview.png`}
              alt="Momentum student overview showing goals, progress, next steps and mentor feedback"
            />
            <small>One overview, with a clear route into the details.</small>
          </div>
        </section>
        <section className="welcome-features">
          <article>
            <Icon name="target" size={24} />
            <h2>Give a goal some structure</h2>
            <p>
              Use a GROW plan and small action steps to turn an intention into
              something you can work on.
            </p>
          </article>
          <article>
            <Icon name="activity" size={24} />
            <h2>Keep the progress visible</h2>
            <p>
              Monthly check-ins capture what worked, what changed and where you
              need a different approach.
            </p>
          </article>
          <article>
            <Icon name="people" size={24} />
            <h2>Bring your mentor in</h2>
            <p>
              Accept an invitation to share your goals. Mentors can read and
              respond; your plan stays yours to edit.
            </p>
          </article>
        </section>
        <section className="welcome-context welcome-agent">
          <span className="welcome-label">Mentor follow-up Agent</span>
          <h2>From scattered updates to a clear next step.</h2>
          <p>
            Review a student’s progress, check the source records, then edit and
            confirm the feedback. The student’s plan stays theirs to change.
          </p>
          <ol>
            <li>
              <strong>Prepare</strong> — open a goal and bring its progress into
              one draft.
            </li>
            <li>
              <strong>Review</strong> — inspect the sources and put the feedback
              in your own words.
            </li>
            <li>
              <strong>Confirm</strong> — save only the feedback you choose to
              share.
            </li>
          </ol>
          <Link className="button-link" href="/login/?example=followup">
            Try the mentor example <Icon name="arrow" size={16} />
          </Link>
          <p className="demo-caption">
            Public demo: fictional records and template-based drafts. No AI
            model is called. The connected application supports Google ADK and
            Vertex AI.
          </p>
        </section>
        <section className="welcome-context">
          <h2>Built around a real mentoring need</h2>
          <p>
            Momentum is a full-stack platform built to solve task tracking and
            follow-up needs in Northeastern University’s OGS Global Student
            Mentor Program. The project supported <strong>40+ students</strong>.
            The new Agent workflow extends that foundation with source-linked
            drafts, mentor review and confirmation before feedback is saved.
          </p>
          <a
            className="text-link"
            href="https://github.com/Mingkai406/momentum-project#engineering"
          >
            Explore the implementation <Icon name="arrow" size={14} />
          </a>
        </section>
      </main>
      <footer className="app-footer">
        Momentum <span>A project by Mingkai Gao</span>
      </footer>
    </>
  );
}
