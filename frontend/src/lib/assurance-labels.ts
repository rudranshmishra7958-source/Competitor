import type { LiveSessionRow } from "@exam/shared";

export function assuranceLabel(assurance: LiveSessionRow["assurance"]): string {
  switch (assurance) {
    case "browser_only":
      return "Browser only";
    case "browser_endpoint":
      return "Browser + agent";
    case "agent_required_missing":
      return "Agent required (not connected)";
    default:
      return String(assurance).replaceAll("_", " ");
  }
}

export function reviewLabel(status: string): string {
  switch (status) {
    case "unreviewed":
      return "Unreviewed";
    case "flagged":
      return "Flagged";
    case "cleared":
      return "Cleared";
    default:
      return status;
  }
}
