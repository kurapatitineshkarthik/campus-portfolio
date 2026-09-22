/**
 * =========================================================================
 * ALL UG COURSES CAMPUS PORTFOLIO - FRONTEND SCRIPT
 * =========================================================================
 * - Dual Filtering: By Course (B.Tech, BCA, B.Sc, B.Com, BBA, BA) & Year (1st-4th)
 * - Real-Time Search across Name, Course, Major, Skill, Project
 * - Dedicated Student Portfolio Modal with Google Docs Project Report Links
 * - Theme Switcher & Auth State
 */

let allStudents = [];
let activeCourseFilter = 'all';
let activeYearFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  checkAuthStatus();
  setupCourseFilters();
  setupYearFilters();
  setupSearch();
  fetchStudents();

  const currentYearEl = document.getElementById('currentYear');
  if (currentYearEl) currentYearEl.textContent = new Date().getFullYear();
});

/* ==========================================================================
   THEME SWITCHER
   ========================================================================== */
function initTheme() {
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const html = document.documentElement;

  const savedTheme = localStorage.getItem('portfolio-theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

  applyTheme(currentTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      currentTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(currentTheme);
      localStorage.setItem('portfolio-theme', currentTheme);
    });
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'portfolio-theme' && e.newValue) {
      applyTheme(e.newValue);
    }
  });

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    if (themeIcon) {
      themeIcon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
  }
}

/* ==========================================================================
   AUTH STATUS CHECK
   ========================================================================== */
function checkAuthStatus() {
  const token = localStorage.getItem('campus_token');
  const authNavBtn = document.getElementById('authNavBtn');
  const authNavText = document.getElementById('authNavText');
  const logoutWrapper = document.getElementById('logoutBtnWrapper');

  if (token && authNavBtn && authNavText) {
    authNavBtn.href = 'dashboard.html';
    authNavBtn.className = 'btn btn-secondary';
    authNavBtn.innerHTML = `<i class="fas fa-columns"></i> <span>My Dashboard</span>`;
    if (logoutWrapper) {
      logoutWrapper.innerHTML = `
        <button type="button" onclick="handleLogout()" class="btn btn-secondary" style="padding: 9px 14px; font-size: 0.88rem;" title="Log Out">
          <i class="fas fa-sign-out-alt"></i>
        </button>
      `;
    }
  } else if (logoutWrapper) {
    logoutWrapper.innerHTML = '';
  }
}

function handleLogout() {
  localStorage.removeItem('campus_token');
  localStorage.removeItem('campus_user');
  window.location.reload();
}

/* ==========================================================================
   FETCH & RENDER STUDENTS
   ========================================================================== */
