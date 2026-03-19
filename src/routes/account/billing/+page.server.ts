import { ApiService, ApiServiceError } from '$lib/api/api.service';
import { formatCurrency } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

type UnknownRecord = Record<string, unknown>;

type BillingProduct = {
	id: string;
	name: string;
	description: string;
	priceLabel: string;
	billingLabel: string;
	active: boolean;
};

type BillingSubscription = {
	id: string;
	status: string;
	productName: string;
	startedAt: string | null;
	renewsAt: string | null;
	canceledAt: string | null;
	amountLabel: string;
};

type BillingState = {
	status: string;
	hasActiveSubscription: boolean;
	customerId: string | null;
	activeSubscriptionCount: number;
	trialSubscriptionCount: number;
	cancelledSubscriptionCount: number;
};

type EndpointResult = {
	data: unknown;
	error: string | null;
};

const isRecord = (value: unknown): value is UnknownRecord =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null => {
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}
	if (typeof value === 'number' && Number.isFinite(value)) {
		return String(value);
	}
	return null;
};

const asNumber = (value: unknown): number | null => {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
};

const asBoolean = (value: unknown): boolean | null => {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		if (normalized === 'true') return true;
		if (normalized === 'false') return false;
	}
	return null;
};

const getPathValue = (record: UnknownRecord, path: string[]): unknown => {
	let current: unknown = record;
	for (const segment of path) {
		if (!isRecord(current)) return undefined;
		current = current[segment];
	}
	return current;
};

const getPathFromUnknown = (value: unknown, path: string): unknown => {
	const segments = path.split('.');
	let current: unknown = value;
	for (const segment of segments) {
		if (!isRecord(current)) return undefined;
		current = current[segment];
	}
	return current;
};

