import { HttpHelper } from "$lib/server/helpers/httpHelper";
import type { BaseResponse } from "../baseHttpResponse";
import type { Cw_Ss_TmepnpkResponse } from "./models/responses/cw-ss-tmepnpk";

export abstract class HttpDeviceConsumer extends HttpHelper {
    public static async getDeviceCollection(query?: string): Promise<BaseResponse<Cw_Ss_TmepnpkResponse>> {
        try {
            const endpoint = `/api/v1/devices/cw-ss-tmepnpk${query ? `?${query}` : ''}`;
            const response = await this.get(endpoint);
            return this.handleResponse('GET', endpoint, null, response);
        } catch (error) {
            return this.getErrorResponse({ error });
        }
    }
}