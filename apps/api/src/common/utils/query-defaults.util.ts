import { BaseQueryDto } from '@api/common/dto/base-query.dto';

/**
 * Utility to provide default values for query parameters based on BaseQueryDto
 */
export class QueryDefaultsUtil {
  private static readonly defaults = new BaseQueryDto();

  /**
   * Get default pagination options from BaseQueryDto
   */
  static getPaginationDefaults(query: Partial<BaseQueryDto> = {}) {
    let paginationValue =
      query.pagination ?? QueryDefaultsUtil.defaults.pagination;

    if (typeof paginationValue === 'string') {
      paginationValue = paginationValue !== 'false';
    }

    return {
      limit: query.limit ?? QueryDefaultsUtil.defaults.limit,
      page: query.page ?? QueryDefaultsUtil.defaults.page,
      pagination: paginationValue,
    };
  }
}
