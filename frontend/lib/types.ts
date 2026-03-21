export interface Lead {
  id: number;
  user_id: number;
  name: string;
  phone_no: string;
  email?: string;
  tags?: string;
  status: "prospect" | "customer";
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
  created_at?: string;
  updated_at?: string;
}

export interface Campaign {
  id: number;
  user_id: number;
  name: string;
  template_id?: number;
  lead_group_id?: number;
  status: "draft" | "scheduled" | "running" | "completed" | "failed";
  scheduled_at?: string;
  created_at?: string;
  template_name?: string;
  lead_group_name?: string;
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
}
