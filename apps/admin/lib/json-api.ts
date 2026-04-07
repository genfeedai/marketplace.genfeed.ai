/**
 * Minimal JSON:API deserialization helpers.
 *
 * The marketplace API returns JSON:API-shaped responses. These helpers
 * flatten `{ data: { id, type, attributes } }` into plain objects that
 * match our TypeScript interfaces.
 */

interface JsonApiResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<
    string,
    { data: JsonApiResource | JsonApiResource[] | null }
  >;
}

export interface JsonApiDocument {
  data: JsonApiResource | JsonApiResource[] | null;
  included?: JsonApiResource[];
  meta?: Record<string, unknown>;
  links?: Record<string, unknown>;
}

function flattenResource<T>(resource: JsonApiResource): T {
  return { id: resource.id, ...resource.attributes } as T;
}

export function deserializeResource<T>(document: JsonApiDocument): T {
  if (!document.data || Array.isArray(document.data)) {
    throw new TypeError(
      'Invalid JSON:API document: expected single resource data',
    );
  }
  return flattenResource<T>(document.data);
}

export function deserializeCollection<T>(document: JsonApiDocument): T[] {
  if (!document.data || !Array.isArray(document.data)) {
    throw new TypeError('Invalid JSON:API document: expected collection data');
  }
  return document.data.map((resource) => flattenResource<T>(resource));
}
