import React from 'react';

import { TrackResponse } from 'frontend/responses';

export const SpotifyIframe: React.FC<{ track: TrackResponse }> = (props): JSX.Element => {
  const src = `https://open.spotify.com/embed/track/${props.track.spotify.spotify_id}`;

  return (
    <div style={{ height: '75px' }}>
      <iframe
        src={src}
        width="100%"
        height={75}
        frameBorder={0}
        allow="encrypted-media"
      />
    </div>
  );
};