async function fetchStudents() {
  const grid = document.getElementById('studentsGrid');
  grid.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 60px 0;">
      <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--accent);"></i>
      <p style="color: var(--text-secondary); margin-top: 14px;">Loading undergraduate student portfolios...</p>
    </div>
  `;

  try {
    const res = await fetch('/api/students');
    if (res.ok) {
      allStudents = await res.json();
    } else {
      throw new Error('API request failed');
    }
  } catch (err) {
    console.warn('Backend API not responding, using pre-seeded local data:', err);
    allStudents = [
      {
        id: 'student-tinesh',
        name: 'Tinesh Karthik',
        course: 'B.Tech',
        year: '3rd Year',
        branch: 'Computer Science & Engineering',
        college: 'B.Tech Engineering College',
        tagline: 'Passionate developer crafting clean web applications & leading campus tech initiatives.',
        bio: 'Hello! I am a 3rd-year B.Tech CSE student focused on building high-performance web applications, mastering data structures, and collaborating on student innovation.',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
        whatILearned: [
          'Data Structures & Algorithms (Binary Trees, Graphs) in C++',
          'Full-Stack Web Development with Node.js & Express',
          'Database Management Systems & SQL Query Optimization'
        ],
        skills: ['JavaScript', 'Node.js', 'C++', 'SQL', 'HTML5/CSS3', 'Git'],
        projects: [
          {
            title: 'All UG Students Portfolio & Project Showcase Platform',
            category: 'Web Development',
            description: 'Platform allowing undergraduate students across all degrees to showcase their learning journeys and share Google Docs project reports.',
            googleDocsUrl: 'https://docs.google.com',
            githubUrl: 'https://github.com',
            liveUrl: 'https://tinesh.in'
          }
        ]
      }
    ];
  }

  renderStudents();
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem('campus_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function isUserPortfolio(student, currentUser) {
  if (!student || !currentUser) return false;
  if (currentUser.id && (student.id === currentUser.id || student.username === currentUser.id)) return true;
  if (currentUser.username && (student.username === currentUser.username || student.id === currentUser.username)) return true;
  if (currentUser.email && student.email && student.email.toLowerCase() === currentUser.email.toLowerCase()) return true;
  if (currentUser.name && student.name && student.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) return true;
  return false;
}

function renderStudents() {
  const grid = document.getElementById('studentsGrid');
  const countEl = document.getElementById('studentsCount');
  const filterAddWrapper = document.getElementById('filterAddPortfolioWrapper');

  const filtered = allStudents.filter(s => {
    const sCourse = (s.course || 'B.Tech').toLowerCase();
    const sYear = (s.year || '').toLowerCase();

    const matchCourse = activeCourseFilter === 'all' || sCourse === activeCourseFilter.toLowerCase();
    const matchYear = activeYearFilter === 'all' || sYear === activeYearFilter.toLowerCase();

    return matchCourse && matchYear;
  });

  const courseLabel = activeCourseFilter === 'all' ? 'All Degrees' : activeCourseFilter;
  const yearLabel = activeYearFilter === 'all' ? 'All Years' : activeYearFilter;

  if (countEl) {
    countEl.textContent = `Showing ${filtered.length} student${filtered.length === 1 ? '' : 's'} (${courseLabel} \u2022 ${yearLabel})`;
  }

  const currentUser = getCurrentUser();
  const token = localStorage.getItem('campus_token');
  const isLoggedIn = !!(token && currentUser);

  // Check if any portfolio in the filtered list belongs to the current user
  const userPortfolioPresent = isLoggedIn && filtered.some(s => isUserPortfolio(s, currentUser));
  // If a portfolio belonging to the user is present in this filter, do NOT show the option!
  // Otherwise, show the option across all filters!
  const showAddOption = !userPortfolioPresent;

  const addPortfolioUrl = isLoggedIn ? 'dashboard.html' : 'auth.html';
  const addPortfolioBtnText = isLoggedIn ? 'Add to My Portfolio' : 'Add Your Portfolio';

  // Update top bar Add Portfolio button
  if (filterAddWrapper) {
    if (showAddOption) {
      const topBtnLabel = courseLabel !== 'All Degrees' ? `+ Add ${courseLabel} Portfolio` : '+ Add Your Portfolio';
      filterAddWrapper.innerHTML = `
        <a href="${addPortfolioUrl}" class="btn btn-primary" style="padding: 7px 16px; font-size: 0.84rem; display: inline-flex; align-items: center; gap: 8px;">
          <i class="fas fa-plus-circle"></i>
          <span>${topBtnLabel}</span>
        </a>
      `;
    } else {
      filterAddWrapper.innerHTML = '';
    }
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;" class="card glass-card">
        <i class="fas fa-user-graduate" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 16px;"></i>
        <h3 style="font-size: 1.3rem; margin-bottom: 8px;">No students found for this filter</h3>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">Be the first student to add your portfolio in this category!</p>
        ${showAddOption ? `
          <a href="${addPortfolioUrl}" class="btn btn-primary">
            <i class="fas fa-plus-circle"></i> + Add My Portfolio
          </a>
        ` : ''}
      </div>
    `;
    return;
  }

  const studentCardsHtml = filtered.map(s => {
    const yearColor = getYearColor(s.year);
    const learnedPreview = (s.whatILearned && s.whatILearned.length > 0)
      ? s.whatILearned.slice(0, 2)
      : ['Coursework fundamentals'];

    return `
      <article class="project-card card glass-card" style="padding: 24px; display: flex; flex-direction: column;">
        
        <!-- Student Header -->
        <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 18px;">
          <div style="width: 60px; height: 60px; border-radius: 50%; overflow: hidden; border: 2px solid var(--accent); flex-shrink: 0; box-shadow: 0 0 12px var(--accent-glow);">
            <img src="${s.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(s.name)}" alt="${s.name}" style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;">
          </div>
          <div>
            <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 4px;">${s.name}</h3>
            <span style="font-size: 0.78rem; font-weight: 700; padding: 4px 10px; border-radius: var(--radius-full); background: ${yearColor.bg}; color: ${yearColor.text}; border: 1px solid ${yearColor.border};">
              ${s.course || 'UG'} &bull; ${s.year || '1st Year'} ${s.branch ? '(' + s.branch + ')' : ''}
            </span>
          </div>
        </div>

        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 16px; line-height: 1.5; flex-grow: 1;">
          ${s.tagline || ((s.course || 'UG') + ' ' + (s.year || '') + ' student at ' + (s.college || 'College'))}
        </p>

        <!-- What I Learned Highlights -->
        <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 16px;">
          <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--accent); letter-spacing: 0.5px; margin-bottom: 6px;">
            <i class="fas fa-book-open"></i> What I Learned:
          </div>
          <ul style="list-style: none; padding-left: 0; margin: 0; font-size: 0.85rem; color: var(--text-secondary);">
            ${learnedPreview.map(l => `<li style="margin-bottom: 4px; display: flex; align-items: baseline; gap: 6px;"><span style="color: var(--accent);">&bull;</span> <span>${l}</span></li>`).join('')}
          </ul>
        </div>

        <!-- Skills Tags -->
        <div class="project-tags" style="margin-bottom: 20px;">
          ${(s.skills || []).slice(0, 4).map(skill => `<span class="project-tag">${skill}</span>`).join('')}
          ${(s.skills || []).length > 4 ? `<span class="project-tag">+${s.skills.length - 4}</span>` : ''}
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 8px; margin-top: auto;">
          <button type="button" onclick="openStudentModal('${s.username || s.id || ''}')" class="btn btn-primary" style="flex: 1; font-size: 0.88rem; text-align: center; justify-content: center; cursor: pointer;">
            <span>View Full Portfolio</span>
            <i class="fas fa-arrow-right"></i>
          </button>
          <a href="/p/${s.username || s.id || ''}" target="_blank" class="btn btn-secondary" style="padding: 0 14px;" title="Open in dedicated page">
            <i class="fas fa-external-link-alt"></i>
          </a>
          <button type="button" onclick="copyStudentUrl('${s.username || s.id || ''}', this)" class="btn btn-secondary" style="padding: 0 14px;" title="Copy direct portfolio link">
            <i class="fas fa-share-nodes"></i>
          </button>
        </div>

      </article>
    `;
  }).join('');

  // If showAddOption is true, append the "Add Your Portfolio" card at the end of the grid!
  let addPortfolioCardHtml = '';
  if (showAddOption) {
    const degreeContext = courseLabel !== 'All Degrees' ? courseLabel : 'Undergraduate';
    const yearContext = yearLabel !== 'All Years' ? ` (${yearLabel})` : '';

    addPortfolioCardHtml = `
      <article class="project-card card glass-card add-portfolio-card">
        <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--accent-glow); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 16px; border: 1px solid var(--accent);">
          <i class="fas fa-plus"></i>
        </div>
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px;">Add Your Portfolio</h3>
        <p style="color: var(--text-secondary); font-size: 0.88rem; margin-bottom: 22px; line-height: 1.5; max-width: 260px;">
          Are you a <strong>${degreeContext}${yearContext}</strong> student? Showcase your projects, skills, and Google Docs reports!
        </p>
        <a href="${addPortfolioUrl}" class="btn btn-primary" style="padding: 10px 22px; font-size: 0.9rem;">
          <i class="fas fa-plus-circle"></i> <span>${addPortfolioBtnText}</span>
        </a>
      </article>
    `;
  }

  grid.innerHTML = studentCardsHtml + addPortfolioCardHtml;
}

