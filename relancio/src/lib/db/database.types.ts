
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity_events": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"customer_id": string | null,"id": string,"message": string,"metadata": NonNullable<Json>,"organization_id": string,"quote_id": string | null,"type": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"customer_id"?: string | null,"id"?: string,"message": string,"metadata"?: NonNullable<Json>,"organization_id": string,"quote_id"?: string | null,"type": string,"updated_at"?: string
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"customer_id"?: string | null,"id"?: string,"message"?: string,"metadata"?: NonNullable<Json>,"organization_id"?: string,"quote_id"?: string | null,"type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_events_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_events_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_events_quote_id_fkey"
      columns: ["quote_id"]
isOneToOne: false
      referencedRelation: "quotes"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"id": string,"ip_address": string | null,"metadata": NonNullable<Json>,"organization_id": string | null,"target_id": string | null,"target_type": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"id"?: string,"ip_address"?: string | null,"metadata"?: NonNullable<Json>,"organization_id"?: string | null,"target_id"?: string | null,"target_type"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"id"?: string,"ip_address"?: string | null,"metadata"?: NonNullable<Json>,"organization_id"?: string | null,"target_id"?: string | null,"target_type"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_logs_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"communication_events": {
                  Row: {
                    "actor_id": string | null,"channel": string,"created_at": string,"customer_id": string | null,"delivery_status": string | null,"direction": string,"followup_job_id": string | null,"id": string,"kind": string,"occurred_at": string,"organization_id": string,"provider": string | null,"provider_message_id": string | null,"quote_id": string | null,"subject": string | null,"summary": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"channel": string,"created_at"?: string,"customer_id"?: string | null,"delivery_status"?: string | null,"direction": string,"followup_job_id"?: string | null,"id"?: string,"kind": string,"occurred_at"?: string,"organization_id": string,"provider"?: string | null,"provider_message_id"?: string | null,"quote_id"?: string | null,"subject"?: string | null,"summary"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "actor_id"?: string | null,"channel"?: string,"created_at"?: string,"customer_id"?: string | null,"delivery_status"?: string | null,"direction"?: string,"followup_job_id"?: string | null,"id"?: string,"kind"?: string,"occurred_at"?: string,"organization_id"?: string,"provider"?: string | null,"provider_message_id"?: string | null,"quote_id"?: string | null,"subject"?: string | null,"summary"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "communication_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "communication_events_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "communication_events_followup_job_id_fkey"
      columns: ["followup_job_id"]
isOneToOne: false
      referencedRelation: "followup_jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "communication_events_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "communication_events_quote_id_fkey"
      columns: ["quote_id"]
isOneToOne: false
      referencedRelation: "quotes"
      referencedColumns: ["id"]
    }
                  ]
                },"customers": {
                  Row: {
                    "address_line": string | null,"city": string | null,"company_name": string | null,"created_at": string,"created_by": string | null,"customer_type": string,"do_not_contact": boolean,"do_not_contact_at": string | null,"email": string | null,"email_normalized": string | null,"id": string,"name": string,"notes": string | null,"organization_id": string,"phone": string | null,"phone_normalized": string | null,"postal_code": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line"?: string | null,"city"?: string | null,"company_name"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_type"?: string,"do_not_contact"?: boolean,"do_not_contact_at"?: string | null,"email"?: string | null,"email_normalized"?: never,"id"?: string,"name": string,"notes"?: string | null,"organization_id": string,"phone"?: string | null,"phone_normalized"?: string | null,"postal_code"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address_line"?: string | null,"city"?: string | null,"company_name"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_type"?: string,"do_not_contact"?: boolean,"do_not_contact_at"?: string | null,"email"?: string | null,"email_normalized"?: never,"id"?: string,"name"?: string,"notes"?: string | null,"organization_id"?: string,"phone"?: string | null,"phone_normalized"?: string | null,"postal_code"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"followup_jobs": {
                  Row: {
                    "approved_at": string | null,"approved_by": string | null,"attempt_count": number,"body": string | null,"cancelled_reason": string | null,"channel": string,"created_at": string,"id": string,"last_error": string | null,"organization_id": string,"provider_message_id": string | null,"quote_id": string,"recipient_email": string | null,"scheduled_for": string,"sent_at": string | null,"sent_by": string | null,"sequence": number,"status": string,"subject": string | null,"template_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"attempt_count"?: number,"body"?: string | null,"cancelled_reason"?: string | null,"channel"?: string,"created_at"?: string,"id"?: string,"last_error"?: string | null,"organization_id": string,"provider_message_id"?: string | null,"quote_id": string,"recipient_email"?: string | null,"scheduled_for": string,"sent_at"?: string | null,"sent_by"?: string | null,"sequence": number,"status"?: string,"subject"?: string | null,"template_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"attempt_count"?: number,"body"?: string | null,"cancelled_reason"?: string | null,"channel"?: string,"created_at"?: string,"id"?: string,"last_error"?: string | null,"organization_id"?: string,"provider_message_id"?: string | null,"quote_id"?: string,"recipient_email"?: string | null,"scheduled_for"?: string,"sent_at"?: string | null,"sent_by"?: string | null,"sequence"?: number,"status"?: string,"subject"?: string | null,"template_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "followup_jobs_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "followup_jobs_quote_id_fkey"
      columns: ["quote_id"]
isOneToOne: false
      referencedRelation: "quotes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "followup_jobs_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "followup_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"followup_policies": {
                  Row: {
                    "auto_expire": boolean,"business_days_only": boolean,"created_at": string,"first_delay_days": number,"id": string,"max_followups": number,"organization_id": string,"second_delay_days": number,"third_delay_days": number | null,"updated_at": string,"window_end_minutes": number,"window_start_minutes": number
                  }
                  ComputedFields: never
                  Insert: {
                    "auto_expire"?: boolean,"business_days_only"?: boolean,"created_at"?: string,"first_delay_days"?: number,"id"?: string,"max_followups"?: number,"organization_id": string,"second_delay_days"?: number,"third_delay_days"?: number | null,"updated_at"?: string,"window_end_minutes"?: number,"window_start_minutes"?: number
                  }
                  Update: {
                    "auto_expire"?: boolean,"business_days_only"?: boolean,"created_at"?: string,"first_delay_days"?: number,"id"?: string,"max_followups"?: number,"organization_id"?: string,"second_delay_days"?: number,"third_delay_days"?: number | null,"updated_at"?: string,"window_end_minutes"?: number,"window_start_minutes"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "followup_policies_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: true
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"followup_templates": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"is_active": boolean,"kind": string,"name": string,"organization_id": string,"subject": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"kind": string,"name": string,"organization_id": string,"subject": string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"kind"?: string,"name"?: string,"organization_id"?: string,"subject"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "followup_templates_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"import_jobs": {
                  Row: {
                    "completed_at": string | null,"created_at": string,"created_by": string | null,"created_customers": number,"delimiter": string | null,"encoding": string | null,"error_rows": number,"file_name": string,"id": string,"imported_rows": number,"mapping": NonNullable<Json>,"organization_id": string,"skipped_rows": number,"status": string,"total_rows": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"created_customers"?: number,"delimiter"?: string | null,"encoding"?: string | null,"error_rows"?: number,"file_name": string,"id"?: string,"imported_rows"?: number,"mapping"?: NonNullable<Json>,"organization_id": string,"skipped_rows"?: number,"status"?: string,"total_rows"?: number,"updated_at"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"created_customers"?: number,"delimiter"?: string | null,"encoding"?: string | null,"error_rows"?: number,"file_name"?: string,"id"?: string,"imported_rows"?: number,"mapping"?: NonNullable<Json>,"organization_id"?: string,"skipped_rows"?: number,"status"?: string,"total_rows"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_jobs_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"import_rows": {
                  Row: {
                    "created_at": string,"errors": (string)[],"id": string,"import_job_id": string,"organization_id": string,"quote_id": string | null,"raw": NonNullable<Json>,"row_number": number,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"errors"?: (string)[],"id"?: string,"import_job_id": string,"organization_id": string,"quote_id"?: string | null,"raw"?: NonNullable<Json>,"row_number": number,"status": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"errors"?: (string)[],"id"?: string,"import_job_id"?: string,"organization_id"?: string,"quote_id"?: string | null,"raw"?: NonNullable<Json>,"row_number"?: number,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_rows_import_job_id_fkey"
      columns: ["import_job_id"]
isOneToOne: false
      referencedRelation: "import_jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "import_rows_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "import_rows_quote_id_fkey"
      columns: ["quote_id"]
isOneToOne: false
      referencedRelation: "quotes"
      referencedColumns: ["id"]
    }
                  ]
                },"integrations": {
                  Row: {
                    "created_at": string,"enabled": boolean,"from_name": string | null,"id": string,"organization_id": string,"provider": string,"reply_to_email": string | null,"signature": string | null,"updated_at": string,"verification_sent_at": string | null,"verification_token_hash": string | null,"verified_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"enabled"?: boolean,"from_name"?: string | null,"id"?: string,"organization_id": string,"provider": string,"reply_to_email"?: string | null,"signature"?: string | null,"updated_at"?: string,"verification_sent_at"?: string | null,"verification_token_hash"?: string | null,"verified_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"enabled"?: boolean,"from_name"?: string | null,"id"?: string,"organization_id"?: string,"provider"?: string,"reply_to_email"?: string | null,"signature"?: string | null,"updated_at"?: string,"verification_sent_at"?: string | null,"verification_token_hash"?: string | null,"verified_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "integrations_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"dedupe_key": string | null,"id": string,"link": string | null,"organization_id": string,"read_at": string | null,"title": string,"type": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"dedupe_key"?: string | null,"id"?: string,"link"?: string | null,"organization_id": string,"read_at"?: string | null,"title": string,"type": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"dedupe_key"?: string | null,"id"?: string,"link"?: string | null,"organization_id"?: string,"read_at"?: string | null,"title"?: string,"type"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"organization_invitations": {
                  Row: {
                    "accepted_at": string | null,"created_at": string,"email": string,"expires_at": string,"id": string,"invited_by": string | null,"organization_id": string,"revoked_at": string | null,"role": string,"token_hash": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"created_at"?: string,"email": string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"organization_id": string,"revoked_at"?: string | null,"role": string,"token_hash": string,"updated_at"?: string
                  }
                  Update: {
                    "accepted_at"?: string | null,"created_at"?: string,"email"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"organization_id"?: string,"revoked_at"?: string | null,"role"?: string,"token_hash"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "organization_invitations_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"organization_members": {
                  Row: {
                    "created_at": string,"id": string,"organization_id": string,"role": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"organization_id": string,"role": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"organization_id"?: string,"role"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "organization_members_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "organization_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "address_line": string | null,"city": string | null,"created_at": string,"created_by": string | null,"email": string | null,"id": string,"is_demo": boolean,"legal_name": string | null,"name": string,"onboarding_completed_at": string | null,"onboarding_step": number,"phone": string | null,"postal_code": string | null,"siret": string | null,"trades": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line"?: string | null,"city"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"id"?: string,"is_demo"?: boolean,"legal_name"?: string | null,"name": string,"onboarding_completed_at"?: string | null,"onboarding_step"?: number,"phone"?: string | null,"postal_code"?: string | null,"siret"?: string | null,"trades"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "address_line"?: string | null,"city"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"id"?: string,"is_demo"?: boolean,"legal_name"?: string | null,"name"?: string,"onboarding_completed_at"?: string | null,"onboarding_step"?: number,"phone"?: string | null,"postal_code"?: string | null,"siret"?: string | null,"trades"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"current_organization_id": string | null,"email": string,"full_name": string | null,"id": string,"notify_failures": boolean,"notify_followups": boolean,"notify_imports": boolean,"phone": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_organization_id"?: string | null,"email": string,"full_name"?: string | null,"id": string,"notify_failures"?: boolean,"notify_followups"?: boolean,"notify_imports"?: boolean,"phone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"current_organization_id"?: string | null,"email"?: string,"full_name"?: string | null,"id"?: string,"notify_failures"?: boolean,"notify_followups"?: boolean,"notify_imports"?: boolean,"phone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_current_organization_id_fkey"
      columns: ["current_organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"quote_attachments": {
                  Row: {
                    "created_at": string,"file_name": string,"id": string,"mime_type": string,"organization_id": string,"quote_id": string,"size_bytes": number,"storage_path": string,"updated_at": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"file_name": string,"id"?: string,"mime_type": string,"organization_id": string,"quote_id": string,"size_bytes": number,"storage_path": string,"updated_at"?: string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"file_name"?: string,"id"?: string,"mime_type"?: string,"organization_id"?: string,"quote_id"?: string,"size_bytes"?: number,"storage_path"?: string,"updated_at"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "quote_attachments_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quote_attachments_quote_id_fkey"
      columns: ["quote_id"]
isOneToOne: false
      referencedRelation: "quotes"
      referencedColumns: ["id"]
    }
                  ]
                },"quotes": {
                  Row: {
                    "accepted_at": string | null,"amount_ht_cents": number,"amount_ttc_cents": number,"created_at": string,"created_by": string | null,"customer_id": string,"declined_at": string | null,"description": string | null,"expires_on": string | null,"followup_count": number,"followups_paused": boolean,"followups_paused_reason": string | null,"id": string,"import_job_id": string | null,"issued_on": string,"last_followup_at": string | null,"lost_reason": string | null,"lost_reason_details": string | null,"next_followup_at": string | null,"notes": string | null,"organization_id": string,"owner_id": string | null,"reference": string,"replied_at": string | null,"sent_at": string | null,"service_type": string,"source": string,"status": string,"title": string,"updated_at": string,"vat_rate_bp": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"amount_ht_cents": number,"amount_ttc_cents": number,"created_at"?: string,"created_by"?: string | null,"customer_id": string,"declined_at"?: string | null,"description"?: string | null,"expires_on"?: string | null,"followup_count"?: number,"followups_paused"?: boolean,"followups_paused_reason"?: string | null,"id"?: string,"import_job_id"?: string | null,"issued_on"?: string,"last_followup_at"?: string | null,"lost_reason"?: string | null,"lost_reason_details"?: string | null,"next_followup_at"?: string | null,"notes"?: string | null,"organization_id": string,"owner_id"?: string | null,"reference": string,"replied_at"?: string | null,"sent_at"?: string | null,"service_type"?: string,"source"?: string,"status"?: string,"title": string,"updated_at"?: string,"vat_rate_bp"?: number | null
                  }
                  Update: {
                    "accepted_at"?: string | null,"amount_ht_cents"?: number,"amount_ttc_cents"?: number,"created_at"?: string,"created_by"?: string | null,"customer_id"?: string,"declined_at"?: string | null,"description"?: string | null,"expires_on"?: string | null,"followup_count"?: number,"followups_paused"?: boolean,"followups_paused_reason"?: string | null,"id"?: string,"import_job_id"?: string | null,"issued_on"?: string,"last_followup_at"?: string | null,"lost_reason"?: string | null,"lost_reason_details"?: string | null,"next_followup_at"?: string | null,"notes"?: string | null,"organization_id"?: string,"owner_id"?: string | null,"reference"?: string,"replied_at"?: string | null,"sent_at"?: string | null,"service_type"?: string,"source"?: string,"status"?: string,"title"?: string,"updated_at"?: string,"vat_rate_bp"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotes_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotes_import_job_fk"
      columns: ["import_job_id"]
isOneToOne: false
      referencedRelation: "import_jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotes_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotes_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "check_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"create_organization":
{ Args: { "p_city"?: string,"p_email"?: string,"p_name": string,"p_phone"?: string,"p_siret"?: string,"p_trades"?: (string)[] }; Returns: string
                           },
"has_org_role":
{ Args: { "org": string,"roles": (string)[] }; Returns: boolean
                           },
"is_org_member":
{ Args: { "org": string }; Returns: boolean
                           },
"normalize_phone":
{ Args: { "p": string }; Returns: string
                           },
"seed_organization_defaults":
{ Args: { "p_org": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
