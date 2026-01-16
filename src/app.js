/**
 * Day 2 Main Application - MVC Implementation
 * Orchestrates semua komponen: Storage, Repositories, Controllers, Views
 */

// Global application state
let app = {
    storage: null,
    userRepository: null,
    taskRepository: null,
    userController: null,
    taskController: null,
    taskView: null,
    currentUser: null
};

/**
 * Initialize aplikasi
 */
function initializeApp() {
    console.log('🚀 Initializing Day 2 Task Management System...');
    
    try {
        // 1. Initialize storage manager (FIX: Gunakan EnhancedStorageManager)
        if (typeof EnhancedStorageManager === 'undefined') {
            throw new Error('EnhancedStorageManager belum dimuat');
        }
        app.storage = new EnhancedStorageManager('taskAppDay2', '2.0');
        console.log('✅ Storage manager initialized');
        
        // 2. Initialize repositories
        app.userRepository = new UserRepository(app.storage);
        app.taskRepository = new TaskRepository(app.storage);
        console.log('✅ Repositories initialized');
        
        // 3. Initialize controllers
        app.userController = new UserController(app.userRepository);
        app.taskController = new TaskController(app.taskRepository, app.userRepository);
        console.log('✅ Controllers initialized');
        
        // 4. Initialize view
        app.taskView = new TaskView(app.taskController, app.userController);
        console.log('✅ Views initialized');
        
        // 5. Setup authentication & event listeners
        setupEventListeners();
        
        // 6. Create demo user jika belum ada
        createDemoUserIfNeeded();
        
        // 7. Show login section
        showLoginSection();
        
        // 8. Render Initial Stats (jika ada elemen stats di halaman login/dashboard umum)
        renderCategoryStats();
        
        console.log('✅ Day 2 Application initialized successfully!');
        
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        // Fallback alert jika showMessage belum siap
        alert('Gagal menginisialisasi aplikasi: ' + error.message);
    }
}

/**
 * Setup authentication event listeners
 */
function setupEventListeners() {
    // --- Auth Listeners ---
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) registerBtn.addEventListener('click', showRegisterModal);
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    const usernameInput = document.getElementById('usernameInput');
    if (usernameInput) {
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }
    
    // --- Register Modal ---
    const registerForm = document.getElementById('registerForm');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    
    const closeRegisterModal = document.getElementById('closeRegisterModal');
    const cancelRegister = document.getElementById('cancelRegister');
    if (closeRegisterModal) closeRegisterModal.addEventListener('click', hideRegisterModal);
    if (cancelRegister) cancelRegister.addEventListener('click', hideRegisterModal);
    
    // --- Quick Action Buttons ---
    const showOverdueBtn = document.getElementById('showOverdueBtn');
    if (showOverdueBtn) showOverdueBtn.addEventListener('click', showOverdueTasks);
    
    const showDueSoonBtn = document.getElementById('showDueSoonBtn');
    if (showDueSoonBtn) showDueSoonBtn.addEventListener('click', showDueSoonTasks);
    
    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) exportDataBtn.addEventListener('click', exportAppData);
    
    const refreshTasks = document.getElementById('refreshTasks');
    if (refreshTasks) refreshTasks.addEventListener('click', () => {
        if(app.taskView) app.taskView.refresh();
        renderCategoryStats(); // Refresh stats juga
    });

    // --- Category Filter Buttons (NEW FEATURE) ---
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', handleCategoryFilter);
    });

    // --- Main Filter Buttons (All, Pending, etc) ---
    const filterButtons = document.querySelectorAll('.filter-buttons .filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Reset active class
            filterButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Reset category buttons visual state
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));

            const filterType = e.target.dataset.filter;
            if (app.taskView) {
                // Mapping filter sederhana untuk View
                let filters = {};
                if (filterType === 'pending') filters.status = 'pending';
                else if (filterType === 'completed') filters.status = 'completed';
                else if (filterType === 'high') filters.priority = 'high';
                
                app.taskView.refresh(filters);
            }
        });
    });
}

/**
 * Handle user login
 */
function handleLogin() {
    const usernameInput = document.getElementById('usernameInput');
    const username = usernameInput.value.trim();
    
    if (!username) {
        showMessage('Username wajib diisi', 'error');
        return;
    }
    
    const response = app.userController.login(username);
    
    if (response.success) {
        app.currentUser = response.data;
        
        // Set current user di task controller
        app.taskController.setCurrentUser(app.currentUser.id);
        
        // Show main content
        showMainContent();
        
        // Load user list untuk assign dropdown
        loadUserListForAssign();
        
        // Refresh views & stats
        if (app.taskView) app.taskView.refresh();
        renderCategoryStats();
        
        showMessage(response.message, 'success');
    } else {
        showMessage(response.error, 'error');
    }
}

/**
 * Handle user logout
 */
function handleLogout() {
    const response = app.userController.logout();
    
    app.currentUser = null;
    
    // Hide main content
    hideMainContent();
    
    // Show login section
    showLoginSection();
    
    showMessage(response.message, 'info');
}

/**
 * Handle Category Filter (MVC Version)
 */
function handleCategoryFilter(event) {
    const btn = event.target;
    const category = btn.dataset.category;
    
    // Update active category button UI
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Reset other filters UI
    document.querySelectorAll('.filter-buttons .filter-btn').forEach(b => b.classList.remove('active'));
    
    // Call Controller
    const result = app.taskController.getTasksByCategory(category);
    
    if (result.success) {
        // Render menggunakan TaskView (jika support) atau render manual
        if (app.taskView && typeof app.taskView.renderTaskList === 'function') {
            app.taskView.renderTaskList(result.data);
            showMessage(`Menampilkan kategori: ${result.categoryDisplayName || category}`, 'info');
        } else {
            // Fallback: Refresh dengan filter object
            app.taskView.refresh({ category: category });
        }
    } else {
        showMessage(result.error, 'error');
    }
}

