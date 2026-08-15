/**
 * Learning Platform - Main Application Script
 * Handles authentication, routing, UI interactions, and API calls.
 * All data is fetched from the live backend (MySQL database).
 */

// =============================================
// THEME MANAGEMENT (Dark/Light Mode)
// =============================================
(function initTheme() {
    const savedTheme = localStorage.getItem('app-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (document.body) {
        document.body.classList.toggle('light-mode', savedTheme === 'light');
    }
})();

document.addEventListener('DOMContentLoaded', () => {

    // =============================================
    // API CONFIGURATION & CREDENTIALS ROUTER
    // =============================================
    const API_BASE = window.location.port && window.location.port !== '8080' 
        ? `${window.location.protocol}//${window.location.hostname}:8080` 
        : '';

    async function apiFetch(url, options = {}) {
        options.credentials = 'include';
        if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
            options.headers = options.headers || {};
            if (!options.headers['Content-Type']) {
                options.headers['Content-Type'] = 'application/json';
            }
            options.body = JSON.stringify(options.body);
        }
        return fetch(API_BASE + url, options);
    }

    const pathParts = window.location.pathname.split('/');
    const pageName = pathParts[pathParts.length - 1] || 'index.html';
    const isLoginPage = pageName === 'login.html' || window.location.pathname === '/' || window.location.pathname.endsWith('/');
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    const userRole = sessionStorage.getItem('userRole');

    // Route Protection: redirect unauthenticated users to login
    if (!isAuthenticated && !isLoginPage) {
        window.location.href = 'login.html';
        return;
    }

    // Redirect already-authenticated users away from login page
    if (isAuthenticated && isLoginPage) {
        window.location.href = userRole === 'ROLE_ADMIN' ? 'index.html' : 'student.html';
        return;
    }

    // Role-based page protection
    if (isAuthenticated && !isLoginPage) {
        const adminPages = ['index.html', 'courses.html', 'students.html', 'settings.html', 'analytics.html', 'admin-tests.html'];
        const isAdminPage = adminPages.includes(pageName);
        if (isAdminPage && userRole !== 'ROLE_ADMIN') {
            window.location.href = 'student.html';
            return;
        }
        if (pageName === 'student.html' && userRole === 'ROLE_ADMIN') {
            window.location.href = 'index.html';
            return;
        }
    }

    // =============================================
    // 2. LOGIN / SIGNUP PAGE LOGIC
    // =============================================
    if (isLoginPage) {
        const loginForm = document.getElementById('admin-login-form');
        const signupForm = document.getElementById('signup-form');
        const loginError = document.getElementById('login-error');
        const signupSuccess = document.getElementById('signup-success');
        const btnLogin = document.getElementById('btn-show-login');
        const btnSignup = document.getElementById('btn-show-signup');

        if (btnLogin && btnSignup) {
            btnLogin.addEventListener('click', () => {
                btnLogin.classList.add('active');
                btnSignup.classList.remove('active');
                loginForm.style.display = 'block';
                signupForm.style.display = 'none';
                loginError.style.display = 'none';
            });
            btnSignup.addEventListener('click', () => {
                btnSignup.classList.add('active');
                btnLogin.classList.remove('active');
                signupForm.style.display = 'block';
                loginForm.style.display = 'none';
                signupSuccess.style.display = 'none';
            });
        }

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                loginError.style.display = 'none';
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                const email = document.getElementById('email').value.trim();
                const password = document.getElementById('password').value;

                submitBtn.textContent = 'Signing in...';
                submitBtn.disabled = true;

                try {
                    const response = await apiFetch('/api/auth/login', {
                        method: 'POST',
                        body: { email, password }
                    });

                    const data = await response.json();

                    if (response.ok) {
                        sessionStorage.setItem('isAuthenticated', 'true');
                        sessionStorage.setItem('userRole', data.role);
                        sessionStorage.setItem('userName', data.name);
                        sessionStorage.setItem('userEmail', data.email);
                        sessionStorage.setItem('userId', data.id);
                        window.location.href = data.role === 'ROLE_ADMIN' ? 'index.html' : 'student.html';
                    } else {
                        loginError.textContent = data.message || 'Invalid email or password.';
                        loginError.style.display = 'block';
                        submitBtn.textContent = 'Sign In';
                        submitBtn.disabled = false;
                    }
                } catch (err) {
                    console.error('Login failed:', err);
                    loginError.textContent = 'Cannot connect to server. Please ensure the backend is running.';
                    loginError.style.display = 'block';
                    submitBtn.textContent = 'Sign In';
                    submitBtn.disabled = false;
                }
            });
        }

        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = signupForm.querySelector('button[type="submit"]');
                const name = document.getElementById('signup-name').value.trim();
                const email = document.getElementById('signup-email').value.trim();
                const password = document.getElementById('signup-password').value;

                submitBtn.textContent = 'Creating Account...';
                submitBtn.disabled = true;

                try {
                    const response = await apiFetch('/api/auth/signup', {
                        method: 'POST',
                        body: { name, email, password }
                    });

                    const data = await response.json();

                    if (response.ok) {
                        signupForm.reset();
                        signupSuccess.style.display = 'block';
                        setTimeout(() => btnLogin.click(), 1500);
                    } else {
                        alert(data.message || 'Signup failed. Please try again.');
                    }
                } catch (err) {
                    console.error('Signup failed:', err);
                    alert('Cannot connect to server. Please ensure the backend is running.');
                } finally {
                    submitBtn.textContent = 'Sign Up';
                    submitBtn.disabled = false;
                }
            });
        }
        return; // Stop here for login page
    }

    // =============================================
    // 3. COMMON UI - Header, Sidebar, Profile
    // =============================================

    // Apply theme class to body
    applyTheme(localStorage.getItem('app-theme') || 'dark');

    // Populate user info from sessionStorage or database
    const userName = sessionStorage.getItem('userName') || 'User';
    const userEmail = sessionStorage.getItem('userEmail') || '';
    const cachedProfilePic = sessionStorage.getItem('profilePicUrl');

    const profileH4 = document.querySelector('.profile-info h4');
    const studentNameEl = document.getElementById('student-name');
    if (profileH4) profileH4.textContent = userName;
    if (studentNameEl) studentNameEl.textContent = userName;

    function updateHeaderAvatars(picUrl) {
        const defaultBg = userRole === 'ROLE_ADMIN' ? '3b82f6' : '10b981';
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=${defaultBg}&color=fff`;
        const avatarSrc = picUrl || defaultAvatar;

        const avatarImgs = document.querySelectorAll('.profile-avatar');
        avatarImgs.forEach(img => {
            img.src = avatarSrc;
            img.alt = userName;
        });

        const studentAvatar = document.getElementById('student-avatar');
        if (studentAvatar) {
            studentAvatar.src = avatarSrc;
        }
    }

    // Set initial avatar (using cached base64 if present)
    updateHeaderAvatars(cachedProfilePic);

    // Fetch latest user details on load to ensure sync
    if (isAuthenticated && !isLoginPage) {
        apiFetch('/api/auth/me')
            .then(res => {
                if (res.ok) return res.json();
                throw new Error();
            })
            .then(me => {
                sessionStorage.setItem('userName', me.name);
                sessionStorage.setItem('profilePicUrl', me.profilePicUrl || '');
                if (profileH4) profileH4.textContent = me.name;
                if (studentNameEl) studentNameEl.textContent = me.name;
                updateHeaderAvatars(me.profilePicUrl);
            })
            .catch(err => console.warn('Could not sync user details on load'));
    }


    // Logout handler
    const profileMenu = document.querySelector('.profile-menu');
    if (profileMenu) {
        profileMenu.addEventListener('click', async () => {
            if (confirm('Are you sure you want to logout?')) {
                try {
                    await apiFetch('/api/auth/logout', { method: 'POST' });
                } catch (err) {
                    console.error('Logout failed on server', err);
                }
                sessionStorage.clear();
                window.location.href = 'login.html';
            }
        });
    }

    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
        window.addEventListener('resize', () => {
            mobileMenuBtn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
            if (window.innerWidth > 768) sidebar.classList.remove('open');
        });
        mobileMenuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    }

    // =============================================
    // 4. DASHBOARD (index.html)
    // =============================================
    let engagementChart;
    const engagementChartCanvas = document.getElementById('engagementChart');
    if (engagementChartCanvas) {
        const ctx = engagementChartCanvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

        engagementChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Active Students',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#3b82f6',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: 'var(--bg-dark)',
                    pointBorderColor: '#3b82f6',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
                }
            }
        });

        loadDashboardStats();
        loadLeaderboard();
    }

    async function loadDashboardStats() {
        try {
            const [studentsRes, coursesRes] = await Promise.all([
                apiFetch('/api/students/count'),
                apiFetch('/api/courses')
            ]);
            const studentsData = await studentsRes.json();
            const coursesData = await coursesRes.json();

            const totalStudentsEl = document.getElementById('stat-total-students');
            const activeCoursesEl = document.getElementById('stat-active-courses');
            if (totalStudentsEl) totalStudentsEl.textContent = studentsData.count.toLocaleString();
            if (activeCoursesEl) activeCoursesEl.textContent = coursesData.length;

            if (engagementChart && studentsData.count) {
                const count = studentsData.count;
                engagementChart.data.datasets[0].data = [
                    Math.round(count * 0.4),
                    Math.round(count * 0.6),
                    Math.round(count * 0.5),
                    Math.round(count * 0.8),
                    Math.round(count * 0.7),
                    Math.round(count * 0.9),
                    Math.round(count * 0.75)
                ];
                engagementChart.update();
            }
        } catch (err) {
            console.error('Failed to load dashboard stats:', err);
        }
    }

    // =============================================
    // 5. COURSES PAGE (courses.html)
    // =============================================
    const courseGrid = document.getElementById('course-grid');
    if (courseGrid) {
        loadCourses();

        async function loadCourses() {
            try {
                const response = await apiFetch('/api/courses');
                if (!response.ok) throw new Error('Failed to fetch courses');
                const courses = await response.json();
                renderCourses(courses);
            } catch (err) {
                console.error('Error loading courses:', err);
                showToast('Failed to load courses. Please refresh the page.', 'error');
            }
        }

        function renderCourses(courses) {
            const placeholder = document.getElementById('open-add-course-modal');
            courseGrid.innerHTML = '';

            if (courses.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.style.cssText = 'color: var(--text-muted); text-align: center; padding: 40px; grid-column: 1/-1;';
                emptyMsg.innerHTML = '<i class="fa-solid fa-box-open" style="font-size: 48px; margin-bottom: 16px; display: block;"></i><p>No courses yet. Create your first course!</p>';
                courseGrid.appendChild(emptyMsg);
            }

            courses.forEach(c => {
                const card = document.createElement('div');
                card.className = 'glass-panel course-card';
                const thumbStyle = c.image ? `background-image: url('${c.image}');` : 'background: var(--bg-panel);';
                card.innerHTML = `
                    <div class="course-thumbnail" style="${thumbStyle}">
                        <span class="course-badge" style="color: #4ade80;"><i class="fa-solid fa-circle" style="font-size: 8px; margin-right: 4px;"></i> Active</span>
                    </div>
                    <div class="course-content">
                        <h3 class="course-title">${escapeHtml(c.title)}</h3>
                        <div class="course-meta">
                            <span class="course-meta-item"><i class="fa-solid fa-layer-group"></i> ${c.modules} Modules</span>
                            <span class="course-meta-item"><i class="fa-regular fa-clock"></i> ${c.duration}</span>
                        </div>
                        <div class="course-footer">
                            <span style="font-size: 13px; color: var(--text-secondary);"><i class="fa-solid fa-user-tie"></i> ${escapeHtml(c.author)}</span>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-outline expandable-trigger" style="padding: 6px 12px; font-size: 12px;"
                                    data-id="${c.id}" data-title="${escapeHtml(c.title)}" data-subtitle="${escapeHtml(c.author)}"
                                    data-image="${c.image || ''}" data-video="${c.video || ''}">
                                    View Details
                                </button>
                                <button class="btn btn-outline delete-course-btn" style="padding: 6px 12px; font-size: 12px; color: #ef4444; border-color: #ef4444;"
                                    data-id="${c.id}">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                courseGrid.appendChild(card);
            });

            // Re-append placeholder
            if (placeholder) {
                courseGrid.appendChild(placeholder);
                placeholder.onclick = () => document.getElementById('create-course-modal').classList.add('active');
            }
        }

        // Add Course Button (top)
        const addCourseBtn = document.getElementById('add-course-btn');
        if (addCourseBtn) {
            addCourseBtn.addEventListener('click', () => {
                document.getElementById('create-course-modal').classList.add('active');
            });
        }

        // Expandable Card (View Details)
        courseGrid.addEventListener('click', async (e) => {
            const btn = e.target.closest('.expandable-trigger');
            if (btn) {
                const title = btn.getAttribute('data-title');
                const subtitle = btn.getAttribute('data-subtitle');
                const image = btn.getAttribute('data-image');
                const video = btn.getAttribute('data-video');

                document.getElementById('expanded-title').textContent = title;
                document.getElementById('expanded-subtitle').textContent = subtitle;
                const thumb = document.getElementById('expanded-thumbnail');
                if (thumb) thumb.style.backgroundImage = image ? `url('${image}')` : 'none';
                const expVideo = document.getElementById('expanded-video');
                if (expVideo) expVideo.src = video || '';

                document.getElementById('expandable-overlay').classList.add('active');
                document.body.style.overflow = 'hidden';
                return;
            }

            const deleteBtn = e.target.closest('.delete-course-btn');
            if (deleteBtn) {
                const courseId = deleteBtn.getAttribute('data-id');
                if (!confirm('Are you sure you want to delete this course?')) return;
                try {
                    const res = await apiFetch(`/api/courses/${courseId}`, { method: 'DELETE' });
                    if (res.ok) {
                        showToast('Course deleted successfully!', 'success');
                        loadCourses();
                    } else {
                        showToast('Failed to delete course.', 'error');
                    }
                } catch (err) {
                    showToast('Error deleting course.', 'error');
                }
            }
        });

        // Close Expandable Card
        const closeExpanded = document.getElementById('close-expanded');
        const overlay = document.getElementById('expandable-overlay');
        const expVideo = document.getElementById('expanded-video');

        if (closeExpanded && overlay) {
            const closeOverlay = () => {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
                setTimeout(() => { if (expVideo) expVideo.src = ''; }, 400);
            };
            closeExpanded.addEventListener('click', closeOverlay);
            const backdrop = document.getElementById('expandable-backdrop');
            if (backdrop) backdrop.addEventListener('click', closeOverlay);
        }

        // Create Course Modal
        const createModal = document.getElementById('create-course-modal');
        if (createModal) {
            const closeCreateModal = () => createModal.classList.remove('active');
            document.getElementById('close-create-modal').addEventListener('click', closeCreateModal);
            document.getElementById('create-modal-backdrop').addEventListener('click', closeCreateModal);

            document.getElementById('create-course-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = e.target.querySelector('button[type="submit"]');
                const courseData = {
                    title: document.getElementById('course-title').value.trim(),
                    author: document.getElementById('course-author').value.trim(),
                    image: document.getElementById('course-image').value.trim(),
                    video: document.getElementById('course-video').value.trim(),
                    modules: parseInt(document.getElementById('course-modules').value) || 0,
                    duration: document.getElementById('course-duration').value.trim() || '0 Hr'
                };

                submitBtn.textContent = 'Saving...';
                submitBtn.disabled = true;

                try {
                    const res = await apiFetch('/api/courses', {
                        method: 'POST',
                        body: courseData
                    });
                    const data = await res.json();
                    if (res.ok) {
                        showToast('Course created successfully!', 'success');
                        closeCreateModal();
                        e.target.reset();
                        loadCourses();
                    } else {
                        showToast(data.message || 'Failed to create course.', 'error');
                    }
                } catch (err) {
                    showToast('Error creating course. Please try again.', 'error');
                } finally {
                    submitBtn.textContent = 'Save Course';
                    submitBtn.disabled = false;
                }
            });
        }
    }

    // =============================================
    // 6. STUDENTS PAGE (students.html)
    // =============================================
    const studentTbody = document.getElementById('students-table-body');
    if (studentTbody) {
        loadStudentEnrollments();
        loadLeaderboard();

        async function loadStudentEnrollments() {
            try {
                const response = await apiFetch('/api/students/enrollments');
                if (!response.ok) throw new Error('Failed to fetch enrollments');
                const enrollments = await response.json();
                renderStudents(enrollments);
            } catch (err) {
                console.error('Error loading students:', err);
                studentTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 40px;">No student data found or failed to load.</td></tr>';
            }
        }

        function renderStudents(enrollments) {
            studentTbody.innerHTML = '';

            if (enrollments.length === 0) {
                studentTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 40px;"><i class="fa-solid fa-users-slash" style="font-size: 32px; display: block; margin-bottom: 12px;"></i>No enrollments yet.</td></tr>';
                return;
            }

            enrollments.forEach(s => {
                const tr = document.createElement('tr');
                const badgeClass = s.status === 'Active' ? 'status-active' : (s.status === 'Completed' ? 'status-completed' : 'status-inactive');
                tr.innerHTML = `
                    <td>
                        <div class="student-cell">
                            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(s.studentName)}&background=3b82f6&color=fff" alt="Student">
                            <div>
                                <div class="student-name">${escapeHtml(s.studentName)}</div>
                                <div class="student-email">${escapeHtml(s.studentEmail)}</div>
                            </div>
                        </div>
                    </td>
                    <td>${escapeHtml(s.courseTitle)}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div class="course-progress-bg" style="flex: 1; margin: 0;">
                                <div class="course-progress-fill" style="width: ${s.progress}%; ${s.progress === 100 ? 'background: var(--accent-green);' : ''}"></div>
                            </div>
                            <span style="font-size: 12px; color: var(--text-secondary); min-width: 35px;">${s.progress}%</span>
                        </div>
                    </td>
                    <td><span class="status-badge ${badgeClass}">${escapeHtml(s.status)}</span></td>
                    <td><button class="icon-btn" style="width: 32px; height: 32px;" title="Actions"><i class="fa-solid fa-ellipsis-vertical"></i></button></td>
                `;
                studentTbody.appendChild(tr);
            });
        }

        // Export CSV with real data
        const exportBtn = document.getElementById('export-data-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                try {
                    const response = await apiFetch('/api/students/enrollments');
                    const enrollments = await response.json();

                    let csvContent = 'data:text/csv;charset=utf-8,';
                    csvContent += 'Student Name,Email,Course,Progress,Status\n';
                    enrollments.forEach(s => {
                        csvContent += `"${s.studentName}","${s.studentEmail}","${s.courseTitle}",${s.progress},"${s.status}"\n`;
                    });

                    const link = document.createElement('a');
                    link.setAttribute('href', encodeURI(csvContent));
                    link.setAttribute('download', 'student_report.csv');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    showToast('Report exported successfully!', 'success');
                } catch (err) {
                    showToast('Failed to export data.', 'error');
                }
            });
        }
    }

    // =============================================
    // 7. SETTINGS PAGE (settings.html)
    // =============================================
    const settingsPage = document.querySelector('.settings-container');
    if (settingsPage) {
        initSettings();
    }

    function initSettings() {
        // Pre-fill profile fields
        const settingNameInput = document.getElementById('setting-name');
        const settingEmailInput = document.getElementById('setting-email');
        if (settingNameInput) settingNameInput.value = sessionStorage.getItem('userName') || '';
        if (settingEmailInput) settingEmailInput.value = sessionStorage.getItem('userEmail') || '';

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        const currentTheme = localStorage.getItem('app-theme') || 'dark';
        if (themeToggle) {
            themeToggle.checked = currentTheme === 'light';
            themeToggle.addEventListener('change', () => {
                const newTheme = themeToggle.checked ? 'light' : 'dark';
                localStorage.setItem('app-theme', newTheme);
                applyTheme(newTheme);
                showToast(`Switched to ${newTheme} mode`, 'success');
            });
        }

        // Update profile form
        const profileForm = document.getElementById('profile-update-form');
        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newName = document.getElementById('setting-name').value.trim();
                const email = sessionStorage.getItem('userEmail');
                const submitBtn = profileForm.querySelector('button[type="submit"]');

                if (!newName) {
                    showToast('Name cannot be empty.', 'error');
                    return;
                }

                submitBtn.textContent = 'Saving...';
                submitBtn.disabled = true;

                try {
                    const res = await apiFetch('/api/auth/update-profile', {
                        method: 'POST',
                        body: { email, name: newName }
                    });
                    const data = await res.json();
                    if (res.ok) {
                        sessionStorage.setItem('userName', data.name);
                        const ph4 = document.querySelector('.profile-info h4');
                        if (ph4) ph4.textContent = data.name;
                        showToast('Profile updated successfully!', 'success');
                    } else {
                        showToast(data.message || 'Failed to update profile.', 'error');
                    }
                } catch (err) {
                    showToast('Error updating profile.', 'error');
                } finally {
                    submitBtn.textContent = 'Update Profile';
                    submitBtn.disabled = false;
                }
            });
        }

        // Change password form
        const passwordForm = document.getElementById('change-password-form');
        if (passwordForm) {
            passwordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const currentPassword = document.getElementById('current-password').value;
                const newPassword = document.getElementById('new-password').value;
                const confirmPassword = document.getElementById('confirm-password').value;
                const email = sessionStorage.getItem('userEmail');
                const submitBtn = passwordForm.querySelector('button[type="submit"]');

                if (newPassword !== confirmPassword) {
                    showToast('New passwords do not match.', 'error');
                    return;
                }
                if (newPassword.length < 6) {
                    showToast('New password must be at least 6 characters.', 'error');
                    return;
                }

                submitBtn.textContent = 'Changing...';
                submitBtn.disabled = true;

                try {
                    const res = await apiFetch('/api/auth/change-password', {
                        method: 'POST',
                        body: { email, currentPassword, newPassword }
                    });
                    const data = await res.json();
                    if (res.ok) {
                        passwordForm.reset();
                        showToast('Password changed successfully!', 'success');
                    } else {
                        showToast(data.message || 'Failed to change password.', 'error');
                    }
                } catch (err) {
                    showToast('Error changing password.', 'error');
                } finally {
                    submitBtn.textContent = 'Change Password';
                    submitBtn.disabled = false;
                }
            });
        }

        // Notification toggle persistence
        const notifToggle = document.getElementById('notif-toggle');
        if (notifToggle) {
            notifToggle.checked = localStorage.getItem('notif-enabled') !== 'false';
            notifToggle.addEventListener('change', () => {
                localStorage.setItem('notif-enabled', notifToggle.checked);
                showToast(`Email notifications ${notifToggle.checked ? 'enabled' : 'disabled'}`, 'success');
            });
        }

        // Maintenance Mode toggle
        const maintToggle = document.getElementById('maintenance-toggle');
        if (maintToggle) {
            maintToggle.checked = localStorage.getItem('maintenance-mode') === 'true';
            maintToggle.addEventListener('change', () => {
                localStorage.setItem('maintenance-mode', maintToggle.checked);
                showToast(`Maintenance mode ${maintToggle.checked ? 'enabled' : 'disabled'}`, 'success');
            });
        }

        // Broadcast Announcement (Admin Only Settings)
        const broadcastForm = document.getElementById('broadcast-form');
        const broadcastsContainer = document.getElementById('broadcasts-container');
        if (broadcastForm && broadcastsContainer) {
            // Load sent announcements on init
            loadSentBroadcasts();

            // Submit handler
            broadcastForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = document.getElementById('broadcast-title').value.trim();
                const message = document.getElementById('broadcast-message').value.trim();
                const submitBtn = broadcastForm.querySelector('button[type="submit"]');

                if (!title || !message) {
                    showToast('Title and message cannot be empty.', 'error');
                    return;
                }

                submitBtn.textContent = 'Sending...';
                submitBtn.disabled = true;

                try {
                    const res = await apiFetch('/api/notifications', {
                        method: 'POST',
                        body: { title, message }
                    });
                    let data = {};
                    const contentType = res.headers.get("content-type");
                    if (contentType && contentType.includes("application/json")) {
                        data = await res.json();
                    }
                    if (res.ok) {
                        showToast('Announcement broadcasted successfully!', 'success');
                        broadcastForm.reset();
                        loadSentBroadcasts();
                    } else {
                        showToast(data.message || 'Failed to send broadcast.', 'error');
                    }
                } catch (err) {
                    showToast('Error sending broadcast.', 'error');
                } finally {
                    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send to All Students';
                    submitBtn.disabled = false;
                }
            });

            async function loadSentBroadcasts() {
                try {
                    const res = await apiFetch('/api/notifications');
                    if (res.ok) {
                        const notifications = await res.json();
                        renderSentBroadcasts(notifications);
                    } else {
                        broadcastsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px 0;">Failed to load announcements.</p>';
                    }
                } catch (err) {
                    broadcastsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px 0;">Error loading announcements.</p>';
                }
            }

            function renderSentBroadcasts(notifications) {
                if (notifications.length === 0) {
                    broadcastsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px 0;">No announcements sent yet.</p>';
                    return;
                }
                broadcastsContainer.innerHTML = notifications.map(notif => {
                    const date = new Date(notif.createdAt);
                    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return `
                        <div class="broadcast-item" data-id="${notif.id}">
                            <div class="broadcast-content">
                                <h4>${escapeHtml(notif.title)}</h4>
                                <p>${escapeHtml(notif.message)}</p>
                                <span><i class="fa-regular fa-clock"></i> ${formattedDate}</span>
                            </div>
                            <button class="broadcast-delete-btn" title="Delete Announcement"><i class="fa-regular fa-trash-can"></i></button>
                        </div>
                    `;
                }).join('');

                // Delete handlers
                broadcastsContainer.querySelectorAll('.broadcast-delete-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const item = e.target.closest('.broadcast-item');
                        const id = item.dataset.id;
                        if (confirm('Are you sure you want to delete this announcement?')) {
                            try {
                                const res = await apiFetch(`/api/notifications/${id}`, {
                                    method: 'DELETE'
                                });
                                if (res.ok) {
                                    showToast('Announcement deleted.', 'success');
                                    loadSentBroadcasts();
                                } else {
                                    showToast('Failed to delete announcement.', 'error');
                                }
                            } catch (err) {
                                showToast('Error deleting announcement.', 'error');
                            }
                        }
                    });
                });
            }
        }
    }

    // =============================================
    // 8. STUDENT PORTAL (student.html)
    // =============================================
    const myCoursesContainer = document.getElementById('my-courses-container');
    if (myCoursesContainer) {
        loadStudentCourses();
    }

    if (document.getElementById('student-notifications-btn')) {
        initStudentNotifications();
    }

    function initStudentNotifications() {
            const notifBtn = document.getElementById('student-notifications-btn');
            const notifDropdown = document.getElementById('student-notifications-dropdown');
            const notifBadge = document.getElementById('student-notif-badge');
            const notifList = document.getElementById('student-notifications-list');
            const markAllBtn = document.getElementById('mark-all-read-btn');

            if (!notifBtn || !notifDropdown || !notifList) return;

            // Load notifications
            loadNotifications();

            // Toggle dropdown
            notifBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                notifDropdown.classList.toggle('active');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
                    notifDropdown.classList.remove('active');
                }
            });

            // Mark all read
            if (markAllBtn) {
                markAllBtn.addEventListener('click', () => {
                    const items = notifList.querySelectorAll('.notification-item.unread');
                    if (items.length === 0) return;

                    let readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
                    items.forEach(item => {
                        const id = parseInt(item.dataset.id);
                        if (!readIds.includes(id)) {
                            readIds.push(id);
                        }
                        item.classList.remove('unread');
                    });
                    localStorage.setItem('read_notifications', JSON.stringify(readIds));
                    updateBadgeCount();
                    showToast('All notifications marked as read', 'success');
                });
            }

            async function loadNotifications() {
                try {
                    const res = await apiFetch('/api/notifications');
                    if (res.ok) {
                        const notifications = await res.json();
                        renderNotifications(notifications);
                    }
                } catch (err) {
                    console.error('Error loading notifications:', err);
                }
            }

            function renderNotifications(notifications) {
                if (notifications.length === 0) {
                    notifList.innerHTML = `
                        <div class="notifications-empty">
                            <i class="fa-regular fa-bell"></i>
                            No notifications yet
                        </div>
                    `;
                    updateBadgeCount(0);
                    return;
                }

                const readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
                
                notifList.innerHTML = notifications.map(notif => {
                    const isUnread = !readIds.includes(notif.id);
                    const date = new Date(notif.createdAt);
                    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return `
                        <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${notif.id}">
                            <h4>${escapeHtml(notif.title)}</h4>
                            <p>${escapeHtml(notif.message)}</p>
                            <span><i class="fa-regular fa-clock"></i> ${formattedDate}</span>
                        </div>
                    `;
                }).join('');

                // Click handler on items
                notifList.querySelectorAll('.notification-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        const id = parseInt(item.dataset.id);
                        let readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
                        if (!readIds.includes(id)) {
                            readIds.push(id);
                            localStorage.setItem('read_notifications', JSON.stringify(readIds));
                            item.classList.remove('unread');
                            updateBadgeCount();
                        }
                    });
                });

                updateBadgeCount();
            }

            function updateBadgeCount() {
                const items = notifList.querySelectorAll('.notification-item.unread');
                const count = items.length;
                if (count > 0) {
                    notifBadge.textContent = count;
                    notifBadge.style.display = 'flex';
                } else {
                    notifBadge.style.display = 'none';
                }
            }
        }

        async function loadStudentCourses() {
            try {
                const [enrollmentsRes, coursesRes] = await Promise.all([
                    apiFetch('/api/students/my-enrollments'),
                    apiFetch('/api/courses')
                ]);
                
                const enrollments = enrollmentsRes.ok ? await enrollmentsRes.json() : [];
                const courses = await coursesRes.json();

                if (courses.length === 0) {
                    myCoursesContainer.innerHTML = '<p style="color: var(--text-muted); padding: 20px 0;">No courses are available yet. Check back soon!</p>';
                    return;
                }

                myCoursesContainer.innerHTML = '';
                courses.forEach(c => {
                    const enrollment = enrollments.find(e => e.courseId === c.id);
                    const isEnrolled = !!enrollment;

                    const card = document.createElement('div');
                    card.className = 'glass-panel course-card';
                    const thumbStyle = c.image ? `background-image: url('${c.image}');` : 'background: var(--bg-panel);';
                    
                    let badgeHtml = '';
                    let footerBtnHtml = '';
                    let progressHtml = '';

                    if (isEnrolled) {
                        const progress = enrollment.progress || 0;
                        const statusColor = enrollment.status === 'Completed' ? '#10b981' : '#3b82f6';
                        badgeHtml = `<span class="course-badge" style="color: ${statusColor}; border-color: ${statusColor};"><i class="fa-solid fa-circle" style="font-size: 8px; margin-right: 4px;"></i> Enrolled (${enrollment.status})</span>`;
                        
                        progressHtml = `
                            <div style="display: flex; align-items: center; gap: 8px; margin: 12px 0 8px 0;">
                                <div class="course-progress-bg" style="flex: 1; margin: 0;">
                                    <div class="course-progress-fill" style="width: ${progress}%; ${progress === 100 ? 'background: var(--accent-green);' : ''}"></div>
                                </div>
                                <span style="font-size: 12px; color: var(--text-secondary); min-width: 30px;">${progress}%</span>
                            </div>
                        `;
                        
                        footerBtnHtml = `${c.video ? `<button class="btn btn-primary watch-btn" style="padding: 6px 12px; font-size: 12px;" data-id="${c.id}" data-video="${c.video}" data-title="${escapeHtml(c.title)}" data-progress="${progress}"><i class="fa-solid fa-play"></i> Continue</button>` : ''}`;
                    } else {
                        badgeHtml = `<span class="course-badge" style="color: var(--text-muted);"><i class="fa-solid fa-circle" style="font-size: 8px; margin-right: 4px;"></i> Available</span>`;
                        footerBtnHtml = `<button class="btn btn-outline enroll-btn" style="padding: 6px 12px; font-size: 12px; border-color: var(--accent-blue); color: var(--accent-blue);" data-id="${c.id}"><i class="fa-solid fa-plus"></i> Enroll</button>`;
                    }

                    card.innerHTML = `
                        <div class="course-thumbnail" style="${thumbStyle}">
                            ${badgeHtml}
                        </div>
                        <div class="course-content">
                            <h3 class="course-title">${escapeHtml(c.title)}</h3>
                            <div class="course-meta">
                                <span class="course-meta-item"><i class="fa-solid fa-layer-group"></i> ${c.modules} Modules</span>
                                <span class="course-meta-item"><i class="fa-regular fa-clock"></i> ${c.duration}</span>
                            </div>
                            ${progressHtml}
                            <div class="course-footer">
                                <span style="font-size: 13px; color: var(--text-secondary);"><i class="fa-solid fa-user-tie"></i> ${escapeHtml(c.author)}</span>
                                ${footerBtnHtml}
                            </div>
                        </div>
                    `;
                    myCoursesContainer.appendChild(card);
                });
            } catch (err) {
                console.error('Error loading courses:', err);
                myCoursesContainer.innerHTML = '<p style="color: var(--text-muted);">Failed to load courses. Please refresh.</p>';
            }
        }

        if (myCoursesContainer) {
            myCoursesContainer.addEventListener('click', async (e) => {
                const enrollBtn = e.target.closest('.enroll-btn');
                if (enrollBtn) {
                    const courseId = enrollBtn.getAttribute('data-id');
                    try {
                        const res = await apiFetch(`/api/students/enroll/${courseId}`, { method: 'POST' });
                        const data = await res.json();
                        if (res.ok) {
                            showToast('Enrolled in course successfully!', 'success');
                            loadStudentCourses();
                        } else {
                            showToast(data.message || 'Failed to enroll.', 'error');
                        }
                    } catch (err) {
                        console.error(err);
                        showToast('Error enrolling in course.', 'error');
                    }
                    return;
                }

                const watchBtn = e.target.closest('.watch-btn');
                if (watchBtn) {
                    const video = watchBtn.getAttribute('data-video');
                    const title = watchBtn.getAttribute('data-title');
                    const courseId = watchBtn.getAttribute('data-id');
                    const progress = parseInt(watchBtn.getAttribute('data-progress')) || 0;
                    openVideoModal(video, title, courseId, progress);
                }
            });
        }

        function openVideoModal(videoUrl, title, courseId, currentProgress) {
            let modal = document.getElementById('video-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'video-modal';
                modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;';
                modal.innerHTML = `
                    <div style="width:90%;max-width:800px;background:var(--bg-panel);border-radius:16px;overflow:hidden;position:relative;">
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border-light);">
                            <h3 id="video-modal-title" style="font-size:18px;margin:0;"></h3>
                            <div style="display:flex;gap:12px;align-items:center;">
                                <button id="btn-update-progress" class="btn btn-primary" style="padding:6px 12px;font-size:12px;"><i class="fa-solid fa-square-check"></i> Study 15 Mins (+25% Progress)</button>
                                <button id="close-video-modal" class="icon-btn" style="width:32px;height:32px;margin:0;"><i class="fa-solid fa-xmark"></i></button>
                            </div>
                        </div>
                        <div style="aspect-ratio:16/9;">
                            <iframe id="video-modal-iframe" width="100%" height="100%" src="" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe>
                        </div>
                    </div>`;
                document.body.appendChild(modal);
                document.getElementById('close-video-modal').addEventListener('click', () => {
                    const iframe = document.getElementById('video-modal-iframe');
                    if (iframe) iframe.src = '';
                    const video = document.getElementById('video-modal-video');
                    if (video) video.pause();
                    modal.remove();
                });
            }
            
            document.getElementById('video-modal-title').textContent = title;
            
            const container = document.getElementById('video-modal-iframe').parentElement;
            
            // Convert standard YouTube/Vimeo URLs to embed URLs
            const ytMatch = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
            if (ytMatch) {
                container.innerHTML = `<iframe id="video-modal-iframe" width="100%" height="100%" src="https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe>`;
            } else if (videoUrl.includes('vimeo.com')) {
                const vimeoId = videoUrl.split('/').pop();
                container.innerHTML = `<iframe id="video-modal-iframe" width="100%" height="100%" src="https://player.vimeo.com/video/${vimeoId}?autoplay=1" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe>`;
            } else {
                container.innerHTML = `<video id="video-modal-video" width="100%" height="100%" controls autoplay><source src="${videoUrl}" type="video/mp4">Your browser does not support the video tag.</video>`;
            }

            const updateBtn = document.getElementById('btn-update-progress');
            updateBtn.style.display = currentProgress >= 100 ? 'none' : 'flex';
            
            const newUpdateBtn = updateBtn.cloneNode(true);
            updateBtn.parentNode.replaceChild(newUpdateBtn, updateBtn);

            newUpdateBtn.addEventListener('click', async () => {
                const nextProgress = Math.min(currentProgress + 25, 100);
                newUpdateBtn.disabled = true;
                newUpdateBtn.textContent = 'Saving...';
                try {
                    const res = await apiFetch('/api/students/progress', {
                        method: 'POST',
                        body: {
                            courseId: parseInt(courseId),
                            progress: nextProgress,
                            timeSpent: 15
                        }
                    });
                    const data = await res.json();
                    if (res.ok) {
                        showToast(nextProgress === 100 ? 'Course completed! Fantastic achievement!' : 'Progress saved: +25% progress, +15 mins study time!', 'success');
                        document.getElementById('close-video-modal').click();
                        loadStudentCourses();
                    } else {
                        showToast(data.message || 'Failed to update progress.', 'error');
                        newUpdateBtn.disabled = false;
                        newUpdateBtn.innerHTML = '<i class="fa-solid fa-square-check"></i> Study 15 Mins (+25% Progress)';
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Error updating progress.', 'error');
                    newUpdateBtn.disabled = false;
                    newUpdateBtn.innerHTML = '<i class="fa-solid fa-square-check"></i> Study 15 Mins (+25% Progress)';
                }
            });
        }


    // =============================================
    // UTILITY FUNCTIONS
    // =============================================

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.body.classList.toggle('light-mode', theme === 'light');
        const icon = document.querySelector('#global-theme-toggle i');
        if (icon) {
            if (theme === 'light') {
                icon.className = 'fa-solid fa-sun';
            } else {
                icon.className = 'fa-solid fa-moon';
            }
        }
    }

    // Global Theme Toggle
    const globalThemeToggle = document.getElementById('global-theme-toggle');
    if (globalThemeToggle) {
        const currentTheme = localStorage.getItem('app-theme') || 'dark';
        const icon = globalThemeToggle.querySelector('i');
        if (icon) {
            icon.className = currentTheme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        }
        
        globalThemeToggle.addEventListener('click', () => {
            const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            localStorage.setItem('app-theme', newTheme);
            applyTheme(newTheme);
            showToast(`Theme switched to ${newTheme} mode`, 'success');
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function showToast(message, type = 'success') {
        // Remove existing toast
        const existing = document.getElementById('toast-notification');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'toast-notification';
        const bg = type === 'success' ? '#10b981' : '#ef4444';
        toast.style.cssText = `
            position: fixed; bottom: 24px; right: 24px; z-index: 99999;
            background: ${bg}; color: white; padding: 14px 20px;
            border-radius: 12px; font-size: 14px; font-weight: 500;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            display: flex; align-items: center; gap: 10px;
            animation: slideInRight 0.3s ease-out;
            max-width: 350px;
        `;
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${escapeHtml(message)}`;

        // Add animation keyframe if not present
        if (!document.getElementById('toast-style')) {
            const style = document.createElement('style');
            style.id = 'toast-style';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3500);
    }

    async function loadLeaderboard() {
        const lbLists = document.querySelectorAll('.leaderboard-list');
        if (lbLists.length === 0) return;

        try {
            const res = await apiFetch('/api/students/leaderboard');
            if (!res.ok) throw new Error('Failed to fetch leaderboard');
            const leaderboard = await res.json();

            lbLists.forEach(lbList => {
                lbList.innerHTML = '';
                if (leaderboard.length === 0) {
                    lbList.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 20px;">No performance data yet.</div>';
                    return;
                }
                
                const limit = lbList.closest('.dashboard-grid') ? 5 : 10;
                const itemsToShow = leaderboard.slice(0, limit);

                itemsToShow.forEach((user, index) => {
                    const rank = index + 1;
                    const rankClass = rank <= 3 ? `rank-${rank}` : '';
                    const bg = rank === 1 ? '10b981' : (rank === 2 ? '3b82f6' : (rank === 3 ? 'f97316' : '475569'));
                    
                    const item = document.createElement('div');
                    item.className = 'leaderboard-item';
                    item.innerHTML = `
                        <div class="rank ${rankClass}">${rank}</div>
                        <div class="lb-user">
                            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=${bg}&color=fff" alt="${escapeHtml(user.name)}" class="lb-avatar">
                            <span class="lb-name">${escapeHtml(user.name)}</span>
                        </div>
                        <div class="lb-score">${user.score.toLocaleString()}</div>
                    `;
                    lbList.appendChild(item);
                });
            });
        } catch (err) {
            console.error('Error loading leaderboard:', err);
        }
    }

    // =============================================
    // 9. STUDENT PROFILE PAGE LOGIC (student-profile.html)
    // =============================================
    const profileFullName = document.getElementById('profile-full-name');
    if (profileFullName) {
        let selectedResumeFile = null;

        loadStudentProfile();

        async function loadStudentProfile() {
            try {
                // Fetch User Details
                const meRes = await apiFetch('/api/auth/me');
                if (!meRes.ok) throw new Error('Failed to load profile details');
                const me = await meRes.json();

                profileFullName.textContent = me.name || 'Student';
                const pEmail = document.getElementById('profile-email');
                if (pEmail) pEmail.textContent = me.email || '';

                const pBio = document.getElementById('profile-bio-display');
                if (pBio) pBio.textContent = me.bio || 'No bio written yet.';

                const phoneBadge = document.getElementById('profile-phone-badge');
                const phoneText = document.getElementById('profile-phone-text');
                if (me.phone) {
                    if (phoneText) phoneText.textContent = me.phone;
                    if (phoneBadge) phoneBadge.style.display = 'inline-flex';
                } else {
                    if (phoneBadge) phoneBadge.style.display = 'none';
                }

                const resumeLink = document.getElementById('profile-resume-link');
                const fileInfoZone = document.getElementById('resume-file-info');
                if (me.resumeUrl) {
                    if (resumeLink) {
                        resumeLink.href = me.resumeUrl;
                        resumeLink.style.display = 'inline-flex';
                    }
                    if (fileInfoZone) {
                        fileInfoZone.style.display = 'flex';
                        document.getElementById('file-name').textContent = me.resumeUrl.startsWith('data:') ? 'Uploaded_Resume.pdf' : 'resume.pdf';
                        document.getElementById('file-size').textContent = 'Stored Online';
                        const fileIcon = document.getElementById('file-icon');
                        if (fileIcon) {
                            if (me.resumeUrl.includes('pdf')) {
                                fileIcon.className = 'fa-regular fa-file-pdf';
                                fileIcon.style.color = '#ef4444';
                            } else {
                                fileIcon.className = 'fa-regular fa-file-image';
                                fileIcon.style.color = '#3b82f6';
                            }
                        }
                    }
                } else {
                    if (resumeLink) resumeLink.style.display = 'none';
                    if (fileInfoZone) fileInfoZone.style.display = 'none';
                }

                const largeAvatar = document.getElementById('profile-avatar-img');
                if (largeAvatar) {
                    largeAvatar.src = me.profilePicUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(me.name)}&background=10b981&color=fff&size=128`;
                }

                // Fetch Enrollments
                const enrollRes = await apiFetch('/api/students/my-enrollments');
                if (enrollRes.ok) {
                    const enrollments = await enrollRes.json();
                    renderProfileEnrollments(enrollments);
                } else {
                    throw new Error('Failed to load enrollments');
                }

            } catch (err) {
                console.error('Error loading student profile:', err);
                showToast('Failed to load profile information.', 'error');
                if (profileFullName && profileFullName.textContent === 'Loading...') {
                    profileFullName.textContent = 'User Data Unavailable';
                }
                const listContainer = document.getElementById('course-progress-list');
                if (listContainer) {
                    listContainer.innerHTML = '<p style="color:#ef4444; text-align:center; padding: 20px 0;"><i class="fa-solid fa-triangle-exclamation"></i> Error loading profile data. Please refresh.</p>';
                }
            }
        }

        function renderProfileEnrollments(enrollments) {
            const listContainer = document.getElementById('course-progress-list');
            if (!listContainer) return;

            const statEnrolled = document.getElementById('stat-enrolled');
            const statCompleted = document.getElementById('stat-completed');
            const statHours = document.getElementById('stat-hours');

            const total = enrollments.length;
            const completed = enrollments.filter(e => e.status === 'Completed').length;
            
            let totalHours = 0;
            enrollments.forEach(e => {
                totalHours += Math.round((e.progress || 0) * 0.15);
            });

            if (statEnrolled) statEnrolled.textContent = total;
            if (statCompleted) statCompleted.textContent = completed;
            if (statHours) statHours.textContent = totalHours || '0';

            if (total === 0) {
                listContainer.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 20px 0;">You are not enrolled in any courses yet.</p>';
                return;
            }

            listContainer.innerHTML = enrollments.map(e => {
                const barColor = e.progress === 100 ? 'var(--accent-green)' : 'var(--accent-blue)';
                return `
                    <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border-light);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <h4 style="font-size:15px; font-weight:600;">${escapeHtml(e.courseTitle)}</h4>
                            <span style="font-size:13px; font-weight:600; color:${barColor};">${e.progress}%</span>
                        </div>
                        <div class="course-progress-bg" style="margin:0; height:8px;">
                            <div class="course-progress-fill" style="width:${e.progress}%; background:${barColor};"></div>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-top:6px; font-size:12px; color:var(--text-muted);">
                            <span>Status: ${e.status}</span>
                            <span>${e.duration || '0 Hr'}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Profile Picture Upload Handler
        const picUploadInput = document.getElementById('profile-pic-upload');
        const avatarLarge = document.getElementById('profile-avatar-large');
        if (avatarLarge && picUploadInput) {
            avatarLarge.addEventListener('click', (e) => {
                if (e.target !== picUploadInput && e.target.tagName !== 'LABEL' && e.target.parentElement?.tagName !== 'LABEL') {
                    picUploadInput.click();
                }
            });
        }
        if (picUploadInput) {
            picUploadInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                if (file.size > 2 * 1024 * 1024) {
                    showToast('Profile image size must be less than 2MB', 'error');
                    return;
                }

                const formData = new FormData();
                formData.append('file', file);
                
                try {
                    const uploadRes = await apiFetch('/api/upload', {
                        method: 'POST',
                        body: formData
                    });
                    if (!uploadRes.ok) throw new Error('Upload failed');
                    const uploadData = await uploadRes.json();
                    const fileUrl = uploadData.url;
                    
                    const meRes = await apiFetch('/api/auth/me');
                    const me = await meRes.json();

                    const res = await apiFetch('/api/auth/update-profile', {
                        method: 'POST',
                        body: {
                            name: me.name,
                            profilePicUrl: fileUrl
                        }
                    });

                    if (res.ok) {
                        showToast('Profile picture updated successfully!', 'success');
                        // Update UI and session storage cache
                        sessionStorage.setItem('profilePicUrl', fileUrl);
                        document.getElementById('profile-avatar-img').src = fileUrl;
                        const studentAvatar = document.getElementById('student-avatar');
                        if (studentAvatar) studentAvatar.src = fileUrl;
                        document.querySelectorAll('.profile-avatar').forEach(img => img.src = fileUrl);
                    } else {
                        showToast('Failed to save profile picture', 'error');
                    }
                } catch (err) {
                    showToast('Error uploading profile picture', 'error');
                }
            });
        }

        // Resume Drag and Drop + Upload logic
        const fileInput = document.getElementById('resume-file-input');
        const dropZone = document.getElementById('resume-drop-zone');
        const fileInfo = document.getElementById('resume-file-info');
        const submitBtn = document.getElementById('resume-submit-btn');

        if (fileInput && dropZone) {
            fileInput.addEventListener('change', handleFileSelect);
            
            // drag and drop events
            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    dropZone.style.borderColor = 'var(--accent-blue)';
                    dropZone.style.background = 'rgba(59, 130, 246, 0.05)';
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    dropZone.style.borderColor = 'var(--border-light)';
                    dropZone.style.background = 'rgba(255,255,255,0.01)';
                }, false);
            });

            dropZone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const file = dt.files[0];
                if (file) {
                    fileInput.files = dt.files;
                    handleFile(file);
                }
            });

            const removeBtn = document.getElementById('remove-file-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    fileInput.value = '';
                    selectedResumeFile = null;
                    fileInfo.style.display = 'none';
                    submitBtn.disabled = true;
                });
            }
        }

        function handleFileSelect(e) {
            const file = e.target.files[0];
            if (file) handleFile(file);
        }

        function handleFile(file) {
            if (file.size > 5 * 1024 * 1024) {
                showToast('Resume size must be less than 5MB', 'error');
                fileInput.value = '';
                return;
            }

            document.getElementById('file-name').textContent = file.name;
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            document.getElementById('file-size').textContent = `${sizeMB} MB`;

            const icon = document.getElementById('file-icon');
            if (icon) {
                if (file.type.includes('pdf')) {
                    icon.className = 'fa-regular fa-file-pdf';
                    icon.style.color = '#ef4444';
                } else if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
                    icon.className = 'fa-regular fa-file-word';
                    icon.style.color = '#3b82f6';
                } else {
                    icon.className = 'fa-regular fa-file-image';
                    icon.style.color = '#10b981';
                }
            }

            fileInfo.style.display = 'flex';
            submitBtn.disabled = false;

            selectedResumeFile = file;
        }

        // Resume Submit
        const resumeUploadForm = document.getElementById('resume-upload-form');
        if (resumeUploadForm) {
            resumeUploadForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!selectedResumeFile) return;

                submitBtn.disabled = true;
                submitBtn.textContent = 'Uploading...';

                try {
                    const formData = new FormData();
                    formData.append('file', selectedResumeFile);
                    
                    const uploadRes = await apiFetch('/api/upload', {
                        method: 'POST',
                        body: formData
                    });
                    if (!uploadRes.ok) throw new Error('Upload failed');
                    const uploadData = await uploadRes.json();
                    const fileUrl = uploadData.url;

                    const meRes = await apiFetch('/api/auth/me');
                    const me = await meRes.json();

                    const res = await apiFetch('/api/auth/update-profile', {
                        method: 'POST',
                        body: {
                            name: me.name,
                            resumeUrl: fileUrl
                        }
                    });

                    if (res.ok) {
                        showToast('Resume uploaded successfully!', 'success');
                        loadStudentProfile();
                    } else {
                        showToast('Failed to upload resume.', 'error');
                    }
                } catch (err) {
                    showToast('Error uploading resume.', 'error');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Upload Resume File';
                }
            });
        }
    }

    // =============================================
    // 10. STUDENT SETTINGS PAGE LOGIC (student-settings.html)
    // =============================================
    const studentProfileForm = document.getElementById('student-profile-form');
    if (studentProfileForm) {
        initStudentSettings();

        async function initStudentSettings() {
            try {
                const res = await apiFetch('/api/auth/me');
                if (!res.ok) throw new Error('Unauthorized');
                const me = await res.json();

                const nameInput = document.getElementById('s-setting-name');
                const emailInput = document.getElementById('s-setting-email');
                const phoneInput = document.getElementById('s-setting-phone');
                const bioInput = document.getElementById('s-setting-bio');

                if (nameInput) nameInput.value = me.name || '';
                if (emailInput) emailInput.value = me.email || '';
                if (phoneInput) phoneInput.value = me.phone || '';
                if (bioInput) bioInput.value = me.bio || '';

            } catch (err) {
                console.error(err);
            }
        }

        studentProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = studentProfileForm.querySelector('button[type="submit"]');
            const name = document.getElementById('s-setting-name').value.trim();
            const phone = document.getElementById('s-setting-phone').value.trim();
            const bio = document.getElementById('s-setting-bio').value.trim();

            if (!name) {
                showToast('Name is required.', 'error');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            try {
                const res = await apiFetch('/api/auth/update-profile', {
                    method: 'POST',
                    body: { name, phone, bio }
                });

                const data = await res.json();
                if (res.ok) {
                    sessionStorage.setItem('userName', data.name);
                    const sh4 = document.querySelector('.profile-info h4');
                    if (sh4) sh4.textContent = data.name;
                    showToast('Profile settings updated!', 'success');
                } else {
                    showToast(data.message || 'Failed to update profile.', 'error');
                }
            } catch (err) {
                showToast('Error updating profile.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
            }
        });

        const studentPasswordForm = document.getElementById('student-password-form');
        if (studentPasswordForm) {
            studentPasswordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = studentPasswordForm.querySelector('button[type="submit"]');
                const currentPassword = document.getElementById('s-current-password').value;
                const newPassword = document.getElementById('s-new-password').value;
                const confirmPassword = document.getElementById('s-confirm-password').value;

                if (newPassword !== confirmPassword) {
                    showToast('New passwords do not match.', 'error');
                    return;
                }
                if (newPassword.length < 6) {
                    showToast('New password must be at least 6 characters.', 'error');
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.textContent = 'Changing...';

                try {
                    const res = await apiFetch('/api/auth/change-password', {
                        method: 'POST',
                        body: { currentPassword, newPassword }
                    });
                    const data = await res.json();
                    if (res.ok) {
                        studentPasswordForm.reset();
                        showToast('Password changed successfully!', 'success');
                    } else {
                        showToast(data.message || 'Failed to change password.', 'error');
                    }
                } catch (err) {
                    showToast('Error changing password.', 'error');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Change Password';
                }
            });
        }



        // Student Notifications Switch
        const sNotifToggle = document.getElementById('s-notif-toggle');
        if (sNotifToggle) {
            sNotifToggle.checked = localStorage.getItem('notif-enabled') !== 'false';
            sNotifToggle.addEventListener('change', () => {
                localStorage.setItem('notif-enabled', sNotifToggle.checked);
                showToast(`Notifications ${sNotifToggle.checked ? 'enabled' : 'disabled'}`, 'success');
            });
        }

        // Student Logout
        const sLogoutBtn = document.getElementById('s-logout-btn');
        if (sLogoutBtn) {
            sLogoutBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to logout?')) {
                    try {
                        await apiFetch('/api/auth/logout', { method: 'POST' });
                    } catch (err) {}
                    sessionStorage.clear();
                    window.location.href = 'login.html';
                }
            });
        }
    }

    // =============================================
    // 11. STUDENT TESTS PAGE LOGIC (student-tests.html)
    // =============================================
    const testsContainer = document.getElementById('tests-container');
    if (testsContainer) {
        let allMyTests = [];
        let currentFilter = 'all';

        loadStudentTests();

        async function loadStudentTests() {
            try {
                const res = await apiFetch('/api/quizzes/my');
                if (!res.ok) throw new Error('Failed to load quizzes');
                allMyTests = await res.json();
                renderStudentTests();
            } catch (err) {
                console.error(err);
                testsContainer.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:40px;">Failed to load assigned tests.</p>';
            }
        }

        function renderStudentTests() {
            testsContainer.innerHTML = '';
            
            const filtered = allMyTests.filter(t => {
                if (currentFilter === 'all') return true;
                return t.testStatus === currentFilter;
            });

            if (filtered.length === 0) {
                testsContainer.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:40px;">No tests found matching this status.</p>`;
                return;
            }

            filtered.forEach(t => {
                const card = document.createElement('div');
                card.className = 'glass-panel test-card';
                card.style.cssText = 'padding: 24px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;';

                let statusBadge = '';
                let actionBtn = '';
                const startTime = t.scheduledStart ? new Date(t.scheduledStart).toLocaleString() : 'N/A';
                const endTime = t.scheduledEnd ? new Date(t.scheduledEnd).toLocaleString() : 'N/A';

                if (t.testStatus === 'LIVE') {
                    statusBadge = `<span class="status-badge status-active"><i class="fa-solid fa-circle animate-pulse" style="font-size: 8px; margin-right: 6px;"></i>Live Now</span>`;
                    actionBtn = `<a href="test-session.html?id=${t.id}" class="btn btn-primary" style="background:linear-gradient(135deg,#10b981,#059669);"><i class="fa-solid fa-play"></i> Start Test</a>`;
                } else if (t.testStatus === 'UPCOMING') {
                    statusBadge = `<span class="status-badge status-inactive"><i class="fa-regular fa-clock" style="margin-right:6px;"></i>Upcoming</span>`;
                    actionBtn = `<button class="btn btn-outline" disabled><i class="fa-solid fa-lock"></i> Locked</button>`;
                } else if (t.testStatus === 'COMPLETED') {
                    statusBadge = `<span class="status-badge status-completed"><i class="fa-solid fa-circle-check" style="margin-right:6px;"></i>Completed</span>`;
                    actionBtn = `
                        <div style="text-align: right;">
                            <div style="font-size: 18px; font-weight: 700; color: var(--accent-green);">${t.score} / ${t.totalMarks}</div>
                            <div style="font-size: 11px; color: var(--text-muted);">Status: ${t.submissionStatus || 'Submitted'}</div>
                        </div>`;
                } else {
                    statusBadge = `<span class="status-badge" style="background:rgba(239,68,68,0.15); color:#ef4444;"><i class="fa-solid fa-ban" style="margin-right:6px;"></i>Expired</span>`;
                    actionBtn = `<span style="color:var(--text-muted); font-size:13px;">Window Closed</span>`;
                }

                card.innerHTML = `
                    <div style="flex:1; min-width:280px;">
                        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
                            <h3 style="font-size:18px; font-weight:700; margin:0;">${escapeHtml(t.title)}</h3>
                            ${statusBadge}
                        </div>
                        <p style="color:var(--text-secondary); font-size:14px; margin-bottom:12px;">${escapeHtml(t.description || 'No description provided.')}</p>
                        <div style="display:flex; gap:20px; font-size:12px; color:var(--text-muted); flex-wrap:wrap;">
                            <span><i class="fa-solid fa-clock-rotate-left"></i> Duration: <strong>${t.durationMinutes} Mins</strong></span>
                            <span><i class="fa-solid fa-circle-question"></i> Questions: <strong>${t.questionCount}</strong></span>
                            <span><i class="fa-solid fa-calendar-days"></i> Window: <strong>${startTime} - ${endTime}</strong></span>
                        </div>
                    </div>
                    <div>
                        ${actionBtn}
                    </div>
                `;
                testsContainer.appendChild(card);
            });
        }

        // Test tabs logic
        const tabs = document.querySelectorAll('.test-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilter = tab.dataset.filter;
                renderStudentTests();
            });
        });
    }

    // =============================================
    // 12. TEST SESSION PAGE LOGIC (test-session.html)
    // =============================================
    const testSessionWrapper = document.getElementById('test-session-wrapper');
    if (testSessionWrapper) {
        const urlParams = new URLSearchParams(window.location.search);
        const quizId = urlParams.get('id');

        let quizData = null;
        let currentQuestionIndex = 0;
        let answersMap = {}; // stores questionId -> selectedAnswer
        let timerInterval = null;
        let timeRemainingSeconds = 0;
        let tabViolations = 0;
        let totalDurationSeconds = 0;

        if (!quizId) {
            alert('Invalid quiz access.');
            window.location.href = 'student-tests.html';
        } else {
            initTestSession();
        }

        async function initTestSession() {
            try {
                const res = await apiFetch(`/api/quizzes/${quizId}/questions`);
                if (!res.ok) {
                    const err = await res.json();
                    alert(err.message || 'Cannot access this test.');
                    window.location.href = 'student-tests.html';
                    return;
                }
                quizData = await res.json();
                
                // Set metadata
                document.getElementById('test-session-title').textContent = quizData.title;
                document.getElementById('total-count').textContent = quizData.questions.length;
                document.getElementById('test-questions-count').textContent = `${quizData.questions.length} questions assigned`;

                const endTime = quizData.scheduledEnd ? new Date(quizData.scheduledEnd).getTime() : 0;
                const now = Date.now();
                
                // Time remaining is the minimum of scheduled end time vs durations
                const remFromScheduled = endTime ? Math.floor((endTime - now) / 1000) : Infinity;
                const remFromDuration = (quizData.durationMinutes || 30) * 60;
                timeRemainingSeconds = Math.min(remFromScheduled > 0 ? remFromScheduled : 0, remFromDuration);
                totalDurationSeconds = remFromDuration;

                if (timeRemainingSeconds <= 0) {
                    alert('This test session window is already expired.');
                    window.location.href = 'student-tests.html';
                    return;
                }

                // Render first question
                renderQuestion(0);
                renderQuestionNav();

                // Start Timer
                startTestTimer();

                // Secure Fullscreen Mode
                requestFullscreenMode();

                // Setup Proctoring Detectors
                setupProctoring();

            } catch (err) {
                console.error(err);
                alert('An error occurred initializing the test session.');
                window.location.href = 'student-tests.html';
            }
        }

        function requestFullscreenMode() {
            // Attempt to trigger fullscreen
            const docEl = document.documentElement;
            const requestFS = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
            if (requestFS) {
                document.addEventListener('click', function fsClickTrigger() {
                    requestFS.call(docEl).catch(() => {});
                    document.removeEventListener('click', fsClickTrigger);
                });
            }
        }

        function setupProctoring() {
            // Tab Visibility Detection
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    triggerTabViolation();
                }
            });

            // Esc key prevention
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                }
            });

            // Warning overlay continue button
            const continueBtn = document.getElementById('tab-warning-continue-btn');
            if (continueBtn) {
                continueBtn.addEventListener('click', () => {
                    document.getElementById('tab-warning-overlay').classList.remove('active');
                });
            }
        }

        function triggerTabViolation() {
            // Ignore if test already submitted
            if (document.getElementById('results-screen').classList.contains('active')) return;

            tabViolations++;
            const warningOverlay = document.getElementById('tab-warning-overlay');
            const violationCount = document.getElementById('violation-count');

            if (tabViolations >= 3) {
                if (warningOverlay) warningOverlay.classList.remove('active');
                autoSubmitTest('AUTO_SUBMIT_VIOLATION');
            } else {
                if (violationCount) violationCount.textContent = `${tabViolations} / 3`;
                if (warningOverlay) warningOverlay.classList.add('active');
            }
        }

        function startTestTimer() {
            const timerText = document.getElementById('test-timer-text');
            const timerBar = document.getElementById('test-timer-bar-fill');
            const timerDisplay = document.getElementById('test-timer-display');

            timerInterval = setInterval(() => {
                timeRemainingSeconds--;
                if (timeRemainingSeconds <= 0) {
                    clearInterval(timerInterval);
                    autoSubmitTest('SUBMITTED');
                    return;
                }

                // Format text
                const mins = Math.floor(timeRemainingSeconds / 60);
                const secs = timeRemainingSeconds % 60;
                timerText.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

                // Warning class updates
                if (timeRemainingSeconds < 60) {
                    timerDisplay.className = 'test-timer-display danger';
                } else if (timeRemainingSeconds < 300) {
                    timerDisplay.className = 'test-timer-display warning';
                }

                // Progress Bar fill
                const perc = (timeRemainingSeconds / totalDurationSeconds) * 100;
                timerBar.style.width = `${perc}%`;
            }, 1000);
        }

        function renderQuestion(index) {
            currentQuestionIndex = index;
            const container = document.getElementById('test-question-area');
            if (!container || !quizData) return;

            const q = quizData.questions[index];
            const savedAns = answersMap[q.id] || '';

            let optionsHtml = '';
            if (q.questionType === 'MCQ') {
                optionsHtml = `
                    <div class="mcq-options">
                        ${['A', 'B', 'C', 'D'].map(opt => {
                            const optText = q[`option${opt}`];
                            if (!optText) return '';
                            const isSelected = savedAns === opt;
                            return `
                                <div class="mcq-option ${isSelected ? 'selected' : ''}" data-value="${opt}">
                                    <input type="radio" name="q-${q.id}" value="${opt}" ${isSelected ? 'checked' : ''}>
                                    <div class="mcq-option-label"><strong>${opt}.</strong> ${escapeHtml(optText)}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            } else if (q.questionType === 'TRUE_FALSE') {
                optionsHtml = `
                    <div class="tf-options">
                        <button class="tf-btn ${savedAns === 'TRUE' ? 'selected' : ''}" data-value="TRUE">True</button>
                        <button class="tf-btn ${savedAns === 'FALSE' ? 'selected' : ''}" data-value="FALSE">False</button>
                    </div>
                `;
            } else if (q.questionType === 'SHORT_ANSWER') {
                optionsHtml = `
                    <textarea class="sa-textarea" placeholder="Type your short answer here..." rows="2">${escapeHtml(savedAns)}</textarea>
                `;
            } else if (q.questionType === 'FILL_IN_BLANKS') {
                optionsHtml = `
                    <input type="text" class="fib-input" style="width:100%; padding:12px; border:1px solid var(--border-light); border-radius:8px; background:var(--bg-dark); color:var(--text-light); font-size:16px;" placeholder="Type the exact word or phrase..." value="${escapeHtml(savedAns)}">
                `;
            } else if (q.questionType === 'CODING') {
                optionsHtml = `
                    <textarea class="coding-textarea" placeholder="// Write your code here..." rows="10" style="width:100%; padding:12px; border:1px solid var(--border-light); border-radius:8px; background:#1e1e1e; color:#d4d4d4; font-family:monospace; font-size:14px; resize:vertical;">${escapeHtml(savedAns)}</textarea>
                `;
            } else {
                optionsHtml = `
                    <textarea class="sa-textarea" placeholder="Type your answer here..." rows="4">${escapeHtml(savedAns)}</textarea>
                `;
            }

            container.innerHTML = `
                <div class="q-number-label">Question ${index + 1} of ${quizData.questions.length}</div>
                <div class="q-marks-badge"><i class="fa-solid fa-award"></i> ${q.marks} Marks</div>
                <div class="q-text">${escapeHtml(q.questionText)}</div>
                
                ${optionsHtml}

                <div class="q-nav-buttons">
                    <button class="btn btn-outline" id="prev-q-btn" ${index === 0 ? 'disabled' : ''}>Previous</button>
                    <button class="btn btn-primary" id="next-q-btn">${index === quizData.questions.length - 1 ? 'Finish & Review' : 'Next Question'}</button>
                </div>
            `;

            // Radio Click Handlers
            container.querySelectorAll('.mcq-option').forEach(el => {
                el.addEventListener('click', () => {
                    container.querySelectorAll('.mcq-option').forEach(x => x.classList.remove('selected'));
                    el.classList.add('selected');
                    const radio = el.querySelector('input');
                    radio.checked = true;
                    saveAnswer(q.id, el.dataset.value);
                });
            });

            // True False Buttons Handlers
            container.querySelectorAll('.tf-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    container.querySelectorAll('.tf-btn').forEach(x => x.classList.remove('selected'));
                    btn.classList.add('selected');
                    saveAnswer(q.id, btn.dataset.value);
                });
            });

            // Text input handlers
            const textarea = container.querySelector('.sa-textarea');
            if (textarea) {
                textarea.addEventListener('input', () => saveAnswer(q.id, textarea.value));
            }
            const fibInput = container.querySelector('.fib-input');
            if (fibInput) {
                fibInput.addEventListener('input', () => saveAnswer(q.id, fibInput.value));
            }
            const codingTextarea = container.querySelector('.coding-textarea');
            if (codingTextarea) {
                codingTextarea.addEventListener('input', () => saveAnswer(q.id, codingTextarea.value));
            }

            // Prev and Next navigation
            document.getElementById('prev-q-btn').onclick = () => renderQuestion(index - 1);
            document.getElementById('next-q-btn').onclick = () => {
                if (index === quizData.questions.length - 1) {
                    // Flash sidebar grid highlighting
                    showToast('All answers review completed. You can submit now.', 'success');
                } else {
                    renderQuestion(index + 1);
                }
            };

            // Highlight current index in nav sidebar
            document.querySelectorAll('.q-nav-btn').forEach(btn => {
                btn.classList.remove('active');
                if (parseInt(btn.dataset.index) === index) {
                    btn.classList.add('active');
                }
            });
        }

        function saveAnswer(questionId, val) {
            answersMap[questionId] = val;
            
            // Check answered state
            const btn = document.querySelector(`.q-nav-btn[data-id="${questionId}"]`);
            if (btn) {
                if (val && val.trim() !== '') {
                    btn.classList.add('answered');
                } else {
                    btn.classList.remove('answered');
                }
            }

            // Update stats
            const answeredCount = Object.values(answersMap).filter(v => v && v.trim() !== '').length;
            document.getElementById('answered-count').textContent = answeredCount;
        }

        function renderQuestionNav() {
            const navGrid = document.getElementById('q-nav-grid');
            if (!navGrid || !quizData) return;

            navGrid.innerHTML = quizData.questions.map((q, idx) => {
                return `<button class="q-nav-btn" data-index="${idx}" data-id="${q.id}">${idx + 1}</button>`;
            }).join('');

            navGrid.querySelectorAll('.q-nav-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    renderQuestion(parseInt(btn.dataset.index));
                });
            });
        }

        // Manual Submit Button Handler
        const submitTestBtn = document.getElementById('submit-test-btn');
        if (submitTestBtn) {
            submitTestBtn.addEventListener('click', () => {
                const total = quizData.questions.length;
                const answered = Object.values(answersMap).filter(v => v && v.trim() !== '').length;
                
                if (confirm(`Are you sure you want to submit? You have answered ${answered} of ${total} questions.`)) {
                    autoSubmitTest('SUBMITTED');
                }
            });
        }

        async function autoSubmitTest(status) {
            clearInterval(timerInterval);

            // Exit Fullscreen if any
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }

            try {
                // Post to submission endpoint
                const res = await apiFetch(`/api/quizzes/${quizId}/submit`, {
                    method: 'POST',
                    body: {
                        answers: answersMap,
                        status: status
                    }
                });

                if (!res.ok) throw new Error('Submission server error');
                const data = await res.json();

                // Show Results Screen
                document.getElementById('result-score').textContent = `${data.score} / ${data.totalMarks}`;
                document.getElementById('result-percentage').textContent = `${data.percentage}%`;
                
                let message = 'Keep learning and practicing!';
                if (data.percentage >= 80) message = 'Excellent! You passed with high marks!';
                else if (data.percentage >= 50) message = 'Good job! You passed the test.';
                document.getElementById('result-message').textContent = message;

                if (status === 'AUTO_SUBMIT_VIOLATION') {
                    document.getElementById('result-auto-submit-notice').style.display = 'block';
                }

                document.getElementById('results-screen').classList.add('active');

            } catch (err) {
                console.error(err);
                alert('Critical error: Failed to submit quiz online. Please contact admin.');
            }
        }
    }

    // =============================================
    // 13. ADMIN TESTS PAGE LOGIC (admin-tests.html)
    // =============================================
    const quizzesAdminContainer = document.getElementById('quizzes-admin-container');
    if (quizzesAdminContainer) {
        let allQuizzes = [];
        loadAdminQuizzes();

        // Create Button trigger
        const createBtn = document.getElementById('create-quiz-btn');
        const overlay = document.getElementById('quiz-modal-overlay');
        
        if (createBtn && overlay) {
            createBtn.addEventListener('click', () => {
                document.getElementById('quiz-form').reset();
                document.getElementById('quiz-edit-id').value = '';
                document.getElementById('quiz-modal-title').textContent = 'Create New Test';
                document.getElementById('specific-students-group').style.display = 'none';
                overlay.style.display = 'flex';
            });
        }

        // Close modal handlers
        const cancelQuizBtn = document.getElementById('cancel-quiz-modal');
        const closeQuizBtn = document.getElementById('close-quiz-modal');
        if (cancelQuizBtn) cancelQuizBtn.addEventListener('click', () => overlay.style.display = 'none');
        if (closeQuizBtn) closeQuizBtn.addEventListener('click', () => overlay.style.display = 'none');

        // Target dropdown visibility listener
        const targetSelect = document.getElementById('qf-target');
        if (targetSelect) {
            targetSelect.addEventListener('change', () => {
                const group = document.getElementById('specific-students-group');
                group.style.display = targetSelect.value === 'specific' ? 'block' : 'none';
            });
        }

        // Form Submit Handler
        const quizForm = document.getElementById('quiz-form');
        if (quizForm) {
            quizForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = document.getElementById('quiz-form-submit-btn');
                const editId = document.getElementById('quiz-edit-id').value;

                const scheduledStart = document.getElementById('qf-start').value;
                const scheduledEnd = document.getElementById('qf-end').value;

                const payload = {
                    title: document.getElementById('qf-title').value.trim(),
                    description: document.getElementById('qf-description').value.trim(),
                    scheduledStart: scheduledStart, // ISO compatible mapping
                    scheduledEnd: scheduledEnd,
                    durationMinutes: parseInt(document.getElementById('qf-duration').value),
                    targetStudentIds: targetSelect.value === 'specific' ? document.getElementById('qf-specific-ids').value.trim() : 'ALL'
                };

                submitBtn.disabled = true;
                submitBtn.textContent = 'Saving...';

                try {
                    let res;
                    if (editId) {
                        res = await apiFetch(`/api/quizzes/${editId}`, {
                            method: 'PUT',
                            body: payload
                        });
                    } else {
                        res = await apiFetch('/api/quizzes', {
                            method: 'POST',
                            body: payload
                        });
                    }

                    if (res.ok) {
                        const savedQuiz = await res.json();
                        showToast(editId ? 'Test updated successfully!' : 'Test created successfully!', 'success');
                        overlay.style.display = 'none';
                        loadAdminQuizzes();
                        if (!editId) {
                            openQuestionsModal(savedQuiz.id, savedQuiz.title);
                        }
                    } else {
                        const err = await res.json();
                        showToast(err.message || 'Failed to save test details', 'error');
                    }
                } catch (err) {
                    showToast('Network error saving test details.', 'error');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Test';
                }
            });
        }

        async function loadAdminQuizzes() {
            try {
                const res = await apiFetch('/api/quizzes');
                if (!res.ok) throw new Error('Admin unauthorized');
                allQuizzes = await res.json();
                renderAdminQuizzes();
            } catch (err) {
                console.error(err);
                quizzesAdminContainer.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">Failed to load quizzes list.</p>';
            }
        }

        function renderAdminQuizzes() {
            quizzesAdminContainer.innerHTML = '';
            
            if (allQuizzes.length === 0) {
                quizzesAdminContainer.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">No tests created yet. Use the button above to create one!</p>';
                return;
            }

            allQuizzes.forEach(q => {
                const card = document.createElement('div');
                card.className = 'glass-panel test-card';
                card.style.cssText = 'padding:24px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;';

                const startStr = q.scheduledStart ? new Date(q.scheduledStart).toLocaleString() : 'N/A';
                const endStr = q.scheduledEnd ? new Date(q.scheduledEnd).toLocaleString() : 'N/A';

                let statusBadge = '';
                let conductBtn = '';
                if (q.status === 'LIVE') {
                    statusBadge = `<span class="status-badge status-active"><i class="fa-solid fa-circle animate-pulse" style="font-size: 8px; margin-right: 6px;"></i>Live Now</span>`;
                    conductBtn = `<button class="btn btn-outline complete-quiz-btn" data-id="${q.id}" style="border-color:#ef4444; color:#ef4444;"><i class="fa-solid fa-circle-check"></i> Complete Test</button>`;
                } else if (q.status === 'UPCOMING') {
                    statusBadge = `<span class="status-badge status-inactive"><i class="fa-regular fa-clock" style="margin-right:6px;"></i>Upcoming</span>`;
                    conductBtn = `<button class="btn btn-outline make-live-btn" data-id="${q.id}" style="border-color:#10b981; color:#10b981;"><i class="fa-solid fa-play"></i> Make Live Now</button>`;
                } else {
                    statusBadge = `<span class="status-badge status-completed"><i class="fa-solid fa-circle-check" style="margin-right:6px;"></i>Completed</span>`;
                }

                card.innerHTML = `
                    <div style="flex:1; min-width:300px;">
                        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
                            <h3 style="font-size:18px; font-weight:700; margin:0;">${escapeHtml(q.title)}</h3>
                            <span style="font-size:11px; padding:3px 8px; border-radius:12px; background:rgba(59,130,246,0.15); color:var(--accent-blue);">
                                ID: ${q.id}
                            </span>
                            ${statusBadge}
                        </div>
                        <p style="color:var(--text-secondary); font-size:14px; margin-bottom:12px;">${escapeHtml(q.description || 'No description provided.')}</p>
                        <div style="display:flex; gap:20px; font-size:12px; color:var(--text-muted); flex-wrap:wrap;">
                            <span>Duration: <strong>${q.durationMinutes} Mins</strong></span>
                            <span>Target: <strong>${q.targetStudentIds === 'ALL' ? 'All Students' : 'Specific IDs'}</strong></span>
                            <span>Window: <strong>${startStr} - ${endStr}</strong></span>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        ${conductBtn}
                        <button class="btn btn-outline manage-qs-btn" data-id="${q.id}" data-title="${escapeHtml(q.title)}"><i class="fa-solid fa-circle-question"></i> Questions</button>
                        <button class="btn btn-outline view-subs-btn" data-id="${q.id}" data-title="${escapeHtml(q.title)}"><i class="fa-solid fa-users-rectangle"></i> Submissions</button>
                        <button class="btn btn-outline edit-quiz-btn" data-id="${q.id}"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                        <button class="btn btn-outline delete-quiz-btn" data-id="${q.id}" style="border-color:#ef4444; color:#ef4444;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
                quizzesAdminContainer.appendChild(card);
            });
            // Action listeners

            quizzesAdminContainer.querySelectorAll('.make-live-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.id;
                    if (confirm('Make this test live now? The start time will be set to current time.')) {
                        try {
                            const res = await apiFetch(`/api/quizzes/${id}/make-live`, { method: 'POST' });
                            if (res.ok) {
                                showToast('Test is now live!', 'success');
                                loadAdminQuizzes();
                            } else {
                                showToast('Failed to make test live.', 'error');
                            }
                        } catch (err) {
                            showToast('Error conducting test.', 'error');
                        }
                    }
                });
            });

            quizzesAdminContainer.querySelectorAll('.complete-quiz-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.id;
                    if (confirm('Mark this test as completed? The end time will be set to current time.')) {
                        try {
                            const res = await apiFetch(`/api/quizzes/${id}/complete`, { method: 'POST' });
                            if (res.ok) {
                                showToast('Test marked as completed!', 'success');
                                loadAdminQuizzes();
                            } else {
                                showToast('Failed to complete test.', 'error');
                            }
                        } catch (err) {
                            showToast('Error completing test.', 'error');
                        }
                    }
                });
            });

            quizzesAdminContainer.querySelectorAll('.edit-quiz-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.id;
                    try {
                        const res = await apiFetch(`/api/quizzes/${id}`);
                        if (res.ok) {
                            const data = await res.json();
                            document.getElementById('quiz-edit-id').value = data.id;
                            document.getElementById('qf-title').value = data.title;
                            document.getElementById('qf-description').value = data.description || '';
                            
                            // Parse local datetime input friendly values
                            document.getElementById('qf-start').value = data.scheduledStart.substring(0, 16);
                            document.getElementById('qf-end').value = data.scheduledEnd.substring(0, 16);
                            
                            document.getElementById('qf-duration').value = data.durationMinutes;

                            const target = data.targetStudentIds === 'ALL' ? 'ALL' : 'specific';
                            document.getElementById('qf-target').value = target;
                            const idsInput = document.getElementById('qf-specific-ids');
                            idsInput.value = target === 'specific' ? data.targetStudentIds : '';
                            document.getElementById('specific-students-group').style.display = target === 'specific' ? 'block' : 'none';

                            document.getElementById('quiz-modal-title').textContent = 'Edit Test Details';
                            document.getElementById('quiz-modal-overlay').style.display = 'flex';
                        }
                    } catch (err) {
                        showToast('Error loading quiz detail.', 'error');
                    }
                });
            });

            quizzesAdminContainer.querySelectorAll('.delete-quiz-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.id;
                    if (confirm('Are you sure you want to delete this test? All questions and student submissions will be lost!')) {
                        try {
                            const res = await apiFetch(`/api/quizzes/${id}`, { method: 'DELETE' });
                            if (res.ok) {
                                showToast('Test deleted successfully.', 'success');
                                loadAdminQuizzes();
                            } else {
                                showToast('Failed to delete test.', 'error');
                            }
                        } catch (err) {
                            showToast('Error deleting test.', 'error');
                        }
                    }
                });
            });

            // Questions Manager Modals
            quizzesAdminContainer.querySelectorAll('.manage-qs-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    openQuestionsModal(btn.dataset.id, btn.dataset.title);
                });
            });

            // Submissions Manager Modals
            quizzesAdminContainer.querySelectorAll('.view-subs-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    openSubmissionsModal(btn.dataset.id, btn.dataset.title);
                });
            });
        }

        // ================= QUESTIONS CRUD =================
        const qsOverlay = document.getElementById('questions-modal-overlay');
        const qListContainer = document.getElementById('question-list-container');
        const addQForm = document.getElementById('add-question-form');
        const aqfType = document.getElementById('aqf-type');

        if (qsOverlay) {
            document.getElementById('close-questions-modal').onclick = () => qsOverlay.style.display = 'none';
        }

        if (aqfType) {
            aqfType.addEventListener('change', () => {
                const type = aqfType.value;
                document.getElementById('mcq-options-group').style.display = type === 'MCQ' ? 'block' : 'none';
                document.getElementById('tf-options-group').style.display = type === 'TRUE_FALSE' ? 'block' : 'none';
                document.getElementById('sa-options-group').style.display = type === 'SHORT_ANSWER' ? 'block' : 'none';
                document.getElementById('fib-options-group').style.display = type === 'FILL_IN_BLANKS' ? 'block' : 'none';
                document.getElementById('coding-options-group').style.display = type === 'CODING' ? 'block' : 'none';
            });
        }

        async function openQuestionsModal(quizId, quizTitle) {
            document.getElementById('questions-modal-quiz-title').textContent = quizTitle;
            document.getElementById('aqf-quiz-id').value = quizId;
            addQForm.reset();
            if (aqfType) aqfType.dispatchEvent(new Event('change'));
            qsOverlay.style.display = 'flex';
            
            loadQuizQuestions(quizId);
        }

        async function loadQuizQuestions(quizId) {
            try {
                const res = await apiFetch(`/api/quizzes/${quizId}`);
                if (res.ok) {
                    const data = await res.json();
                    renderQuizQuestions(quizId, data.questions || []);
                }
            } catch (err) {
                console.error(err);
            }
        }

        function renderQuizQuestions(quizId, questions) {
            qListContainer.innerHTML = '';
            if (questions.length === 0) {
                qListContainer.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No questions yet.</p>';
                return;
            }

            questions.forEach((q, idx) => {
                const item = document.createElement('div');
                item.style.cssText = 'padding:14px; background:var(--bg-dark); border:1px solid var(--border-light); border-radius:8px; margin-bottom:12px; position:relative;';
                
                let details = '';
                if (q.questionType === 'MCQ') {
                    details = `<div style="font-size:12px; color:var(--text-muted); margin-top:6px;">Options: A) ${escapeHtml(q.optionA)} | B) ${escapeHtml(q.optionB)} | C) ${escapeHtml(q.optionC)} | D) ${escapeHtml(q.optionD)}</div>`;
                }

                item.innerHTML = `
                    <div style="font-weight:600; font-size:14px; padding-right:32px;">${idx + 1}. ${escapeHtml(q.questionText)}</div>
                    <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;">
                        Type: <strong>${q.questionType}</strong> | Correct: <strong style="color:var(--accent-green);">${escapeHtml(q.correctAnswer)}</strong> | Marks: <strong>${q.marks}</strong>
                    </div>
                    ${details}
                    <button class="delete-q-btn" data-id="${q.id}" style="position:absolute; right:12px; top:12px; background:none; border:none; color:#ef4444; cursor:pointer;" title="Delete Question"><i class="fa-solid fa-trash-can"></i></button>
                `;

                item.querySelector('.delete-q-btn').onclick = async () => {
                    if (confirm('Delete this question?')) {
                        try {
                            const dRes = await apiFetch(`/api/quizzes/${quizId}/questions/${q.id}`, { method: 'DELETE' });
                            if (dRes.ok) {
                                showToast('Question deleted', 'success');
                                loadQuizQuestions(quizId);
                            }
                        } catch (err) {
                            showToast('Error deleting question', 'error');
                        }
                    }
                };

                qListContainer.appendChild(item);
            });
        }

        // Add question handler
        if (addQForm) {
            addQForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const quizId = document.getElementById('aqf-quiz-id').value;
                const type = aqfType.value;
                
                let correctAnswer = '';
                if (type === 'MCQ') correctAnswer = document.getElementById('aqf-correct-mcq').value;
                else if (type === 'TRUE_FALSE') correctAnswer = document.getElementById('aqf-correct-tf').value;
                else if (type === 'SHORT_ANSWER') correctAnswer = document.getElementById('aqf-correct-sa').value.trim();
                else if (type === 'FILL_IN_BLANKS') correctAnswer = document.getElementById('aqf-correct-fib').value.trim();
                else if (type === 'CODING') correctAnswer = document.getElementById('aqf-correct-coding').value.trim();

                const payload = {
                    questionType: type,
                    questionText: document.getElementById('aqf-text').value.trim(),
                    optionA: document.getElementById('aqf-optA').value.trim(),
                    optionB: document.getElementById('aqf-optB').value.trim(),
                    optionC: document.getElementById('aqf-optC').value.trim(),
                    optionD: document.getElementById('aqf-optD').value.trim(),
                    correctAnswer: correctAnswer,
                    marks: parseInt(document.getElementById('aqf-marks').value) || 1
                };

                try {
                    const res = await apiFetch(`/api/quizzes/${quizId}/questions`, {
                        method: 'POST',
                        body: payload
                    });

                    if (res.ok) {
                        showToast('Question added successfully!', 'success');
                        addQForm.reset();
                        if (aqfType) aqfType.dispatchEvent(new Event('change'));
                        loadQuizQuestions(quizId);
                    } else {
                        showToast('Failed to add question', 'error');
                    }
                } catch (err) {
                    showToast('Error adding question', 'error');
                }
            });
        }

        // ================= SUBMISSIONS VIEW =================
        const subOverlay = document.getElementById('submissions-modal-overlay');
        const subContainer = document.getElementById('submissions-list-container');

        if (subOverlay) {
            document.getElementById('close-submissions-modal').onclick = () => subOverlay.style.display = 'none';
        }

        async function openSubmissionsModal(quizId, quizTitle) {
            document.getElementById('submissions-modal-title').textContent = quizTitle;
            subContainer.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading submissions...</p>';
            subOverlay.style.display = 'flex';

            try {
                const res = await apiFetch(`/api/quizzes/${quizId}/submissions`);
                if (res.ok) {
                    const data = await res.json();
                    renderQuizSubmissions(data);
                }
            } catch (err) {
                subContainer.innerHTML = '<p style="color:#ef4444;text-align:center;padding:20px;">Failed to load submissions list.</p>';
            }
        }

        function renderQuizSubmissions(submissions) {
            subContainer.innerHTML = '';
            if (submissions.length === 0) {
                subContainer.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No student submissions yet.</p>';
                return;
            }

            const table = document.createElement('table');
            table.className = 'analytics-table';
            table.style.width = '100%';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th style="text-align:left;">Student</th>
                        <th>Score</th>
                        <th>Status</th>
                        <th>Submitted At</th>
                    </tr>
                </thead>
                <tbody>
                    ${submissions.map(s => {
                        const date = new Date(s.submittedAt).toLocaleString();
                        const perc = s.totalMarks > 0 ? Math.round((s.score / s.totalMarks) * 100) : 0;
                        const statusColor = s.status.includes('VIOLATION') ? '#ef4444' : 'var(--accent-green)';
                        return `
                            <tr>
                                <td>
                                    <div style="font-weight:600;">${escapeHtml(s.studentName)}</div>
                                    <div style="font-size:12px; color:var(--text-muted);">${escapeHtml(s.studentEmail)}</div>
                                </td>
                                <td style="text-align:center; font-weight:700;">
                                    ${s.score} / ${s.totalMarks} <small style="font-weight:normal; color:var(--text-muted);">(${perc}%)</small>
                                </td>
                                <td style="text-align:center;">
                                    <span style="font-size:11px; padding:2px 8px; border-radius:12px; background:rgba(255,255,255,0.05); color:${statusColor}; font-weight:600;">
                                        ${s.status}
                                    </span>
                                </td>
                                <td style="text-align:center; font-size:13px; color:var(--text-secondary);">${date}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            `;
            subContainer.appendChild(table);
        }
    }

    // Make showToast globally available for settings page
    window.showToast = showToast;
});

