import { h, Component } from 'preact';
import style from './style';
import { route } from 'preact-router';
import { Link } from 'preact-router/match';
import SocialLinkList from '../../components/sociallinklist';
import Loader from '../../components/loader';
import Header from '../../components/header';
import {
  isValidUrl,
  getUrlQueryParameterByName,
  removeHtml,
  getTimeFromSeconds,
  getTime,
  getSecondsFromTime,
  getFlagEmojiFromLanguage,
  setDocumentMetaTags,
  slugify,
} from '../../utils/misc';

export default class Podcast extends Component {
  constructor(props) {
    super(props);
    this.state = {
      docTitle: 'Podcast',
      docDescription: 'Listen now at 1tuner.com',
      podcastInfo: null,
      errorMessage: null,
      isLoading: false,
    };
  }

  getPodcast = (AFeedUrl) => {
    this.setState({ isLoading: true });
    AFeedUrl = AFeedUrl ? decodeURIComponent(AFeedUrl) : null;
    if (!AFeedUrl || !isValidUrl(AFeedUrl)) {
      this.setState({ errorMessage: 'Error: The feed url is invalid.' });
      return null;
    }
    let loadXml = true;
    let podcastInfo = this.state.podcastInfo;
    const podcastSearchResult = this.props.lastPodcastSearchResult;
    const stationPodcastList = this.props.stationPodcastList;
    const podcastList = this.props.podcastList;
    if (!podcastInfo && podcastList) {
      for (let i = 0; i < podcastList.length; i++) {
        if (podcastList[i].feedUrl == AFeedUrl) {
          const dateNowMs = new Date().getTime();
          podcastInfo = podcastList[i];
          if (podcastInfo.modified && (dateNowMs - podcastInfo.modified.getTime()) / 3600000 < 24) {
            loadXml = false;
          } else {
            loadXml = true;
          }
          this.setState({ podcastInfo: podcastInfo, isLoading: false });
          break;
        }
      }
    }
    if (!podcastInfo && podcastSearchResult) {
      for (let i = 0; i < podcastSearchResult.length; i++) {
        if (podcastSearchResult[i].feedUrl == AFeedUrl) {
          podcastInfo = podcastSearchResult[i];
          this.setState({ podcastInfo: podcastInfo, isLoading: false });
          loadXml = true;
          break;
        }
      }
    }
    if (!podcastInfo && stationPodcastList) {
      for (let i = 0; i < stationPodcastList.length; i++) {
        if (stationPodcastList[i].feedUrl == AFeedUrl) {
          podcastInfo = stationPodcastList[i];
          this.setState({ podcastInfo: podcastInfo, isLoading: false });
          loadXml = true;
          break;
        }
      }
    }
    if (!podcastInfo) {
      podcastInfo = {
        feedUrl: AFeedUrl,
      };
    }
    if (loadXml) {
      this.loadXmlFeed(podcastInfo, AFeedUrl);
    }
    return podcastInfo;
  };

