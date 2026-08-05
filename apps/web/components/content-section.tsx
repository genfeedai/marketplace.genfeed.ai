import type { ReactNode } from 'react';

interface ContentSectionProps {
  heading: string;
  children: ReactNode;
}

export default function ContentSection({
  heading,
  children,
}: ContentSectionProps): ReactNode {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold text-white">{heading}</h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-white/60">
        {children}
      </div>
    </section>
  );
}
