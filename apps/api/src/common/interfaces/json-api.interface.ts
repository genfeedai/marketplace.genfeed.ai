/**
 * JSON:API response interfaces for the marketplace API.
 */

export interface JsonApiSingleResponse<T = Record<string, unknown>> {
  data: {
    id: string;
    type: string;
    attributes: T;
    relationships?: Record<string, unknown>;
  };
}

export interface JsonApiCollectionResponse {
  data: Array<{
    id: string;
    type: string;
    attributes: Record<string, unknown>;
  }> | unknown[];
  meta?: Record<string, unknown>;
}
