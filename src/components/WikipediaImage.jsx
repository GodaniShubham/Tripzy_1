import React, { useEffect, useMemo, useState } from 'react';

const buildSearchUrl = (term) =>
  `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${term}&gsrlimit=1&prop=pageimages&format=json&origin=*&piprop=thumbnail|original&pithumbsize=900`;

const buildTitleUrl = (title) =>
  `https://en.wikipedia.org/w/api.php?action=query&titles=${title}&prop=pageimages&format=json&origin=*&piprop=thumbnail|original&pithumbsize=900`;

const normalizePlaceText = (value = '') =>
  value.toLowerCase().replace(/[^a-z0-9,\s-]/g, ' ').replace(/\s+/g, ' ').trim();

const compactPlaceText = (value = '') => normalizePlaceText(value).replace(/\s+/g, '');

const curatedImageRules = [
  {
    keywords: ['goa', 'panaji', 'calangute', 'margao', 'old goa', 'andaman', 'port blair', 'havelock', 'lakshadweep'],
    url: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=1200&auto=format&fit=crop',
  },
  {
    keywords: ['kerala', 'kochi', 'cochin', 'munnar', 'alleppey', 'alappuzha', 'varkala', 'wayanad', 'trivandrum'],
    url: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&auto=format&fit=crop',
  },
  {
    keywords: ['manali', 'shimla', 'himachal', 'kullu', 'solang', 'rohtang', 'ladakh', 'leh', 'kargil', 'gulmarg', 'pahalgam', 'srinagar', 'darjeeling'],
    url: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200&auto=format&fit=crop',
  },
  {
    keywords: ['jaipur', 'udaipur', 'jodhpur', 'jaisalmer', 'agra', 'amritsar', 'rajasthan', 'delhi', 'new delhi', 'gujarat', 'ahmedabad', 'gandhinagar', 'surat'],
    url: 'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?w=1200&auto=format&fit=crop',
  },
  {
    keywords: ['varanasi', 'banaras', 'kashi', 'rishikesh', 'haridwar', 'prayagraj', 'allahabad'],
    url: 'https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=1200&auto=format&fit=crop',
  },
];

const genericIndiaImagePool = [
  'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200&auto=format&fit=crop',
];

const getPageImage = (page) => page?.original?.source || page?.thumbnail?.source || null;

const scorePageTitleMatch = (title, seedText) => {
  const normalizedTitle = normalizePlaceText(title);
  const compactTitle = compactPlaceText(title);
  const normalizedSeed = normalizePlaceText(seedText);
  const compactSeed = compactPlaceText(seedText);
  const tokens = normalizedSeed.split(' ').filter(Boolean);

  let score = 0;

  if (normalizedTitle === normalizedSeed) score += 120;
  if (compactSeed && compactTitle === compactSeed) score += 110;
  if (normalizedTitle.startsWith(normalizedSeed)) score += 60;
  if (normalizedTitle.includes(normalizedSeed)) score += 40;
  if (compactSeed && compactTitle.includes(compactSeed)) score += 35;

  tokens.forEach((token) => {
    if (normalizedTitle.includes(token)) score += 8;
  });

  if (normalizedTitle.includes('disambiguation')) score -= 120;
  if (normalizedTitle.includes('film') || normalizedTitle.includes('album') || normalizedTitle.includes('song')) score -= 40;

  return score;
};

const extractBestImage = (data, seedText) => {
  const pages = Object.values(data.query?.pages || {});
  if (!pages.length) return null;

  const rankedPages = pages
    .map((page) => ({
      page,
      score: scorePageTitleMatch(page?.title || '', seedText),
      image: getPageImage(page),
    }))
    .filter((entry) => entry.image)
    .sort((left, right) => right.score - left.score);

  return rankedPages[0]?.image || null;
};

const pickDeterministicFallback = (seedText) => {
  const normalized = normalizePlaceText(seedText);

  for (const rule of curatedImageRules) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.url;
    }
  }

  const hash = normalized.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  return genericIndiaImagePool[hash % genericIndiaImagePool.length];
};

const WikipediaImage = ({ place, query, wikiTitle, className, alt }) => {
  const [imgUrl, setImgUrl] = useState(null);
  const fallbackImage = useMemo(
    () => pickDeterministicFallback([wikiTitle, query, place, alt].filter(Boolean).join(' ')),
    [alt, place, query, wikiTitle]
  );

  useEffect(() => {
    let isMounted = true;

    const fetchImg = async () => {
      if (!place && !query && !wikiTitle) return;

      setImgUrl(null);

      try {
        const titleCandidates = [wikiTitle, place, query]
          .filter(Boolean)
          .flatMap((value) => [value, `${value} India`]);
        const uniqueTitleCandidates = [...new Set(titleCandidates)];

        for (const title of uniqueTitleCandidates) {
          const titleRes = await fetch(buildTitleUrl(encodeURIComponent(title)));
          const titleData = await titleRes.json();
          const titleImg = extractBestImage(titleData, [wikiTitle, place, query, title].filter(Boolean).join(' '));
          if (titleImg && isMounted) {
            setImgUrl(titleImg);
            return;
          }
        }

        const searches = [];

        if (query) searches.push(query);
        if (place) searches.push(place, `${place} India`, `${place} travel`);

        const uniqueSearches = [...new Set(searches.filter(Boolean))];

        for (const term of uniqueSearches) {
          const res = await fetch(buildSearchUrl(encodeURIComponent(term)));
          const data = await res.json();
          const bestImage = extractBestImage(data, [wikiTitle, place, query, term].filter(Boolean).join(' '));
          if (bestImage && isMounted) {
            setImgUrl(bestImage);
            return;
          }
        }

        if (isMounted) {
          setImgUrl(fallbackImage);
        }
      } catch (error) {
        if (isMounted) {
          setImgUrl(fallbackImage);
        }
      }
    };

    fetchImg();

    return () => {
      isMounted = false;
    };
  }, [fallbackImage, place, query, wikiTitle]);

  return imgUrl ? (
    <img src={imgUrl} className={className} alt={alt} />
  ) : (
    <div className={`bg-gray-200 animate-pulse ${className}`} />
  );
};

export default WikipediaImage;
