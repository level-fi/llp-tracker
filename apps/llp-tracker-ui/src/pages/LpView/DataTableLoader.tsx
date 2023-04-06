import React, { memo } from 'react';
import ContentLoader, { IContentLoaderProps } from 'react-content-loader';

const range = (n: number) => {
  return new Array(n).fill(1).map((_, i) => i);
};

export const DataTableLoader: React.FC<IContentLoaderProps & { rows: number }> = memo(function DataTableLoader({
  rows,
  ...props
}) {
  const viewBoxHeight = 30 * rows + 20;
  return (
    <ContentLoader
      // width={1200}
      // height={400}
      viewBox={`0 0 1200 ${viewBoxHeight}`}
      backgroundColor="#29292C"
      foregroundColor="#36363d"
      {...props}
    >
      <rect x="27" y="5" rx="4" ry="4" width="20" height="20" />
      <rect x="67" y="5" rx="10" ry="10" width="85" height="19" />
      <rect x="188" y="5" rx="10" ry="10" width="169" height="19" />
      <rect x="402" y="5" rx="10" ry="10" width="85" height="19" />
      <rect x="523" y="5" rx="10" ry="10" width="169" height="19" />
      <rect x="731" y="5" rx="10" ry="10" width="85" height="19" />
      <rect x="852" y="5" rx="10" ry="10" width="85" height="19" />
      <rect x="977" y="5" rx="10" ry="10" width="169" height="19" />
      {range(rows).map((t) => (
        <React.Fragment key={t}>
          <rect x="27" y={40 + t * 50} rx="4" ry="4" width="20" height="20" />
          <rect x="67" y={40 + t * 50} rx="10" ry="10" width="85" height="19" />
          <rect x="188" y={40 + t * 50} rx="10" ry="10" width="169" height="19" />
          <rect x="402" y={40 + t * 50} rx="10" ry="10" width="85" height="19" />
          <rect x="523" y={40 + t * 50} rx="10" ry="10" width="169" height="19" />
          <rect x="731" y={40 + t * 50} rx="10" ry="10" width="85" height="19" />
          <rect x="852" y={40 + t * 50} rx="10" ry="10" width="85" height="19" />
          <rect x="978" y={40 + t * 50} rx="10" ry="10" width="169" height="19" />
        </React.Fragment>
      ))}

      {/* <rect x="26" y="90" rx="4" ry="4" width="20" height="20" />
      <rect x="66" y="90" rx="10" ry="10" width="85" height="19" />
      <rect x="187" y="90" rx="10" ry="10" width="169" height="19" />
      <rect x="401" y="90" rx="10" ry="10" width="85" height="19" />
      <rect x="522" y="90" rx="10" ry="10" width="169" height="19" />
      <rect x="730" y="90" rx="10" ry="10" width="85" height="19" />
      <rect x="851" y="90" rx="10" ry="10" width="85" height="19" />
      <rect x="977" y="90" rx="10" ry="10" width="169" height="19" />

      <rect x="26" y="140" rx="4" ry="4" width="20" height="20" />
      <rect x="66" y="140" rx="10" ry="10" width="85" height="19" />
      <rect x="187" y="140" rx="10" ry="10" width="169" height="19" />
      <rect x="401" y="140" rx="10" ry="10" width="85" height="19" />
      <rect x="522" y="140" rx="10" ry="10" width="169" height="19" />
      <rect x="730" y="140" rx="10" ry="10" width="85" height="19" />
      <rect x="851" y="140" rx="10" ry="10" width="85" height="19" />
      <rect x="977" y="140" rx="10" ry="10" width="169" height="19" />

      <rect x="26" y="190" rx="4" ry="4" width="20" height="20" />
      <rect x="66" y="190" rx="10" ry="10" width="85" height="19" />
      <rect x="187" y="190" rx="10" ry="10" width="169" height="19" />
      <rect x="401" y="190" rx="10" ry="10" width="85" height="19" />
      <rect x="522" y="190" rx="10" ry="10" width="169" height="19" />
      <rect x="730" y="190" rx="10" ry="10" width="85" height="19" />
      <rect x="851" y="190" rx="10" ry="10" width="85" height="19" />
      <rect x="977" y="190" rx="10" ry="10" width="169" height="19" />

      <rect x="26" y="240" rx="4" ry="4" width="20" height="20" />
      <rect x="66" y="240" rx="10" ry="10" width="85" height="19" />
      <rect x="187" y="240" rx="10" ry="10" width="169" height="19" />
      <rect x="401" y="240" rx="10" ry="10" width="85" height="19" />
      <rect x="522" y="240" rx="10" ry="10" width="169" height="19" />
      <rect x="730" y="240" rx="10" ry="10" width="85" height="19" />
      <rect x="851" y="240" rx="10" ry="10" width="85" height="19" />
      <rect x="977" y="240" rx="10" ry="10" width="169" height="19" />

      <rect x="26" y="290" rx="4" ry="4" width="20" height="20" />
      <rect x="66" y="290" rx="10" ry="10" width="85" height="19" />
      <rect x="187" y="290" rx="10" ry="10" width="169" height="19" />
      <rect x="401" y="290" rx="10" ry="10" width="85" height="19" />
      <rect x="522" y="290" rx="10" ry="10" width="169" height="19" />
      <rect x="730" y="290" rx="10" ry="10" width="85" height="19" />
      <rect x="851" y="290" rx="10" ry="10" width="85" height="19" />
      <rect x="977" y="290" rx="10" ry="10" width="169" height="19" />

      <rect x="26" y="340" rx="4" ry="4" width="20" height="20" />
      <rect x="66" y="340" rx="10" ry="10" width="85" height="19" />
      <rect x="187" y="340" rx="10" ry="10" width="169" height="19" />
      <rect x="401" y="340" rx="10" ry="10" width="85" height="19" />
      <rect x="522" y="340" rx="10" ry="10" width="169" height="19" />
      <rect x="730" y="340" rx="10" ry="10" width="85" height="19" />
      <rect x="851" y="340" rx="10" ry="10" width="85" height="19" />
      <rect x="977" y="340" rx="10" ry="10" width="169" height="19" />   */}
    </ContentLoader>
  );
});
