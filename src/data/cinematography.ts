import { mediaUrl } from '../lib/media'

export type CinematographyProject = {
  id: string
  title: string
  line: string
  /** Max ~120 characters; sits under the active film, clamped to two lines. */
  description: string
  src: string
  href: string
  /** Optional still shown before (or instead of) the first frame; preloaded for adjacent films. */
  poster?: string
}

const DEFAULT_HREF = '/services/videography'

/**
 * The homepage cinematography films, copied from VIDEO_PROJECTS in
 * components/Videography.tsx (the old pinned section).
 *
 * Films 03 and 04 pointed at /video/*.mp4, but public/video only holds
 * ForWebsite.mp4, so those paths 404. They are served from the same R2
 * Photography folder as film 01/02 instead.
 *
 * PLACEHOLDER: every `description` below was written from the film's
 * `line` and should be replaced with real copy.
 */
export const CINEMATOGRAPHY_PROJECTS: CinematographyProject[] = [
  {
    id: '01',
    title: 'Brand Film',
    line: 'Ideas, given movement.',
    description: 'Ideas, given movement. A brand film that shows who you are and why it matters, in under two minutes.', // PLACEHOLDER
    src: mediaUrl('ForWebsite_Full.mp4'),
    href: DEFAULT_HREF,
  },
  {
    id: '02',
    title: 'Campaign Film',
    line: 'Rhythm becomes direction.',
    description: 'Rhythm becomes direction. A campaign film cut to carry one message across every channel.', // PLACEHOLDER
    src: mediaUrl('ForWebsite_Full.mp4'),
    href: DEFAULT_HREF,
  },
  {
    id: '03',
    title: 'Visual Story',
    line: 'Every frame carries intent.',
    description: 'Every frame carries intent. A short visual story built shot by shot around a single idea.', // PLACEHOLDER
    src: mediaUrl('Idea - Cinematic Video _ Shot on Canon EOS250D.mp4'),
    href: DEFAULT_HREF,
  },
  {
    id: '04',
    title: 'Creative Film',
    line: 'The story keeps moving.',
    description: 'The story keeps moving. A creative film with pace, music and edit working as one.', // PLACEHOLDER
    src: mediaUrl('CENTRAL CEE - BOOGA (MUSIC VIDEO).mp4'),
    href: DEFAULT_HREF,
  },
]
