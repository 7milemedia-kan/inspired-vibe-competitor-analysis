/** Two website inputs; the existing score engine remains unchanged. */
export function websiteUrl(raw: string): string {
  const value = raw.trim();
  if (!value || /\s/.test(value)) throw new Error('Please check this website address and try again.');
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`); }
  catch { throw new Error('Please check this website address and try again.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
      !url.hostname.includes('.') || /^(?:\d+\.){3}\d+$/.test(url.hostname) ||
      /(?:^|\.)(?:localhost|local|internal|arpa)$/.test(url.hostname)) {
    throw new Error('Please check this website address and try again.');
  }
  url.hash = '';
  return url.href;
}

export async function assessWebsites<T>(
  ownInput: string,
  competitorInput: string,
  score: (url: string) => Promise<T>,
): Promise<{ competitor: T; own: T | null; ownUnavailable: boolean }> {
  const ownUrl = websiteUrl(ownInput);
  const competitorUrl = websiteUrl(competitorInput);
  if (ownUrl === competitorUrl) {
    const result = await score(competitorUrl);
    return { competitor: result, own: result, ownUnavailable: false };
  }
  const [competitor, own] = await Promise.allSettled([score(competitorUrl), score(ownUrl)]);
  if (competitor.status === 'rejected') throw competitor.reason;
  return {
    competitor: competitor.value,
    own: own.status === 'fulfilled' ? own.value : null,
    ownUnavailable: own.status === 'rejected',
  };
}
