import type { CropTypeDetailDto, CropTypeDto } from '../api.dtos';
import type { HttpClient, RequestSignalOptions } from '../http/http-client';
import { replacePathParams } from '../http/url';

const CROPS_ENDPOINT = '/crops';
const CROP_BY_ID_ENDPOINT = '/crops/{id}';

/** Crop types for soil sensors and their growing targets (reference data). */
export interface CropRepository {
	/** The crops on offer in the picker, in display order. */
	getCrops(options?: RequestSignalOptions): Promise<CropTypeDto[]>;
	/** One crop with its targets per metric and period of the day. */
	getCrop(id: number, options?: RequestSignalOptions): Promise<CropTypeDetailDto>;
}

export class HttpCropRepository implements CropRepository {
	readonly #http: HttpClient;

	public constructor(http: HttpClient) {
		this.#http = http;
	}

	public getCrops(options: RequestSignalOptions = {}): Promise<CropTypeDto[]> {
		return this.#http.request<CropTypeDto[]>(CROPS_ENDPOINT, {
			method: 'GET',
			signal: options.signal
		});
	}

	public getCrop(id: number, options: RequestSignalOptions = {}): Promise<CropTypeDetailDto> {
		return this.#http.request<CropTypeDetailDto>(
			replacePathParams(CROP_BY_ID_ENDPOINT, { id: String(id) }),
			{ method: 'GET', signal: options.signal }
		);
	}
}
