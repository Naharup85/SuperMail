import { pgTable, text, jsonb, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const corsairIntegrations = pgTable('corsair_integrations', {
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    name: text('name').notNull(),
    config: jsonb('config').notNull().default({}),
    dek: text('dek'),
});

export const corsairAccounts = pgTable('corsair_accounts', {
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    tenantId: text('tenant_id').notNull(),
    integrationId: text('integration_id').notNull().references(() => corsairIntegrations.id),
    config: jsonb('config').notNull().default({}),
    dek: text('dek'),
});

export const corsairEntities = pgTable('corsair_entities', {
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    accountId: text('account_id').notNull().references(() => corsairAccounts.id),
    entityId: text('entity_id').notNull(),
    entityType: text('entity_type').notNull(),
    version: text('version').notNull(),
    data: jsonb('data').notNull().default({}),
});

export const corsairEvents = pgTable('corsair_events', {
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    accountId: text('account_id').notNull().references(() => corsairAccounts.id),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull().default({}),
    status: text('status'),
});

export const corsairPermissions = pgTable('corsair_permissions', {
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    token: text('token').notNull(),
    plugin: text('plugin').notNull(),
    endpoint: text('endpoint').notNull(),
    args: text('args').notNull(),
    tenantId: text('tenant_id').notNull(),
    status: text('status').notNull().default('pending'),
    expiresAt: text('expires_at').notNull(),
    error: text('error'),
});

export const agentAutomations = pgTable('agent_automations', {
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    userId: text('user_id').notNull(),
    tenantId: text('tenant_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    enabled: boolean('enabled').notNull().default(true),
    status: text('status').notNull().default('ACTIVE'), // ACTIVE, PAUSED, COMPLETED, FAILED
    triggerType: text('trigger_type').notNull().default('schedule'), // schedule, one_time
    schedule: jsonb('schedule').notNull().default({}),
    timezone: text('timezone').notNull(),
    instruction: text('instruction').notNull(),
    allowedTools: jsonb('allowed_tools').notNull().default([]),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    nextRunAt: timestamp('next_run_at', { withTimezone: true }),
    failureCount: integer('failure_count').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    lastRunStatus: text('last_run_status'),
    lastRunResult: text('last_run_result'),
});

export const agentAutomationRuns = pgTable('agent_automation_runs', {
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    automationId: text('automation_id').notNull().references(() => agentAutomations.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    tenantId: text('tenant_id').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    status: text('status').notNull(), // running, succeeded, failed, cancelled
    summary: text('summary'),
    error: text('error'),
    errorCategory: text('error_category'),
    stepsCount: integer('steps_count').default(0),
    toolCallsCount: integer('tool_calls_count').default(0),
    durationMs: integer('duration_ms'),
});