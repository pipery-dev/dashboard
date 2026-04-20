import JSZip from "jszip";

const API_ROOT = "https://api.github.com";
const DEFAULT_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28"
};

async function requestGitHub(pathname, token) {
  const response = await fetch(`${API_ROOT}${pathname}`, {
    headers: {
      ...DEFAULT_HEADERS,
      Authorization: `Bearer ${token}`
    }
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || `GitHub request failed for ${pathname}`);
  }

  return payload;
}

export async function getCurrentUser(token) {
  return requestGitHub("/user", token);
}

export async function listRepos(token) {
  const repos = await requestGitHub(
    "/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member",
    token
  );

  return repos.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner.login,
    private: repo.private,
    defaultBranch: repo.default_branch,
    updatedAt: repo.updated_at,
    url: repo.html_url
  }));
}

export async function listBranches(owner, repo, token) {
  const branches = await requestGitHub(`/repos/${owner}/${repo}/branches?per_page=100`, token);

  return branches.map((branch) => ({
    name: branch.name,
    protected: branch.protected
  }));
}

export async function listWorkflows(owner, repo, token) {
  const payload = await requestGitHub(`/repos/${owner}/${repo}/actions/workflows?per_page=100`, token);

  return (payload.workflows || []).map((workflow) => ({
    id: workflow.id,
    name: workflow.name,
    path: workflow.path,
    state: workflow.state
  }));
}

export async function listRuns(owner, repo, workflowId, branch, token) {
  const query = new URLSearchParams({
    branch,
    per_page: "50"
  });
  const payload = await requestGitHub(
    `/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?${query}`,
    token
  );

  return (payload.workflow_runs || []).map((run) => ({
    id: run.id,
    name: run.name,
    displayTitle: run.display_title,
    event: run.event,
    status: run.status,
    conclusion: run.conclusion,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    htmlUrl: run.html_url
  }));
}

export async function listArtifacts(owner, repo, runId, token) {
  const payload = await requestGitHub(
    `/repos/${owner}/${repo}/actions/runs/${runId}/artifacts?per_page=100`,
    token
  );

  return (payload.artifacts || []).map((artifact) => ({
    id: artifact.id,
    name: artifact.name,
    sizeInBytes: artifact.size_in_bytes,
    expiresAt: artifact.expires_at,
    createdAt: artifact.created_at,
    updatedAt: artifact.updated_at,
    expired: artifact.expired
  }));
}

export async function downloadJsonlFromArtifact(owner, repo, artifactId, token) {
  const response = await fetch(
    `${API_ROOT}/repos/${owner}/${repo}/actions/artifacts/${artifactId}/zip`,
    {
      headers: {
        ...DEFAULT_HEADERS,
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || "Unable to download the selected artifact.");
  }

  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const files = [];

  for (const [filePath, file] of Object.entries(zip.files)) {
    if (file.dir || !filePath.toLowerCase().endsWith(".jsonl")) {
      continue;
    }

    files.push({
      path: filePath,
      content: await file.async("text"),
      preferred: filePath.toLowerCase().endsWith("pipery.jsonl")
    });
  }

  if (files.length === 0) {
    throw new Error("No .jsonl files were found inside the selected artifact.");
  }

  files.sort((left, right) => Number(right.preferred) - Number(left.preferred));
  return files;
}
