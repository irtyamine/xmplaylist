import debug from 'debug';
import got from 'got';
import { URLSearchParams } from 'url';
import { db } from './db';

import { matchesGarbage } from './ignoreNames';
import { Channel } from '../../frontend/channels';
import { SiriusDeeplink } from './siriusDeeplink';
import { TrackModel, ScrobbleModel } from './models';

const log = debug('xmplaylist');

export class NoSongMarker extends Error {
  message = 'no song marker found';
}

export class AlreadyScrobbled extends Error {
  message = 'Already scrobbled';
}

export function parseName(name: string) {
  return name.split(' #')[0];
}

export function parseArtists(artists: string): string[] {
  // Splits artists into an array
  return artists.match(/(?:\/\\|[^/\\])+/g);
}

export function parseDeeplinkResponse(data: SiriusDeeplink) {
  try {
    const markerLists =
      data?.ModuleListResponse?.moduleList?.modules?.[0].moduleResponse?.moduleDetails
        ?.liveChannelResponse.liveChannelResponses?.[0].markerLists ?? [];
    const cut = markerLists.find(markerList => markerList.layer === 'cut');
    const marker = cut?.markers?.find(
      marker =>
        (marker.cut.cutContentType === 'Song' || marker.cut.cutContentType === 'Link') &&
        marker.cut.title &&
        marker.cut.title.trim().length > 0 &&
        marker.cut.galaxyAssetId.trim().length > 1 &&
        // block @sxmwillie
        !marker.cut?.artists?.[0]?.name?.trim()?.startsWith('@') &&
        (!marker.duration || marker.duration > 35) &&
        !matchesGarbage(marker),
    );
    if (!marker || !marker.cut) {
      throw new NoSongMarker();
    }

    return {
      song: marker.cut,
      startTime: marker.timestamp.absolute,
    };
  } catch (e) {
    // log('parsing response error', e);
    throw e;
  }
}

export async function handleResponse(channel: Channel, res: SiriusDeeplink) {
  const { song, startTime } = parseDeeplinkResponse(res);
  const artists = parseArtists(song.artists[0].name);
  const name = parseName(song.title);
  const track: TrackModel = {
    id: song.galaxyAssetId,
    name,
    // stringify because knex errors otherwise
    artists: JSON.stringify(artists) as any,
  };
  const scrobble: ScrobbleModel = {
    trackId: track.id,
    channel: channel.deeplink,
    startTime: new Date(startTime),
  };

  const alreadyScrobbled = await db('scrobble')
    .select<{ id: string } | undefined>('id')
    .where(scrobble)
    .first();
  if (alreadyScrobbled) {
    throw new AlreadyScrobbled();
  }

  const existingTrackCount = await db('track')
    .select<{ id: string } | undefined>('id')
    .where({ id: track.id })
    .first();
  if (!existingTrackCount) {
    await db('track').insert(track);
  }

  await db('scrobble').insert(scrobble);

  return { track, scrobble };
}

export async function checkEndpoint(channel: Channel) {
  let res: SiriusDeeplink;
  try {
    const searchParams = new URLSearchParams({
      deepLinkId: channel.deeplink,
      'deepLink-type': 'live',
    });
    res = await got
      .get('http://player.siriusxm.com/rest/v2/experience/modules/get/deeplink', {
        timeout: 15_000, // 15 sec
        searchParams,
      })
      .json();
  } catch (e) {
    log(e);
    throw e;
  }

  return handleResponse(channel, res);
}
