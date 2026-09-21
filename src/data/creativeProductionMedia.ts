/**
 * TEMPORARY DEMO ASSETS
 * Replace with final BrandWorks team/work media later.
 */

export const creativeProductionMedia = {
  people: [
    {
      id: 'designer',
      title: 'Graphic Designer',
      imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=600&fit=crop',
      type: 'candid' as const,
    },
    {
      id: 'motion',
      title: 'Motion Designer',
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
      type: 'candid' as const,
    },
    {
      id: 'editor',
      title: 'Editor',
      imageUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&h=600&fit=crop',
      type: 'candid' as const,
    },
    {
      id: 'developer',
      title: 'Developer',
      imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=600&fit=crop',
      type: 'candid' as const,
    },
    {
      id: 'team-review',
      title: 'Team Reviewing Work',
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=800&fit=crop',
      type: 'candid' as const,
    },
  ],
  screens: [
    {
      id: 'studio-monitor',
      title: 'Studio Monitor Workspace',
      imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1000&h=800&fit=crop',
      type: 'workspace' as const,
    },
  ],
  graphics: [
    {
      id: 'graphic-01',
      title: 'Graphic Composition',
      imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&h=800&fit=crop',
      type: 'static' as const,
    },
  ],
  motion: [
    {
      id: 'motion-video-01',
      title: 'Motion Composition',
      videoUrl: 'https://videos.pexels.com/video-files/3571937/3571937-sd_640_360_30fps.mp4',
      type: 'video' as const,
    },
  ],
  code: [
    {
      id: 'code-gsap',
      language: 'javascript' as const,
      snippet: `gsap.to(".visual", {
  scale: 1,
  clipPath: "inset(0%)",
  ease: "power3.inOut",
  duration: 1.2,
});`,
    },
    {
      id: 'code-react',
      language: 'typescript' as const,
      snippet: `useGSAP(() => {
  gsap.timeline()
    .to(".element", { opacity: 1 })
    .to(".element", { y: -20 });
}, { scope: sectionRef });`,
    },
  ],
  output: [
    {
      id: 'output-graphic',
      title: 'Design Output',
      imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1000&h=800&fit=crop',
      type: 'image' as const,
    },
    {
      id: 'output-motion',
      title: 'Motion Output',
      videoUrl: 'https://videos.pexels.com/video-files/3571937/3571937-sd_640_360_30fps.mp4',
      type: 'video' as const,
    },
  ],
  creativeWall: {
    team: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=600&fit=crop',
    campaign: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=400&fit=crop',
    video: 'https://videos.pexels.com/video-files/3571937/3571937-sd_640_360_30fps.mp4',
    code: `gsap.timeline({
  scrollTrigger: {
    trigger: ".section",
    start: "top top"
  }
}).to(".element", { y: -100 });`,
    typography: 'DESIGN\nMOTION\nCODE',
    detail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=300&h=300&fit=crop',
  },
};
