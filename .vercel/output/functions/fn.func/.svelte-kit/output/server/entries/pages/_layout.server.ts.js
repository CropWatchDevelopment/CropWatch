const load = async ({ locals: { getSession } }) => {
  return {
    session: await getSession()
  };
};
export {
  load
};
