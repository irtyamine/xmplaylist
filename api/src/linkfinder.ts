import got from 'got';
import { Spotify } from './models';
import uaString from 'ua-string';
import { db } from './db';

export class FailedLinkFinding extends Error {
  message = 'Could not find links';
}

export interface SongWhipTrackResponse {
  status: string;
  data: Data;
}

export interface Data {
  id: number;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  refreshedAt: Date | null;
  name: string;
  sourceUrl: string;
  sourceCountry: string;
  images: string[];
  image: string;
  links?: { [key: string]: Link[] };
  linksCountries?: string[];
  linksOverride?: null;
  aliasId: null;
  artistId?: number;
  releaseDate?: Date | null;
  type: string;
  url: string;
  artists?: Data[];
  albums?: Data[];
  description?: null;
  descriptionOverride?: null;
}

export interface Link {
  link: string;
  countries: string[] | null;
}

export async function getLinks(spotify: Spotify): Promise<Array<{ site: string; url: string }>> {
  let res: SongWhipTrackResponse;
  try {
    res = await got
      .post('https://songwhip.com/api/', {
        headers: {
          'content-type': 'application/json',
          'user-agent': uaString,
        },
        json: {
          url: `https://open.spotify.com/track/${spotify.spotifyId}`,
          country: 'US',
        },
        retry: 0,
        timeout: 10_000, // 10 sec
      })
      .json();
  } catch (error) {
    throw new FailedLinkFinding();
  }

  const links = Object.entries(res.data.links ?? {}).map(([key, link]) => {
    let url = link[0]?.link;
    if (link[0]?.countries) {
      url = url.replace('{country}', link[0]?.countries[0]);
    }

    return {
      site: key,
      url,
    };
  });

  return links;
}

export async function findAndCacheLinks(spotify: Spotify) {
  const existing = await db('links').select().where({ trackId: spotify.trackId }).first();

  if (existing) {
    return;
  }

  const links = await getLinks(spotify);

  await db('links').insert({ trackId: spotify.trackId, links: JSON.stringify(links) });
}
