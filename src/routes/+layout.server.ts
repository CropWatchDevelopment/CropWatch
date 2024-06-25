// src/routes/+layout.server.js
export const load = async (event) => {
  let session = await event.locals.getSession();
  return {
      session
  };
};