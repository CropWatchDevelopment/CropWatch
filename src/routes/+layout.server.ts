// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals: { getSession }, cookies }) => {
  const { user } = await getSession()

  return {
    user,
    cookies: cookies.getAll(),
  }
}