function copyStudentUrl(slug, btnEl) {
  const url = `${window.location.origin}/p/${slug}`;
  navigator.clipboard.writeText(url).then(() => {
    const orig = btnEl.innerHTML;
    btnEl.innerHTML = `<i class="fas fa-check" style="color: #10b981;"></i>`;
    setTimeout(() => { btnEl.innerHTML = orig; }, 2000);
  });
}

function getYearColor(year) {
  switch (year) {
    case '1st Year':
      return { bg: 'rgba(48, 209, 88, 0.12)', text: '#30d158', border: 'rgba(48, 209, 88, 0.25)' };
    case '2nd Year':
      return { bg: 'rgba(255, 159, 10, 0.12)', text: '#ff9f0a', border: 'rgba(255, 159, 10, 0.25)' };
    case '3rd Year':
      return { bg: 'rgba(10, 132, 255, 0.12)', text: '#0a84ff', border: 'rgba(10, 132, 255, 0.25)' };
    case '4th Year':
      return { bg: 'rgba(255, 255, 255, 0.08)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.2)' };
    default:
      return { bg: 'rgba(255, 255, 255, 0.08)', text: '#ffffff', border: 'var(--border-color)' };
  }
}

/* ==========================================================================
   FILTER TABS (COURSE & YEAR)
   ========================================================================== */