/**
 * Render Category Statistics (MVC Version)
 */
function renderCategoryStats() {
    // Pastikan user login dan controller siap
    if (!app.currentUser || !app.taskController) return;

    const statsContainer = document.getElementById('taskStats'); // Menggunakan container yang ada di HTML
    if (!statsContainer) return;
    
    // Ambil data dari controller
    const result = app.taskController.getCategoryStats();
    
    if (result.success) {
        const stats = result.data.byCategory;
        
        // Render stats HTML
        const statsHTML = Object.entries(stats)
            .filter(([_, data]) => data.total > 0)
            .map(([category, data]) => {
                // Format display name (huruf depan kapital)
                const displayName = category.charAt(0).toUpperCase() + category.slice(1);
                
                return `
                    <div class="stat-card category-stat">
                        <h4>${displayName}</h4>
                        <div class="stat-number">${data.total}</div>
                        <div class="stat-meta">
                            <span class="stat-completed">${data.completed} done</span>
                            ${data.overdue > 0 ? `<span class="stat-overdue">${data.overdue} late</span>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        
        // Jika ada data, tampilkan. Jika tidak, tampilkan pesan kosong.
        if (statsHTML) {
            statsContainer.innerHTML = statsHTML;
        } else {
            statsContainer.innerHTML = '<p class="text-muted">Belum ada statistik task.</p>';
        }
    }
}

// --- Helper Functions (Modal, Register, UI) ---

function showRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) modal.style.display = 'flex';
}

function hideRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.style.display = 'none';
        const form = document.getElementById('registerForm');
        if (form) form.reset();
    }
}

function handleRegister(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const userData = {
        username: formData.get('username')?.trim(),
        email: formData.get('email')?.trim(),
        fullName: formData.get('fullName')?.trim()
    };
    
    const response = app.userController.register(userData);
    
    if (response.success) {
        hideRegisterModal();
        showMessage(response.message, 'success');
        const usernameInput = document.getElementById('usernameInput');
        if (usernameInput) usernameInput.value = userData.username;
    } else {
        showMessage(response.error, 'error');
    }
}

function showLoginSection() {
    const loginSection = document.getElementById('loginSection');
    const userInfo = document.getElementById('userInfo');
    const mainContent = document.getElementById('mainContent');
    
    if (loginSection) loginSection.style.display = 'flex';
    if (userInfo) userInfo.style.display = 'none';
    if (mainContent) mainContent.style.display = 'none';
    
    const usernameInput = document.getElementById('usernameInput');
    if (usernameInput) {
        usernameInput.value = '';
        usernameInput.focus();
    }
}

function showMainContent() {
    const loginSection = document.getElementById('loginSection');
    const userInfo = document.getElementById('userInfo');
    const mainContent = document.getElementById('mainContent');
    const welcomeMessage = document.getElementById('welcomeMessage');
    
    if (loginSection) loginSection.style.display = 'none';
    if (userInfo) userInfo.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'block';
    
    if (welcomeMessage && app.currentUser) {
        welcomeMessage.textContent = `Selamat datang, ${app.currentUser.fullName || app.currentUser.username}!`;
    }
}

function hideMainContent() {
    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.style.display = 'none';
}

function loadUserListForAssign() {
    const response = app.userController.getAllUsers();
    if (response.success) {
        const assigneeSelect = document.getElementById('taskAssignee');
        if (assigneeSelect) {
            assigneeSelect.innerHTML = '<option value="self">Diri Sendiri</option>';
            response.data.forEach(user => {
                if (user.id !== app.currentUser.id) {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = user.fullName || user.username;
                    assigneeSelect.appendChild(option);
                }
            });
        }
    }
}

function showOverdueTasks() {
    const response = app.taskController.getOverdueTasks();
    if (response.success) {
        if (app.taskView && typeof app.taskView.renderTaskList === 'function') {
            app.taskView.renderTaskList(response.data);
            showMessage(`Ditemukan ${response.count} task overdue`, 'warning');
        } else {
            // Fallback refresh
            app.taskView.refresh({ overdue: true });
        }
    } else {
        showMessage(response.error, 'error');
    }
}

function showDueSoonTasks() {
    const response = app.taskController.getTasksDueSoon(3);
    if (response.success) {
        if (app.taskView && typeof app.taskView.renderTaskList === 'function') {
            app.taskView.renderTaskList(response.data);
            showMessage(`Ditemukan ${response.count} task due soon`, 'warning');
        } else {
            // Fallback refresh
            app.taskView.refresh({ dueSoon: true });
        }
    } else {
        showMessage(response.error, 'error');
    }
}

function exportAppData() {
    const exportData = app.storage.exportData();
    if (exportData) {
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `task-app-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        showMessage('Data berhasil diekspor', 'success');
    } else {
        showMessage('Gagal mengekspor data', 'error');
    }
}

function createDemoUserIfNeeded() {
    if (app.userRepository && app.userRepository.findAll().length === 0) {
        try {
            app.userRepository.create({ username: 'demo', email: 'demo@example.com', fullName: 'Demo User' });
            app.userRepository.create({ username: 'john', email: 'john@example.com', fullName: 'John Doe' });
            console.log('✅ Demo users created');
        } catch (e) {
            console.error('Failed create demo user', e);
        }
    }
}

function showMessage(message, type = 'info') {
    if (app.taskView && typeof app.taskView.showMessage === 'function') {
        app.taskView.showMessage(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Global Error Handlers
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Export untuk testing (jika diperlukan)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeApp,
        handleLogin,
        handleLogout,
        handleRegister,
        app
    };
}