/**
 * TEMPORARY DEMO ASSETS — CREATIVE STUDIO AESTHETIC
 * Replace with final BrandWorks team/work media later.
 * Uses editorial and creative workspace photography.
 */

export const creativeProductionMedia = {
  // PEOPLE SCENE: Three images at different scales (large, medium, small)
  people: [
    {
      id: 'designer-primary',
      title: 'Graphic Designer at Work',
      // High-res photo of designer working at desk with monitor
      imageUrl:
        'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=900&h=1100&fit=crop',
      type: 'candid' as const,
    },
    {
      id: 'team-collaboration',
      title: 'Team Collaboration',
      // Medium shot of team reviewing work together
      imageUrl:
        'https://images.unsplash.com/photo-1552664730-d307ca884978?w=700&h=850&fit=crop',
      type: 'candid' as const,
    },
    {
      id: 'motion-specialist',
      title: 'Motion Specialist',
      // Smaller supporting image of someone working on motion
      imageUrl:
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=720&fit=crop',
      type: 'candid' as const,
    },
    {
      id: 'developer-coding',
      title: 'Developer at Desk',
      imageUrl:
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=600&fit=crop',
      type: 'candid' as const,
    },
    {
      id: 'editor-workspace',
      title: 'Video Editor',
      imageUrl:
        'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&h=600&fit=crop',
      type: 'candid' as const,
    },
  ],

  // PROCESS/MONITOR: Studio workspace with screens and equipment
  screens: [
    {
      id: 'studio-workspace-main',
      title: 'Studio Monitor Workspace',
      // Creative studio desk with multiple monitors and equipment
      imageUrl:
        'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=900&fit=crop',
      type: 'workspace' as const,
    },
    {
      id: 'studio-workspace-alt',
      title: 'Creative Workstation',
      imageUrl:
        'https://images.unsplash.com/photo-1522869635100-ce306c19cf82?w=1200&h=900&fit=crop',
      type: 'workspace' as const,
    },
  ],

  // GRAPHICS: Static design compositions
  graphics: [
    {
      id: 'graphic-design-01',
      title: 'Graphic Composition',
      // Bold, modern graphic design composition
      imageUrl:
        'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1400&h=1000&fit=crop',
      type: 'static' as const,
    },
    {
      id: 'graphic-design-02',
      title: 'Design System',
      imageUrl:
        'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1400&h=1000&fit=crop',
      type: 'static' as const,
    },
  ],

  // MOTION: Video/moving composition
  motion: [
    {
      id: 'motion-video-primary',
      title: 'Motion Composition',
      // Creative motion/animation video
      videoUrl:
        'https://videos.pexels.com/video-files/3571937/3571937-sd_640_360_30fps.mp4',
      type: 'video' as const,
    },
  ],

  // CODE: Development snippets shown in CodeScene
  code: [
    {
      id: 'code-gsap-animation',
      language: 'javascript' as const,
      snippet: `gsap.timeline({
  scrollTrigger: {
    trigger: ".section",
    start: "top top",
    scrub: 1.4,
  }
}).to(".scene", {
  scale: 1,
  opacity: 1,
  duration: 14,
  ease: "expo.inOut"
});`,
    },
    {
      id: 'code-react-hook',
      language: 'typescript' as const,
      snippet: `useGSAP(() => {
  const tl = gsap.timeline({
    scrollTrigger: { trigger: section }
  });

  tl.to(".element", {
    yPercent: -100,
    blur: "8px"
  })
}, { scope: sectionRef });`,
    },
  ],

  // OUTPUT: Results of design and motion work
  output: [
    {
      id: 'output-design-visual',
      title: 'Design Output',
      // Showcase of final design output
      imageUrl:
        'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&h=900&fit=crop',
      type: 'image' as const,
    },
    {
      id: 'output-motion-result',
      title: 'Motion Execution',
      // Motion result video
      videoUrl:
        'https://videos.pexels.com/video-files/3571937/3571937-sd_640_360_30fps.mp4',
      type: 'video' as const,
    },
  ],

  // CREATIVE WALL: Synthesis of all disciplines shown together
  creativeWall: {
    // Team image (top-left area of creative wall)
    team: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=700&fit=crop',

    // Campaign/graphic design (center-left, larger area)
    campaign:
      'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=600&fit=crop',

    // Video/motion element (right side)
    video:
      'https://videos.pexels.com/video-files/3571937/3571937-sd_640_360_30fps.mp4',

    // Code snippet displayed in wall composition
    code: `const createDesignSystem = () => {
  return {
    design: { scale, color, type },
    motion: { duration, easing },
    code: { React, GSAP, TypeScript }
  }
}`,

    // Main typography overlay
    typography: 'DESIGN.\nMOTION.\nCODE.',

    // Detail image (bottom-right corner)
    detail:
      'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=400&fit=crop',
  },
};
