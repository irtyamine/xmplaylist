/* eslint-disable @typescript-eslint/camelcase */
export interface TrackResponse {
  track: {
    id: string;
    name: string;
    artists: string[];
  };
  spotify: {
    spotify_id: string;
    preview_url: string;
    cover: string;
  };
  links: Array<{ site: string; url: string }>;
}

export interface TrackPlay {
  y: number;
  x: string;
}

export interface TrackChannelResponse extends TrackResponse {
  plays: TrackPlay[];
}

export interface StationRecent extends TrackResponse {
  start_time: string;
  id: string;
}

export interface StationNewest extends StationRecent {
  plays: number;
}