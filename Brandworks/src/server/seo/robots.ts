export function buildRobotsTxt(publicOrigin:string):string{
  return ['User-agent: *','Allow: /','Disallow: /admin','Disallow: /api/admin','',`Sitemap: ${publicOrigin}/sitemap.xml`,''].join('\n')
}