const toIsoStringOrNull = (value: unknown): string | null => {
	if (typeof value === 'number' && Number.isFinite(value)) {
		const fromNumber = new Date(value);
		return Number.isNaN(fromNumber.getTime()) ? null : fromNumber.toISOString();
	}
	const text = asString(value);
	if (!text) return null;
	const parsed = new Date(text);
	return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const extractRecords = (payload: unknown, keys: string[]): UnknownRecord[] => {
	if (Array.isArray(payload)) {
		return payload.filter(isRecord);
	}
	if (!isRecord(payload)) {
		return [];
	}

	for (const key of keys) {
		const value = getPathFromUnknown(payload, key);
		if (Array.isArray(value)) {
			const records = value.filter(isRecord);
			if (records.length > 0) return records;
		}
	}

	return [];
};

const extractPriceRecord = (source: UnknownRecord): UnknownRecord | null => {
	if (Array.isArray(source.prices)) {
		const firstPrice = source.prices.find(isRecord);
		if (firstPrice) return firstPrice;
	}
	if (isRecord(source.price)) return source.price;
	if (isRecord(source.product_price)) return source.product_price;
	return null;
};

const extractPriceLabel = (source: UnknownRecord): { priceLabel: string; billingLabel: string } => {
	const price = extractPriceRecord(source);
	const amountMinor =
		asNumber(price?.price_amount) ??
		asNumber(price?.amount) ??
		asNumber(source.price_amount) ??
		asNumber(source.amount);
	const currency =
		asString(price?.price_currency) ??
		asString(price?.currency) ??
		asString(source.price_currency) ??
		asString(source.currency) ??
		'USD';
	const interval =
		asString(price?.recurring_interval) ??
		asString(price?.interval) ??
		asString(source.recurring_interval) ??
		asString(source.interval);

	const priceLabel =
		amountMinor === null ? m.billing_custom_pricing() : formatCurrency(amountMinor / 100, currency);
	const billingLabel = interval ? m.billing_billed_interval({ interval }) : m.billing_one_time();
	return { priceLabel, billingLabel };
};

const normalizeProducts = (payload: unknown): BillingProduct[] => {
	const items = extractRecords(payload, [
		'items',
		'products',
		'data',
		'result',
		'result.items',
		'result.products',
		'data.items',
		'data.products'
	]);
	return items.flatMap((item) => {
		const base = isRecord(item.product) ? item.product : item;
		const id =
			asString(base.id) ??
			asString(base.product_id) ??
			asString(base.productId) ??
			asString(base.uuid) ??
			asString(item.id);
		if (!id) return [];

		const name =
			asString(base.name) ??
			asString(base.title) ??
			asString(base.display_name) ??
			asString(getPathValue(base, ['metadata', 'name'])) ??
			asString(getPathValue(item, ['metadata', 'name'])) ??
			id;
		const description =
			asString(base.description) ??
			asString(getPathValue(base, ['metadata', 'description'])) ??
			asString(getPathValue(item, ['metadata', 'description'])) ??
			'';
		const active =
			(asBoolean(base.active) ?? asBoolean(item.active) ?? true) &&
			!(asBoolean(base.archived) ?? asBoolean(item.archived) ?? false) &&
			!(asBoolean(base.is_archived) ?? asBoolean(item.is_archived) ?? false);
		const pricing = extractPriceLabel(isRecord(item.product) ? { ...base, ...item } : item);

		return [
			{
				id,
				name,
				description,
				priceLabel: pricing.priceLabel,
				billingLabel: pricing.billingLabel,
				active
			}
		];
	});
};

const normalizeSubscriptions = (payload: unknown): BillingSubscription[] => {
	const items = extractRecords(payload, [
		'items',
		'subscriptions',
		'data',
		'result',
		'result.items',
		'result.subscriptions',
		'data.items',
		'data.subscriptions'
	]);
	return items.flatMap((item) => {
		const id = asString(item.id) ?? asString(item.subscription_id) ?? asString(item.subscriptionId);
		if (!id) return [];

		const status =
			asString(item.status) ??
			asString(item.state) ??
			asString(item.subscription_status) ??
			m.billing_status_unknown();
		const productName =
			asString(getPathValue(item, ['product', 'name'])) ??
			asString(getPathValue(item, ['product', 'display_name'])) ??
			asString(getPathValue(item, ['price', 'product', 'name'])) ??
			asString(getPathValue(item, ['product_price', 'product', 'name'])) ??
			asString(item.product_name) ??
			asString(item.productName) ??
			m.billing_unknown_plan();
		const startedAt =
			toIsoStringOrNull(item.started_at) ??
			toIsoStringOrNull(item.start_date) ??
			toIsoStringOrNull(item.current_period_start);
		const renewsAt =
			toIsoStringOrNull(item.current_period_end) ??
			toIsoStringOrNull(item.renews_at) ??
			toIsoStringOrNull(item.ends_at);
		const canceledAt =
			toIsoStringOrNull(item.canceled_at) ??
			toIsoStringOrNull(item.cancel_at) ??
			toIsoStringOrNull(item.revoked_at);
		const pricing = extractPriceLabel(item);

		return [
			{
				id,
				status,
				productName,
				startedAt,
				renewsAt,
				canceledAt,
				amountLabel: pricing.priceLabel
			}
		];
	});
};

const normalizeState = (payload: unknown): BillingState => {
	const state = isRecord(payload) ? payload : {};
	const activeSubscriptionCount =
		asNumber(state.active_subscription_count) ?? asNumber(state.activeSubscriptionCount) ?? 0;
	const trialSubscriptionCount =
		asNumber(state.trial_subscription_count) ?? asNumber(state.trialSubscriptionCount) ?? 0;
	const cancelledSubscriptionCount =
		asNumber(state.cancelled_subscription_count) ?? asNumber(state.cancelledSubscriptionCount) ?? 0;
	const hasActiveSubscription =
		asBoolean(state.has_active_subscription) ??
		asBoolean(state.hasActiveSubscription) ??
		activeSubscriptionCount + trialSubscriptionCount > 0;
	const customerId =
		asString(state.customer_id) ??
		asString(state.customerId) ??
		asString(getPathValue(state, ['customer', 'id']));
	const status = asString(state.status) ?? m.billing_status_unknown();

	return {
		status,
		hasActiveSubscription,
		customerId,
		activeSubscriptionCount,
		trialSubscriptionCount,
		cancelledSubscriptionCount
	};
};

const readApiError = (payload: unknown, fallback: string): string => {
	if (isRecord(payload)) {
		const message = payload.message;
		if (Array.isArray(message)) {
			const fromArray = message.map(asString).filter(Boolean).join(', ');
			if (fromArray.length > 0) return fromArray;
		}
		const fromField = asString(message);
		if (fromField) return fromField;
	}
	return fallback;
};

const executeApiRequest = async (
	request: () => Promise<unknown>,
	fallback: string
): Promise<EndpointResult> => {
	try {
		return { data: await request(), error: null };
	} catch (error) {
		return {
			data: null,
			error:
				error instanceof ApiServiceError
					? readApiError(error.payload, fallback)
					: error instanceof Error
						? error.message
						: fallback
		};
	}
};

const findRedirectUrl = (payload: unknown): string | null => {
	if (typeof payload === 'string' && /^https?:\/\//i.test(payload)) {
		return payload;
	}
	if (Array.isArray(payload)) {
		for (const item of payload) {
			const fromArray = findRedirectUrl(item);
			if (fromArray) return fromArray;
		}
		return null;
	}
	if (!isRecord(payload)) return null;

	const directKeys = [
		'url',
		'checkout_url',
		'checkoutUrl',
		'portal_url',
		'portalUrl',
		'customer_portal_url',
		'customerPortalUrl'
	];
	for (const key of directKeys) {
		const candidate = asString(payload[key]);
		if (candidate && /^https?:\/\//i.test(candidate)) return candidate;
	}

	for (const value of Object.values(payload)) {
		const nested = findRedirectUrl(value);
		if (nested) return nested;
	}
	return null;
};

const requireAuth = (jwt: string | null) => {
	if (!jwt) {
		throw redirect(303, '/auth/login');
	}
};

export const load: PageServerLoad = async ({ fetch, locals }) => {
	requireAuth(locals.jwtString);
	const api = new ApiService({
		fetchFn: fetch,
		authToken: locals.jwtString
	});

	const [productsResult, subscriptionsResult, stateResult] = await Promise.all([
		executeApiRequest(() => api.getPaymentsProducts(), m.billing_load_products_failed()),
		executeApiRequest(() => api.getPaymentsSubscriptions(), m.billing_load_subscriptions_failed()),
		executeApiRequest(() => api.getPaymentsSubscriptionState(), m.billing_load_state_failed())
	]);

	const subscriptions = normalizeSubscriptions(subscriptionsResult.data);

	return {
		products: normalizeProducts(productsResult.data),
		subscriptions,
		subscriptionState: normalizeState(stateResult.data),
		errors: {
			products: productsResult.error,
			subscriptions: subscriptionsResult.error,
			state: stateResult.error
		}
	};
};

export const actions: Actions = {
	createCheckoutSession: async ({ request, fetch, url, locals }) => {
		requireAuth(locals.jwtString);
		const api = new ApiService({
			fetchFn: fetch,
			authToken: locals.jwtString
		});

		const formData = await request.formData();
		const products = formData
			.getAll('products')
			.map((value) => String(value).trim())
			.filter((value) => value.length > 0);

		if (products.length === 0) {
			return fail(400, {
				action: 'checkout',
				message: m.billing_select_product_before_checkout()
			});
		}

		const customerName = asString(formData.get('customer_name'));
		const customerEmail = asString(formData.get('customer_email'));
		const allowDiscountCodes = asBoolean(formData.get('allow_discount_codes')) ?? true;
		const allowTrial = asBoolean(formData.get('allow_trial')) ?? true;
		const returnUrl = asString(formData.get('return_url')) ?? `${url.origin}/account/billing`;
		const successUrl =
			asString(formData.get('success_url')) ?? `${url.origin}/account/billing?checkout=success`;

		const payload: UnknownRecord = {
			products,
			return_url: returnUrl,
			success_url: successUrl,
			allow_discount_codes: allowDiscountCodes,
			allow_trial: allowTrial
		};
		if (customerName) payload.customer_name = customerName;
		if (customerEmail) payload.customer_email = customerEmail;

		let responsePayload: unknown;
		try {
			responsePayload = await api.createPaymentsCheckoutSession(payload);
		} catch (error) {
			return fail(error instanceof ApiServiceError ? error.status : 502, {
				action: 'checkout',
				message: readApiError(
					error instanceof ApiServiceError ? error.payload : error,
					m.billing_checkout_session_failed()
				)
			});
		}

		const redirectUrl = findRedirectUrl(responsePayload);
		if (!redirectUrl) {
			return fail(502, {
				action: 'checkout',
				message: m.billing_checkout_redirect_missing()
			});
		}

		return {
			action: 'checkout',
			message: m.billing_checkout_session_created(),
			redirectUrl
		};
	},

	createPortalSession: async ({ request, fetch, url, locals }) => {
		requireAuth(locals.jwtString);
		const api = new ApiService({
			fetchFn: fetch,
			authToken: locals.jwtString
		});

		const formData = await request.formData();
		const returnUrl = asString(formData.get('return_url')) ?? `${url.origin}/account/billing`;
		const payload = { return_url: returnUrl };

		let responsePayload: unknown;
		try {
			responsePayload = await api.createPaymentsPortalSession(payload);
		} catch (error) {
			return fail(error instanceof ApiServiceError ? error.status : 502, {
				action: 'portal',
				message: readApiError(
					error instanceof ApiServiceError ? error.payload : error,
					m.billing_portal_open_failed()
				)
			});
		}

		const redirectUrl = findRedirectUrl(responsePayload);
		if (!redirectUrl) {
			return fail(502, {
				action: 'portal',
				message: m.billing_portal_redirect_missing()
			});
		}

		return {
			action: 'portal',
			message: m.billing_portal_session_created(),
			redirectUrl
		};
	},

	cancelSubscription: async ({ request, fetch, locals }) => {
		requireAuth(locals.jwtString);
		const api = new ApiService({
			fetchFn: fetch,
			authToken: locals.jwtString
		});

		const formData = await request.formData();
		const subscriptionId = asString(formData.get('subscription_id'));

		if (!subscriptionId) {
			return fail(400, {
				action: 'cancel',
				message: m.billing_subscription_id_required()
			});
		}

		try {
			await api.cancelPaymentsSubscription(subscriptionId);
		} catch (error) {
			return fail(error instanceof ApiServiceError ? error.status : 502, {
				action: 'cancel',
				message: readApiError(
					error instanceof ApiServiceError ? error.payload : error,
					m.billing_subscription_cancel_failed()
				)
			});
		}

		return {
			action: 'cancel',
			message: m.billing_subscription_canceled(),
			cancelledId: subscriptionId
		};
	}
};
