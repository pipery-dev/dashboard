"use client";

import { useEffect, useMemo, useState } from "react";
import { JsonlViewer } from "@/components/jsonl-viewer";
import { getSavedDocument, listSavedDocuments, saveDocument } from "@/lib/storage";

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function RepoBrowser({ session }) {
  const [repos, setRepos] = useState([]);
  const [branches, setBranches] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [runs, setRuns] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [savedDocuments, setSavedDocuments] = useState([]);
  const [selection, setSelection] = useState({
    repo: "",
    branch: "",
    workflowId: "",
    runId: "",
    artifactId: ""
  });
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  const selectedRepo = useMemo(
    () => repos.find((repo) => repo.fullName === selection.repo) || null,
    [repos, selection.repo]
  );

  useEffect(() => {
    listSavedDocuments().then(setSavedDocuments).catch(() => {
      setSavedDocuments([]);
    });
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    setLoading("repos");
    fetchJson("/api/github/repos")
      .then((payload) => {
        setRepos(payload.repos);
        setSelection((current) => ({
          ...current,
          repo: payload.repos[0]?.fullName || ""
        }));
      })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(""));
  }, [session]);

  useEffect(() => {
    if (!selectedRepo) {
      return;
    }

    const repoPath = `/api/github/repos/${selectedRepo.owner}/${selectedRepo.name}`;
    setLoading("repo-metadata");
    Promise.all([
      fetchJson(`${repoPath}/branches`),
      fetchJson(`${repoPath}/workflows`)
    ])
      .then(([branchPayload, workflowPayload]) => {
        setBranches(branchPayload.branches);
        setWorkflows(workflowPayload.workflows);
        setSelection((current) => ({
          ...current,
          branch: branchPayload.branches.find((branch) => branch.name === selectedRepo.defaultBranch)?.name ||
            branchPayload.branches[0]?.name ||
            "",
          workflowId: String(workflowPayload.workflows[0]?.id || ""),
          runId: "",
          artifactId: ""
        }));
        setRuns([]);
        setArtifacts([]);
      })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(""));
  }, [selectedRepo]);

  useEffect(() => {
    if (!selectedRepo || !selection.branch || !selection.workflowId) {
      return;
    }

    setLoading("runs");
    fetchJson(
      `/api/github/repos/${selectedRepo.owner}/${selectedRepo.name}/runs?branch=${encodeURIComponent(selection.branch)}&workflowId=${encodeURIComponent(selection.workflowId)}`
    )
      .then((payload) => {
        setRuns(payload.runs);
        setSelection((current) => ({
          ...current,
          runId: String(payload.runs[0]?.id || ""),
          artifactId: ""
        }));
        setArtifacts([]);
      })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(""));
  }, [selectedRepo, selection.branch, selection.workflowId]);

  useEffect(() => {
    if (!selectedRepo || !selection.runId) {
      return;
    }

    setLoading("artifacts");
    fetchJson(
      `/api/github/repos/${selectedRepo.owner}/${selectedRepo.name}/artifacts?runId=${encodeURIComponent(selection.runId)}`
    )
      .then((payload) => {
        setArtifacts(payload.artifacts);
        setSelection((current) => ({
          ...current,
          artifactId: String(payload.artifacts[0]?.id || "")
        }));
      })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(""));
  }, [selectedRepo, selection.runId]);

  async function openArtifact() {
    if (!selectedRepo || !selection.artifactId) {
      return;
    }

    setError("");
    setLoading("open-artifact");

    try {
      const payload = await fetchJson(
        `/api/github/repos/${selectedRepo.owner}/${selectedRepo.name}/artifact-file?artifactId=${encodeURIComponent(selection.artifactId)}`
      );

      const nextDocument = {
        id: `${selectedRepo.fullName}:${selection.branch}:${selection.workflowId}:${selection.runId}:${selection.artifactId}`,
        repoFullName: selectedRepo.fullName,
        branch: selection.branch,
        workflowId: selection.workflowId,
        runId: selection.runId,
        artifactId: selection.artifactId,
        filePath: payload.selectedFile,
        content: payload.content,
        files: payload.files,
        savedAt: new Date().toISOString()
      };

      setDocument(nextDocument);
      await saveDocument(nextDocument);
      setSavedDocuments(await listSavedDocuments());
    } catch (openError) {
      setError(openError.message);
    } finally {
      setLoading("");
    }
  }

  async function reopenSaved(id) {
    const saved = await getSavedDocument(id);
    if (saved) {
      setDocument(saved);
    }
  }

  if (!session) {
    return (
      <section className="panel emptyState">
        <h2>GitHub sign-in required</h2>
        <p>
          The dashboard uses your GitHub session to list repositories and read GitHub Actions
          artifacts that contain Pipery JSONL output.
        </p>
      </section>
    );
  }

  return (
    <div className="workspace">
      <section className="controlPanel panel">
        <div className="panelHeader">
          <div>
            <p className="panelLabel">Artifact Flow</p>
            <h2>Select repository context</h2>
          </div>
          {loading ? <div className="statPill">Loading {loading}</div> : null}
        </div>

        <div className="formGrid">
          <label>
            Repository
            <select
              className="textInput"
              value={selection.repo}
              onChange={(event) =>
                setSelection({
                  repo: event.target.value,
                  branch: "",
                  workflowId: "",
                  runId: "",
                  artifactId: ""
                })
              }
            >
              {repos.map((repo) => (
                <option key={repo.id} value={repo.fullName}>
                  {repo.fullName}
                </option>
              ))}
            </select>
          </label>

          <label>
            Branch
            <select
              className="textInput"
              value={selection.branch}
              onChange={(event) =>
                setSelection((current) => ({
                  ...current,
                  branch: event.target.value,
                  runId: "",
                  artifactId: ""
                }))
              }
            >
              {branches.map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Action
            <select
              className="textInput"
              value={selection.workflowId}
              onChange={(event) =>
                setSelection((current) => ({
                  ...current,
                  workflowId: event.target.value,
                  runId: "",
                  artifactId: ""
                }))
              }
            >
              {workflows.map((workflow) => (
                <option key={workflow.id} value={String(workflow.id)}>
                  {workflow.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Run
            <select
              className="textInput"
              value={selection.runId}
              onChange={(event) =>
                setSelection((current) => ({
                  ...current,
                  runId: event.target.value,
                  artifactId: ""
                }))
              }
            >
              {runs.map((run) => (
                <option key={run.id} value={String(run.id)}>
                  {run.displayTitle || run.name} ({run.conclusion || run.status})
                </option>
              ))}
            </select>
          </label>

          <label>
            Artifact
            <select
              className="textInput"
              value={selection.artifactId}
              onChange={(event) =>
                setSelection((current) => ({
                  ...current,
                  artifactId: event.target.value
                }))
              }
            >
              {artifacts.map((artifact) => (
                <option key={artifact.id} value={String(artifact.id)}>
                  {artifact.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="metaGrid">
          <div className="metaCard">
            <span>Repository</span>
            <strong>{selectedRepo?.fullName || "None selected"}</strong>
          </div>
          <div className="metaCard">
            <span>Recent run count</span>
            <strong>{runs.length}</strong>
          </div>
          <div className="metaCard">
            <span>Artifact count</span>
            <strong>{artifacts.length}</strong>
          </div>
          <div className="metaCard">
            <span>Signed in as</span>
            <strong>{session.user?.email || session.user?.name || "GitHub user"}</strong>
          </div>
        </div>

        <div className="buttonRow">
          <button className="primaryButton" onClick={openArtifact} disabled={!selection.artifactId}>
            Open JSONL from artifact
          </button>
        </div>

        {error ? (
          <div className="errorBanner">
            <strong>Request failed.</strong> {error}
          </div>
        ) : null}

        <div className="runList">
          {runs.slice(0, 5).map((run) => (
            <article key={run.id} className="runCard">
              <strong>{run.displayTitle || run.name}</strong>
              <p>{run.event} • {run.conclusion || run.status}</p>
              <span>{formatDate(run.updatedAt)}</span>
            </article>
          ))}
        </div>
      </section>

      <aside className="savedPanel panel">
        <div className="panelHeader">
          <div>
            <p className="panelLabel">Offline Cache</p>
            <h2>Saved JSONL files</h2>
          </div>
        </div>
        <div className="savedList">
          {savedDocuments.map((saved) => (
            <button className="savedItem" key={saved.id} onClick={() => reopenSaved(saved.id)}>
              <strong>{saved.repoFullName}</strong>
              <p>{saved.filePath}</p>
              <span>{formatDate(saved.savedAt)}</span>
            </button>
          ))}
          {savedDocuments.length === 0 ? (
            <div className="emptyState smallEmpty">
              <p>Opened artifacts will be cached here for offline review.</p>
            </div>
          ) : null}
        </div>
      </aside>

      {document ? (
        <JsonlViewer document={document} onSelectSaved={() => reopenSaved(document.id)} />
      ) : (
        <section className="panel emptyState">
          <h2>No JSONL opened yet</h2>
          <p>
            Choose a repository, branch, workflow, run, and artifact, then open the `.jsonl` file.
            The dashboard will prefer `pipery.jsonl` when it exists inside the artifact zip.
          </p>
        </section>
      )}
    </div>
  );
}
