module.exports = async function() {
  let urlArray = [{
    url: '/',
    title: '1tuner',
    subtitle: 'listen to radio, podcasts and create playlists',
    description: 'Listen to radio, podcasts and create playlists.',
    logo: 'https://1tuner.com/assets/icons/icon-512x512.png',
    jsonld: {"@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "1tuner",
    "url": "https://1tuner.com",
    "image": "https://1tuner.com/assets/icons/icon-512x512.png",
    "thumbnailUrl": "https://1tuner.com/assets/icons/icon-192x192.png",
    "operatingSystem": "All",
    "applicationCategory": "Entertainment",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5",
      "ratingCount": "1"
    },
    "offers": {
      "@type": "Offer",
      "price": "0"
    },
    "sameAs": [
      "https://twitter.com/1tuner",
      "https://github.com/robinbakker/1tuner"
    ],
    "author": {
      "@type": "Person",
      "name": "Robin Bakker",
      "url": "https://robinbakker.nl",
      "sameAs": [
        "https://twitter.com/robinbakker",
        "https://github.com/robinbakker"
      ]
    }}
  }, {
    url: '/about',
    title: 'About 1tuner',
    subtitle: 'one web app to listen to audio streams',
    description: 'Listen to radio, podcasts and create playlists.',
    logo: 'https://1tuner.com/assets/icons/icon-512x512.png'
  }, {
    url: '/podcasts',
    title: 'Podcasts',
    subtitle: '1tuner | listen to podcasts',
    description: 'Listen to radio, podcasts and create playlists.',
    logo: 'https://1tuner.com/assets/icons/icon-512x512.png'
  }, {
    url: '/playlists',
    title: 'Playlists',
    subtitle:  '1tuner | take control',
    description: 'Listen to radio, podcasts and create playlists.',
    logo: 'https://1tuner.com/assets/icons/icon-512x512.png'
  }, {
    url: '/playlist-edit',
    title: 'Add a playlist',
    subtitle:  '1tuner | take control',
    description: 'Listen to radio, podcasts and create playlists.',
    logo: 'https://1tuner.com/assets/icons/icon-512x512.png'
  }, {
    url: '/settings',
    title: 'Settings',
    subtitle: '1tuner | one web app to listen to audio streams',
    description: 'Listen to radio, podcasts and create playlists.',
    logo: 'https://1tuner.com/assets/icons/icon-512x512.png'
  }];
  await fetch('https://raw.githubusercontent.com/robinbakker/1tuner/master/assets/data/stations.json', {
    method: 'get'
  }).then((resp) => resp.json()).then(function(items) {
    urlArray.push({
      url: '/radio-stations',
      title: 'Radio stations',
      subtitle: '1tuner | listen to the radio',
      description: 'Listen to radio, podcasts and create playlists.',
      logo: 'https://1tuner.com/assets/icons/icon-512x512.png',
      data: items
    });
    for (let item in items) {
      urlArray.push({
        url: '/radio-station/' + item,
        title: items[item].name,
        subtitle: 'Radio station | 1tuner',
        description: 'Listen now to ' + items[item].name + ' at 1tuner.com',
        logo: items[item].logosource,
        data: items[item]
      });
    }
  });
  // OK this feels stupid
  let slugify = function(text) {
    const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;';
    const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------';
    const p = new RegExp(a.split('').join('|'), 'g');

    return text.toString().toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
      .replace(/&/g, '-and-') // Replace & with 'and'
      .replace(/[^\w\-]+/g, '') // Remove all non-word characters
      .replace(/\-\-+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start of text
      .replace(/-+$/, ''); // Trim - from end of text
  };
  await fetch('https://raw.githubusercontent.com/robinbakker/1tuner/master/assets/data/podcasts.json', {
    method: 'get'
  }).then((resp) => resp.json()).then(function(data) {
    for (let item in data.podcasts) {
      let pc = data.podcasts[item];
      urlArray.push({
        url: '/podcast/' + slugify(pc.name) + '/' + Buffer.from(pc.feedUrl).toString('base64'),
        title: pc.name,
        subtitle: 'Podcast | 1tuner',
        description: 'Listen now to ' + pc.name + ' at 1tuner.com',
        logo: pc.artworkUrl,
        data: pc
      });
    }
  });
  return urlArray;
};
