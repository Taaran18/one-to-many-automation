export interface Lead {
  id: number;
  user_id: number;
  name: string;
  phone_no: string;
  email?: string;
  company_name?: string;
  address_line1?: string;
  address_line2?: string;
  address_line3?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
  tags?: string;
  status: string;
  created_at?: string;
}

export interface LeadGroup {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  created_at?: string;
  member_count: number;
}

export interface Template {
  id: number;
  user_id: number;
  name: string;
  body: string;
  tags?: string;
  connection_type?: "qr" | "meta";
  meta_template_name?: string;
  meta_category?: string;
  meta_status?: string;
  meta_language?: string;
  meta_header_image_url?: string;
  meta_variable_map?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Campaign {
  id: number;
  user_id: number;
  name: string;
  template_id?: number;
  lead_group_id?: number;
  lead_group_ids?: number[];
  status: "draft" | "scheduled" | "running" | "completed" | "failed";
  scheduled_at?: string;
  stop_at?: string;
  created_at?: string;
  recurrence?: string;
  recurrence_config?: string;
  tags?: string;
  template_name?: string;
  lead_group_name?: string;
  lead_group_names?: string[];
  messages_sent?: number;
  messages_failed?: number;
}

export interface MessageLog {
  id: number;
  campaign_id: number;
  lead_id: number;
  status: "sent" | "delivered" | "failed";
  sent_at?: string;
  error_message?: string;
  lead_name?: string;
  lead_phone?: string;
  run_number?: number;
}

export interface DashboardStats {
  total_leads: number;
  leads_touched: number;
  total_templates: number;
  total_campaigns: number;
  campaigns_next_7_days: number;
  messages_sent_this_month: number;
  total_customers: number;
  total_prospects: number;
}

export interface ChartDataPoint {
  date: string;
  count: number;
}

export interface ScheduleItem {
  id: number;
  name: string;
  status: string;
  scheduled_at?: string;
  lead_group_name?: string;
  template_name?: string;
}

export interface WAStatus {
  status: "connected" | "disconnected" | "qr_pending";
  user_email?: string;
  wa_type?: "qr" | "meta";
}

export interface ChatMessage {
  id: number;
  direction: "outbound" | "inbound";
  body: string;
  timestamp?: string;
  status?: string;
  campaign_id?: number;
  campaign_name?: string;
  is_read?: boolean;
}

export interface ChatContact {
  lead_id?: number;
  name: string;
  phone_no: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
}

