import type { DefaultTriggerCatalogEvent } from "./default-trigger-catalog";

export const GITHUB_TRIGGER_EVENTS = [
  {
    key: "github.*",
    displayName: "Any event",
    description: "Emit whenever GitHub delivers any webhook event (wildcard).",
    deliveryMode: "webhook",
  },
  {
    key: "github.check_run",
    displayName: "Check run",
    description:
      "Triggered when a check run is created, rerequested, completed, or has a requested action.",
    deliveryMode: "webhook",
  },
  {
    key: "github.check_suite",
    displayName: "Check suite",
    description: "Triggered when a check suite is completed, requested, or rerequested.",
    deliveryMode: "webhook",
  },
  {
    key: "github.commit_comment",
    displayName: "Commit comment",
    description: "Triggered when a commit comment is created.",
    deliveryMode: "webhook",
  },
  {
    key: "github.create",
    displayName: "Create",
    description: "Triggered when a repository, branch, or tag is created.",
    deliveryMode: "webhook",
  },
  {
    key: "github.delete",
    displayName: "Delete",
    description: "Triggered when a repository branch or tag is deleted.",
    deliveryMode: "webhook",
  },
  {
    key: "github.deploy_key",
    displayName: "Deploy key",
    description: "Triggered when a deploy key is added or removed from a repository.",
    deliveryMode: "webhook",
  },
  {
    key: "github.deployment",
    displayName: "Deployment",
    description: "Triggered when a deployment is created.",
    deliveryMode: "webhook",
  },
  {
    key: "github.deployment_status",
    displayName: "Deployment status",
    description: "Triggered when the status of a deployment changes.",
    deliveryMode: "webhook",
  },
  {
    key: "github.fork",
    displayName: "Fork",
    description: "Triggered when a user forks a repository.",
    deliveryMode: "webhook",
  },
  {
    key: "github.github_app_authorization",
    displayName: "GitHub App authorization",
    description: "Triggered when someone revokes their authorization of a GitHub App.",
    deliveryMode: "webhook",
  },
  {
    key: "github.gollum",
    displayName: "Gollum",
    description: "Triggered when a Wiki page is created or updated.",
    deliveryMode: "webhook",
  },
  {
    key: "github.installation",
    displayName: "Installation",
    description:
      "Triggered when someone installs, uninstalls, or accepts new permissions for a GitHub App.",
    deliveryMode: "webhook",
  },
  {
    key: "github.installation_repositories",
    displayName: "Installation repositories",
    description: "Triggered when a repository is added or removed from a GitHub App installation.",
    deliveryMode: "webhook",
  },
  {
    key: "github.issue_comment",
    displayName: "Issue comment",
    description: "Triggered when an issue comment is created, edited, or deleted.",
    deliveryMode: "webhook",
  },
  {
    key: "github.issues",
    displayName: "Issues",
    description:
      "Triggered when an issue is created, edited, deleted, transferred, pinned, closed, reopened, or changed.",
    deliveryMode: "webhook",
  },
  {
    key: "github.label",
    displayName: "Label",
    description: "Triggered when a repository's label is created, edited, or deleted.",
    deliveryMode: "webhook",
  },
  {
    key: "github.marketplace_purchase",
    displayName: "Marketplace purchase",
    description:
      "Triggered when a GitHub Marketplace plan is purchased, upgraded, downgraded, or cancelled.",
    deliveryMode: "webhook",
  },
  {
    key: "github.member",
    displayName: "Member",
    description:
      "Triggered when a user accepts an invitation, is removed, or has permissions changed as a collaborator.",
    deliveryMode: "webhook",
  },
  {
    key: "github.membership",
    displayName: "Membership",
    description: "Triggered when a user is added or removed from a team (organization hooks only).",
    deliveryMode: "webhook",
  },
  {
    key: "github.meta",
    displayName: "Meta",
    description: "Triggered when the webhook configuration itself is deleted.",
    deliveryMode: "webhook",
  },
  {
    key: "github.milestone",
    displayName: "Milestone",
    description: "Triggered when a milestone is created, closed, opened, edited, or deleted.",
    deliveryMode: "webhook",
  },
  {
    key: "github.org_block",
    displayName: "Org block",
    description:
      "Triggered when an organization blocks or unblocks a user (organization hooks only).",
    deliveryMode: "webhook",
  },
  {
    key: "github.organization",
    displayName: "Organization",
    description:
      "Triggered when an organization is renamed, deleted, or membership changes (organization hooks only).",
    deliveryMode: "webhook",
  },
  {
    key: "github.page_build",
    displayName: "Page build",
    description:
      "Triggered on pushes to a GitHub Pages enabled branch that results in a page build.",
    deliveryMode: "webhook",
  },
  {
    key: "github.project",
    displayName: "Project",
    description: "Triggered when a project is created, updated, closed, reopened, or deleted.",
    deliveryMode: "webhook",
  },
  {
    key: "github.project_card",
    displayName: "Project card",
    description:
      "Triggered when a project card is created, edited, moved, converted to an issue, or deleted.",
    deliveryMode: "webhook",
  },
  {
    key: "github.project_column",
    displayName: "Project column",
    description: "Triggered when a project column is created, updated, moved, or deleted.",
    deliveryMode: "webhook",
  },
  {
    key: "github.public",
    displayName: "Public",
    description: "Triggered when a private repository is open sourced.",
    deliveryMode: "webhook",
  },
  {
    key: "github.pull_request",
    displayName: "Pull request",
    description:
      "Triggered when a pull request is opened, edited, closed, reopened, labeled, assigned, or synchronized.",
    deliveryMode: "webhook",
  },
  {
    key: "github.pull_request_review",
    displayName: "Pull request review",
    description: "Triggered when a pull request review is submitted, edited, or dismissed.",
    deliveryMode: "webhook",
  },
  {
    key: "github.pull_request_review_comment",
    displayName: "Pull request review comment",
    description: "Triggered when a comment on a pull request diff is created, edited, or deleted.",
    deliveryMode: "webhook",
  },
  {
    key: "github.push",
    displayName: "Push",
    description:
      "Triggered on a push to a branch or tag. This is the default event for repository webhooks.",
    deliveryMode: "webhook",
  },
  {
    key: "github.release",
    displayName: "Release",
    description: "Triggered when a release is published, edited, deleted, or prereleased.",
    deliveryMode: "webhook",
  },
  {
    key: "github.repository",
    displayName: "Repository",
    description:
      "Triggered when a repository is created, archived, unarchived, renamed, transferred, or deleted.",
    deliveryMode: "webhook",
  },
  {
    key: "github.repository_import",
    displayName: "Repository import",
    description: "Triggered when a repository import succeeds, fails, or is cancelled.",
    deliveryMode: "webhook",
  },
  {
    key: "github.repository_vulnerability_alert",
    displayName: "Repository vulnerability alert",
    description: "Triggered when a Dependabot security alert is created, dismissed, or resolved.",
    deliveryMode: "webhook",
  },
  {
    key: "github.security_advisory",
    displayName: "Security advisory",
    description:
      "Triggered when a security advisory is published, updated, or withdrawn for an organization.",
    deliveryMode: "webhook",
  },
  {
    key: "github.star",
    displayName: "Star",
    description: "Triggered when a star is added to or removed from a repository.",
    deliveryMode: "webhook",
  },
  {
    key: "github.status",
    displayName: "Status",
    description: "Triggered when the status of a Git commit changes.",
    deliveryMode: "webhook",
  },
  {
    key: "github.team",
    displayName: "Team",
    description:
      "Triggered when an organization's team is created, deleted, edited, or repository access changes (organization hooks only).",
    deliveryMode: "webhook",
  },
  {
    key: "github.team_add",
    displayName: "Team add",
    description: "Triggered when a repository is added to a team.",
    deliveryMode: "webhook",
  },
  {
    key: "github.watch",
    displayName: "Watch",
    description: "Triggered when someone stars a repository.",
    deliveryMode: "webhook",
  },
] as const satisfies readonly DefaultTriggerCatalogEvent[];
