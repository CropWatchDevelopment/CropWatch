export type SelectOption = {
	disabled?: boolean;
	label: string;
	value: string;
};

export type ScheduleDraft = {
	created_at: string;
	dev_eui: string;
	end_of_month: boolean;
	end_of_week: boolean;
	id: string;
	is_active: boolean;
	key: string;
	report_id: string;
	report_user_schedule_id: string;
	user_id: string;
};

export type RecipientDraft = {
	communication_method: string;
	created_at: string;
	email: string;
	id: string;
	key: string;
	name: string;
	report_id: string;
	user_id: string;
};

export type DataProcessingScheduleDraft = {
	crosses_midnight: boolean;
	day_of_week: string;
	end_time: string;
	id: string;
	is_enabled: boolean;
	key: string;
	report_id: string;
	rule_type: string;
	start_time: string;
	timezone: string;
};

export type ReportDraft = {
	created_at: string;
	dev_eui: string;
	id: string;
	name: string;
	report_id: string;
	report_data_processing_schedules: DataProcessingScheduleDraft[];
	report_recipients: RecipientDraft[];
	report_user_schedule: ScheduleDraft[];
	user_id: string;
};
