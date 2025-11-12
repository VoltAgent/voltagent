import React, { useState } from "react";

interface GitHubEvent {
  id: string;
  name: string;
  category: string;
  description: string;
}

const categories = [
  { id: "all", label: "All Events" },
  { id: "repository", label: "Repository" },
  { id: "project", label: "Project Management" },
  { id: "cicd", label: "CI/CD & Deployment" },
  { id: "security", label: "Security" },
  { id: "collaboration", label: "Collaboration" },
  { id: "other", label: "Other" },
];

const events: GitHubEvent[] = [
  // Repository Events
  {
    id: "push",
    name: "Push",
    category: "repository",
    description: "Commits pushed to a repository branch or tag",
  },
  {
    id: "pull_request",
    name: "Pull Request",
    category: "repository",
    description: "Pull request activity (opened, closed, synchronized, merged, labeled, assigned)",
  },
  {
    id: "pull_request_review",
    name: "Pull Request Review",
    category: "repository",
    description: "Pull request review submitted, edited, or dismissed",
  },
  {
    id: "issues",
    name: "Issues",
    category: "repository",
    description: "Issue activity (created, edited, deleted, transferred, pinned, closed, reopened)",
  },
  {
    id: "issue_comment",
    name: "Issue Comment",
    category: "repository",
    description: "Comments on issues or pull requests (created, edited, deleted)",
  },
  {
    id: "release",
    name: "Release",
    category: "repository",
    description: "Release published, edited, deleted, or prereleased",
  },
  { id: "fork", name: "Fork", category: "repository", description: "User forks a repository" },
  {
    id: "star",
    name: "Star",
    category: "repository",
    description: "Star added to or removed from a repository",
  },
  { id: "watch", name: "Watch", category: "repository", description: "Someone stars a repository" },
  {
    id: "create",
    name: "Create",
    category: "repository",
    description: "Repository, branch, or tag created",
  },
  {
    id: "delete",
    name: "Delete",
    category: "repository",
    description: "Repository branch or tag deleted",
  },
  {
    id: "branch_protection_rule",
    name: "Branch Protection Rule",
    category: "repository",
    description: "Branch protection rules changed",
  },
  { id: "public", name: "Public", category: "repository", description: "Repository made public" },
  {
    id: "repository",
    name: "Repository",
    category: "repository",
    description:
      "Repository created, deleted, archived, unarchived, publicized, privatized, edited, renamed, transferred, or changed",
  },

  // Project Management
  {
    id: "project",
    name: "Project",
    category: "project",
    description: "Project created, updated, closed, reopened, edited, or deleted",
  },
  {
    id: "project_card",
    name: "Project Card",
    category: "project",
    description: "Project card created, edited, moved, converted, or deleted",
  },
  {
    id: "project_column",
    name: "Project Column",
    category: "project",
    description: "Project column created, updated, moved, or deleted",
  },
  {
    id: "milestone",
    name: "Milestone",
    category: "project",
    description: "Milestone created, edited, closed, opened, or deleted",
  },
  {
    id: "label",
    name: "Label",
    category: "project",
    description: "Label created, edited, or deleted",
  },

  // CI/CD & Deployment
  {
    id: "check_run",
    name: "Check Run",
    category: "cicd",
    description: "Check run created, completed, or rerequested",
  },
  {
    id: "check_suite",
    name: "Check Suite",
    category: "cicd",
    description: "Check suite completed or requested",
  },
  { id: "deployment", name: "Deployment", category: "cicd", description: "Deployment created" },
  {
    id: "deployment_status",
    name: "Deployment Status",
    category: "cicd",
    description: "Deployment status updated",
  },
  { id: "status", name: "Status", category: "cicd", description: "Commit status updated" },
  {
    id: "workflow_dispatch",
    name: "Workflow Dispatch",
    category: "cicd",
    description: "Manual workflow trigger",
  },
  {
    id: "workflow_job",
    name: "Workflow Job",
    category: "cicd",
    description: "Workflow job queued, in progress, or completed",
  },
  {
    id: "workflow_run",
    name: "Workflow Run",
    category: "cicd",
    description: "Workflow run requested, in progress, or completed",
  },
  { id: "page_build", name: "Page Build", category: "cicd", description: "Pages site built" },
  { id: "deploy", name: "Deploy", category: "cicd", description: "Deployment request" },

  // Security
  {
    id: "code_scanning_alert",
    name: "Code Scanning Alert",
    category: "security",
    description: "Code scanning alert created, fixed, appeared in branch, closed, or reopened",
  },
  {
    id: "repository_vulnerability_alert",
    name: "Repository Vulnerability Alert",
    category: "security",
    description: "Security vulnerability detected",
  },
  {
    id: "security_advisory",
    name: "Security Advisory",
    category: "security",
    description: "Security advisory published, updated, or withdrawn",
  },
  {
    id: "repository_advisory",
    name: "Repository Advisory",
    category: "security",
    description: "Repository security advisory published, updated, or reported",
  },

  // Collaboration
  {
    id: "discussion",
    name: "Discussion",
    category: "collaboration",
    description: "Discussion created, edited, deleted, or changed",
  },
  {
    id: "discussion_comment",
    name: "Discussion Comment",
    category: "collaboration",
    description: "Comment on a discussion",
  },
  {
    id: "member",
    name: "Member",
    category: "collaboration",
    description: "Collaborator added to repository",
  },
  {
    id: "membership",
    name: "Membership",
    category: "collaboration",
    description: "User added or removed from team",
  },
  {
    id: "team",
    name: "Team",
    category: "collaboration",
    description: "Team created, deleted, edited, added to repository, or removed from repository",
  },
  {
    id: "team_add",
    name: "Team Add",
    category: "collaboration",
    description: "Team added to repository",
  },
  {
    id: "organization",
    name: "Organization",
    category: "collaboration",
    description: "Organization deleted, renamed, member added, member removed, or member invited",
  },
  {
    id: "org_block",
    name: "Org Block",
    category: "collaboration",
    description: "Organization blocks or unblocks a user",
  },
  {
    id: "sponsorship",
    name: "Sponsorship",
    category: "collaboration",
    description: "Sponsorship created, cancelled, edited, tier changed, or pending tier change",
  },

  // Other
  {
    id: "commit_comment",
    name: "Commit Comment",
    category: "other",
    description: "Comment on a commit",
  },
  {
    id: "pull_request_review_comment",
    name: "Pull Request Review Comment",
    category: "other",
    description: "Comment on pull request diff",
  },
  {
    id: "pull_request_review_thread",
    name: "Pull Request Review Thread",
    category: "other",
    description: "Review thread resolved or unresolved",
  },
  {
    id: "deploy_key",
    name: "Deploy Key",
    category: "other",
    description: "Deploy key added or removed",
  },
  { id: "gollum", name: "Gollum", category: "other", description: "Wiki page updated" },
  {
    id: "package",
    name: "Package",
    category: "other",
    description: "Package published or updated",
  },
  {
    id: "repository_dispatch",
    name: "Repository Dispatch",
    category: "other",
    description: "Custom webhook event",
  },
  {
    id: "repository_import",
    name: "Repository Import",
    category: "other",
    description: "Repository import completed",
  },
  { id: "meta", name: "Meta", category: "other", description: "Webhook modified" },
];

export default function GitHubEventTypes(): JSX.Element {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const filteredEvents =
    selectedCategory === "all"
      ? events
      : events.filter((event) => event.category === selectedCategory);

  return (
    <div className="my-6">
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors border border-solid whitespace-nowrap ${
              selectedCategory === category.id
                ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20"
                : "bg-transparent text-[#10b981] border-[#30363d] hover:bg-[#10b98110]"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Toggle Button */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center cursor-pointer gap-2 text-sm mt-8 text-emerald-400 mb-3 transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>
          {isExpanded ? "Hide" : "Show"} {filteredEvents.length} events
        </span>
      </div>

      {/* Event List */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredEvents.map((event) => (
            <div key={event.id} className="p-4 rounded-md border border-solid border-[#30363d]">
              <div className="flex justify-between items-start mb-1">
                <span className="!text-sm font-semibold  text-[var(--ifm-heading-color)]">
                  {event.name}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-400/10 text-emerald-400 border border-solid border-emerald-400/20 inline-block mb-2">
                  WEBHOOK
                </span>
              </div>

              <p className="!text-sm text-[var(--ifm-font-color-base)] !mb-0">
                {event.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
