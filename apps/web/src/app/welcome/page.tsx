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
              Make a plan, record what changes and get feedback where it
              belongs: next to the work you’re doing.
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
        <section className="welcome-context">
          <h2>Built around a real mentoring need</h2>
          <p>
            Momentum began in my work as a Global Student Mentor. An earlier
            version supported approximately 40 mentees. This rebuilt version
            brings the frontend and backend into one project, with a clearer
            workflow and explicit control over who can access a student’s goals.
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
