/**
 * Handles MongoDB-style sort query format.
 *
 * @example
 * handleQuerySort("createdAt: -1") // { createdAt: -1 }
 * handleQuerySort("category: 1, label: -1") // { category: 1, label: -1 }
 */
export const handleQuerySort = (
  query: string | undefined | null,
): Record<string, 1 | -1> => {
  if (!query || query === '') {
    return { createdAt: -1 };
  }

  try {
    const toJSONString = `{${query}}`.replace(/(\w+:)|(\w+ :)/g, (matched) => {
      return `"${matched.substring(0, matched.length - 1)}":`;
    });
    return JSON.parse(toJSONString) as Record<string, 1 | -1>;
  } catch {
    return { createdAt: -1 };
  }
};
