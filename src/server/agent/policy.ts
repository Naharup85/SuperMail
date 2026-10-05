import type {
  ActionPolicyDefinition,
  AgentPermissionKey,
} from "@/types/agent-actions";

/**
 * Default User Permissions for SuperMail AI Agent (Phase 13).
 *
 * All authorized users start with standard read and staged write permissions.
 * Destructive operations (permanent deletion) are NOT a permission and are permanently BLOCKED.
 */
export const DEFAULT_USER_PERMISSIONS: Record<AgentPermissionKey, boolean> = {
  "gmail.read": true,
  "gmail.draft": true,
  "gmail.modify": true,
  "gmail.send": true,
  "gmail.trash": true,
  "calendar.read": true,
  "calendar.create": true,
  "calendar.update": true,
  "calendar.delete": true,
};

/**
 * Centralized Action Policy Registry.
 *
 * Defines the authoritative risk levels, confirmation requirements,
 * permissions, and blocked states for all agent operations.
 */
export const ACTION_POLICIES: Record<string, ActionPolicyDefinition> = {
  // --- Low-Risk Gmail Actions ---
  create_draft: {
    action: "create_draft",
    name: "Create Email Draft",
    provider: "gmail",
    riskLevel: "LOW",
    allowed: true,
    requiresConfirmation: false,
    isDestructive: false,
    isReversible: true,
    requiredPermission: "gmail.draft",
    description: "Create an email draft without sending it.",
  },
  modify_email: {
    action: "modify_email",
    name: "Modify Email Labels",
    provider: "gmail",
    riskLevel: "LOW",
    allowed: true,
    requiresConfirmation: false,
    isDestructive: false,
    isReversible: true,
    requiredPermission: "gmail.modify",
    description: "Modify email labels (mark read/unread, star/unstar, archive).",
  },
  modify_message: {
    action: "modify_message",
    name: "Modify Email Labels",
    provider: "gmail",
    riskLevel: "LOW",
    allowed: true,
    requiresConfirmation: false,
    isDestructive: false,
    isReversible: true,
    requiredPermission: "gmail.modify",
    description: "Modify email labels (alias for modify_email).",
  },

  // --- High-Impact Gmail Actions ---
  send_email: {
    action: "send_email",
    name: "Send Email",
    provider: "gmail",
    riskLevel: "HIGH",
    allowed: true,
    requiresConfirmation: true,
    isDestructive: false,
    isReversible: false,
    requiredPermission: "gmail.send",
    description: "Send a new outgoing email to external recipients.",
  },
  send_reply: {
    action: "send_reply",
    name: "Send Reply",
    provider: "gmail",
    riskLevel: "HIGH",
    allowed: true,
    requiresConfirmation: true,
    isDestructive: false,
    isReversible: false,
    requiredPermission: "gmail.send",
    description: "Send a reply within an existing email thread.",
  },

  // --- Destructive Gmail Actions ---
  trash_message: {
    action: "trash_message",
    name: "Move Email to Trash",
    provider: "gmail",
    riskLevel: "DESTRUCTIVE",
    allowed: true,
    requiresConfirmation: true,
    isDestructive: true,
    isReversible: true,
    requiredPermission: "gmail.trash",
    description: "Move an email message to the Gmail Trash folder.",
  },

  // --- Blocked Gmail Actions ---
  permanent_email_delete: {
    action: "permanent_email_delete",
    name: "Permanent Email Deletion",
    provider: "gmail",
    riskLevel: "BLOCKED",
    allowed: false,
    requiresConfirmation: false,
    isDestructive: true,
    isReversible: false,
    requiredPermission: null,
    description: "Permanent deletion of emails is blocked for safety.",
  },

  // --- High-Impact Google Calendar Actions ---
  create_calendar_event: {
    action: "create_calendar_event",
    name: "Create Calendar Event",
    provider: "googlecalendar",
    riskLevel: "HIGH",
    allowed: true,
    requiresConfirmation: true,
    isDestructive: false,
    isReversible: true,
    requiredPermission: "calendar.create",
    description: "Create a new meeting or event on Google Calendar.",
  },
  update_calendar_event: {
    action: "update_calendar_event",
    name: "Update Calendar Event",
    provider: "googlecalendar",
    riskLevel: "HIGH",
    allowed: true,
    requiresConfirmation: true,
    isDestructive: false,
    isReversible: true,
    requiredPermission: "calendar.update",
    description: "Update, reschedule, or edit an existing Google Calendar event.",
  },

  // --- Destructive Google Calendar Actions ---
  delete_calendar_event: {
    action: "delete_calendar_event",
    name: "Delete Calendar Event",
    provider: "googlecalendar",
    riskLevel: "DESTRUCTIVE",
    allowed: true,
    requiresConfirmation: true,
    isDestructive: true,
    isReversible: false,
    requiredPermission: "calendar.delete",
    description: "Delete an existing event from Google Calendar.",
  },

  // --- Blocked Calendar Actions ---
  permanent_calendar_purge: {
    action: "permanent_calendar_purge",
    name: "Purge Calendar",
    provider: "googlecalendar",
    riskLevel: "BLOCKED",
    allowed: false,
    requiresConfirmation: false,
    isDestructive: true,
    isReversible: false,
    requiredPermission: null,
    description: "Purging entire calendars is blocked.",
  },

  // --- Automation Management Actions (Phase 14) ---
  create_automation: {
    action: "create_automation",
    name: "Create Automation Workflow",
    provider: "automations",
    riskLevel: "LOW",
    allowed: true,
    requiresConfirmation: true,
    isDestructive: false,
    isReversible: true,
    requiredPermission: null,
    description: "Create a scheduled or one-time automation task after user confirmation.",
  },
  update_automation: {
    action: "update_automation",
    name: "Update Automation Workflow",
    provider: "automations",
    riskLevel: "LOW",
    allowed: true,
    requiresConfirmation: true,
    isDestructive: false,
    isReversible: true,
    requiredPermission: null,
    description: "Update, pause, or resume an automation workflow after user confirmation.",
  },
  delete_automation: {
    action: "delete_automation",
    name: "Delete Automation Workflow",
    provider: "automations",
    riskLevel: "HIGH",
    allowed: true,
    requiresConfirmation: true,
    isDestructive: true,
    isReversible: false,
    requiredPermission: null,
    description: "Delete an automation workflow after user confirmation.",
  },

  // --- Native Read Operations ---
  "gmail.api.messages.list": {
    action: "gmail.api.messages.list",
    name: "List Emails",
    provider: "gmail",
    riskLevel: "LOW",
    allowed: true,
    requiresConfirmation: false,
    isDestructive: false,
    isReversible: true,
    requiredPermission: "gmail.read",
    description: "Read-only listing of Gmail messages.",
  },
  "gmail.api.messages.get": {
    action: "gmail.api.messages.get",
    name: "Get Email Message",
    provider: "gmail",
    riskLevel: "LOW",
    allowed: true,
    requiresConfirmation: false,
    isDestructive: false,
    isReversible: true,
    requiredPermission: "gmail.read",
    description: "Read-only retrieval of a Gmail message.",
  },
  "gmail.api.threads.list": {
    action: "gmail.api.threads.list",
    name: "List Email Threads",
    provider: "gmail",
    riskLevel: "LOW",
    allowed: true,
    requiresConfirmation: false,
    isDestructive: false,
    isReversible: true,
    requiredPermission: "gmail.read",
    description: "Read-only listing of Gmail threads.",
  },
  "gmail.api.threads.get": {
    action: "gmail.api.threads.get",
    name: "Get Email Thread",
    provider: "gmail",
    riskLevel: "LOW",
    allowed: true,
    requiresConfirmation: false,
    isDestructive: false,
    isReversible: true,
    requiredPermission: "gmail.read",
    description: "Read-only retrieval of a Gmail thread.",
  },
  "gmail.api.labels.list": {
    action: "gmail.api.labels.list",
    name: "List Gmail Labels",
    provider: "gmail",
    riskLevel: "LOW",
    allowed: true,
    requiresConfirmation: false,
    isDestructive: false,
    isReversible: true,
    requiredPermission: "gmail.read",
    description: "Read-only listing of Gmail labels.",
  },
  "gmail.api.labels.get": {
    action: "gmail.api.labels.get",
    name: "Get Gmail Label",
    provider: "gmail",
    riskLevel: "LOW",
    allowed: true,
    requiresConfirmation: false,
    isDestructive: false,
    isReversible: true,
    requiredPermission: "gmail.read",
    description: "Read-only retrieval of a Gmail label.",
  },
  "googlecalendar.api.events.getMany": {
    action: "googlecalendar.api.events.getMany",
    name: "List Calendar Events",
    provider: "googlecalendar",
    riskLevel: "LOW",
    allowed: true,
    requiresConfirmation: false,
    isDestructive: false,
    isReversible: true,
    requiredPermission: "calendar.read",
    description: "Read-only retrieval of multiple Google Calendar events.",
  },
  "googlecalendar.api.events.get": {
    action: "googlecalendar.api.events.get",
    name: "Get Calendar Event",
    provider: "googlecalendar",
    riskLevel: "LOW",
    allowed: true,
    requiresConfirmation: false,
    isDestructive: false,
    isReversible: true,
    requiredPermission: "calendar.read",
    description: "Read-only retrieval of a single Google Calendar event.",
  },
  "googlecalendar.api.calendar.getAvailability": {
    action: "googlecalendar.api.calendar.getAvailability",
    name: "Get Calendar Availability",
    provider: "googlecalendar",
    riskLevel: "LOW",
    allowed: true,
    requiresConfirmation: false,
    isDestructive: false,
    isReversible: true,
    requiredPermission: "calendar.read",
    description: "Read-only check of calendar free/busy availability.",
  },
};

