import type { CSSProperties, ReactNode } from 'react';
import type { Listing } from '@/lib/marketplace-api';

const OUTPUT_TYPE_LABELS = {
  video: 'Video',
  image: 'Image',
  'image-edit': 'Photo edit',
} as const;

/** What the listing makes, as text; null when the listing does not say. */
export function outputTypeLabel(listing: Listing): string | null {
  return listing.outputType ? OUTPUT_TYPE_LABELS[listing.outputType] : null;
}

function frameStyle(listing: Listing): CSSProperties | undefined {
  return listing.mediaAspectRatio
    ? { aspectRatio: listing.mediaAspectRatio.replace(':', ' / ') }
    : undefined;
}

/** The card picture. Renders nothing, not an empty frame, when the listing has none. */
export function ListingCardMedia({ listing }: { listing: Listing }): ReactNode {
  if (!listing.thumbnail) return null;
  return (
    <div className="mb-4 flex max-h-80 justify-center overflow-hidden rounded-md bg-black/40">
      {/* biome-ignore lint/performance/noImgElement: Store media is pre-optimized on the CDN and does not need next/image. */}
      <img
        alt={listing.mediaAlt || listing.title}
        className="max-h-80 w-auto max-w-full object-cover"
        loading="lazy"
        src={listing.thumbnail}
        style={frameStyle(listing)}
      />
    </div>
  );
}

function PreviewVideo({
  listing,
  src,
}: {
  listing: Listing;
  src: string;
}): ReactNode {
  return (
    <video
      className="max-h-[32rem] max-w-full rounded-lg bg-black"
      controls
      muted
      playsInline
      poster={listing.thumbnail ?? undefined}
      preload="metadata"
      src={src}
      style={frameStyle(listing)}
    />
  );
}

/**
 * The listing page media: the clip (muted, with controls, never autoplaying),
 * then the pictures; the card picture stands in when there is nothing else.
 * Renders nothing when the listing has no media.
 */
export function ListingPageMedia({ listing }: { listing: Listing }): ReactNode {
  const images =
    listing.previewImages.length > 0
      ? listing.previewImages
      : listing.previewVideo || !listing.thumbnail
        ? []
        : [listing.thumbnail];
  if (!listing.previewVideo && images.length === 0) return null;
  const alt = listing.mediaAlt || listing.title;
  return (
    <div className="mb-8 flex flex-wrap items-start gap-4">
      {listing.previewVideo && (
        <PreviewVideo listing={listing} src={listing.previewVideo} />
      )}
      {images.map((src) => (
        // biome-ignore lint/performance/noImgElement: Store media is pre-optimized on the CDN and does not need next/image.
        <img
          alt={alt}
          className="max-h-[32rem] max-w-full rounded-lg"
          key={src}
          loading="lazy"
          src={src}
          style={frameStyle(listing)}
        />
      ))}
    </div>
  );
}
