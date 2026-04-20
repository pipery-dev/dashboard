import readline from "node:readline/promises";
import fs from "node:fs/promises";
import process from "node:process";
import { login, logout, requireToken, getSavedToken } from "./auth.js";
import {
  downloadJsonlFromArtifact,
  getCurrentUser,
  listArtifacts,
  listBranches,
  listRepos,
  listRuns,
  listWorkflows
} from "../../pipery-core/src/github.js";
import {
  buildHistogram,
  filterEntries,
  formatTimestamp,
  getVisibleTimeRange,
  parseJsonl,
  renderEntryDetail,
  renderEntryPreview,
  renderHistogramSparkline,
  renderOverview,
  summarizeEntry
} from "../../pipery-core/src/jsonl.js";

function printHelp() {
  console.log(`Pipery CLI

Usage:
  pipery login
  pipery logout
  pipery whoami
  pipery browse
  pipery open <path-to-jsonl>

Notes:
  - GitHub login uses GitHub device flow through dash.pipery.dev by default.
  - The CLI mirrors the dashboard flow: repo -> branch -> workflow -> run -> artifact -> pipery.jsonl.
  - Local files can be opened directly without GitHub login.
`);
}

async function loadLocalJsonl(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  return {
    filePath,
    content
  };
}

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function selectFromList(items, label, formatter) {
  if (!items.length) {
    throw new Error(`No ${label.toLowerCase()} found.`);
  }

  console.log(`\n${label}`);
  items.forEach((item, index) => {
    console.log(`  ${index + 1}. ${formatter(item)}`);
  });

  while (true) {
    const answer = await prompt(`Choose ${label.toLowerCase()} [1-${items.length}]: `);
    const index = Number(answer) - 1;

    if (Number.isInteger(index) && index >= 0 && index < items.length) {
      return items[index];
    }

    console.log("Please enter a valid number.");
  }
}

async function runBrowse() {
  const token = await requireToken();
  const repos = await listRepos(token);
  const repo = await selectFromList(
    repos,
    "Repositories",
    (item) => `${item.fullName} (${item.private ? "private" : "public"})`
  );

  const branches = await listBranches(repo.owner, repo.name, token);
  const branch = await selectFromList(branches, "Branches", (item) => item.name);

  const workflows = await listWorkflows(repo.owner, repo.name, token);
  const workflow = await selectFromList(
    workflows,
    "Workflows",
    (item) => `${item.name} [${item.state}]`
  );

  const runs = await listRuns(repo.owner, repo.name, workflow.id, branch.name, token);
  const run = await selectFromList(
    runs,
    "Workflow Runs",
    (item) => `${item.displayTitle || item.name} (${item.conclusion || item.status})`
  );

  const artifacts = await listArtifacts(repo.owner, repo.name, run.id, token);
  const artifact = await selectFromList(
    artifacts,
    "Artifacts",
    (item) => `${item.name} (${item.sizeInBytes} bytes)`
  );

  const files = await downloadJsonlFromArtifact(repo.owner, repo.name, artifact.id, token);
  console.log(`\nOpened ${files[0].path} from ${artifact.name}\n`);

  await exploreDocument({
    label: `${repo.fullName}:${artifact.name}:${files[0].path}`,
    content: files[0].content
  });
}

