/** Common timestamps for entity records */
export interface ITimestamps {
  createdAt: string;
  updatedAt: string;
}

/** Base identifiable entity with timestamps */
export interface IIdentifiable extends ITimestamps {
  id: string;
}

/** Common pagination query parameters */
export interface IPaginatedQuery {
  page?: number;
  limit?: number;
  sort?: string;
}

/** URL response */
export interface IUrlResponse {
  url: string;
}
