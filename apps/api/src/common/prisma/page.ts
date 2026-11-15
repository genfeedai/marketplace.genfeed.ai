export interface Page<T> {
  items: T[];
  limit: number;
  page: number;
  total: number;
}
