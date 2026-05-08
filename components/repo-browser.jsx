"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { JsonlViewer } from "@/components/jsonl-viewer";
import { usePiperySession } from "@/components/use-pipery-session";
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

const providerLabels = {
  github: "GitHub",
  gitlab: "GitLab",
  bitbucket: "Bitbucket"
};

function repoMetadataPath(provider, repo) {
  if (provider === "github") {
    return {
      branches: `/api/github/repos/${repo.owner}/${repo.name}/branches`,
      workflows: `/api/github/repos/${repo.owner}/${repo.name}/workflows`
    };
  }

  if (provider === "gitlab") {
    return {
      branches: `/api/gitlab/branches?projectId=${encodeURIComponent(repo.id)}`,
      workflows: null
    };
  }

  return {
    branches: `/api/bitbucket/branches?workspace=${encodeURIComponent(repo.workspace)}&repo=${encodeURIComponent(repo.slug)}`,
    workflows: null
  };
}

function runsPath(provider, repo, selection) {
  if (provider === "github") {
    return `/api/github/repos/${repo.owner}/${repo.name}/runs?branch=${encodeURIComponent(selection.branch)}&workflowId=${encodeURIComponent(selection.workflowId)}`;
  }

  if (provider === "gitlab") {
    return `/api/gitlab/pipelines?projectId=${encodeURIComponent(repo.id)}&branch=${encodeURIComponent(selection.branch)}`;
  }

  return `/api/bitbucket/pipelines?workspace=${encodeURIComponent(repo.workspace)}&repo=${encodeURIComponent(repo.slug)}&branch=${encodeURIComponent(selection.branch)}`;
}

function artifactsPath(provider, repo, selection) {
  if (provider === "github") {
    return `/api/github/repos/${repo.owner}/${repo.name}/artifacts?runId=${encodeURIComponent(selection.runId)}`;
  }

  if (provider === "gitlab") {
    return `/api/gitlab/jobs?projectId=${encodeURIComponent(repo.id)}&pipelineId=${encodeURIComponent(selection.runId)}`;
  }

  return `/api/bitbucket/downloads?workspace=${encodeURIComponent(repo.workspace)}&repo=${encodeURIComponent(repo.slug)}`;
}

function artifactFilePath(provider, repo, selection) {
  if (provider === "github") {
    return `/api/github/repos/${repo.owner}/${repo.name}/artifact-file?artifactId=${encodeURIComponent(selection.artifactId)}`;
  }

  if (provider === "gitlab") {
    return `/api/gitlab/artifact-file?projectId=${encodeURIComponent(repo.id)}&jobId=${encodeURIComponent(selection.artifactId)}`;
  }

  return `/api/bitbucket/artifact-file?workspace=${encodeURIComponent(repo.workspace)}&repo=${encodeURIComponent(repo.slug)}&name=${encodeURIComponent(selection.artifactId)}`;
}

