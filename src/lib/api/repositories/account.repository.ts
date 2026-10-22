import type {
	AcceptLegalRequest,
	AccountRemovalChallengeDto,
	EmailChangeResponse,
	LegalStatusDto,
	PreferencesDto,
	ProfileDto,
	RequestAccountRemovalRequest,
	UpdateEmailRequest,
	UpdatePreferencesRequest,
	UpdateProfileRequest,
	WhatsNewStatusDto
} from '../api.dtos';
import type { HttpClient } from '../http/http-client';

const USER_PROFILE_ENDPOINT = '/auth/user-profile';
const EMAIL_ENDPOINT = '/auth/email';
const PREFERENCES_ENDPOINT = '/auth/preferences';
const LEGAL_STATUS_ENDPOINT = '/auth/legal-status';
const LEGAL_ACCEPTANCE_ENDPOINT = '/auth/legal-acceptance';
const WHATS_NEW_ENDPOINT = '/auth/whats-new';
const WHATS_NEW_SEEN_ENDPOINT = '/auth/whats-new/seen';
const ACCOUNT_REMOVAL_CHALLENGE_ENDPOINT = '/account-removal/challenge';
const ACCOUNT_REMOVAL_REQUEST_ENDPOINT = '/account-removal/request';

/** The signed-in user's own account: profile, email, preferences, legal and what's-new state. */
export interface AccountRepository {
	getUserProfile(): Promise<ProfileDto>;
	updateProfile(payload: UpdateProfileRequest): Promise<ProfileDto>;
	updateEmail(payload: UpdateEmailRequest): Promise<EmailChangeResponse>;
	getPreferences(): Promise<PreferencesDto>;
	updatePreferences(payload: UpdatePreferencesRequest): Promise<PreferencesDto>;
	getLegalStatus(): Promise<LegalStatusDto>;
	acceptLegalDocuments(payload: AcceptLegalRequest): Promise<LegalStatusDto>;
	getWhatsNewStatus(): Promise<WhatsNewStatusDto>;
	markWhatsNewSeen(): Promise<WhatsNewStatusDto>;
	/**
	 * Public account-removal endpoints: always sent without a session token.
	 * Call them from the browser, not SSR: the API rate-limits anonymous callers
	 * by client IP, and SSR would pool everyone behind Vercel's egress.
	 */
	getAccountRemovalChallenge(): Promise<AccountRemovalChallengeDto>;
	requestAccountRemoval(payload: RequestAccountRemovalRequest): Promise<void>;
}

export class HttpAccountRepository implements AccountRepository {
	readonly #http: HttpClient;

	public constructor(http: HttpClient) {
		this.#http = http;
	}

	public getUserProfile(): Promise<ProfileDto> {
		return this.#http.request<ProfileDto>(USER_PROFILE_ENDPOINT, { method: 'GET' });
	}

	public updateProfile(payload: UpdateProfileRequest): Promise<ProfileDto> {
		return this.#http.request<ProfileDto>(USER_PROFILE_ENDPOINT, {
			method: 'PATCH',
			body: payload
		});
	}

	public updateEmail(payload: UpdateEmailRequest): Promise<EmailChangeResponse> {
		return this.#http.request<EmailChangeResponse>(EMAIL_ENDPOINT, {
			method: 'PATCH',
			body: payload
		});
	}

	public getPreferences(): Promise<PreferencesDto> {
		return this.#http.request<PreferencesDto>(PREFERENCES_ENDPOINT, { method: 'GET' });
	}

	public updatePreferences(payload: UpdatePreferencesRequest): Promise<PreferencesDto> {
		return this.#http.request<PreferencesDto>(PREFERENCES_ENDPOINT, {
			method: 'PATCH',
			body: payload
		});
	}

	public getLegalStatus(): Promise<LegalStatusDto> {
		return this.#http.request<LegalStatusDto>(LEGAL_STATUS_ENDPOINT, { method: 'GET' });
	}

	public acceptLegalDocuments(payload: AcceptLegalRequest): Promise<LegalStatusDto> {
		return this.#http.request<LegalStatusDto>(LEGAL_ACCEPTANCE_ENDPOINT, {
			method: 'POST',
			body: payload
		});
	}

	public getWhatsNewStatus(): Promise<WhatsNewStatusDto> {
		return this.#http.request<WhatsNewStatusDto>(WHATS_NEW_ENDPOINT, { method: 'GET' });
	}

	public markWhatsNewSeen(): Promise<WhatsNewStatusDto> {
		return this.#http.request<WhatsNewStatusDto>(WHATS_NEW_SEEN_ENDPOINT, { method: 'POST' });
	}

	public getAccountRemovalChallenge(): Promise<AccountRemovalChallengeDto> {
		return this.#http.request<AccountRemovalChallengeDto>(ACCOUNT_REMOVAL_CHALLENGE_ENDPOINT, {
			method: 'GET',
			authToken: null
		});
	}

	public requestAccountRemoval(payload: RequestAccountRemovalRequest): Promise<void> {
		return this.#http.request<void>(ACCOUNT_REMOVAL_REQUEST_ENDPOINT, {
			method: 'POST',
			body: payload,
			authToken: null
		});
	}
}
