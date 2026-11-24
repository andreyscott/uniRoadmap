/**
 * Cache tags for university data. Public pages cache their database reads with these tags, and
 * every admin change expires them (updateTag), so edits show on the next request.
 */
export const UNIVERSITIES_TAG = "universities";
export const universityTag = (id: string) => `university:${id}`;