export function RepoBrowser() {
  const { data: session } = usePiperySession();
  const searchParams = useSearchParams();
  const [provider, setProvider] = useState("github");
  const previousProviderRef = useRef(provider);
  const isSignedIn = Boolean(session?.accounts?.[provider]?.authenticated);
  const authenticatedProviders = session?.accounts ? Object.keys(session.accounts) : [];
  const authenticatedProvidersKey = authenticatedProviders.join(",");
  const hasAnyProviderSession = authenticatedProviders.length > 0;
  const [activeTab, setActiveTab] = useState("local");
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
  const workflowPlaceholder = [{ id: "pipery", name: provider === "gitlab" ? "GitLab pipelines" : "Bitbucket pipelines" }];
  const signInToProvider = () => {
    const callbackUrl = encodeURIComponent(window.location.href);
    window.location.href = `/api/auth/start?provider=${provider}&callbackUrl=${callbackUrl}`;
  };

  useEffect(() => {
    listSavedDocuments().then(setSavedDocuments).catch(() => {
      setSavedDocuments([]);
    });
  }, []);

  useEffect(() => {
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const runId = searchParams.get("runId");
    const artifactId = searchParams.get("artifactId");

    if (owner && repo && runId && artifactId) {
      setSelection({
        repo: `${owner}/${repo}`,
        branch: "",
        workflowId: "",
        runId,
        artifactId
      });
      setProvider("github");
      setActiveTab("provider");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isSignedIn && hasAnyProviderSession) {
      setProvider(authenticatedProviders[0]);
      return;
    }

    if (isSignedIn && activeTab === "local" && !document) {
      setActiveTab("provider");
    }

    if (!isSignedIn && activeTab === "provider") {
      setActiveTab("local");
    }
  }, [isSignedIn, hasAnyProviderSession, authenticatedProvidersKey, activeTab, document]);

  useEffect(() => {
    if (previousProviderRef.current === provider) {
      return;
    }

    previousProviderRef.current = provider;
    setRepos([]);
    setBranches([]);
    setWorkflows([]);
    setRuns([]);
    setArtifacts([]);
    setSelection({
      repo: "",
      branch: "",
      workflowId: "",
      runId: "",
      artifactId: ""
    });
  }, [provider]);

  useEffect(() => {
    if (!isSignedIn) {
      setError("");
      setLoading("");
      setRepos([]);
      setBranches([]);
      setWorkflows([]);
      setRuns([]);
      setArtifacts([]);
      setSelection({
        repo: "",
        branch: "",
        workflowId: "",
        runId: "",
        artifactId: ""
      });
      return;
    }

    setLoading("repos");
    const reposUrl = provider === "github" ? "/api/github/repos" : provider === "gitlab" ? "/api/gitlab/projects" : "/api/bitbucket/repos";
    fetchJson(reposUrl)
      .then((payload) => {
        setRepos(payload.repos);
        setSelection((current) => ({
          ...current,
          repo: payload.repos[0]?.fullName || ""
        }));
      })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(""));
  }, [isSignedIn, provider]);

  useEffect(() => {
    if (!selectedRepo) {
      return;
    }

    const paths = repoMetadataPath(provider, selectedRepo);
    setLoading("repo-metadata");
    Promise.all([
      fetchJson(paths.branches),
        paths.workflows ? fetchJson(paths.workflows) : Promise.resolve({ workflows: workflowPlaceholder })
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
  }, [selectedRepo, provider]);

  useEffect(() => {
    if (!selectedRepo || !selection.branch || !selection.workflowId) {
      return;
    }

    setLoading("runs");
    fetchJson(runsPath(provider, selectedRepo, selection))
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
  }, [selectedRepo, provider, selection.branch, selection.workflowId]);

  useEffect(() => {
    if (!selectedRepo || (provider !== "bitbucket" && !selection.runId)) {
      return;
    }

    setLoading("artifacts");
    fetchJson(artifactsPath(provider, selectedRepo, selection))
      .then((payload) => {
        setArtifacts(payload.artifacts);
        setSelection((current) => ({
          ...current,
          artifactId: String(payload.artifacts[0]?.id || "")
        }));
      })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(""));
  }, [selectedRepo, provider, selection.runId]);

  async function openArtifact() {
    if (!selectedRepo || !selection.artifactId) {
      return;
    }

    setError("");
    setLoading("open-artifact");

    try {
      const payload = await fetchJson(artifactFilePath(provider, selectedRepo, selection));

      const nextDocument = {
        id: `${provider}:${selectedRepo.fullName}:${selection.branch}:${selection.workflowId}:${selection.runId}:${selection.artifactId}`,
        provider,
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

  async function handleLocalUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");

    try {
      const content = await file.text();
      const nextDocument = {
        id: `local:${file.name}:${file.lastModified}`,
        repoFullName: "Local upload",
        branch: "",
        workflowId: "",
        runId: "",
        artifactId: "",
        filePath: file.name,
        content,
        files: [{ path: file.name, preferred: true }],
        source: "local",
        savedAt: new Date().toISOString()
      };

      setDocument(nextDocument);
      await saveDocument(nextDocument);
      setSavedDocuments(await listSavedDocuments());
      setActiveTab("local");
    } catch (uploadError) {
      setError(uploadError.message || "Unable to open the selected file.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="workspace">
      <section className="controlPanel panel">
        <div className="panelHeader">
          <div>
            <p className="panelLabel">Data Sources</p>
            <h2>Choose how to open a JSONL file</h2>
          </div>
          {loading ? <div className="statPill">Loading {loading}</div> : null}
        </div>

        <div className="tabRow" role="tablist" aria-label="JSONL source">
          <button
            className={`tabButton ${activeTab === "provider" ? "tabButtonActive" : ""}`}
            onClick={() => setActiveTab("provider")}
            role="tab"
            aria-selected={activeTab === "provider"}
          >
            CI/CD Artifacts
          </button>
          <button
            className={`tabButton ${activeTab === "local" ? "tabButtonActive" : ""}`}
            onClick={() => setActiveTab("local")}
            role="tab"
            aria-selected={activeTab === "local"}
          >
            Local Files
          </button>
        </div>

        {activeTab === "provider" ? (
          <>
            <div className="providerRow" role="tablist" aria-label="CI/CD provider">
              {Object.entries(providerLabels).map(([key, label]) => (
                <button
                  key={key}
                  className={`tabButton ${provider === key ? "tabButtonActive" : ""}`}
                  onClick={() => setProvider(key)}
                  role="tab"
                  aria-selected={provider === key}
                >
                  {label}
                </button>
              ))}
            </div>
            {isSignedIn ? (
              <>
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
                  {provider === "github" ? "Action" : "Pipeline source"}
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
                  {provider === "bitbucket" ? "Recent pipeline" : "Run"}
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
                  {provider === "gitlab" ? "Job artifact" : provider === "bitbucket" ? "Download" : "Artifact"}
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
                    <span>Provider</span>
                    <strong>{providerLabels[provider]}</strong>
                  </div>
                  <div className="metaCard">
                    <span>{provider === "bitbucket" ? "Recent pipeline count" : "Recent run count"}</span>
                    <strong>{runs.length}</strong>
                  </div>
                  <div className="metaCard">
                    <span>Artifact count</span>
                    <strong>{artifacts.length}</strong>
                  </div>
                  <div className="metaCard">
                    <span>Signed in as</span>
                    <strong>{session?.user?.email || session?.user?.name || session?.user?.login || `${providerLabels[provider]} user`}</strong>
                  </div>
                </div>

              <div className="buttonRow">
                <button className="primaryButton" onClick={openArtifact} disabled={!selection.artifactId}>
                  Open JSONL from artifact
                </button>
              </div>

              <div className="runList">
                {runs.slice(0, 5).map((run) => (
                  <article key={run.id} className="runCard">
                    <strong>{run.displayTitle || run.name}</strong>
                    <p>{run.event} • {run.conclusion || run.status}</p>
                    <span>{formatDate(run.updatedAt)}</span>
                  </article>
                ))}
              </div>
              </>
            ) : (
              <div className="emptyState smallEmpty providerSignInPrompt">
                <p>Sign in with {providerLabels[provider]} to browse projects, builds, and JSONL artifacts.</p>
                <button className="primaryButton" onClick={signInToProvider}>
                  Sign in with {providerLabels[provider]}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="localTab">
            <div className="uploadCard">
              <p className="panelLabel">Local Review</p>
              <h3>Upload a `.jsonl` file from your machine</h3>
              <p className="uploadHint">
                The file is read only in your web UI, is not uploaded to the backend, can be cached
                locally in your browser for later review, and uses the same search and timeline
                tools as artifact-backed logs.
              </p>
              <label className="uploadDropzone">
                <span>Select JSONL file</span>
                <input
                  className="fileInput"
                  type="file"
                  accept=".jsonl,application/x-ndjson,application/json"
                  onChange={handleLocalUpload}
                />
              </label>
            </div>

            <div className="metaGrid localMetaGrid">
              <div className="metaCard">
                <span>Access mode</span>
                <strong>{isSignedIn ? "Signed in" : "Offline/local only"}</strong>
              </div>
              <div className="metaCard">
                <span>Upload path</span>
                <strong>Browser only</strong>
              </div>
              <div className="metaCard">
                <span>Saved files</span>
                <strong>{savedDocuments.length}</strong>
              </div>
              <div className="metaCard">
                <span>Current source</span>
                <strong>{document?.source === "local" ? "Local upload" : "Saved/opened file"}</strong>
              </div>
              <div className="metaCard">
                <span>Viewer status</span>
                <strong>{document ? "Ready to inspect" : "Waiting for file"}</strong>
              </div>
            </div>
          </div>
        )}

        {error ? (
          <div className="errorBanner">
            <strong>Request failed.</strong> {error}
          </div>
        ) : null}
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
