import { appendFileSync, readFileSync } from "node:fs"

const [reportPath, statusArgument, mode] = process.argv.slice(2)
const auditStatus = Number(statusArgument)
const failOnVulnerabilities = mode === "--fail-on-vulnerabilities"

if (!reportPath || !Number.isInteger(auditStatus)) {
  throw new Error(
    "Usage: node report-pnpm-audit.mjs <report-path> <audit-status> [--fail-on-vulnerabilities]"
  )
}

let report

try {
  report = JSON.parse(readFileSync(reportPath, "utf8"))
} catch (error) {
  throw new Error(`Could not parse pnpm audit JSON: ${error.message}`)
}

const counts = report.metadata?.vulnerabilities

if (report.error || !counts) {
  throw new Error("pnpm audit did not return a vulnerability report")
}

const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
const advisories = report.advisories ?? report.vulnerabilities ?? {}

const escapeCommandMessage = (value) =>
  String(value).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A")

const escapeCommandProperty = (value) =>
  escapeCommandMessage(value).replace(/:/g, "%3A").replace(/,/g, "%2C")

const advisoryDetails = Object.entries(advisories).map(([key, advisory]) => {
  const name = advisory.module_name ?? advisory.name ?? key
  const severity = advisory.severity ?? "unknown"
  const title = advisory.title ?? advisory.via?.find((item) => typeof item === "object")?.title ?? name
  const vulnerable = advisory.vulnerable_versions ?? advisory.range ?? "unknown"
  const patched = advisory.patched_versions ?? advisory.fixAvailable?.version ?? "not listed"
  const url = advisory.url ?? advisory.via?.find((item) => typeof item === "object")?.url
  const paths = (advisory.findings ?? [])
    .flatMap((finding) => finding.paths ?? [])
    .slice(0, 5)

  return { name, severity, title, vulnerable, patched, url, paths }
})

const summary = ["## pnpm audit", ""]

if (total === 0) {
  summary.push("No known vulnerabilities found.")
} else {
  summary.push(`**${total} vulnerability${total === 1 ? "" : "ies"} found.**`, "")

  for (const advisory of advisoryDetails) {
    const message = [
      `Severity: ${advisory.severity}`,
      `Affected: ${advisory.vulnerable}`,
      `Patched: ${advisory.patched}`,
      ...(advisory.paths.length > 0 ? [`Paths: ${advisory.paths.join("; ")}`] : []),
      ...(advisory.url ? [`More info: ${advisory.url}`] : []),
    ].join(" | ")

    console.log(
      `::error title=${escapeCommandProperty(`pnpm audit: ${advisory.name}`)}::${escapeCommandMessage(`${advisory.title}. ${message}`)}`
    )

    summary.push(`### ${advisory.name} (${advisory.severity})`, "")
    summary.push(`- ${advisory.title}`)
    summary.push(`- Affected: \`${advisory.vulnerable}\``)
    summary.push(`- Patched: \`${advisory.patched}\``)

    if (advisory.paths.length > 0) {
      summary.push("- Paths:")
      summary.push(...advisory.paths.map((path) => `  - \`${path}\``))
    }

    if (advisory.url) {
      summary.push(`- More info: ${advisory.url}`)
    }

    summary.push("")
  }
}

appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary.join("\n")}\n`)
appendFileSync(process.env.GITHUB_OUTPUT, `vulnerable=${total > 0}\n`)

if (auditStatus !== 0 && total === 0) {
  throw new Error("pnpm audit failed without reporting vulnerabilities")
}

if (failOnVulnerabilities && total > 0) {
  process.exitCode = 1
}
