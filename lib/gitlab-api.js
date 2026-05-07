import JSZip from "jszip";

const GITLAB_API_BASE = process.env.GITLAB_API_BASE || "https://gitlab.com/api/v4";

async function gitlabRequest(path, token, init = {}) {
  const response = await fetch(`${GITLAB_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitLab API ${response.status}: ${text || response.statusText}`);
  }

  return response.json();
}

function normalizeJob(job) {
  return {
    id: job.id,
    name: job.name,
    displayTitle: job.name,
    event: job.stage,
    status: job.status,
    conclusion: job.status,
    createdAt: job.created_at,
    updatedAt: job.finished_at || job.created_at,
    htmlUrl: job.web_url
  };
}

export async function listGitLabProjects(token) {
  const projects = await gitlabRequest(
    "/projects?membership=true&simple=true&order_by=last_activity_at&sort=desc&per_page=100",
    token
  );

  return projects.map((project) => ({
    id: String(project.id),
    name: project.name,
    fullName: project.path_with_namespace,
    owner: project.namespace?.full_path || "",
    private: project.visibility !== "public",
    defaultBranch: project.default_branch || "main",
    updatedAt: project.last_activity_at,
    url: project.web_url
  }));
}

export async function listGitLabBranches(projectId, token) {
  const branches = await gitlabRequest(
    `/projects/${encodeURIComponent(projectId)}/repository/branches?per_page=100`,
    token
  );

  return branches.map((branch) => ({
    name: branch.name,
    protected: branch.protected
  }));
}

export async function listGitLabPipelines(projectId, branch, token) {
  const query = new URLSearchParams({ ref: branch, per_page: "50" });
  const pipelines = await gitlabRequest(
    `/projects/${encodeURIComponent(projectId)}/pipelines?${query}`,
    token
  );

  return pipelines.map((pipeline) => ({
    id: pipeline.id,
    name: `Pipeline #${pipeline.id}`,
    displayTitle: `Pipeline #${pipeline.id}`,
    event: pipeline.source,
    status: pipeline.status,
    conclusion: pipeline.status,
    createdAt: pipeline.created_at,
    updatedAt: pipeline.updated_at,
    htmlUrl: pipeline.web_url
  }));
}

export async function listGitLabJobs(projectId, pipelineId, token) {
  const jobs = await gitlabRequest(
    `/projects/${encodeURIComponent(projectId)}/pipelines/${encodeURIComponent(pipelineId)}/jobs?per_page=100`,
    token
  );

  return jobs.filter((job) => job.artifacts_file?.filename).map(normalizeJob);
}

export async function downloadGitLabJsonlArtifact(projectId, jobId, token) {
  const response = await fetch(
    `${GITLAB_API_BASE}/projects/${encodeURIComponent(projectId)}/jobs/${encodeURIComponent(jobId)}/artifacts`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Unable to download the selected GitLab artifact.");
  }

  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const files = [];

  for (const [filePath, file] of Object.entries(zip.files)) {
    if (file.dir || !filePath.toLowerCase().endsWith(".jsonl")) continue;
    files.push({
      path: filePath,
      content: await file.async("text"),
      preferred: filePath.toLowerCase().endsWith("pipery.jsonl")
    });
  }

  files.sort((left, right) => Number(right.preferred) - Number(left.preferred));
  return files;
}