function setupCourseFilters() {
  const tabs = document.querySelectorAll('#courseFilterTabs .filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeCourseFilter = tab.getAttribute('data-course');
      renderStudents();
    });
  });
}

function setupYearFilters() {
  const tabs = document.querySelectorAll('#yearFilterTabs .filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeYearFilter = tab.getAttribute('data-year');
      renderStudents();
    });
  });
}

/* ==========================================================================
   REAL-TIME SEARCH
   ========================================================================== */
function setupSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;

  input.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();

    if (!q) {
      renderStudents();
      return;
    }

    const filtered = allStudents.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.course || '').toLowerCase().includes(q) ||
      (s.branch || '').toLowerCase().includes(q) ||
      (s.year || '').toLowerCase().includes(q) ||
      (s.skills || []).some(skill => skill.toLowerCase().includes(q)) ||
      (s.projects || []).some(p => (p.title || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q))
    );

    const grid = document.getElementById('studentsGrid');
    const countEl = document.getElementById('studentsCount');

    if (countEl) countEl.textContent = `Found ${filtered.length} matching students for "${q}"`;

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;" class="card glass-card">
          <i class="fas fa-search" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 14px;"></i>
          <h3 style="font-size: 1.2rem; margin-bottom: 6px;">No students match "${q}"</h3>
          <p style="color: var(--text-secondary);">Try searching by degree (BCA, B.Sc, B.Tech, B.Com), skills, or names.</p>
        </div>
      `;
      return;
    }

    const saved = allStudents;
    allStudents = filtered;
    renderStudents();
    allStudents = saved;
  });
}

/* ==========================================================================
   STUDENT DETAIL MODAL WITH GOOGLE DOCS BUTTONS
   ========================================================================== */
function openStudentModal(studentIdentifier) {
  let student = null;
  if (studentIdentifier && studentIdentifier !== 'undefined') {
    student = allStudents.find(s => 
      (s.username && s.username === studentIdentifier) || 
      (s.id && s.id === studentIdentifier) || 
      (s.name && s.name.toLowerCase() === String(studentIdentifier).toLowerCase())
    );
  }
  if (!student && allStudents.length > 0) {
    student = allStudents[0];
  }
  if (!student) {
    console.warn('Student not found for modal:', studentIdentifier);
    return;
  }

  const modal = document.getElementById('studentDetailModal');
  const body = document.getElementById('studentDetailBody');
  if (!modal || !body) return;
  const yearColor = getYearColor(student.year);

  body.innerHTML = `
    <!-- Modal Student Header -->
    <div style="display: flex; gap: 24px; align-items: center; flex-wrap: wrap; margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid var(--border-color);">
      <div style="width: 90px; height: 90px; border-radius: 50%; overflow: hidden; border: 3px solid var(--accent); box-shadow: 0 0 20px var(--accent-glow);">
        <img src="${student.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(student.name)}" alt="${student.name}" style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;">
      </div>
      <div>
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px;">
          <h2 style="font-size: 1.8rem; font-weight: 800; margin: 0;">${student.name}</h2>
          <span style="font-size: 0.8rem; font-weight: 700; padding: 4px 12px; border-radius: var(--radius-full); background: ${yearColor.bg}; color: ${yearColor.text}; border: 1px solid ${yearColor.border};">
            ${student.course || 'UG'} &bull; ${student.year || '1st Year'} ${student.branch ? '(' + student.branch + ')' : ''}
          </span>
        </div>
        <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 10px;">
          ${student.tagline || ''} &bull; <em>${student.college || 'College'}</em>
        </p>

        <!-- Direct Link & Social Links -->
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <a href="/p/${student.username || student.id}" target="_blank" class="btn btn-primary" style="padding: 6px 14px; font-size: 0.85rem;">
            <i class="fas fa-external-link-alt"></i> Dedicated Portfolio URL
          </a>
          <button onclick="copyStudentUrl('${student.username || student.id}', this)" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.85rem;" title="Copy shareable link">
            <i class="fas fa-share-nodes"></i>
          </button>
          ${student.socials && student.socials.github ? `<a href="${student.socials.github}" target="_blank" rel="noopener noreferrer" class="social-link" style="width: 36px; height: 36px; font-size: 1rem;"><i class="fab fa-github"></i></a>` : ''}
          ${student.socials && student.socials.linkedin ? `<a href="${student.socials.linkedin}" target="_blank" rel="noopener noreferrer" class="social-link" style="width: 36px; height: 36px; font-size: 1rem;"><i class="fab fa-linkedin-in"></i></a>` : ''}
          ${student.email ? `<a href="mailto:${student.email}" class="social-link" style="width: 36px; height: 36px; font-size: 1rem;"><i class="fas fa-envelope"></i></a>` : ''}
        </div>
      </div>
    </div>

    <!-- About Me / Bio -->
    <div style="margin-bottom: 28px;">
      <h3 style="font-size: 1.15rem; margin-bottom: 8px; color: var(--text-primary);"><i class="fas fa-user logo-accent"></i> About Me</h3>
      <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6;">
        ${student.bio || 'Undergraduate student.'}
      </p>
    </div>

    <!-- WHAT I LEARNED SECTION -->
    <div style="margin-bottom: 32px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 20px;">
      <h3 style="font-size: 1.15rem; margin-bottom: 12px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-book-open logo-accent"></i> What I Learned (${student.course || 'UG'} &bull; ${student.year || '1st Year'})
      </h3>
      <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
        ${(student.whatILearned && student.whatILearned.length > 0)
          ? student.whatILearned.map(l => `
            <li style="display: flex; align-items: baseline; gap: 10px; color: var(--text-secondary); font-size: 0.95rem;">
              <i class="fas fa-check-circle" style="color: var(--accent); font-size: 0.85rem;"></i>
              <span>${l}</span>
            </li>
          `).join('')
          : '<li style="color: var(--text-muted); font-size: 0.9rem;">No learning points documented yet.</li>'
        }
      </ul>
    </div>

    <!-- PROJECTS WITH GOOGLE DOCS LINKS -->
    <div style="margin-bottom: 28px;">
      <h3 style="font-size: 1.25rem; margin-bottom: 16px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-folder-open logo-accent"></i> Projects & Google Docs Reports
      </h3>

      <div style="display: flex; flex-direction: column; gap: 18px;">
        ${(student.projects && student.projects.length > 0)
          ? student.projects.map(p => `
            <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <h4 style="font-size: 1.15rem; font-weight: 700; margin: 0;">${p.title}</h4>
                <span style="font-size: 0.75rem; font-weight: 600; padding: 3px 10px; border-radius: var(--radius-full); background: var(--badge-bg); color: var(--badge-text);">
                  ${p.category || 'Project'}
                </span>
              </div>
              <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 16px; line-height: 1.5;">
                ${p.description || ''}
              </p>

              <!-- Action Links (Google Docs, GitHub, Live Demo) -->
              <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
                ${p.googleDocsUrl ? `
                  <a href="${p.googleDocsUrl}" target="_blank" rel="noopener noreferrer" class="btn docs-btn" style="padding: 7px 16px; font-size: 0.85rem;">
                    <i class="fas fa-file-alt"></i>
                    <span>Project Report (Google Docs)</span>
                    <i class="fas fa-external-link-alt" style="font-size: 0.75rem;"></i>
                  </a>
                ` : ''}

                ${p.githubUrl ? `
                  <a href="${p.githubUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="padding: 7px 16px; font-size: 0.85rem;">
                    <i class="fab fa-github"></i>
                    <span>GitHub</span>
                  </a>
                ` : ''}

                ${p.liveUrl ? `
                  <a href="${p.liveUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost" style="padding: 7px 16px; font-size: 0.85rem;">
                    <i class="fas fa-globe"></i>
                    <span>Live Demo</span>
                  </a>
                ` : ''}
              </div>
            </div>
          `).join('')
          : '<p style="color: var(--text-muted); font-size: 0.9rem; font-style: italic;">No projects added yet.</p>'
        }
      </div>
    </div>

    <!-- Skills -->
    <div>
      <h3 style="font-size: 1.15rem; margin-bottom: 12px; color: var(--text-primary);"><i class="fas fa-code logo-accent"></i> Skills</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        ${(student.skills || []).map(skill => `<span class="project-tag" style="font-size: 0.85rem; padding: 6px 14px;">${skill}</span>`).join('')}
      </div>
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeStudentModal() {
  const modal = document.getElementById('studentDetailModal');
  modal.classList.remove('active');
  document.body.style.overflow = 'auto';
}

function handleModalBackdropClick(e) {
  if (e.target.id === 'studentDetailModal') {
    closeStudentModal();
  }
}
