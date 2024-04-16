import { HttpDeviceConsumer } from "$lib/server/httpConsumers/devices/httpDeviceConsumer";
import type { RequestHandler } from "@sveltejs/kit";


export const GET: RequestHandler = async ({ url }) => {
    const query = url.search;
    const response = await HttpDeviceConsumer.getDeviceCollection(query);
    return new Response(JSON.stringify(response));
}