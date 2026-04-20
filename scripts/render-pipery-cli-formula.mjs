import fs from "node:fs/promises";
import path from "node:path";

const version = process.env.PIPERY_VERSION;
const repository = process.env.GITHUB_REPOSITORY;

if (!version || !repository) {
  throw new Error("PIPERY_VERSION and GITHUB_REPOSITORY are required.");
}

const checksumsPath = path.resolve("dist/checksums.txt");
const checksums = new Map();

for (const line of (await fs.readFile(checksumsPath, "utf8")).split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed) {
    continue;
  }

  const [sha, file] = trimmed.split(/\s+/);
  checksums.set(file, sha);
}

function getSha(file) {
  const value = checksums.get(file);
  if (!value) {
    throw new Error(`Missing checksum for ${file}`);
  }

  return value;
}

const formula = `class PiperyCli < Formula
  desc "Browse Pipery GitHub artifact logs from the terminal"
  homepage "https://github.com/${repository}"
  version "${version}"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/${repository}/releases/download/pipery-cli-v${version}/pipery-cli_${version}_darwin_arm64.tar.gz"
      sha256 "${getSha(`pipery-cli_${version}_darwin_arm64.tar.gz`)}"
    else
      url "https://github.com/${repository}/releases/download/pipery-cli-v${version}/pipery-cli_${version}_darwin_amd64.tar.gz"
      sha256 "${getSha(`pipery-cli_${version}_darwin_amd64.tar.gz`)}"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/${repository}/releases/download/pipery-cli-v${version}/pipery-cli_${version}_linux_arm64.tar.gz"
      sha256 "${getSha(`pipery-cli_${version}_linux_arm64.tar.gz`)}"
    else
      url "https://github.com/${repository}/releases/download/pipery-cli-v${version}/pipery-cli_${version}_linux_amd64.tar.gz"
      sha256 "${getSha(`pipery-cli_${version}_linux_amd64.tar.gz`)}"
    end
  end

  def install
    bin.install "pipery"
  end

  test do
    assert_match "Pipery CLI", shell_output("#{bin}/pipery help")
  end
end
`;

await fs.mkdir(path.resolve("dist"), { recursive: true });
await fs.writeFile(path.resolve("dist/pipery-cli.rb"), formula);
