import type { MetadataRoute } from 'next';
import { absoluteMarketplaceUrl, INDEXABLE_ROUTES } from '../lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_ROUTES.map((route) => ({
    url: absoluteMarketplaceUrl(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