  loadXmlFeed = (APodcastInfo, AFeedUrl, AFetchOptions) => {
    const self = this;
    const podcastInfo = APodcastInfo || this.state.podcastInfo || {};
    fetch(AFeedUrl, AFetchOptions || {})
      .then((resp) => (resp.ok ? resp.text() : Promise.reject(resp)))
      .then((str) => new window.DOMParser().parseFromString(str, 'text/xml'))
      .then((xmlDoc) => {
        if (!xmlDoc || !xmlDoc.getElementsByTagName('channel')[0]) {
          Promise.reject('no xml');
        }
        podcastInfo.feedUrl = podcastInfo.feedUrl || AFeedUrl;
        podcastInfo.modified = new Date();
        podcastInfo.name = xmlDoc.getElementsByTagName('channel')[0].getElementsByTagName('title')[0].childNodes[0].nodeValue;
        const description =
          xmlDoc.getElementsByTagName('channel')[0].getElementsByTagName('description')[0].childNodes[0].wholeText ||
          xmlDoc.getElementsByTagName('channel')[0].getElementsByTagName('description')[0].childNodes[0].nodeValue;
        podcastInfo.language = xmlDoc.getElementsByTagName('channel')[0].getElementsByTagName('language')[0].childNodes[0].nodeValue;
        podcastInfo.description = description;
        podcastInfo.logo = self.getArtworkUrl(xmlDoc);
        podcastInfo.episodes = self.getFeedEpisodeArray(podcastInfo, xmlDoc);
        if (self.props.name === 'by-url' && self.props.feedcode && podcastInfo.name) {
          route('/podcast/' + slugify(podcastInfo.name) + '/' + self.props.feedcode);
        }
        self.setState({
          podcastInfo: podcastInfo,
          isLoading: false,
        });
        self.props.savePodcastHistory(podcastInfo);
      })
      .catch((err) => {
        if (!AFetchOptions) {
          // Probably a CORS issue, try again via our special request worker
          self.loadXmlFeed(podcastInfo, 'https://request.robinbakker.workers.dev', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/text',
            },
            body: AFeedUrl,
          });
        } else {
          self.setState({ errorMessage: "⚡KA-POW! - That's an error... Sorry! Please try again later, or another podcast maybe?" });
        }
        console.log(err);
      });
  };

  getArtworkUrl = (AXmlDoc) => {
    if (AXmlDoc.getElementsByTagName('channel')[0].getElementsByTagName('media:thumbnail')[0] !== undefined) {
      return AXmlDoc.getElementsByTagName('channel')[0].getElementsByTagName('media:thumbnail')[0].getAttribute('url');
    } else if (AXmlDoc.getElementsByTagName('channel')[0].getElementsByTagName('itunes:image')[0] !== undefined) {
      return AXmlDoc.getElementsByTagName('channel')[0].getElementsByTagName('itunes:image')[0].getAttribute('href');
    } else {
      if (!AXmlDoc.getElementsByTagName('item')) {
        return null;
      }
      // Try to find any item with 'href' or 'url' attribute containing an image
      for (let i = 0; i < AXmlDoc.getElementsByTagName('item').length; i++) {
        let qSelect = AXmlDoc.getElementsByTagName('item')[i].querySelector('*[href*=".jpeg"],*[href*=".jpg"],*[href*=".png"]');
        if (qSelect && qSelect.length !== 0) {
          return qSelect.getAttribute('href');
        }
        qSelect = AXmlDoc.getElementsByTagName('item')[i].querySelector('*[url*=".jpeg"],*[url*=".jpg"],*[url*=".png"]');
        if (qSelect && qSelect.length !== 0) {
          return qSelect.getAttribute('url');
        }
      }
    }
    return null;
  };

  getFeedEpisodeArray = (APodcastInfo, AXmlDoc) => {
    let itemArray = [];
    for (let i = 0; i < AXmlDoc.getElementsByTagName('item').length; i++) {
      const item = AXmlDoc.getElementsByTagName('item')[i];
      const encl = item.getElementsByTagName('enclosure');
      if (encl.length) {
        const durationKey = item.getElementsByTagName('itunes:duration').length ? 'itunes:duration' : 'duration';
        const durationElm = item.getElementsByTagName(durationKey);
        const epItem = {
          title: item.getElementsByTagName('title')[0].childNodes[0].nodeValue,
          length: encl[0].getAttribute('length'),
          type: encl[0].getAttribute('type'),
          url: encl[0].getAttribute('url'),
          description: item.getElementsByTagName('itunes:subtitle')[0]
            ? item.getElementsByTagName('itunes:subtitle')[0].textContent
            : item.getElementsByTagName('description')[0].textContent,
          pubDate: new Date(item.getElementsByTagName('pubDate')[0].childNodes[0].nodeValue),
          duration: durationElm && durationElm.length ? this.getFeedEpisodeDuration(durationElm[0].innerHTML.split(':')) : '',
          durationSeconds: durationElm && durationElm.length ? getSecondsFromTime(durationElm[0].innerHTML) : 0,
        };
        if (APodcastInfo && APodcastInfo.episodes) {
          const oldEp = APodcastInfo.episodes.find((ep) => ep.secondsElapsed && ep.url === epItem.url);
          if (oldEp) {
            epItem.isPlaying = oldEp.isPlaying;
            epItem.secondsElapsed = oldEp.secondsElapsed;
          }
        }
        itemArray.push(epItem);
      }
    }
    return itemArray;
  };

  getFeedEpisodeDuration = (ADurationArr) => {
    if (!ADurationArr || !ADurationArr.length) {
      return '';
    }
    if (ADurationArr.length >= 2) {
      return getTime(ADurationArr[0], ADurationArr[1]);
    } else {
      return getTimeFromSeconds(ADurationArr[0] / 60);
    }
  };

  playEpisode = (e) => {
    if (this.state.podcastInfo && this.state.podcastInfo.episodes) {
      const podcast = this.state.podcastInfo;
      for (let i = 0; i < podcast.episodes.length; i++) {
        podcast.episodes[i].isPlaying = podcast.episodes[i].url == e.target.getAttribute('data-href');
      }
      this.props.playEpisode(podcast, true);
      this.setState({
        podcastInfo: podcast,
      });
    }
    e.preventDefault();
  };

  tryAgain = () => {
    this.setState({ podcastInfo: null, isLoading: false });
  };
  reloadFeed = () => {
    this.getPodcast(this.state.podcastInfo.feedUrl);
  };

  render({ name, feedcode }, { podcastInfo, isLoading, docTitle, docDescription, errorMessage }) {
    if (!podcastInfo) {
      setDocumentMetaTags(this.props.name + ' | ' + docTitle, docDescription);
      if (!isLoading && typeof window !== 'undefined') {
        const urlParam = feedcode ? atob(feedcode) : null;
        const feedUrl = urlParam || getUrlQueryParameterByName('feedurl', window.location.href.split('/?')[1]);
        this.getPodcast(feedUrl);
      }
      return (
        <div class={'page-container'}>
          <Header title={docTitle} />
          <main class={'content content--is-loading ' + style.podcast + ' ' + style['podcast--empty']}>
            <h1>{name}</h1>
            {isLoading && !errorMessage ? (
              <Loader />
            ) : (
              <div>
                <p>{errorMessage}</p>
                <p>
                  <button onClick={this.tryAgain} class={'btn btn--cancel margin--right'}>
                    Try again
                  </button>{' '}
                  <Link href={'/podcasts'} class={'btn btn--search'}>
                    Find other podcasts
                  </Link>
                </p>
              </div>
            )}
          </main>
        </div>
      );
    } else {
      setDocumentMetaTags(
        podcastInfo.name + ' | ' + docTitle,
        docDescription,
        podcastInfo.logo600 ? podcastInfo.logo600 : podcastInfo.logo,
        (window ? window.location.origin : '') + '/podcast/' + slugify(podcastInfo.name) + '/' + btoa(podcastInfo.feedUrl)
      );
      return (
        <div class={'page-container'}>
          <Header title={podcastInfo.name} sharetext={'Listen to this podcast at 1tuner.com'} />
          <div class={style.pageheader}>
            <h1 class={'main-title'}>
              {podcastInfo.name}
              <small class={'main-subtitle main-subtitle--loud'}>{getFlagEmojiFromLanguage(podcastInfo.language)} Podcast</small>
            </h1>
            <SocialLinkList websiteUrl={podcastInfo.website} items={podcastInfo.social} />
          </div>
          <main class={'content ' + style.podcast}>
            <div class={style.start}>
              <img class={style.artwork} src={podcastInfo.logo600 ? podcastInfo.logo600 : podcastInfo.logo} alt={podcastInfo.name} />
              <div class={style.description}>
                <p class={style.descriptiontext}>{removeHtml(podcastInfo.description)}</p>
                {podcastInfo.modified ? (
                  <p class={style.reloadbutton}>
                    <button onClick={this.reloadFeed} class={'btn ' + style.btnreload} title="Reload">
                      <span class={style.reloadicon + (isLoading ? ' ' + style.loading : '')}>
                        <svg xmlns="http://www.w3.org/2000/svg" style="isolation:isolate" viewBox="0 0 96 96">
                          <defs>
                            <clipPath id="a">
                              <path d="M0 0h96v96H0z" />
                            </clipPath>
                          </defs>
                          <g clip-path="url(#a)">
                            <path d="M63.415 32.585l5.798-5.798v15.415H53.798l5.799-5.799c-6.364-6.364-16.759-6.434-23.194 0a16.567 16.567 0 00-4.101 6.789h-5.657c.92-3.889 2.758-7.566 5.799-10.607 8.697-8.556 22.415-8.556 30.971 0zM36.403 59.597c6.364 6.364 16.759 6.434 23.194 0a16.567 16.567 0 004.101-6.789h5.657c-.92 3.889-2.758 7.566-5.799 10.607-8.556 8.556-22.344 8.485-30.83 0l-5.868 5.869V53.869l15.344-.071-5.799 5.799z" />
                          </g>
                        </svg>
                      </span>
                    </button>
                    <span class={style.modifieddate}>
                      {podcastInfo.modified ? podcastInfo.modified.toLocaleDateString(undefined, { dateStyle: 'short' }) : ''}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
            <div class={style.end}>
              {podcastInfo.episodes ? (
                <div>
                  <LastPlayed episode={podcastInfo.episodes.find((ep) => ep.isPlaying && ep.secondsElapsed)} onClick={this.playEpisode.bind(this)} />
                  <ul class={style['podcast-episode__list']}>
                    {podcastInfo.episodes.map((ep) => (
                      <li class={style['podcast-episode__item'] + (ep.isPlaying ? ' ' + style['podcast-episode__item--is-playing'] : '')}>
                        <button
                          data-href={ep.url}
                          onClick={this.playEpisode.bind(this)}
                          class={style['btn--play-episode'] + ' btn btn--play'}
                        ></button>
                        <b>{ep.title}</b> ({ep.duration}
                        {ep.secondsElapsed ? ' - played ' + getTimeFromSeconds(ep.secondsElapsed) : ''})<br />
                        {typeof ep.pubDate == 'object' ? (
                          <span class={style.pubdate}>{ep.pubDate.toLocaleDateString(undefined, { dateStyle: 'full' })}</span>
                        ) : null}
                        {removeHtml(ep.description)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : errorMessage ? (
                <div>
                  <p>{errorMessage}</p>
                  <p>
                    <button onClick={this.tryAgain} class={'btn btn--cancel margin--right'}>
                      Try again
                    </button>{' '}
                    <Link href={'/podcasts'} class={'btn btn--search'}>
                      Find other podcasts
                    </Link>
                  </p>
                </div>
              ) : (
                <Loader />
              )}
            </div>
          </main>
        </div>
      );
    }
  }
}

const LastPlayed = (props) => {
  console.log(props.episode);
  return props.episode ? (
    <div class={style.lastPlayed}>
      <div class={style.lastPlayedButton}>
        <button data-href={props.episode.url} onClick={(e) => props.onClick(e)} class={'btn btn--secondary btn--play'}></button>
      </div>
      <div class={style.lastPlayedText}>
        <h4>{props.episode.title} </h4>
        <p>({props.episode.duration + '  - played ' + getTimeFromSeconds(props.episode.secondsElapsed)})</p>
      </div>
    </div>
  ) : null;
};
