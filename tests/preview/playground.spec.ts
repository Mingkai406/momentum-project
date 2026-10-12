import { test, expect } from "@playwright/test";

test("public demo: persistence, mentor feedback, private browser data and reset", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("welcome/");
  await page.getByRole("link", { name: "Explore the demo" }).click();
  await page.getByRole("button", { name: /^Continue as student/ }).click();
  await expect(
    page.getByRole("heading", { name: "Your overview", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New goal", exact: true }).click();
  await page.getByLabel("Goal title").fill("A visitor-created goal");
  await page.getByLabel("Why it matters").fill("Keep the next step visible");
  await page.getByRole("button", { name: "Create goal", exact: true }).click();
  await page
    .locator(".goal-row")
    .filter({ hasText: "A visitor-created goal" })
    .click();
  const goalUrl = page.url();
  await page.getByLabel("Next action").fill("Write a small working example");
  await page.getByRole("button", { name: "Add step" }).click();
  await page
    .getByRole("checkbox", { name: "Write a small working example" })
    .check();
  await page.getByRole("tab", { name: "GROW plan" }).click();
  await page.getByLabel("Goal — what do you want?").fill("Finish the example");
  await page.getByRole("button", { name: "Save plan" }).click();
  await page.getByRole("tab", { name: /Check-ins/ }).click();
  await page.getByRole("button", { name: "Write check-in" }).click();
  await page.getByLabel("Progress notes").fill("The first step is complete.");
  await page.getByRole("button", { name: "Save check-in" }).click();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Write a small working example" }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("button", { name: /^Continue as mentor/ }).click();
  await page
    .locator(".goal-row")
    .filter({ hasText: "A visitor-created goal" })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Write a small working example" }),
  ).toBeDisabled();
  await page
    .getByLabel("Your feedback")
    .fill("A good next step is to add a regression test.");
  await page.getByRole("button", { name: "Share feedback" }).click();
  await expect(page.getByRole("status")).toHaveText("Feedback shared.");
  const independent = await browser.newContext();
  const visitor = await independent.newPage();
  await visitor.goto(goalUrl);
  await visitor.getByRole("button", { name: /^Continue as student/ }).click();
  await expect(
    visitor.getByRole("heading", { name: "Your overview" }),
  ).toBeVisible();
  await expect(
    visitor.getByRole("link", { name: /A visitor-created goal/ }),
  ).toHaveCount(0);
  await independent.close();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.getByRole("button", { name: /^Continue as student/ }).click();
  await expect(
    page.getByRole("heading", { name: "Your overview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /A visitor-created goal/ }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("responsive views, search, filtering and keyboard dialog", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("welcome/");
    await expect(page.locator(".welcome-preview img")).toBeVisible();
    expect(
      await page
        .locator(".welcome-preview img")
        .evaluate((e: HTMLImageElement) => e.naturalWidth),
    ).toBeGreaterThan(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/preview/welcome-${width}.png`,
      fullPage: true,
    });
    await page.goto("login/");
    await page.getByRole("button", { name: /^Continue as student/ }).click();
    await expect(
      page.getByRole("heading", { name: "Your overview" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 1440)
      await page.screenshot({
        path: "test-results/preview/workspace-preview.png",
      });
    await page.screenshot({
      path: `test-results/preview/overview-${width}.png`,
      fullPage: true,
    });
    await page.goto("goal/?id=1");
    await expect(
      page.getByRole("heading", {
        name: "Build a portfolio worth sharing",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/preview/goal-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("tab", { name: /Action steps/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "GROW plan" })).toBeFocused();
  await expect(page.getByLabel("Goal — what do you want?")).toBeVisible();
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("link", { name: "My goals", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My goals", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Toggle navigation" }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("?view=goals");
  await page.getByLabel("Search goals").fill("portfolio");
  await expect(page.locator(".goal-row")).toHaveCount(1);
  await page.getByLabel("Search goals").clear();
  await page.getByLabel("Filter goals").selectOption("complete");
  await expect(page.locator(".goal-row")).toHaveCount(1);
  await expect(page.locator(".goal-row")).toContainText(
    "Find a steady study routine",
  );
  await page.getByRole("button", { name: "New goal", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Goal title")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(errors).toEqual([]);
});

test("Agent example: source review, edited confirmation, stale records and revoked access", async ({
  page,
  context,
}) => {
  const external: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (request) => {
    if (new URL(request.url()).hostname !== "127.0.0.1")
      external.push(request.url());
  });
  await page.goto("welcome/");
  await page.getByRole("link", { name: "Try the mentor example" }).click();
  await page.getByRole("button", { name: /^Continue as mentor/ }).click();
  await expect(page).toHaveURL(/goal\/\?id=1/);
  const assistant = page.getByRole("region", {
    name: "Mentor follow-up assistant",
  });
  await expect(assistant).toContainText("No AI model is called");
  await assistant
    .getByRole("button", { name: "Prepare example follow-up" })
    .click();
  await expect(assistant).toContainText(
    "2 of 4 reviewed action steps are complete",
  );
  await assistant.getByText("Review source records", { exact: true }).click();
  await expect(
    assistant.getByText("Ask two peers to try it", { exact: true }),
  ).toBeVisible();
  const confirm = assistant.getByRole("button", {
    name: "Confirm and share feedback",
  });
  await expect(confirm).toBeDisabled();
  const student = await context.newPage();
  await student.goto("login/");
  await student.getByRole("button", { name: /^Continue as student/ }).click();
  await student.goto("goal/?id=1");
  await expect(student.getByText(/Let’s check in on/)).toHaveCount(0);
  await expect(
    student.getByRole("region", { name: "Mentor follow-up assistant" }),
  ).toHaveCount(0);
  await assistant.getByRole("checkbox").check();
  const edited =
    "Let’s invite two peers to try the portfolio and compare their feedback.";
  await assistant.getByLabel("Review feedback draft").fill(edited);
  await expect(assistant.getByRole("checkbox")).not.toBeChecked();
  await expect(confirm).toBeDisabled();
  await assistant.getByRole("checkbox").check();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    if (width === 390) {
      await expect
        .poll(() =>
          page
            .locator(".sidebar")
            .evaluate((e) => e.getBoundingClientRect().right),
        )
        .toBeLessThanOrEqual(0);
    }
    await page.screenshot({
      path: `test-results/preview/agent-review-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await confirm.click();
  await expect(assistant.getByRole("status")).toContainText(
    "Feedback saved in this demo",
  );
  await student.reload();
  await expect(student.getByText(edited, { exact: true })).toHaveCount(1);
  await page.reload();
  await expect(page.getByText(edited, { exact: true })).toHaveCount(1);
  await assistant
    .getByRole("button", { name: "Prepare example follow-up" })
    .click();
  await student
    .getByLabel("Next action")
    .fill("Record feedback from both peers");
  await student.getByRole("button", { name: "Add step", exact: true }).click();
  await expect(student.getByRole("status")).toHaveText("Step added.");
  await assistant.getByRole("checkbox").check();
  await confirm.click();
  await expect(assistant.getByRole("alert")).toContainText(
    "The goal has changed",
  );
  await assistant
    .getByRole("button", { name: "Prepare a new example" })
    .click();
  await expect(assistant).toContainText(
    "2 of 5 reviewed action steps are complete",
  );
  await student.goto("?view=people");
  student.once("dialog", (d) => d.accept());
  await student.getByRole("button", { name: "Remove access" }).click();
  await expect(student.getByRole("status")).toHaveText("Connection removed.");
  await assistant.getByRole("checkbox").check();
  await confirm.click();
  await expect(assistant.getByRole("alert")).toContainText(
    "access was removed",
  );
  await student.goto("goal/?id=1");
  await expect(student.getByText(edited, { exact: true })).toHaveCount(1);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});
