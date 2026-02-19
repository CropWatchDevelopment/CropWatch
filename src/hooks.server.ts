export const handle = async ({ event, resolve }) => {
    console.log('Handling request for', event.url.pathname);
    const token = event.cookies.get("token");
    if (token) {
        // Optimistically verify signature for UI state
        // Actual data fetching will still be verified by Go
        const { payload } = await jwtVerify(token, SECRET);
        event.locals.user = payload;
    }
    return await resolve(event);
};