async function exploreDocument(document) {
  const entries = parseJsonl(document.content);
  let query = "";
  let start = "";
  let end = "";
  let selectedIndex = 0;
  let scrollOffset = 0;
  let mode = "list";
  let lastMessage = "";

  const stdin = process.stdin;
  const stdout = process.stdout;

  function moveSelection(nextIndex, filteredLength, pageSize) {
    const safeIndex = Math.max(0, Math.min(nextIndex, Math.max(0, filteredLength - 1)));
    selectedIndex = safeIndex;

    if (selectedIndex < scrollOffset) {
      scrollOffset = selectedIndex;
    }

    if (selectedIndex >= scrollOffset + pageSize) {
      scrollOffset = Math.max(0, selectedIndex - pageSize + 1);
    }
  }

  function clearScreen() {
    stdout.write("\x1b[2J\x1b[H");
  }

  function render() {
    const filtered = filterEntries(entries, query, start, end);
    const histogram = buildHistogram(filtered);
    const visibleRange = getVisibleTimeRange(filtered);
    const columns = stdout.columns || 120;
    const rows = stdout.rows || 36;
    const footerHeight = 7;
    const headerHeight = 4;
    const contentHeight = Math.max(6, rows - footerHeight - headerHeight);

    if (filtered.length === 0) {
      selectedIndex = 0;
      scrollOffset = 0;
    } else {
      moveSelection(selectedIndex, filtered.length, contentHeight);
    }

    const selectedEntry = filtered[selectedIndex] || null;

    clearScreen();
    stdout.write(`${document.label || document.filePath}\n`);
    stdout.write(`${renderOverview(entries, filtered)}\n`);
    stdout.write(
      `Search: ${query || "none"} | Time filter: ${start || "min"} -> ${end || "max"} | Mode: ${mode}\n`
    );
    stdout.write(`${"─".repeat(Math.max(20, columns - 1))}\n`);

    if (mode === "detail" && selectedEntry) {
      const detailLines = renderEntryDetail(selectedEntry).split("\n").slice(0, contentHeight);
      for (const line of detailLines) {
        stdout.write(`${line.slice(0, columns - 1)}\n`);
      }

      for (let index = detailLines.length; index < contentHeight; index += 1) {
        stdout.write("\n");
      }
    } else {
      const visibleEntries = filtered.slice(scrollOffset, scrollOffset + contentHeight);
      visibleEntries.forEach((entry, index) => {
        const actualIndex = scrollOffset + index;
        const marker = actualIndex === selectedIndex ? ">" : " ";
        stdout.write(`${marker} ${renderEntryPreview(entry, columns - 3)}\n`);
      });

      for (let index = visibleEntries.length; index < contentHeight; index += 1) {
        stdout.write("\n");
      }
    }

    stdout.write(`${"─".repeat(Math.max(20, columns - 1))}\n`);
    stdout.write(`File: ${document.label || document.filePath}\n`);
    stdout.write(
      `Selected: ${
        selectedEntry ? `line ${selectedEntry.lineNumber} | ${summarizeEntry(selectedEntry)}` : "none"
      }\n`
    );
    stdout.write(
      `Visible range: ${
        visibleRange ? `${formatTimestamp(visibleRange.start)} -> ${formatTimestamp(visibleRange.end)}` : "no timestamps"
      }\n`
    );
    stdout.write(`Histogram: ${renderHistogramSparkline(histogram, Math.max(12, Math.min(40, columns - 12)))}\n`);
    stdout.write("Keys: Up/Down/PageUp/PageDown move | Right open | Left back | / search | t time | r reset | q quit\n");
    stdout.write(`${lastMessage || ""}\n`);
  }

  async function askInline(label) {
    const wasRaw = stdin.isRaw;
    if (wasRaw) {
      stdin.setRawMode(false);
    }
    stdin.pause();
    clearScreen();
    const answer = await prompt(label);
    stdin.resume();
    if (wasRaw) {
      stdin.setRawMode(true);
    }
    return answer;
  }

  render();

  await new Promise((resolve) => {
    function onData(buffer) {
      const key = buffer.toString("utf8");
      const filtered = filterEntries(entries, query, start, end);
      const rows = stdout.rows || 36;
      const pageSize = Math.max(6, rows - 11);

      if (key === "\u0003" || key === "q") {
        cleanup();
        resolve();
        return;
      }

      if (key === "\u001b[A") {
        moveSelection(selectedIndex - 1, filtered.length, pageSize);
      } else if (key === "\u001b[B") {
        moveSelection(selectedIndex + 1, filtered.length, pageSize);
      } else if (key === "\u001b[5~") {
        moveSelection(selectedIndex - pageSize, filtered.length, pageSize);
      } else if (key === "\u001b[6~") {
        moveSelection(selectedIndex + pageSize, filtered.length, pageSize);
      } else if (key === "\u001b[C") {
        mode = "detail";
      } else if (key === "\u001b[D") {
        mode = "list";
      } else if (key === "r") {
        query = "";
        start = "";
        end = "";
        lastMessage = "Filters reset.";
      } else if (key === "/") {
        askInline("Search query: ").then((answer) => {
          query = answer;
          lastMessage = answer ? `Search set to "${answer}".` : "Search cleared.";
          render();
        });
        return;
      } else if (key === "t") {
        askInline("Start timestamp (blank for min): ").then(async (startAnswer) => {
          const endAnswer = await askInline("End timestamp (blank for max): ");
          start = startAnswer;
          end = endAnswer;
          lastMessage = "Time filter updated.";
          render();
        });
        return;
      }

      render();
    }

    function cleanup() {
      stdin.off("data", onData);
      if (stdin.isRaw) {
        stdin.setRawMode(false);
      }
      stdin.pause();
    }

    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

export async function main() {
  const [, , command, ...rest] = process.argv;

  switch (command) {
    case "login": {
      await login();
      console.log("Login complete.");
      return;
    }
    case "logout": {
      await logout();
      console.log("Logged out.");
      return;
    }
    case "whoami": {
      const token = await getSavedToken();
      if (!token) {
        console.log("Not logged in.");
        return;
      }

      const user = await getCurrentUser(token);
      console.log(`${user.login} (${user.html_url})`);
      return;
    }
    case "browse": {
      await runBrowse();
      return;
    }
    case "open": {
      const filePath = rest[0];
      if (!filePath) {
        throw new Error("Provide a path to a .jsonl file.");
      }

      await exploreDocument(await loadLocalJsonl(filePath));
      return;
    }
    case "help":
    case undefined: {
      printHelp();
      return;
    }
    default: {
      throw new Error(`Unknown command: ${command}`);
    }
  }
}