/**
 * Returns the centralized action policy definition for an action.
 */
export function getActionPolicy(action: string): ActionPolicyDefinition | null {
  return ACTION_POLICIES[action] || null;
}

/**
 * Returns all registered action policy definitions.
 */
export function getAllActionPolicies(): ActionPolicyDefinition[] {
  return Object.values(ACTION_POLICIES);
}

/**
 * Retrieves the effective user permissions for a user.
 * (Returns secure server defaults; ready for persistent storage if added later).
 */
export async function getUserPermissions(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string,
): Promise<Record<AgentPermissionKey, boolean>> {
  return { ...DEFAULT_USER_PERMISSIONS };
}

/**
 * Validates whether an action is allowed by server policy and user permissions.
 */
export function isActionAllowed(
  action: string,
  userPermissions: Record<AgentPermissionKey, boolean> = DEFAULT_USER_PERMISSIONS,
): { allowed: boolean; reason?: string; policy?: ActionPolicyDefinition } {
  const policy = getActionPolicy(action);

  if (!policy) {
    return {
      allowed: false,
      reason: `Unknown action: '${action}' is not recognized in server policy.`,
    };
  }

  if (policy.riskLevel === "BLOCKED" || !policy.allowed) {
    return {
      allowed: false,
      policy,
      reason:
        action === "permanent_email_delete"
          ? "Permanent email deletion is not available in SuperMail."
          : `Action '${policy.name}' is blocked by server policy.`,
    };
  }

  if (policy.requiredPermission) {
    const hasPermission = userPermissions[policy.requiredPermission];
    if (hasPermission === false) {
      return {
        allowed: false,
        policy,
        reason: `Permission '${policy.requiredPermission}' is not enabled for this action.`,
      };
    }
  }

  return { allowed: true, policy };
}

/**
 * Checks whether an action requires explicit user confirmation.
 * The answer always comes from server policy.
 */
export function requiresConfirmation(action: string): boolean {
  const policy = getActionPolicy(action);
  if (!policy) return true; // Default to requiring confirmation if unknown
  return policy.requiresConfirmation;
}

/**
 * Comprehensive authorization check before action execution or preparation.
 */
export function checkActionExecutionPermission(
  action: string,
  userPermissions: Record<AgentPermissionKey, boolean> = DEFAULT_USER_PERMISSIONS,
): {
  allowed: boolean;
  requiresConfirmation: boolean;
  policy?: ActionPolicyDefinition;
  error?: string;
} {
  const check = isActionAllowed(action, userPermissions);
  if (!check.allowed) {
    return {
      allowed: false,
      requiresConfirmation: false,
      policy: check.policy,
      error: check.reason || "Action is not allowed by policy.",
    };
  }

  const needsConfirm = requiresConfirmation(action);
  return {
    allowed: true,
    requiresConfirmation: needsConfirm,
    policy: check.policy,
  };
}
