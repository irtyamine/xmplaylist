/* eslint-disable react-hooks/rules-of-hooks */
import { formatDistanceStrict } from 'date-fns';
import fetch from 'isomorphic-unfetch';
import _ from 'lodash';
import { NextComponentType } from 'next';
import Error from 'next/error';
import Head from 'next/head';
import React, { useState } from 'react';
import useSWR, { useSWRPages } from 'swr';
import AdSense from 'react-adsense';

import { channels } from '../../../channels';
import { AppLayout } from '../../../components/AppLayout';
import { StationHeader } from '../../../components/StationHeader';
import { StationNavigation } from '../../../components/StationNavigation';
import { StreamCardsLayout } from '../../../components/StreamCardsLayout';
import { StationRecent, TrackResponse } from '../../../responses';
import { url } from '../../../url';
import { StationSpotifyPlaylist } from '../../../components/StationSpotifyPlaylist';

interface StationProps {
  recent: StationRecent[][];
  channelId: string;
}

function getLastStartTime(recent: StationRecent[]): number {
  const last = recent[recent.length - 1].start_time;
  return new Date(last).getTime();
}

const StationPage: NextComponentType<any, any, StationProps> = props => {
  const { channelId } = props;
  const lowercaseId = channelId.toLowerCase();
  const channel = channels.find(
    channel => channel.deeplink.toLowerCase() === lowercaseId || channel.id === lowercaseId,
  );
  if (!channel) {
    return <Error statusCode={404} />;
  }

  const { pages, isLoadingMore, isReachingEnd, loadMore } = useSWRPages(
    // page key
    channel.deeplink,

    // page component
    ({ offset, withSWR }) => {
      console.log({ offset });
      const { data } = withSWR(
        useSWR(
          offset ?
            `${url}/api/station/${props.channelId}?last=${offset}` :
            `${url}/api/station/${props.channelId}`,
          {
            refreshInterval: 0,
            initialData: props.recent,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            fetcher: async (url, options) => {
              console.log('hello');
              return fetch(url, options).then(async r => _.chunk(await r.json(), 12));
            },
          },
        ),
      );
      // you can still use other SWRs outside

      // if (!projects) {
      //   return <p>loading</p>;
      // }

      return <StreamCardsLayout tracks={data} channel={channel} secondaryText={secondaryText} />;
    },

    // get next page's offset from the index of current page
    SWR => {
      const data = SWR.data ? SWR.data : props.recent;
      if (data && data.length === 0) {
        return null;
      }

      // offset = pageCount × pageSize
      const recent = data[data.length - 1];
      const last = recent[recent.length - 1].start_time;
      return new Date(last).getTime();
    },

    // deps of the page component
    [],
  );

  const [loading, setLoading] = useState(false);
  // const [recent, setRecent] = useState<StationRecent[][]>(swr.data as StationRecent[][]);

  // if (swr.error) {
  //   return <Error statusCode={500} />;
  // }

  // async function fetchMore(): Promise<void> {
  //   setLoading(true);
  //   const lastDateTime = getLastStartTime(recent[recent.length - 1]);
  //   const res = await fetch(`${url}/api/station/${channelId}?last=${lastDateTime}`);
  //   const json = await res.json();
  //   setLoading(false);
  //   setRecent([...recent, ..._.chunk<any>(json, 12)]);
  // }

  function secondaryText(track: TrackResponse): string {
    const timeAgo = formatDistanceStrict(
      new Date((track as StationRecent).start_time),
      new Date(),
      {
        addSuffix: true,
      },
    );
    return timeAgo;
  }

  return (
    <AppLayout>
      <Head>
        <title>{channel.name} Recently Played - sirius xm playlist</title>
        <meta
          property="og:image"
          content={`https://xmplaylist.com/static/img/${channel.deeplink}-lg.png`}
        />
      </Head>
      {/* Header */}
      <div className="bg-light">
        <div className="container pt-2" style={{ paddingBottom: '2.5rem' }}>
          <div className="row">
            <div className="col-12 col-lg-6">
              <StationHeader channel={channel} />
            </div>
          </div>
        </div>
      </div>
      {/* Spotify link */}
      <div className="container mb-1" style={{ marginTop: '-1.8rem' }}>
        <div className="row">
          <div className="col-12 mb-2">
            <StationSpotifyPlaylist channel={channel} />
          </div>
        </div>
      </div>
      <div className="container mb-3 adsbygoogle">
        <div className="row">
          <div className="col-12">
            <AdSense.Google client="ca-pub-7640562161899788" slot="5645069928" />
          </div>
        </div>
      </div>
      {/* Nav */}
      <div className="container mb-3">
        <div className="row">
          <div className="col-12">
            <StationNavigation channelDeeplink={channel.deeplink} currentPage="recent" />
          </div>
        </div>
      </div>
      {/* Main body */}
      <div className="container">
        <div className="row">{pages}</div>
        {/* Load More */}
        <div className="row mb-4 text-center">
          <div className="col-12">
            <button type="button" className="btn btn-primary" onClick={() => loadMore()}>
              {isLoadingMore ? 'Loading..' : 'Load More'}
            </button>
          </div>
        </div>
      </div>
      <div className="container adsbygoogle mb-5">
        <div className="row">
          <div className="col-12">
            <AdSense.Google client="ca-pub-7640562161899788" slot="5645069928" />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

StationPage.getInitialProps = async context => {
  const id = context.query?.id as string;
  const res = await fetch(`${url}/api/station/${id}`);

  const lowercaseId = id.toLowerCase();
  const channel = channels.find(
    channel => channel.deeplink.toLowerCase() === lowercaseId || channel.id === lowercaseId,
  );

  if (!channel) {
    return { recent: [], channelId: id };
  }

  try {
    const json = await res.json();
    return { recent: _.chunk(json, 12), channelId: id };
  } catch {
    return { recent: [], channelId: id };
  }
};

export default StationPage;
