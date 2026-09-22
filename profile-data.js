/**
 * =========================================================================
 * PERSONAL PORTFOLIO DATA CONFIGURATION
 * =========================================================================
 * Welcome to your portfolio configuration file!
 * Simply edit the values below to update your website with your personal info,
 * skills, projects, and contact details. No need to touch any HTML!
 */

const portfolioData = {
  // -----------------------------------------------------------------------
  // 1. PERSONAL INFORMATION & HERO SECTION
  // -----------------------------------------------------------------------
  personal: {
    fullName: "Your Name",
    titlePrefix: "I am a",
    // Roles displayed in the smooth animated typing effect:
    roles: [
      "JavaScript Developer",
      "Full Stack Engineer",
      "Problem Solver",
      "Open Source Contributor"
    ],
    tagline: "Crafting fast, clean, and interactive digital experiences on the web.",
    bioParagraphs: [
      "Hello! I am a passionate developer who loves transforming ideas into responsive, elegant, and user-friendly web applications.",
      "With a strong foundation in modern JavaScript and web technologies, I focus on writing clean, maintainable code and delivering smooth user experiences.",
      "When I'm not coding, you can find me exploring new tech, contributing to developer communities, or learning about UI/UX design."
    ],
    location: "San Francisco, CA (or Remote)",
    email: "your.email@example.com",
    availableForHire: true, // Set to true to show "Available for opportunities" badge
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80", // Replace with your image link or local image path
    resumeUrl: "#", // Add link to your PDF resume (e.g., "resume.pdf" or Google Drive link)
  },

  // -----------------------------------------------------------------------
  // 2. SOCIAL & PROFESSIONAL PROFILES
  // -----------------------------------------------------------------------
  socials: [
    {
      name: "GitHub",
      url: "https://github.com",
      icon: "fab fa-github",
    },
    {
      name: "LinkedIn",
      url: "https://linkedin.com",
      icon: "fab fa-linkedin-in",
    },
    {
      name: "X / Twitter",
      url: "https://twitter.com",
      icon: "fab fa-x-twitter",
    },
    {
      name: "Email",
      url: "mailto:your.email@example.com",
      icon: "fas fa-envelope",
    }
  ],

  // -----------------------------------------------------------------------
  // 3. KEY HIGHLIGHT STATS
  // -----------------------------------------------------------------------
  stats: [
    { number: "2+", label: "Years Experience" },
    { number: "20+", label: "Projects Completed" },
    { number: "10+", label: "Technologies Mastered" },
    { number: "100%", label: "Dedication & Passion" }
  ],

  // -----------------------------------------------------------------------
  // 4. SKILLS & TECHNOLOGIES
  // -----------------------------------------------------------------------
  skillCategories: [
    {
      category: "Frontend Development",
      skills: [
        { name: "JavaScript (ES6+)", icon: "fab fa-js", level: "Advanced" },
        { name: "HTML5 & Semantic Web", icon: "fab fa-html5", level: "Expert" },
        { name: "CSS3 & Modern Layouts", icon: "fab fa-css3-alt", level: "Advanced" },
        { name: "React.js", icon: "fab fa-react", level: "Intermediate" },
        { name: "Responsive UI/UX", icon: "fas fa-mobile-screen-button", level: "Advanced" }
      ]
    },
    {
      category: "Backend & APIs",
      skills: [
        { name: "Node.js", icon: "fab fa-node-js", level: "Intermediate" },
        { name: "Express.js", icon: "fas fa-server", level: "Intermediate" },
        { name: "RESTful APIs", icon: "fas fa-network-wired", level: "Advanced" },
        { name: "JSON & LocalStorage", icon: "fas fa-database", level: "Expert" }
      ]
    },
    {
      category: "Tools, Workflow & DevOps",
      skills: [
        { name: "Git & GitHub", icon: "fab fa-git-alt", level: "Advanced" },
        { name: "VS Code", icon: "fas fa-code", level: "Expert" },
        { name: "Chrome DevTools", icon: "fab fa-chrome", level: "Advanced" },
        { name: "Figma", icon: "fab fa-figma", level: "Intermediate" }
      ]
    }
  ],

  // -----------------------------------------------------------------------
  // 5. FEATURED PROJECTS
  // -----------------------------------------------------------------------
  projects: [
    {
      id: 1,
      title: "TaskFlow - Task & Productivity Manager",
      category: "web-apps", // Used for filtering: 'all', 'web-apps', 'javascript', 'ui-ux'
      description: "A clean, drag-and-drop productivity dashboard with local storage persistence, priority tags, and deadline tracking.",
      image: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=700&auto=format&fit=crop&q=80",
      tags: ["JavaScript", "HTML5", "CSS Grid", "LocalStorage"],
      githubUrl: "https://github.com",
      liveUrl: "https://example.com",
      featured: true
    },
    {
      id: 2,
      title: "Interactive Weather Insights Dashboard",
      category: "web-apps",
      description: "Real-time weather analytics application featuring geolocation, 7-day forecast cards, animated weather icons, and hourly trends.",
      image: "https://images.unsplash.com/photo-1592210454359-9043f067919b?w=700&auto=format&fit=crop&q=80",
      tags: ["JavaScript", "Async/Await", "REST API", "CSS3"],
      githubUrl: "https://github.com",
      liveUrl: "https://example.com",
      featured: true
    },
    {
      id: 3,
      title: "Modern E-Commerce Storefront UI",
      category: "ui-ux",
      description: "A responsive product catalog with dynamic cart management, instant search filter, dark mode, and smooth checkout animations.",
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop&q=80",
      tags: ["JavaScript", "CSS Flexbox", "State Management"],
      githubUrl: "https://github.com",
      liveUrl: "https://example.com",
      featured: true
    },
    {
      id: 4,
      title: "Audio Visualizer & Music Player",
      category: "javascript",
      description: "Web Audio API powered custom music player with real-time waveform visualization, playlist management, and audio effects.",
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=700&auto=format&fit=crop&q=80",
      tags: ["JavaScript", "Web Audio API", "Canvas API"],
      githubUrl: "https://github.com",
      liveUrl: "https://example.com",
      featured: false
    }
  ],

  // -----------------------------------------------------------------------
  // 6. EXPERIENCE & EDUCATION TIMELINE
  // -----------------------------------------------------------------------
  timeline: [
    {
      type: "work",
      title: "Frontend Developer",
      organization: "Tech Innovators Lab",
      location: "San Francisco, CA",
      period: "2023 - Present",
      description: "Architected responsive interfaces, optimized web vitals for a 40% performance gain, and collaborated on interactive design systems."
    },
    {
      type: "work",
      title: "Junior Web Developer",
      organization: "Digital Creative Agency",
      location: "Remote",
      period: "2022 - 2023",
      description: "Developed client websites using modern JavaScript, HTML5, and CSS3. Translated Figma wireframes into pixel-perfect web pages."
    },
    {
      type: "education",
      title: "B.S. in Computer Science",
      organization: "University of Technology",
      location: "California",
      period: "2018 - 2022",
      description: "Focused on Software Engineering, Data Structures & Algorithms, and Human-Computer Interaction."
    }
  ]
};
