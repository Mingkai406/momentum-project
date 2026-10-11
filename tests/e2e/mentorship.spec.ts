import { test, expect } from "@playwright/test";
test("student and mentor complete the shared goal workflow, then revoke access", async ({
  browser,
}) => {
  const studentContext = await browser.newContext();
  const mentorContext = await browser.newContext();
  const strangerContext = await browser.newContext();
  const student = await studentContext.newPage();
  const mentor = await mentorContext.newPage();
  const stranger = await strangerContext.newPage();
  await student.goto("/login");
  await student
    .getByRole("button", { name: "Continue as student", exact: true })
    .click();
  await student.getByLabel("Goal title").fill("Build a useful portfolio");
  await student
    .getByLabel("Why it matters")
    .fill("Get feedback from my mentor.");
  await student
    .getByRole("button", { name: "Create goal", exact: true })
    .click();
  await student.getByRole("link", { name: /Build a useful portfolio/ }).click();
  await student.waitForURL("**/goals/*");
  const goalUrl = student.url();
  await student
    .getByLabel("Goal — what do you want?")
    .fill("Ship a complete web application");
  await student
    .getByLabel("Will — what will you do next?")
    .fill("Test the main workflow");
  await student.getByRole("button", { name: "Save plan" }).click();
  await expect(student.getByRole("status")).toHaveText("Plan saved.");
  await student
    .getByLabel("Reality — where are you now?")
    .fill("Unsaved reflection");
  await student.getByLabel("Next action").fill("Write permission tests");
  await student.getByRole("button", { name: "Add step" }).click();
  await student
    .getByRole("checkbox", { name: "Write permission tests" })
    .check();
  await expect(student.getByRole("status")).toHaveText("Step updated.");
  await expect(student.getByLabel("Reality — where are you now?")).toHaveValue(
    "Unsaved reflection",
  );
  await student.getByLabel("Progress notes").fill("The API is working.");
  await student.getByRole("button", { name: "Save check-in" }).click();
  await expect(student.getByRole("status")).toHaveText("Check-in saved.");
  await mentor.goto("/login");
  await mentor
    .getByRole("button", { name: "Continue as mentor", exact: true })
    .click();
  await mentor.getByLabel("Student email").fill("student@example.test");
  await mentor.getByRole("button", { name: "Invite student" }).click();
  await expect(mentor.getByRole("status")).toContainText("Invitation added");
  await expect(
    mentor.getByRole("link", { name: /Build a useful portfolio/ }),
  ).toHaveCount(0);
  await student.goto("/");
  await student.getByRole("button", { name: "Accept invitation" }).click();
  await expect(student.getByRole("status")).toHaveText("Invitation accepted.");
  await mentor.reload();
  await mentor.getByRole("link", { name: /Build a useful portfolio/ }).click();
  await expect(mentor.getByLabel("Goal — what do you want?")).toBeDisabled();
  await expect(
    mentor.getByRole("checkbox", { name: "Write permission tests" }),
  ).toBeChecked();
  await mentor
    .getByLabel("Your feedback")
    .fill("Add a test for revoked access.");
  await mentor.getByRole("button", { name: "Share feedback" }).click();
  await expect(mentor.getByRole("status")).toHaveText("Feedback shared.");
  await student.goto(goalUrl);
  await expect(
    student.getByText("Add a test for revoked access.", { exact: true }),
  ).toBeVisible();
  await expect(
    student.getByRole("checkbox", { name: "Write permission tests" }),
  ).toBeChecked();
  await stranger.goto("/login");
  await stranger
    .getByRole("button", { name: "Continue as another student" })
    .click();
  await expect(
    stranger.getByRole("heading", { name: "What’s your next step?" }),
  ).toBeVisible();
  await stranger.goto(goalUrl);
  await expect(
    stranger.getByRole("alert").filter({ hasText: "Goal not found" }),
  ).toHaveText("Goal not found");
  await student.setViewportSize({ width: 390, height: 844 });
  await student.screenshot({
    path: "test-results/student-mobile.png",
    fullPage: true,
  });
  expect(
    await student.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await mentor.screenshot({
    path: "test-results/mentor-desktop.png",
    fullPage: true,
  });
  await student.goto("/");
  student.on("dialog", (dialog) => dialog.accept());
  await student.getByRole("button", { name: "Remove access" }).click();
  await expect(student.getByRole("status")).toHaveText("Connection removed.");
  await mentor.reload();
  await expect(
    mentor.getByRole("alert").filter({ hasText: "Goal not found" }),
  ).toHaveText("Goal not found");
  await studentContext.close();
  await mentorContext.close();
  await strangerContext.close();
});
