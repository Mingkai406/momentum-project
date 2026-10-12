import { test, expect } from "@playwright/test";
test("mentor reviews sources, edits and confirms once; stale and revoked drafts cannot publish", async ({
  browser,
}) => {
  const sc = await browser.newContext();
  const mc = await browser.newContext();
  const s = await sc.newPage();
  const m = await mc.newPage();
  await s.goto("/login");
  await s.getByRole("button", { name: /^Continue as student/ }).click();
  await s.getByRole("button", { name: "New goal", exact: true }).click();
  await s.getByLabel("Goal title").fill("Prepare a useful demonstration");
  await s.getByRole("button", { name: "Create goal", exact: true }).click();
  await s.getByRole("link", { name: /Prepare a useful demonstration/ }).click();
  await s.waitForURL(/goal/);
  const goalUrl = s.url();
  await s.getByLabel("Next action").fill("Choose one scenario");
  await s.getByRole("button", { name: "Add step", exact: true }).click();
  await expect(s.getByRole("status")).toHaveText("Step added.");
  await m.goto("/login");
  await m.getByRole("button", { name: /^Continue as mentor/ }).click();
  await m.getByRole("link", { name: "Students", exact: true }).click();
  await m.getByLabel("Student email").fill("student@example.test");
  await m.getByRole("button", { name: "Invite student" }).click();
  await expect(m.getByRole("status")).toContainText("Invitation added");
  await s.goto("/?view=people");
  await s.getByRole("button", { name: "Accept invitation" }).click();
  await expect(s.getByRole("status")).toHaveText("Invitation accepted.");
  await m.goto(goalUrl);
  const assistant = m.getByRole("region", {
    name: "Mentor follow-up assistant",
  });
  await assistant.getByRole("button", { name: "Prepare follow-up" }).click();
  await expect(assistant.getByLabel("Review feedback draft")).toContainText(
    "test fixture",
  );
  await expect(
    assistant.getByRole("button", { name: "Confirm and share feedback" }),
  ).toBeDisabled();
  await assistant.getByText("Review source records", { exact: true }).click();
  await expect(
    assistant.getByText("Choose one scenario", { exact: true }),
  ).toBeVisible();
  await s.goto(goalUrl);
  await expect(
    s.getByText("What is one small action", { exact: false }),
  ).toHaveCount(0);
  await assistant
    .getByLabel("Review feedback draft")
    .fill("Let's choose one scenario and walk through it together.");
  await assistant.getByRole("checkbox").check();
  await assistant
    .getByLabel("Review feedback draft")
    .fill("Let's choose one scenario and test it together.");
  await expect(assistant.getByRole("checkbox")).not.toBeChecked();
  await assistant.getByRole("checkbox").check();
  await m.setViewportSize({ width: 390, height: 844 });
  await m.screenshot({
    path: "test-results/agent/mentor-review-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await assistant
    .getByRole("button", { name: "Confirm and share feedback" })
    .click();
  await expect(assistant.getByRole("status")).toHaveText(
    "Feedback shared with the student.",
  );
  await s.reload();
  await expect(
    s.getByText("Let's choose one scenario and test it together.", {
      exact: true,
    }),
  ).toHaveCount(1);
  await expect(
    s.getByRole("region", { name: "Mentor follow-up assistant" }),
  ).toHaveCount(0);
  await assistant.getByRole("button", { name: "Prepare follow-up" }).click();
  await expect(assistant.getByLabel("Review feedback draft")).toBeVisible();
  await s.getByLabel("Next action").fill("Changed after draft");
  await s.getByRole("button", { name: "Add step", exact: true }).click();
  await expect(s.getByRole("status")).toHaveText("Step added.");
  await assistant.getByRole("checkbox").check();
  await assistant
    .getByRole("button", { name: "Confirm and share feedback" })
    .click();
  await expect(assistant.getByRole("alert")).toContainText("Goal changed");
  await assistant.getByRole("button", { name: "Generate a new draft" }).click();
  await expect(assistant.getByRole("status")).toContainText("Draft ready");
  await s.goto("/?view=people");
  s.on("dialog", (d) => d.accept());
  await s.getByRole("button", { name: "Remove access" }).click();
  await expect(s.getByRole("status")).toHaveText("Connection removed.");
  await assistant.getByRole("checkbox").check();
  await assistant
    .getByRole("button", { name: "Confirm and share feedback" })
    .click();
  await expect(assistant.getByRole("alert")).toHaveText("Goal not found");
  await sc.close();
  await mc.close();
});
