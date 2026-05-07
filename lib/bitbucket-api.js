import JSZip from "jszip";

const BITBUCKET_API_BASE = "https://api.bitbucket.org/2.0";

async function bitbucketRequest(path, token) {
  const response = await fetch(`${BITBUCKET_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Bitbucket API ${response.status}: ${text || response.statusText}`);
  }

  return response.json();
}

async function bitbucketPaged(path, token) {
  const values = [];
  let nextPath = path;

  while (nextPath) {
    const payload = await bitbucketRequest(nextPath.startsWith("http") ? nextPath.replace(BITBUCKET_API_BASE, "") : nextPath, token);
    values.push(...(payload.values || []));
    nextPath = payload.next || "";
  }

  return values;
}

function repoPath(workspace, repoSlug) {
  return `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repoSlug)}`;
}

export async function listBitbucketRepos(token) {
  const repos = await bitbucketPaged("/repositories?role=member&sort=-updated_on&pagelen=100", token);

  return repos.map((repo) => ({
    id: repo.uuid || repo.full_name,
    name: repo.slug,
    fullName: repo.full_name,
    owner: repo.workspace?.slug || repo.full_name.split("/")[0],
    private: repo.is_private,
    defaultBranch: repo.mainbranch?.name || "main",
    updatedAt: repo.updated_on,
    url: repo.links?.html?.href,
    workspace: repo.workspace?.slug || repo.full_name.split("/")[0],
    slug: repo.slug
  }));
}

export async function listBitbucketBranches(workspace, repoSlug, token) {
  const branches = await bitbucketPaged(`${repoPath(workspace, repoSlug)}/refs/branches?pagelen=100`, token);

  return branches.map((branch) => ({
    name: branch.name,
    protected: false
  }));
}

export async function listBitbucketPipelines(workspace, repoSlug, branch, token) {
  const query = new URLSearchParams({
    "target.ref_name": branch,
    sort: "-created_on",
    pagelen: "50"
  });
  const pipelines = await bitbucketPaged(`${repoPath(workspace, repoSlug)}/pipelines/?${query}`, token);

  return pipelines.map((pipeline) => ({
    id: pipeline.uuid,
    name: pipeline.build_number ? `Pipeline #${pipeline.build_number}` : "Pipeline",
    displayTitle: pipeline.build_number ? `Pipeline #${pipeline.build_number}` : "Pipeline",
    event: pipeline.trigger?.name || pipeline.target?.type || "pipeline",
    status: pipeline.state?.result?.name || pipeline.state?.name,
    conclusion: pipeline.state?.result?.name || pipeline.state?.name,
    createdAt: pipeline.created_on,
    updatedAt: pipeline.completed_on || pipeline.created_on,
    htmlUrl: pipeline.links?.html?.href
  }));
}

export async function listBitbucketDownloads(workspace, repoSlug, token) {
  const downloads = await bitbucketPaged(`${repoPath(workspace, repoSlug)}/downloads?pagelen=100`, token);

  return downloads
    .filter((download) => /\.(zip|jsonl)$/i.test(download.name))
    .map((download) => ({
      id: download.name,
      name: download.name,
      sizeInBytes: download.size,
      createdAt: download.created_on,
      updatedAt: download.created_on
    }));
}

export async function downloadBitbucketJsonlArtifact(workspace, repoSlug, name, token) {
  const response = await fetch(`${BITBUCKET_API_BASE}${repoPath(workspace, repoSlug)}/downloads/${encodeURIComponent(name)}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Unable to download the selected Bitbucket artifact.");
  }

  if (name.toLowerCase().endsWith(".jsonl")) {
    return [{ path: name, content: await response.text(), preferred: name.toLowerCase().endsWith("pipery.jsonl") }];
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
