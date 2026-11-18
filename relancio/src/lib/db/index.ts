import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "./database.types";

export type Db = SupabaseClient<Database>;
export type QuoteRow = Tables<"quotes">;
export type CustomerRow = Tables<"customers">;
export type FollowupJobRow = Tables<"followup_jobs">;
export type TemplateRow = Tables<"followup_templates">;
export type PolicyRow = Tables<"followup_policies">;
export type ActivityRow = Tables<"activity_events">;
export type NotificationRow = Tables<"notifications">;
export type IntegrationRow = Tables<"integrations">;
export type { Database, Tables };
