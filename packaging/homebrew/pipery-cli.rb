class PiperyCli < Formula
  desc "Browse Pipery GitHub artifact logs from the terminal"
  homepage "https://github.com/piperyhq/pipery-dashboard"
  version "0.1.0"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/piperyhq/pipery-dashboard/releases/download/pipery-cli-v0.1.0/pipery-cli_0.1.0_darwin_arm64.tar.gz"
      sha256 "REPLACE_DARWIN_ARM64_SHA256"
    else
      url "https://github.com/piperyhq/pipery-dashboard/releases/download/pipery-cli-v0.1.0/pipery-cli_0.1.0_darwin_amd64.tar.gz"
      sha256 "REPLACE_DARWIN_AMD64_SHA256"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/piperyhq/pipery-dashboard/releases/download/pipery-cli-v0.1.0/pipery-cli_0.1.0_linux_arm64.tar.gz"
      sha256 "REPLACE_LINUX_ARM64_SHA256"
    else
      url "https://github.com/piperyhq/pipery-dashboard/releases/download/pipery-cli-v0.1.0/pipery-cli_0.1.0_linux_amd64.tar.gz"
      sha256 "REPLACE_LINUX_AMD64_SHA256"
    end
  end

  def install
    bin.install "pipery"
  end

  test do
    assert_match "Pipery CLI", shell_output("#{bin}/pipery help")
  end
end
